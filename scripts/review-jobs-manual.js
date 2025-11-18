#!/usr/bin/env node

/**
 * Manual review script to check all three jobs for issues
 * Uses direct database queries and API calls
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const Job = require('../src/server/models/Job');
const ProgressReport = require('../src/server/models/ProgressReport');
const CostToCompleteForecast = require('../src/server/models/CostToCompleteForecast');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const APRegister = require('../src/server/models/APRegister');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

const JOB_NUMBERS = [
  'JOB-2025-INS-001',
  'JOB-2025-MECH-001',
  'JOB-2025-ELEC-001'
];

async function reviewJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const issues = [];
    const jobIds = {};

    // Get job IDs
    for (const jobNumber of JOB_NUMBERS) {
      const job = await Job.findOne({ jobNumber });
      if (job) {
        jobIds[jobNumber] = job._id;
        console.log(`Found ${jobNumber}: ${job._id}`);
      } else {
        issues.push(`❌ Missing job: ${jobNumber}`);
      }
    }

    console.log('\n=== REVIEWING JOBS ===\n');

    for (const [jobNumber, jobId] of Object.entries(jobIds)) {
      console.log(`\n📋 Reviewing ${jobNumber}...`);
      
      // Check Progress Reports
      const progressReports = await ProgressReport.find({ jobId, status: 'approved' }).sort({ reportDate: 1 });
      console.log(`  Progress Reports: ${progressReports.length}`);
      if (progressReports.length === 0) {
        issues.push(`${jobNumber}: No progress reports found`);
      }

      // Check Cost to Complete Forecasts
      const forecasts = await CostToCompleteForecast.find({ 
        jobId, 
        status: { $ne: 'archived' } 
      }).sort({ monthNumber: 1 });
      console.log(`  Cost to Complete Forecasts: ${forecasts.length}`);
      
      if (forecasts.length === 0) {
        issues.push(`${jobNumber}: No cost to complete forecasts found`);
      } else {
        // Check if forecasts have summary data
        forecasts.forEach(forecast => {
          if (!forecast.summary?.forecastFinalCost && forecast.summary?.forecastFinalCost !== 0) {
            issues.push(`${jobNumber}: Forecast ${forecast.forecastPeriod} missing forecastFinalCost in summary`);
          }
          // Check if forecast is linked to progress report
          if (progressReports.length > 0 && !forecast.progressReportId) {
            // Try to match by date
            const matchingReport = progressReports.find(pr => {
              if (!forecast.progressReportDate) return false;
              const forecastDate = new Date(forecast.progressReportDate);
              const reportDate = new Date(pr.reportDate);
              return forecastDate.getFullYear() === reportDate.getFullYear() &&
                     forecastDate.getMonth() === reportDate.getMonth();
            });
            if (!matchingReport) {
              issues.push(`${jobNumber}: Forecast ${forecast.forecastPeriod} not linked to progress report`);
            }
          }
        });
      }

      // Check Timelog Register
      const timelogEntries = await TimelogRegister.find({ jobId, status: 'approved' });
      console.log(`  Timelog Register Entries: ${timelogEntries.length}`);
      if (timelogEntries.length === 0) {
        issues.push(`${jobNumber}: No timelog register entries found`);
      }

      // Check AP Register
      const apEntries = await APRegister.find({ jobId });
      console.log(`  AP Register Entries: ${apEntries.length}`);
      if (apEntries.length === 0) {
        issues.push(`${jobNumber}: No AP register entries found`);
      }

      // Check SOV Line Items
      const sovItems = await ScheduleOfValues.find({ jobId });
      console.log(`  SOV Line Items: ${sovItems.length}`);
      if (sovItems.length === 0) {
        issues.push(`${jobNumber}: No SOV line items found`);
      }

      // Check forecast linkage to progress reports
      if (progressReports.length > 0 && forecasts.length > 0) {
        progressReports.forEach((pr, index) => {
          const matchingForecast = forecasts.find(f => {
            if (f.progressReportId && f.progressReportId.toString() === pr._id.toString()) {
              return true;
            }
            if (f.progressReportDate && pr.reportDate) {
              const forecastDate = new Date(f.progressReportDate);
              const reportDate = new Date(pr.reportDate);
              return forecastDate.getFullYear() === reportDate.getFullYear() &&
                     forecastDate.getMonth() === reportDate.getMonth();
            }
            return false;
          });
          
          if (!matchingForecast) {
            issues.push(`${jobNumber}: Progress Report ${pr.reportNumber} (${pr.reportDate}) has no linked forecast`);
          }
        });
      }
    }

    console.log('\n=== SUMMARY ===\n');
    if (issues.length > 0) {
      console.log('❌ Issues Found:\n');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log(`\nTotal issues: ${issues.length}`);
    } else {
      console.log('✅ No issues found! All jobs have complete data.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error reviewing jobs:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

reviewJobs();




