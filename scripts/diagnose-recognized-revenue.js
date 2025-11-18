const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Require all models to register schemas
require('../src/server/models/Job');
require('../src/server/models/ProgressReport');
require('../src/server/models/ScheduleOfValues');
require('../src/server/models/Area');
require('../src/server/models/System');

const Job = mongoose.model('Job');
const ProgressReport = mongoose.model('ProgressReport');
const ScheduleOfValues = mongoose.model('ScheduleOfValues');

async function diagnoseRecognizedRevenue() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_DEV_URI or MONGODB_URI not set in .env.local');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Find the job
    const job = await Job.findOne({ jobNumber: 'JOB-2025-ELEC-001' });
    if (!job) {
      console.error('❌ Job JOB-2025-ELEC-001 not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`\n📊 Analyzing Job: ${job.name} (${job.jobNumber})\n`);

    // Get all SOV items
    const sovItems = await ScheduleOfValues.find({ jobId: job._id })
      .populate(['areaId', 'systemId'])
      .sort({ sortOrder: 1, lineNumber: 1 });

    const totalSOVValue = sovItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    console.log(`📋 SOV Summary:`);
    console.log(`   Total SOV Items: ${sovItems.length}`);
    console.log(`   Total SOV Value: $${totalSOVValue.toLocaleString()}`);

    // Get all approved progress reports
    const progressReports = await ProgressReport.find({
      jobId: job._id,
      status: 'approved'
    })
      .sort({ reportDate: 1 })
      .lean();

    console.log(`\n📊 Progress Reports Summary:`);
    console.log(`   Total Approved Reports: ${progressReports.length}`);

    if (progressReports.length === 0) {
      console.log('   ⚠️  No approved progress reports found!');
      await mongoose.connection.close();
      return;
    }

    // Get latest progress report
    const latestPR = progressReports[progressReports.length - 1];
    console.log(`   Latest Report: ${latestPR.reportNumber} (${new Date(latestPR.reportDate).toLocaleDateString()})`);
    console.log(`   Calculated % CTD: ${latestPR.summary?.calculatedPercentCTD?.toFixed(2)}%`);

    // Calculate totals from progress reports
    let totalAssignedCost = 0;
    let totalApprovedCTD = 0;
    const lineItemsByAreaSystem = new Map();

    latestPR.lineItems.forEach(item => {
      const key = `${item.areaName}-${item.systemName}`;
      if (!lineItemsByAreaSystem.has(key)) {
        lineItemsByAreaSystem.set(key, {
          areaName: item.areaName,
          systemName: item.systemName,
          assignedCost: 0,
          approvedCTD: 0
        });
      }
      const entry = lineItemsByAreaSystem.get(key);
      entry.assignedCost += item.assignedCost || 0;
      entry.approvedCTD += item.approvedCTD?.amount || 0;
    });

    totalAssignedCost = Array.from(lineItemsByAreaSystem.values())
      .reduce((sum, item) => sum + item.assignedCost, 0);
    totalApprovedCTD = Array.from(lineItemsByAreaSystem.values())
      .reduce((sum, item) => sum + item.approvedCTD, 0);

    console.log(`\n💰 Financial Summary:`);
    console.log(`   Total Assigned Cost (from PR): $${totalAssignedCost.toLocaleString()}`);
    console.log(`   Total Approved CTD (Recognized Revenue): $${totalApprovedCTD.toLocaleString()}`);
    console.log(`   Total SOV Value: $${totalSOVValue.toLocaleString()}`);
    console.log(`   Difference: $${(totalSOVValue - totalAssignedCost).toLocaleString()}`);

    // Check if assignedCost matches SOV totalValue
    if (Math.abs(totalSOVValue - totalAssignedCost) > 1) {
      console.log(`\n⚠️  MISMATCH DETECTED:`);
      console.log(`   Progress Report assignedCost ($${totalAssignedCost.toLocaleString()})`);
      console.log(`   does NOT match SOV totalValue ($${totalSOVValue.toLocaleString()})`);
      console.log(`   Difference: $${(totalSOVValue - totalAssignedCost).toLocaleString()}`);
    } else {
      console.log(`\n✅ Assigned Cost matches SOV Value`);
    }

    // Calculate expected recognized revenue based on completion %
    const completionPercent = latestPR.summary?.calculatedPercentCTD || 0;
    const expectedRecognized = (totalSOVValue * completionPercent) / 100;
    console.log(`\n📈 Expected vs Actual:`);
    console.log(`   Completion %: ${completionPercent.toFixed(2)}%`);
    console.log(`   Expected Recognized (${completionPercent.toFixed(2)}% of $${totalSOVValue.toLocaleString()}): $${expectedRecognized.toLocaleString()}`);
    console.log(`   Actual Recognized: $${totalApprovedCTD.toLocaleString()}`);
    console.log(`   Difference: $${(expectedRecognized - totalApprovedCTD).toLocaleString()}`);

    // Check each line item
    console.log(`\n📋 Line Items Analysis:`);
    console.log(`   Progress Report Line Items: ${latestPR.lineItems.length}`);
    console.log(`   SOV Items: ${sovItems.length}`);

    // Group SOV by Area/System to match progress report structure
    const sovByAreaSystem = new Map();
    sovItems.forEach(sov => {
      const areaName = sov.areaId?.name || 'Unknown Area';
      const systemName = sov.systemId?.name || 'Unknown System';
      const key = `${areaName}-${systemName}`;
      
      if (!sovByAreaSystem.has(key)) {
        sovByAreaSystem.set(key, {
          areaName,
          systemName,
          sovItems: [],
          totalValue: 0
        });
      }
      const entry = sovByAreaSystem.get(key);
      entry.sovItems.push(sov);
      entry.totalValue += sov.totalValue || 0;
    });

    console.log(`   SOV Area/System Groups: ${sovByAreaSystem.size}`);
    console.log(`   PR Area/System Groups: ${lineItemsByAreaSystem.size}`);

    // Compare each group
    const mismatches = [];
    sovByAreaSystem.forEach((sovGroup, key) => {
      const prGroup = lineItemsByAreaSystem.get(key);
      if (!prGroup) {
        mismatches.push({
          key,
          issue: 'Missing in Progress Report',
          sovValue: sovGroup.totalValue
        });
      } else if (Math.abs(sovGroup.totalValue - prGroup.assignedCost) > 1) {
        mismatches.push({
          key,
          issue: 'Assigned Cost Mismatch',
          sovValue: sovGroup.totalValue,
          prAssignedCost: prGroup.assignedCost,
          difference: sovGroup.totalValue - prGroup.assignedCost
        });
      }
    });

    // Check for PR items not in SOV
    lineItemsByAreaSystem.forEach((prGroup, key) => {
      if (!sovByAreaSystem.has(key)) {
        mismatches.push({
          key,
          issue: 'Extra in Progress Report (not in SOV)',
          prAssignedCost: prGroup.assignedCost
        });
      }
    });

    if (mismatches.length > 0) {
      console.log(`\n⚠️  Found ${mismatches.length} mismatches:`);
      mismatches.forEach(m => {
        console.log(`   ${m.key}: ${m.issue}`);
        if (m.sovValue) console.log(`      SOV Value: $${m.sovValue.toLocaleString()}`);
        if (m.prAssignedCost) console.log(`      PR Assigned Cost: $${m.prAssignedCost.toLocaleString()}`);
        if (m.difference) console.log(`      Difference: $${m.difference.toLocaleString()}`);
      });
    } else {
      console.log(`\n✅ All Area/System groups match between SOV and Progress Reports`);
    }

    // Show breakdown by progress report
    console.log(`\n📊 Progress Report Breakdown:`);
    progressReports.forEach((pr, index) => {
      const prTotal = pr.summary?.totalApprovedCTD?.amount || 0;
      const prPercent = pr.summary?.calculatedPercentCTD || 0;
      console.log(`   Month ${index + 1} (${pr.reportNumber}):`);
      console.log(`      Approved CTD: $${prTotal.toLocaleString()} (${prPercent.toFixed(2)}%)`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

diagnoseRecognizedRevenue();

