#!/usr/bin/env node

/**
 * Seed Field Progress Reports
 * Generates 5 months of progress report data for each job
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const ProgressReport = require('../src/server/models/ProgressReport');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or MONGODB_DEV_URI not set');
  process.exit(1);
}

async function seedFieldProgressReports() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all jobs
    const jobs = await Job.find({}).populate('projectId');
    console.log(`📋 Found ${jobs.length} jobs`);

    if (jobs.length === 0) {
      console.log('⚠️  No jobs found. Please create jobs first.');
      await mongoose.connection.close();
      return;
    }

    for (const job of jobs) {
      console.log(`\n📊 Processing job: ${job.name} (${job.jobNumber})`);

      // Get SOV line items for this job
      const sovItems = await ScheduleOfValues.find({ jobId: job._id })
        .populate(['areaId', 'systemId'])
        .sort({ sortOrder: 1, lineNumber: 1 });

      if (sovItems.length === 0) {
        console.log(`  ⚠️  No SOV items found for job ${job.jobNumber}, skipping...`);
        continue;
      }

      console.log(`  📝 Found ${sovItems.length} SOV line items`);

      // Group SOV items by Area and System
      const lineItemsMap = new Map();
      
      sovItems.forEach(sov => {
        const areaName = sov.areaId?.name || 'Unknown Area';
        const systemName = sov.systemId?.name || 'Unknown System';
        const key = `${areaName}-${systemName}`;

        if (!lineItemsMap.has(key)) {
          lineItemsMap.set(key, {
            scheduleOfValuesId: sov._id,
            areaId: sov.areaId?._id,
            areaName,
            systemId: sov.systemId?._id,
            systemName,
            description: sov.description || '',
            assignedCost: sov.totalValue || 0
          });
        } else {
          // Aggregate costs for same area/system combination
          const existing = lineItemsMap.get(key);
          existing.assignedCost += sov.totalValue || 0;
        }
      });

      const baseLineItems = Array.from(lineItemsMap.values());
      console.log(`  📦 Grouped into ${baseLineItems.length} area/system combinations`);

      // Delete existing progress reports for this job
      await ProgressReport.deleteMany({ jobId: job._id });
      console.log(`  🗑️  Cleared existing progress reports`);

      // Generate 5 months of progress reports
      const startDate = new Date(job.startDate || new Date());
      startDate.setDate(1); // First day of month
      
      const reports = [];
      let previousReport = null;

      for (let month = 0; month < 5; month++) {
        const reportDate = new Date(startDate);
        reportDate.setMonth(startDate.getMonth() + month);
        
        const reportPeriodStart = new Date(reportDate);
        reportPeriodStart.setDate(1);
        const reportPeriodEnd = new Date(reportDate);
        reportPeriodEnd.setMonth(reportPeriodEnd.getMonth() + 1);
        reportPeriodEnd.setDate(0); // Last day of month

        const reportNumber = `PR-${String(month + 1).padStart(2, '0')}`;
        
        // Calculate progress percentages based on month
        // Month 1: 0-20%, Month 2: 20-50%, Month 3: 50-75%, Month 4: 75-95%, Month 5: 95-100%
        const progressRanges = [
          { min: 0, max: 20 },
          { min: 20, max: 50 },
          { min: 50, max: 75 },
          { min: 75, max: 95 },
          { min: 95, max: 100 }
        ];
        
        const range = progressRanges[month];
        const baseProgress = range.min + (range.max - range.min) * Math.random();

        // Create line items with progressive completion
        const lineItems = baseLineItems.map((baseItem, index) => {
          // Vary progress slightly between items
          const itemProgress = Math.min(100, Math.max(0, baseProgress + (Math.random() - 0.5) * 10));
          
          // Get previous complete from previous report
          let previousComplete = { amount: 0, percent: 0 };
          if (previousReport) {
            const prevItem = previousReport.lineItems.find(
              li => li.areaName === baseItem.areaName && li.systemName === baseItem.systemName
            );
            if (prevItem) {
              previousComplete = {
                amount: prevItem.approvedCTD?.amount || 0,
                percent: prevItem.approvedCTD?.percent || 0
              };
            }
          }

          const approvedCTDAmount = (baseItem.assignedCost * itemProgress) / 100;
          const approvedCTDPercent = itemProgress;
          
          // Calculate holdback and due this period
          const amountThisPeriod = approvedCTDAmount - previousComplete.amount;
          const holdbackPercent = 10;
          const holdbackThisPeriod = Math.max(0, (amountThisPeriod * holdbackPercent) / 100);
          const dueThisPeriod = Math.max(0, amountThisPeriod - holdbackThisPeriod);

          return {
            ...baseItem,
            submittedCTD: {
              amount: approvedCTDAmount * 0.95, // Submitted slightly less than approved
              percent: approvedCTDPercent * 0.95
            },
            approvedCTD: {
              amount: approvedCTDAmount,
              percent: approvedCTDPercent
            },
            previousComplete: previousComplete,
            holdbackThisPeriod: holdbackThisPeriod,
            holdbackPercent: holdbackPercent,
            dueThisPeriod: dueThisPeriod
          };
        });

        // Determine status - earlier months are approved/invoiced, later ones are draft
        let status = 'draft';
        let invoiceId = null;
        if (month < 3) {
          status = 'invoiced';
          invoiceId = `24-${job.jobNumber.split('-')[2] || '0000'}-03-INV-${String(month + 1).padStart(2, '0')}`;
        } else if (month === 3) {
          status = 'approved';
        }

        const progressReport = new ProgressReport({
          reportNumber,
          reportDate,
          reportPeriodStart,
          reportPeriodEnd,
          jobId: job._id,
          projectId: job.projectId._id || job.projectId,
          completedByName: 'Andrew Martin',
          lineItems,
          status,
          invoiceId,
          invoiceGenerated: month < 3
        });

        await progressReport.save();
        reports.push(progressReport);
        previousReport = progressReport;

        console.log(`  ✅ Created ${reportNumber} - ${reportDate.toISOString().split('T')[0]} (${status}, ${progressReport.summary.calculatedPercentCTD.toFixed(2)}% complete)`);
      }

      console.log(`  🎉 Generated ${reports.length} progress reports for ${job.name}`);
    }

    console.log('\n✅ Field progress reports seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

seedFieldProgressReports();

