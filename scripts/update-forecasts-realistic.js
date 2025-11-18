#!/usr/bin/env node

/**
 * Update existing Cost to Complete forecasts with realistic values
 * Recalculates forecasts using CPI-based logic
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const Job = require('../src/server/models/Job');
const ProgressReport = require('../src/server/models/ProgressReport');
const CostToCompleteForecast = require('../src/server/models/CostToCompleteForecast');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const APRegister = require('../src/server/models/APRegister');
const Area = require('../src/server/models/Area');
const System = require('../src/server/models/System');
const Phase = require('../src/server/models/Phase');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

const JOB_NUMBERS = [
  'JOB-2025-INS-001',
  'JOB-2025-MECH-001',
  'JOB-2025-ELEC-001'
];

// Helper function to generate realistic forecast data
async function generateRealisticForecastData(jobId, progressReport) {
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
    const key = prItem.scheduleOfValuesId?.toString();
    if (key) {
      progressReportLineItems.set(key, prItem);
    }
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
    let forecastedFinalCost = sovItem.totalCost; // Default to budget
    
    if (approvedCTD > 0 && costToDate > 0 && approvedCTDAmount > 0) {
      // Calculate CPI for this line item
      const lineItemCPI = approvedCTDAmount / costToDate;
      
      // Calculate remaining work
      const remainingCostAtBudget = sovItem.totalCost - (sovItem.totalCost * (approvedCTD / 100));
      
      if (lineItemCPI > 0) {
        // Realistic forecast: cost to date + remaining work adjusted by performance
        forecastedFinalCost = costToDate + (remainingCostAtBudget / lineItemCPI);
      } else {
        // Fallback: extrapolate from current rate
        forecastedFinalCost = costToDate / (approvedCTD / 100);
      }
      
      // CRITICAL: Ensure forecast is ALWAYS at least cost to date (can't forecast less than already spent)
      forecastedFinalCost = Math.max(forecastedFinalCost, costToDate * 1.05); // Add 5% buffer minimum
      
      // If we're already over budget, adjust forecast upward
      if (costToDate > sovItem.totalCost) {
        const overrunPercent = (costToDate / sovItem.totalCost) - 1;
        const remainingCostAtBudget = sovItem.totalCost - (sovItem.totalCost * (approvedCTD / 100));
        forecastedFinalCost = costToDate + (remainingCostAtBudget * (1 + overrunPercent));
      }
      
      // Cap forecast at reasonable overrun (max 200% of budget for very troubled projects)
      const maxForecast = sovItem.totalCost * 2.0;
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

async function updateForecastsForJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    for (const jobNumber of JOB_NUMBERS) {
      console.log(`\n📊 Processing ${jobNumber}...`);
      
      const job = await Job.findOne({ jobNumber });
      if (!job) {
        console.log(`  ⚠️  Job not found: ${jobNumber}`);
        continue;
      }

      // Get all existing forecasts
      const forecasts = await CostToCompleteForecast.find({
        jobId: job._id,
        status: { $ne: 'archived' }
      }).sort({ monthNumber: 1 });

      console.log(`  Found ${forecasts.length} existing forecasts`);

      if (forecasts.length === 0) {
        console.log(`  ⚠️  No forecasts found for ${jobNumber}`);
        continue;
      }

      // Update each forecast
      for (const forecast of forecasts) {
        try {
          // Get the progress report for this forecast
          const progressReport = await ProgressReport.findById(forecast.progressReportId);
          
          if (!progressReport) {
            console.log(`  ⚠️  Progress report not found for ${forecast.forecastPeriod}`);
            continue;
          }

          // Generate new forecast data with realistic values
          const forecastData = await generateRealisticForecastData(job._id, progressReport);

          // Update the forecast
          forecast.lineItems = forecastData.lineItems;
          forecast.summary = forecastData.summary;
          await forecast.save();

          console.log(`  ✅ Updated forecast for ${forecast.forecastPeriod}`);
          console.log(`     Old Forecast Final Cost: $${forecast.summary.forecastFinalCost?.toLocaleString() || 'N/A'}`);
          console.log(`     New Forecast Final Cost: $${forecastData.summary.forecastFinalCost.toLocaleString()}`);
          console.log(`     Cost to Date: $${forecastData.summary.costToDate.toLocaleString()}`);
          console.log(`     CPI: ${forecastData.summary.cpi.toFixed(3)}`);
        } catch (error) {
          console.error(`  ❌ Error updating forecast for ${forecast.forecastPeriod}:`, error.message);
        }
      }
    }

    console.log('\n✅ Forecast update complete!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error updating forecasts:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateForecastsForJobs();

