const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Require all models
require('../src/server/models/Job');
require('../src/server/models/ProgressReport');
require('../src/server/models/ScheduleOfValues');
require('../src/server/models/CostToCompleteForecast');
require('../src/server/models/Area');
require('../src/server/models/System');

const Job = mongoose.model('Job');
const ProgressReport = mongoose.model('ProgressReport');
const CostToCompleteForecast = mongoose.model('CostToCompleteForecast');

async function checkAlignment() {
  try {
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_DEV_URI or MONGODB_URI not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    const job = await Job.findOne({ jobNumber: 'JOB-2025-ELEC-001' });
    if (!job) {
      console.error('❌ Job not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`📊 Job: ${job.name} (${job.jobNumber})\n`);

    // Get all approved progress reports
    const progressReports = await ProgressReport.find({
      jobId: job._id,
      status: 'approved'
    })
      .sort({ reportDate: 1 })
      .lean();

    // Get all forecasts (non-archived)
    const forecasts = await CostToCompleteForecast.find({
      jobId: job._id,
      status: { $ne: 'archived' }
    })
      .sort({ monthNumber: 1 })
      .lean();

    console.log(`📋 Progress Reports: ${progressReports.length}`);
    progressReports.forEach((pr, i) => {
      const recognized = pr.summary?.totalApprovedCTD?.amount || 0;
      console.log(`   ${i + 1}. ${pr.reportNumber} (Month ${i + 1}) - $${recognized.toLocaleString()} (${pr.summary?.calculatedPercentCTD?.toFixed(2)}%)`);
    });

    console.log(`\n📊 Forecasts: ${forecasts.length}`);
    forecasts.forEach((f, i) => {
      const costToDate = f.summary?.costToDate || 0;
      const recognized = f.summary?.earnedToDate || 0;
      console.log(`   ${i + 1}. ${f.forecastPeriod} (Month ${f.monthNumber}) - Cost: $${costToDate.toLocaleString()}, Earned: $${recognized.toLocaleString()}`);
      if (f.progressReportId) {
        const pr = progressReports.find(p => p._id.toString() === f.progressReportId.toString());
        if (pr) {
          console.log(`      → Matches PR: ${pr.reportNumber}`);
        } else {
          console.log(`      → ⚠️  PR ID ${f.progressReportId} not found in approved reports`);
        }
      } else {
        console.log(`      → ⚠️  No progressReportId linked`);
      }
    });

    console.log(`\n🔍 Alignment Check:`);
    console.log(`   Progress Reports: ${progressReports.length} months`);
    console.log(`   Forecasts: ${forecasts.length} months`);

    if (progressReports.length !== forecasts.length) {
      console.log(`   ⚠️  MISMATCH: Different number of months!`);
    }

    // Check latest values
    const latestPR = progressReports[progressReports.length - 1];
    const latestForecast = forecasts[forecasts.length - 1];

    if (latestPR && latestForecast) {
      const prRecognized = latestPR.summary?.totalApprovedCTD?.amount || 0;
      const forecastEarned = latestForecast.summary?.earnedToDate || 0;
      
      console.log(`\n💰 Latest Values:`);
      console.log(`   Latest PR (${latestPR.reportNumber}): $${prRecognized.toLocaleString()}`);
      console.log(`   Latest Forecast (${latestForecast.forecastPeriod}): $${forecastEarned.toLocaleString()}`);
      
      if (Math.abs(prRecognized - forecastEarned) > 1) {
        console.log(`   ⚠️  MISMATCH: $${Math.abs(prRecognized - forecastEarned).toLocaleString()} difference`);
      } else {
        console.log(`   ✅ Values match`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Check complete');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkAlignment();

