#!/usr/bin/env node

/**
 * Create Cost to Complete forecasts for all three scenario jobs
 * Generates forecasts from progress reports
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const ProgressReport = require('../src/server/models/ProgressReport');
const CostToCompleteForecast = require('../src/server/models/CostToCompleteForecast');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const APRegister = require('../src/server/models/APRegister');
const User = require('../src/server/models/User');
const Area = require('../src/server/models/Area');
const System = require('../src/server/models/System');
const Phase = require('../src/server/models/Phase');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

const JOB_NUMBERS = [
  'JOB-2025-INS-001',
  'JOB-2025-MECH-001',
  'JOB-2025-ELEC-001'
];

// Helper function to generate cost-to-complete data (simplified version)
async function generateForecastData(jobId, progressReport, monthNumber) {
  const job = await Job.findById(jobId);
  const sovLineItems = await ScheduleOfValues.find({ jobId })
    .populate('areaId')
    .populate('systemId')
    .populate('phaseId')
    .sort({ sortOrder: 1, lineNumber: 1 });

  const costCutoffDate = new Date(progressReport.reportDate);
  costCutoffDate.setHours(23, 59, 59, 999);

  // Get costs up to cutoff date
  const [timelogCosts, apCosts] = await Promise.all([
    TimelogRegister.aggregate([
      {
        $match: {
          jobId: new mongoose.Types.ObjectId(jobId),
          status: 'approved',
          workDate: { $lte: costCutoffDate }
        }
      },
      {
        $group: {
          _id: {
            scheduleOfValuesId: '$scheduleOfValuesId',
            systemId: '$systemId',
            areaId: '$areaId'
          },
          totalCost: { $sum: { $ifNull: ['$totalCostWithBurden', 0] } },
          totalHours: { $sum: { $ifNull: ['$totalHours', 0] } }
        }
      }
    ]),
    APRegister.aggregate([
      {
        $match: {
          jobId: new mongoose.Types.ObjectId(jobId),
          invoiceDate: { $lte: costCutoffDate }
        }
      },
      { $unwind: '$costCodeBreakdown' },
      {
        $group: {
          _id: {
            scheduleOfValuesId: '$costCodeBreakdown.scheduleOfValuesId',
            systemId: '$costCodeBreakdown.systemId',
            areaId: '$costCodeBreakdown.areaId'
          },
          totalCost: { $sum: '$costCodeBreakdown.amount' }
        }
      }
    ])
  ]);

  // Build cost maps
  const timelogCostMap = new Map();
  timelogCosts.forEach(cost => {
    const key = `${cost._id.scheduleOfValuesId}`;
    timelogCostMap.set(key, cost.totalCost || 0);
  });

  const apCostMap = new Map();
  apCosts.forEach(cost => {
    const key = `${cost._id.scheduleOfValuesId}`;
    apCostMap.set(key, (apCostMap.get(key) || 0) + (cost.totalCost || 0));
  });

  // Build line items from SOV and progress report
  const lineItems = [];
  const progressReportLineItems = new Map();
  
  progressReport.lineItems.forEach(prItem => {
    const key = prItem.scheduleOfValuesId.toString();
    progressReportLineItems.set(key, prItem);
  });

  for (const sovItem of sovLineItems) {
    const sovKey = sovItem._id.toString();
    const prItem = progressReportLineItems.get(sovKey);
    
    const timelogCost = timelogCostMap.get(sovKey) || 0;
    const apCost = apCostMap.get(sovKey) || 0;
    const costToDate = timelogCost + apCost;
    
    const approvedCTD = prItem?.approvedCTD?.percent || 0;
    const approvedCTDAmount = prItem?.approvedCTD?.amount || 0;
    
    // Calculate realistic forecast based on actual costs and progress
    // Use CPI (Cost Performance Index) to forecast remaining work
    let forecastedFinalCost = sovItem.totalCost; // Default to budget
    
    if (approvedCTD > 0 && costToDate > 0 && approvedCTDAmount > 0) {
      // Calculate CPI for this line item
      const lineItemCPI = approvedCTDAmount / costToDate;
      
      // Calculate remaining work
      const remainingValue = sovItem.totalValue - approvedCTDAmount;
      const remainingCostAtBudget = sovItem.totalCost - (sovItem.totalCost * (approvedCTD / 100));
      
      if (lineItemCPI > 0) {
        // Realistic forecast: cost to date + remaining work adjusted by performance
        forecastedFinalCost = costToDate + (remainingCostAtBudget / lineItemCPI);
      } else {
        // Fallback: extrapolate from current rate
        forecastedFinalCost = costToDate / (approvedCTD / 100);
      }
      
      // Ensure forecast is at least cost to date
      forecastedFinalCost = Math.max(forecastedFinalCost, costToDate);
      
      // Cap forecast at reasonable overrun (max 150% of budget for realism)
      const maxForecast = sovItem.totalCost * 1.5;
      forecastedFinalCost = Math.min(forecastedFinalCost, maxForecast);
    }
    
    const forecastedFinalValue = sovItem.totalValue;
    const fee = forecastedFinalValue - forecastedFinalCost;
    const feePercent = forecastedFinalValue > 0 ? (fee / forecastedFinalValue) * 100 : 0;

    lineItems.push({
      jobCode: sovItem.costCodeNumber || '',
      area: sovItem.areaId?.name || '',
      system: sovItem.systemId?.name || '',
      areaId: sovItem.areaId?._id,
      systemId: sovItem.systemId?._id,
      totalCost: sovItem.totalCost,
      totalValue: sovItem.totalValue,
      costThisPeriod: prItem ? (approvedCTDAmount - (prItem.previousComplete?.amount || 0)) : 0,
      costToDate: costToDate,
      laborCostToDate: timelogCost,
      apCostToDate: apCost,
      approvedCTD: approvedCTD,
      approvedCTDAmount: approvedCTDAmount,
      earnedThisPeriod: prItem ? (approvedCTDAmount - (prItem.previousComplete?.amount || 0)) : 0,
      earnedToDate: approvedCTDAmount,
      fee: fee,
      feePercent: feePercent,
      forecastedFinalCost: forecastedFinalCost,
      forecastedFinalValue: forecastedFinalValue
    });
  }

  // Calculate summary
  const totalBudget = lineItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalValue = lineItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  const costToDate = lineItems.reduce((sum, item) => sum + (item.costToDate || 0), 0);
  const earnedToDate = lineItems.reduce((sum, item) => sum + (item.earnedToDate || 0), 0);
  const forecastFinalCost = lineItems.reduce((sum, item) => sum + (item.forecastedFinalCost || 0), 0);
  const forecastFinalValue = lineItems.reduce((sum, item) => sum + (item.forecastedFinalValue || 0), 0);
  
  const forecastVariance = forecastFinalCost - totalBudget;
  const forecastVariancePercent = totalBudget > 0 ? (forecastVariance / totalBudget) * 100 : 0;
  const marginAtCompletion = forecastFinalValue - forecastFinalCost;
  const marginAtCompletionPercent = forecastFinalValue > 0 ? (marginAtCompletion / forecastFinalValue) * 100 : 0;
  
  const cpi = earnedToDate > 0 ? earnedToDate / costToDate : 0;
  const linesOverBudget = lineItems.filter(item => item.forecastedFinalCost > item.totalCost).length;
  const linesWithNegativeFee = lineItems.filter(item => item.fee < 0).length;

  const summary = {
    contractTotalValue: totalValue,
    totalBudget: totalBudget,
    costThisPeriod: lineItems.reduce((sum, item) => sum + (item.costThisPeriod || 0), 0),
    costToDate: costToDate,
    earnedThisPeriod: lineItems.reduce((sum, item) => sum + (item.earnedThisPeriod || 0), 0),
    earnedToDate: earnedToDate,
    periodFee: earnedToDate - costToDate,
    periodFeePercent: earnedToDate > 0 ? ((earnedToDate - costToDate) / earnedToDate) * 100 : 0,
    forecastFinalCost: forecastFinalCost,
    forecastFinalValue: forecastFinalValue,
    forecastVariance: forecastVariance,
    forecastVariancePercent: forecastVariancePercent,
    marginAtCompletion: marginAtCompletion,
    marginAtCompletionPercent: marginAtCompletionPercent,
    cpi: cpi,
    linesOverBudget: linesOverBudget,
    linesWithNegativeFee: linesWithNegativeFee,
    insights: linesOverBudget > 0 ? `${linesOverBudget} line items over budget` : 'All line items within budget'
  };

  return {
    lineItems,
    summary
  };
}

async function createForecastsForJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ role: 'project_manager' }) || await User.findOne();
    if (!user) {
      throw new Error('No user found to create forecasts');
    }

    for (const jobNumber of JOB_NUMBERS) {
      console.log(`\n📊 Processing ${jobNumber}...`);
      
      const job = await Job.findOne({ jobNumber });
      if (!job) {
        console.log(`  ⚠️  Job not found: ${jobNumber}`);
        continue;
      }

      // Get all approved progress reports
      const progressReports = await ProgressReport.find({
        jobId: job._id,
        status: 'approved'
      }).sort({ reportDate: 1 });

      console.log(`  Found ${progressReports.length} progress reports`);

      if (progressReports.length === 0) {
        console.log(`  ⚠️  No progress reports found for ${jobNumber}`);
        continue;
      }

      // Check existing forecasts
      const existingForecasts = await CostToCompleteForecast.find({
        jobId: job._id,
        status: { $ne: 'archived' }
      });

      console.log(`  Found ${existingForecasts.length} existing forecasts`);

      // Create forecasts for each progress report
      for (let i = 0; i < progressReports.length; i++) {
        const progressReport = progressReports[i];
        const monthNumber = i + 1;
        const forecastPeriod = `Month ${monthNumber}`;

        // Check if forecast already exists for this progress report
        const existingForecast = existingForecasts.find(f => 
          f.progressReportId && f.progressReportId.toString() === progressReport._id.toString()
        );

        if (existingForecast) {
          console.log(`  ✓ Forecast already exists for ${forecastPeriod} (${progressReport.reportNumber})`);
          continue;
        }

        try {
          // Generate forecast data
          const forecastData = await generateForecastData(job._id, progressReport, monthNumber);

          // Create forecast
          const forecast = await CostToCompleteForecast.create({
            jobId: job._id,
            projectId: job.projectId,
            forecastPeriod: forecastPeriod,
            monthNumber: monthNumber,
            progressReportId: progressReport._id,
            progressReportNumber: progressReport.reportNumber,
            progressReportDate: progressReport.reportDate,
            lineItems: forecastData.lineItems,
            summary: forecastData.summary,
            status: 'submitted',
            createdBy: user._id,
            submittedBy: user._id,
            submittedAt: new Date()
          });

          console.log(`  ✅ Created forecast for ${forecastPeriod} (${progressReport.reportNumber})`);
          console.log(`     Forecast Final Cost: $${forecastData.summary.forecastFinalCost.toLocaleString()}`);
          console.log(`     Forecast Final Value: $${forecastData.summary.forecastFinalValue.toLocaleString()}`);
          console.log(`     Margin: $${forecastData.summary.marginAtCompletion.toLocaleString()} (${forecastData.summary.marginAtCompletionPercent.toFixed(2)}%)`);
        } catch (error) {
          console.error(`  ❌ Error creating forecast for ${forecastPeriod}:`, error.message);
        }
      }
    }

    console.log('\n✅ Forecast creation complete!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error creating forecasts:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createForecastsForJobs();

