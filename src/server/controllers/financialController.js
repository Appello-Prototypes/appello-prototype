const mongoose = require('mongoose');
const APRegister = require('../models/APRegister');
const TimelogRegister = require('../models/TimelogRegister');
const ProgressReport = require('../models/ProgressReport');
const ScheduleOfValues = require('../models/ScheduleOfValues');
const TimeEntry = require('../models/TimeEntry');
const CostToCompleteForecast = require('../models/CostToCompleteForecast');
const Job = require('../models/Job');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Helper function to generate cost-to-complete report data (reusable)
const generateCostToCompleteData = async (jobId, forecastPeriod) => {
  // Get job and SOV line items
  const [job, sovLineItems] = await Promise.all([
    Job.findById(jobId).populate('projectId'),
    ScheduleOfValues.find({ jobId }).populate(['areaId', 'systemId', 'phaseId']).sort({ sortOrder: 1, lineNumber: 1 })
  ]);

  if (!job) {
    throw new Error('Job not found');
  }

  // Determine forecast period
  const period = forecastPeriod || `Month 1`;
  const monthNumber = parseInt(period.replace('Month ', '')) || 1;

  // Calculate job duration in months
  const jobStart = new Date(job.startDate);
  const jobEnd = new Date(job.endDate);
  const jobDurationMonths = Math.ceil(
    (jobEnd - jobStart) / (1000 * 60 * 60 * 24 * 30.44)
  );

  // Validate monthNumber
  if (monthNumber < 1 || monthNumber > jobDurationMonths) {
    throw new Error(`Invalid forecast period. Job duration is ${jobDurationMonths} months.`);
  }

  // Calculate the target month date range
  const targetMonthStart = new Date(jobStart);
  targetMonthStart.setMonth(targetMonthStart.getMonth() + (monthNumber - 1));
  targetMonthStart.setDate(1);
  const targetMonthEnd = new Date(targetMonthStart);
  targetMonthEnd.setMonth(targetMonthEnd.getMonth() + 1);
  targetMonthEnd.setDate(0);

  // Find the progress report for this period
  const progressReport = await ProgressReport.findOne({
    jobId,
    reportDate: {
      $gte: targetMonthStart,
      $lte: targetMonthEnd
    },
    status: 'approved'
  })
    .populate({
      path: 'lineItems.scheduleOfValuesId',
      populate: ['areaId', 'systemId', 'phaseId']
    })
    .sort({ reportDate: -1 });

  if (!progressReport) {
    return {
      lineItems: [],
      summary: {},
      progressReport: null,
      forecastPeriod: period,
      currentMonth: monthNumber
    };
  }

  // Cost cutoff date
  const costCutoffDate = new Date(progressReport.reportDate);
  costCutoffDate.setHours(23, 59, 59, 999);

  // Get costs up to cutoff date
  // First, get ALL costs (for total costToDate calculation)
  const [allTimelogCosts, allAPCosts, timelogCosts, apCosts] = await Promise.all([
    // Get ALL timelog costs (for total costToDate)
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
          _id: null,
          totalCost: { $sum: { $ifNull: ['$totalCostWithBurden', '$totalCost', 0] } }
        }
      }
    ]),
    // Get ALL AP costs (for total costToDate)
    APRegister.aggregate([
      {
        $match: {
          jobId: new mongoose.Types.ObjectId(jobId),
          invoiceDate: { $lte: costCutoffDate }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]),
    // Get timelog costs grouped by SOV (for line item calculations)
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
          totalHours: { $sum: { $ifNull: ['$totalHours', 0] } },
          entries: { $sum: 1 }
        }
      }
    ]),
    // Get AP costs grouped by SOV (for line item calculations)
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
          totalCost: { $sum: '$costCodeBreakdown.amount' },
          invoiceCount: { $sum: 1 }
        }
      }
    ])
  ]);

  // Build cost maps
  const timelogCostMap = new Map();
  timelogCosts.forEach(cost => {
    const key = `${cost._id.scheduleOfValuesId}-${cost._id.areaId}-${cost._id.systemId}`;
    timelogCostMap.set(key, cost);
  });

  const apCostMap = new Map();
  apCosts.forEach(cost => {
    const key = `${cost._id.scheduleOfValuesId}-${cost._id.areaId}-${cost._id.systemId}`;
    apCostMap.set(key, cost);
  });

  // Group SOV items by area/system
  const lineItemsMap = new Map();
  sovLineItems.forEach(sov => {
    const areaName = sov.areaId?.name || 'Unknown';
    const systemName = sov.systemId?.name || 'Unknown';
    const key = `${areaName}-${systemName}`;
    
    if (!lineItemsMap.has(key)) {
      lineItemsMap.set(key, {
        jobCode: sov.costCodeNumber || sov.lineNumber,
        area: areaName,
        system: systemName,
        totalCost: 0,
        totalValue: 0,
        sovItems: []
      });
    }
    
    const item = lineItemsMap.get(key);
    item.totalCost += sov.totalCost || 0;
    item.totalValue += sov.totalValue || 0;
    item.sovItems.push(sov);
  });

  // Calculate total costToDate from ALL costs (not just those matching progress report line items)
  const timelogCost = allTimelogCosts.length > 0 ? allTimelogCosts[0].totalCost : 0;
  const apCost = allAPCosts.length > 0 ? allAPCosts[0].totalAmount : 0;
  const totalCostToDate = timelogCost + apCost;

  // Build line items
  const lineItems = [];
  let totalEarnedToDate = 0;
  let totalEarnedThisPeriod = 0;
  let totalCostThisPeriod = 0;
  let linesOverBudget = 0;
  let linesWithNegativeFee = 0;
  let maxOverrun = 0;

  for (const [key, item] of lineItemsMap) {
    const progressLineItem = progressReport.lineItems.find(
      li => li.areaName === item.area && li.systemName === item.system
    );

    if (!progressLineItem) continue;

    // Calculate costs
    let laborCostToDate = 0;
    let apCostToDate = 0;
    item.sovItems.forEach(sov => {
      const sovId = sov._id.toString();
      const timelogCost = Array.from(timelogCostMap.values()).find(c => 
        c._id.scheduleOfValuesId?.toString() === sovId
      );
      const apCost = Array.from(apCostMap.values()).find(c => 
        c._id.scheduleOfValuesId?.toString() === sovId
      );
      
      if (timelogCost) laborCostToDate += timelogCost.totalCost || 0;
      if (apCost) apCostToDate += apCost.totalCost || 0;
    });

    const itemTotalCostToDate = laborCostToDate + apCostToDate;
    const approvedCTDPercent = progressLineItem.approvedCTD?.percent || 0;
    const approvedCTDAmount = progressLineItem.approvedCTD?.amount || 0;
    const previousCompleteAmount = progressLineItem.previousComplete?.amount || 0;
    
    const earnedThisPeriod = Math.max(0, approvedCTDAmount - previousCompleteAmount);
    const earnedToDate = approvedCTDAmount;
    const costThisPeriod = itemTotalCostToDate - previousCompleteAmount;
    const fee = earnedThisPeriod - costThisPeriod;
    const feePercent = earnedThisPeriod > 0 ? (fee / earnedThisPeriod) * 100 : 0;

    // Calculate realistic forecast based on actual costs and progress
    // If we have progress, extrapolate from current cost performance
    // Otherwise use budget as baseline
    let forecastedFinalCost = item.totalCost; // Default to budget
    if (approvedCTDPercent > 0 && itemTotalCostToDate > 0) {
      // Calculate CPI (Cost Performance Index) for this line item
      const lineItemCPI = earnedToDate > 0 ? earnedToDate / itemTotalCostToDate : 1;
      
      // Forecast using CPI: if CPI < 1, we're over budget; if CPI > 1, we're under budget
      // Forecast = Cost to Date + (Remaining Work / CPI)
      const remainingValue = item.totalValue - earnedToDate;
      const remainingCostAtBudget = item.totalCost - (item.totalCost * (approvedCTDPercent / 100));
      
      if (lineItemCPI > 0) {
        // Realistic forecast: cost to date + remaining work adjusted by performance
        forecastedFinalCost = itemTotalCostToDate + (remainingCostAtBudget / lineItemCPI);
      } else {
        // Fallback: extrapolate from current rate
        forecastedFinalCost = itemTotalCostToDate / (approvedCTDPercent / 100);
      }
      
      // CRITICAL: Ensure forecast is ALWAYS at least cost to date (can't forecast less than already spent)
      forecastedFinalCost = Math.max(forecastedFinalCost, itemTotalCostToDate * 1.05); // Add 5% buffer minimum
      
      // If we're already over budget, adjust forecast upward
      if (itemTotalCostToDate > item.totalCost) {
        const overrunPercent = (itemTotalCostToDate / item.totalCost) - 1;
        const remainingCostAtBudget = item.totalCost - (item.totalCost * (approvedCTDPercent / 100));
        forecastedFinalCost = itemTotalCostToDate + (remainingCostAtBudget * (1 + overrunPercent));
      }
      
      // Cap forecast at reasonable overrun (max 200% of budget for very troubled projects)
      const maxForecast = item.totalCost * 2.0;
      forecastedFinalCost = Math.min(forecastedFinalCost, maxForecast);
    }
    
    const forecastedFinalValue = item.totalValue;

    if (forecastedFinalCost > item.totalCost) {
      linesOverBudget++;
      const overrun = forecastedFinalCost - item.totalCost;
      if (overrun > maxOverrun) maxOverrun = overrun;
    }

    if (fee < 0) {
      linesWithNegativeFee++;
    }

    lineItems.push({
      jobCode: item.jobCode,
      area: item.area,
      system: item.system,
      totalCost: item.totalCost,
      totalValue: item.totalValue,
      costThisPeriod,
      costToDate: itemTotalCostToDate,
      laborCostToDate,
      apCostToDate,
      approvedCTD: approvedCTDPercent,
      approvedCTDAmount,
      earnedThisPeriod,
      earnedToDate,
      fee,
      feePercent,
      forecastedFinalCost,
      forecastedFinalValue
    });

    // Note: totalCostToDate is now calculated from ALL costs above, not summed here
    totalEarnedToDate += earnedToDate;
    totalEarnedThisPeriod += earnedThisPeriod;
    totalCostThisPeriod += costThisPeriod;
  }

  // Calculate summary
  const contractTotalValue = lineItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  const totalBudget = lineItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const forecastFinalCost = lineItems.reduce((sum, item) => sum + (item.forecastedFinalCost || item.totalCost || 0), 0);
  const forecastFinalValue = lineItems.reduce((sum, item) => sum + (item.forecastedFinalValue || item.totalValue || 0), 0);
  const forecastVariance = forecastFinalCost - totalBudget;
  const forecastVariancePercent = totalBudget > 0 ? (forecastVariance / totalBudget) * 100 : 0;
  const marginAtCompletion = forecastFinalValue - forecastFinalCost;
  const marginAtCompletionPercent = forecastFinalValue > 0 ? (marginAtCompletion / forecastFinalValue) * 100 : 0;
  const cpi = totalCostToDate > 0 ? totalEarnedToDate / totalCostToDate : 0;
  const periodFee = totalEarnedThisPeriod - totalCostThisPeriod;
  const periodFeePercent = totalEarnedThisPeriod > 0 ? (periodFee / totalEarnedThisPeriod) * 100 : 0;

  const insights = [];
  if (linesOverBudget > 0) {
    insights.push(`${linesOverBudget} line(s) forecasted over budget`);
  }
  if (linesWithNegativeFee > 0) {
    insights.push(`${linesWithNegativeFee} line(s) produced negative fee this period`);
  }
  if (progressReport) {
    insights.push(`Based on Progress Report ${progressReport.reportNumber} dated ${new Date(progressReport.reportDate).toLocaleDateString()}`);
  }

  return {
    lineItems,
    summary: {
      contractTotalValue,
      totalBudget,
      costThisPeriod: totalCostThisPeriod,
      costToDate: totalCostToDate,
      earnedThisPeriod: totalEarnedThisPeriod,
      earnedToDate: totalEarnedToDate,
      periodFee,
      periodFeePercent,
      forecastFinalCost,
      forecastFinalValue,
      forecastVariance,
      forecastVariancePercent,
      marginAtCompletion,
      marginAtCompletionPercent,
      cpi,
      linesOverBudget,
      linesWithNegativeFee,
      insights: insights.join('. ')
    },
    progressReport: {
      id: progressReport._id,
      _id: progressReport._id,
      reportNumber: progressReport.reportNumber,
      reportDate: progressReport.reportDate,
      reportPeriodStart: progressReport.reportPeriodStart,
      reportPeriodEnd: progressReport.reportPeriodEnd,
      calculatedPercentCTD: progressReport.summary?.calculatedPercentCTD || 0
    },
    forecastPeriod: period,
    currentMonth: monthNumber
  };
};

const financialController = {
  // GET /api/financial/:jobId/ap-register
  getAPRegister: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { startDate, endDate, vendor, costCode, status } = req.query;

      const jobObjectId = mongoose.Types.ObjectId.isValid(jobId) 
        ? new mongoose.Types.ObjectId(jobId) 
        : jobId;

      const filter = { jobId: jobObjectId };
      if (startDate && endDate) {
        filter.invoiceDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      if (vendor) filter['vendor.name'] = { $regex: vendor, $options: 'i' };
      if (status) filter.paymentStatus = status;
      if (costCode) filter['costCodeBreakdown.costCode'] = costCode;

      const apEntries = await APRegister.find(filter)
        .populate(['jobId', 'projectId', 'enteredBy', 'approvedBy'])
        .populate({
          path: 'costCodeBreakdown.scheduleOfValuesId',
          select: 'lineNumber description totalValue costCodeNumber costCodeName'
        })
        .sort({ invoiceDate: -1 })
        .maxTimeMS(10000) // 10 second timeout
        .lean(); // Use lean() for faster queries

      // Enrich cost code breakdown with names from SOV
      // First, get all SOV items for this job to create a lookup map
      const sovItems = await ScheduleOfValues.find({ jobId: jobObjectId })
        .select('costCodeNumber costCodeName')
        .lean();
      const sovMap = {};
      sovItems.forEach(item => {
        if (item.costCodeNumber) {
          sovMap[item.costCodeNumber] = item.costCodeName || '';
        }
      });
      // Enrich AP entries with cost code names
      for (const entry of apEntries) {
        for (const breakdown of entry.costCodeBreakdown) {
          // Try lookup by cost code number first (most reliable)
          if (breakdown.costCode && sovMap[breakdown.costCode]) {
            breakdown.costCodeName = sovMap[breakdown.costCode];
          } else if (breakdown.scheduleOfValuesId) {
            // Check populated SOV
            if (breakdown.scheduleOfValuesId.costCodeName) {
              breakdown.costCodeName = breakdown.scheduleOfValuesId.costCodeName;
            } else if (breakdown.scheduleOfValuesId._id) {
              // If we have the ID but not the name, look it up
              const sovItem = sovItems.find(item => 
                item._id.toString() === breakdown.scheduleOfValuesId._id.toString()
              );
              if (sovItem) {
                breakdown.costCodeName = sovItem.costCodeName || '';
              }
            }
          }
        }
      }

      // Calculate summary with timeout and enrich with cost code names
      const summary = await APRegister.aggregate([
        { $match: { jobId: jobObjectId } },
        { $unwind: '$costCodeBreakdown' },
        {
          $group: {
            _id: '$costCodeBreakdown.costCode',
            totalAmount: { $sum: '$costCodeBreakdown.amount' },
            invoiceCount: { $sum: 1 },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$costCodeBreakdown.amount', 0]
              }
            }
          }
        }
      ]).option({ maxTimeMS: 10000 }); // 10 second timeout

      // Enrich summary with cost code names from SOV (using the same map)
      for (const item of summary) {
        if (sovMap[item._id]) {
          item.costCodeName = sovMap[item._id];
        }
      }

      res.json({
        success: true,
        data: apEntries,
        summary,
        meta: {
          total: apEntries.length,
          totalAmount: apEntries.reduce((sum, ap) => sum + ap.totalAmount, 0),
          paidAmount: apEntries.filter(ap => ap.paymentStatus === 'paid').reduce((sum, ap) => sum + ap.totalAmount, 0)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching AP register',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/timelog-register
  getTimelogRegister: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { startDate, endDate, worker, costCode, craft } = req.query;

      const filter = { jobId: new mongoose.Types.ObjectId(jobId) };
      if (startDate && endDate) {
        filter.workDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      if (worker) filter.workerId = worker;
      if (costCode) filter.costCode = costCode;
      if (craft) filter.craft = craft;

      const timelogEntries = await TimelogRegister.find(filter)
        .populate('workerId', 'name initials')
        .populate(['jobId', 'projectId'])
        .populate({
          path: 'scheduleOfValuesId',
          select: 'lineNumber description totalValue costCodeNumber costCodeName'
        })
        .populate('systemId', 'name')
        .populate('areaId', 'name')
        .populate('phaseId', 'name')
        .sort({ workDate: -1 })
        .lean();

      // Get all SOV items for this job to create a lookup map
      const jobObjectId = mongoose.Types.ObjectId.isValid(jobId) 
        ? new mongoose.Types.ObjectId(jobId) 
        : jobId;
      
      const sovItems = await ScheduleOfValues.find({ jobId: jobObjectId })
        .select('costCodeNumber costCodeName')
        .lean();
      const sovMap = {};
      sovItems.forEach(item => {
        if (item.costCodeNumber) {
          sovMap[item.costCodeNumber] = item.costCodeName || '';
        }
      });

      // Enrich timelog entries with cost code names from SOV
      for (const entry of timelogEntries) {
        // Check populated SOV first
        if (entry.scheduleOfValuesId && entry.scheduleOfValuesId.costCodeName) {
          entry.costCodeName = entry.scheduleOfValuesId.costCodeName;
        } else if (entry.scheduleOfValuesId && entry.scheduleOfValuesId._id) {
          // If we have the ID but not the name, look it up
          const sovItem = sovItems.find(item => 
            item._id.toString() === entry.scheduleOfValuesId._id.toString()
          );
          if (sovItem) {
            entry.costCodeName = sovItem.costCodeName || '';
          }
        } else if (entry.costCode && sovMap[entry.costCode]) {
          // Fallback: lookup by cost code number
          entry.costCodeName = sovMap[entry.costCode];
        }
      }

      // Calculate summary by cost code
      const summary = await TimelogRegister.getCostByJob(jobId, startDate, endDate);
      
      // Enrich summary with cost code names from SOV (using the same map)
      for (const item of summary) {
        if (sovMap[item._id]) {
          item.costCodeName = sovMap[item._id];
        }
      }

      res.json({
        success: true,
        data: timelogEntries,
        summary,
        meta: {
          total: timelogEntries.length,
          totalHours: timelogEntries.reduce((sum, entry) => sum + entry.totalHours, 0),
          totalCost: timelogEntries.reduce((sum, entry) => sum + entry.totalCostWithBurden, 0)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching timelog register',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/earned-vs-burned
  getEarnedVsBurnedAnalysis: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { asOfDate, groupBy = 'costCode' } = req.query;
      const reportDate = asOfDate ? new Date(asOfDate) : new Date();

      // Validate jobId
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }

      const jobObjectId = new mongoose.Types.ObjectId(jobId);

      // Get job for baseline budget
      const job = await Job.findById(jobObjectId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Get latest approved progress report for accurate earned value
      // IMPORTANT: Always use the absolute latest progress report (regardless of reportDate parameter)
      // This ensures EV is based on the most recent completion percentage
      const latestProgressReport = await ProgressReport.findOne({
        jobId: jobObjectId,
        status: 'approved'
      })
        .sort({ reportDate: -1 })
        .populate({
          path: 'lineItems.scheduleOfValuesId',
          populate: ['areaId', 'systemId', 'phaseId']
        });
      
      // Use reportDate only for cost filtering, not for progress report selection
      // This ensures we always use the latest completion % but filter costs appropriately

      // Get SOV line items grouped by Area/System (matching progress report structure)
      const sovLineItems = await ScheduleOfValues.find({ jobId: jobObjectId })
        .populate(['systemId', 'areaId', 'phaseId'])
        .sort({ sortOrder: 1, lineNumber: 1 });

      // Group SOV items by Area/System to match progress report line items
      const sovByAreaSystem = new Map();
      sovLineItems.forEach(sov => {
        const areaName = sov.areaId?.name || 'Unknown Area';
        const systemName = sov.systemId?.name || 'Unknown System';
        const key = `${areaName}-${systemName}`;
        
        if (!sovByAreaSystem.has(key)) {
          sovByAreaSystem.set(key, {
            areaName,
            systemName,
            areaId: sov.areaId?._id,
            systemId: sov.systemId?._id,
            phaseId: sov.phaseId?._id,
            phaseName: sov.phaseId?.name,
            sovItems: [],
            totalContractValue: 0
          });
        }
        
        const group = sovByAreaSystem.get(key);
        group.sovItems.push(sov);
        group.totalContractValue += sov.totalValue || 0;
      });

      // Get cost data from AP Register and TimelogRegister
      // IMPORTANT: Filter AP costs by reportDate to match TimelogRegister date filtering
      // Note: AP Register costCodeBreakdown may not have systemId/areaId/scheduleOfValuesId
      // We'll match by costCode and look up area/system from SOV
      const [apCosts, laborCosts] = await Promise.all([
        APRegister.aggregate([
          { 
            $match: { 
              jobId: jobObjectId,
              invoiceDate: { $lte: reportDate } // Filter by date to match reportDate
            } 
          },
          { $unwind: '$costCodeBreakdown' },
          {
            $group: {
              _id: {
                costCode: '$costCodeBreakdown.costCode',
                // These may be null/undefined - we'll look up from SOV by costCode
                systemId: '$costCodeBreakdown.systemId',
                areaId: '$costCodeBreakdown.areaId',
                scheduleOfValuesId: '$costCodeBreakdown.scheduleOfValuesId'
              },
              totalAPCost: { $sum: { $ifNull: ['$costCodeBreakdown.amount', 0] } },
              invoiceCount: { $sum: 1 }
            }
          }
        ]),
        TimelogRegister.aggregate([
          { 
            $match: { 
              jobId: jobObjectId, 
              status: 'approved',
              workDate: { $lte: reportDate }
            } 
          },
          {
            $addFields: {
              totalCostWithBurden: { $ifNull: ['$totalCostWithBurden', 0] },
              totalLaborCost: { $ifNull: ['$totalLaborCost', 0] },
              totalHours: { $ifNull: ['$totalHours', 0] }
            }
          },
          {
            $group: {
              _id: {
                costCode: '$costCode',
                systemId: '$systemId',
                areaId: '$areaId'
              },
              totalHours: { $sum: '$totalHours' },
              totalCost: { $sum: '$totalCostWithBurden' },
              entries: { $sum: 1 }
            }
          }
        ])
      ]);

      // Build cost map by Area/System
      // Also build a map by scheduleOfValuesId for fallback matching
      const costByAreaSystem = new Map();
      const apCostBySOV = new Map(); // Map for AP costs by scheduleOfValuesId
      
      // Build lookup maps:
      // 1. scheduleOfValuesId -> { areaId, systemId, areaName, systemName }
      // 2. costCode -> array of { areaId, systemId, areaName, systemName, sovId } (multiple SOV items can have same costCode)
      const sovLookupMap = new Map();
      const sovByCostCodeMap = new Map(); // Map costCode to SOV items
      
      sovLineItems.forEach(sov => {
        const sovId = sov._id?.toString();
        const costCode = sov.costCodeNumber || sov.costCode;
        
        if (sovId) {
          const sovInfo = {
            areaId: sov.areaId?._id?.toString() || sov.areaId?.toString(),
            systemId: sov.systemId?._id?.toString() || sov.systemId?.toString(),
            areaName: sov.areaId?.name,
            systemName: sov.systemId?.name,
            sovId: sovId
          };
          
          sovLookupMap.set(sovId, sovInfo);
          
          // Also index by costCode for AP cost matching
          if (costCode) {
            if (!sovByCostCodeMap.has(costCode)) {
              sovByCostCodeMap.set(costCode, []);
            }
            sovByCostCodeMap.get(costCode).push(sovInfo);
          }
        }
      });
      
      // Process AP costs - match by costCode to SOV items, then by area/system
      apCosts.forEach(ap => {
        const costCode = ap._id.costCode;
        const systemId = ap._id.systemId?.toString() || null;
        const areaId = ap._id.areaId?.toString() || null;
        const scheduleOfValuesId = ap._id.scheduleOfValuesId?.toString() || null;
        const apCostAmount = ap.totalAPCost || 0;
        
        // Get SOV items for this costCode
        const sovItemsForCostCode = sovByCostCodeMap.get(costCode) || [];
        
        // If we have a direct scheduleOfValuesId, use it
        if (scheduleOfValuesId) {
          if (!apCostBySOV.has(scheduleOfValuesId)) {
            const sovInfo = sovLookupMap.get(scheduleOfValuesId);
            apCostBySOV.set(scheduleOfValuesId, {
              totalAPCost: 0,
              invoiceCount: 0,
              systemId: systemId || sovInfo?.systemId || null,
              areaId: areaId || sovInfo?.areaId || null,
              areaName: sovInfo?.areaName,
              systemName: sovInfo?.systemName
            });
          }
          const sovCost = apCostBySOV.get(scheduleOfValuesId);
          sovCost.totalAPCost += apCostAmount;
          sovCost.invoiceCount += ap.invoiceCount || 0;
        } else if (sovItemsForCostCode.length > 0) {
          // Match AP cost to SOV items by costCode
          // Distribute AP cost across all SOV items with this costCode proportionally
          // For now, assign to first matching SOV item (can be improved to distribute proportionally)
          const primarySOV = sovItemsForCostCode[0];
          
          // Store in apCostBySOV for fallback matching
          if (!apCostBySOV.has(primarySOV.sovId)) {
            apCostBySOV.set(primarySOV.sovId, {
              totalAPCost: 0,
              invoiceCount: 0,
              systemId: primarySOV.systemId,
              areaId: primarySOV.areaId,
              areaName: primarySOV.areaName,
              systemName: primarySOV.systemName
            });
          }
          const sovCost = apCostBySOV.get(primarySOV.sovId);
          sovCost.totalAPCost += apCostAmount;
          sovCost.invoiceCount += ap.invoiceCount || 0;
          
          // Also try to match by area/system if we have it
          const finalSystemId = systemId || primarySOV.systemId;
          const finalAreaId = areaId || primarySOV.areaId;
          
          if (finalSystemId && finalAreaId) {
            const key = `${finalSystemId}-${finalAreaId}`;
            if (!costByAreaSystem.has(key)) {
              costByAreaSystem.set(key, {
                apCost: 0,
                laborCost: 0,
                totalCost: 0,
                totalHours: 0,
                invoiceCount: 0,
                timeEntryCount: 0,
                sovIds: new Set()
              });
            }
            const cost = costByAreaSystem.get(key);
            cost.apCost += apCostAmount;
            cost.totalCost += apCostAmount;
            cost.invoiceCount += ap.invoiceCount || 0;
            cost.sovIds.add(primarySOV.sovId);
          }
        } else {
          // No matching SOV found - store by costCode for potential later matching
          console.warn(`AP cost for costCode ${costCode} has no matching SOV item`);
        }
      });

      // Process labor costs
      laborCosts.forEach(labor => {
        const systemId = labor._id.systemId?.toString();
        const areaId = labor._id.areaId?.toString();
        const key = systemId && areaId ? `${systemId}-${areaId}` : null;
        
        if (key) {
          if (!costByAreaSystem.has(key)) {
            costByAreaSystem.set(key, {
              apCost: 0,
              laborCost: 0,
              totalCost: 0,
              totalHours: 0,
              invoiceCount: 0,
              timeEntryCount: 0
            });
          }
          const cost = costByAreaSystem.get(key);
          cost.laborCost += labor.totalCost || 0;
          cost.totalCost += labor.totalCost || 0;
          cost.totalHours += labor.totalHours || 0;
          cost.timeEntryCount += labor.entries || 0;
        }
      });

      // Build analysis using progress report earned value
      const analysis = [];
      let totalBAC = 0; // Budget at Completion
      let totalEV = 0;  // Earned Value
      let totalAC = 0;  // Actual Cost
      let totalPV = 0;  // Planned Value (for SPI calculation)

      sovByAreaSystem.forEach((group, key) => {
        // Find matching progress report line item
        let progressLineItem = null;
        if (latestProgressReport && latestProgressReport.lineItems) {
          progressLineItem = latestProgressReport.lineItems.find(
            li => li.areaName === group.areaName && li.systemName === group.systemName
          );
        }

        // Calculate earned value from approved CTD
        const approvedCTDPercent = progressLineItem?.approvedCTD?.percent || 0;
        const approvedCTDAmount = progressLineItem?.approvedCTD?.amount || 0;
        const earnedValue = approvedCTDAmount || (approvedCTDPercent / 100) * group.totalContractValue;

        // Get actual costs - match by area/system first, then fallback to scheduleOfValuesId
        const systemId = group.systemId?.toString();
        const areaId = group.areaId?.toString();
        const costKey = systemId && areaId ? `${systemId}-${areaId}` : null;
        let costData = costKey && costByAreaSystem.has(costKey) 
          ? costByAreaSystem.get(costKey) 
          : {
              apCost: 0,
              laborCost: 0,
              totalCost: 0,
              totalHours: 0,
              invoiceCount: 0,
              timeEntryCount: 0
            };

        // Fallback: If AP costs weren't matched by area/system, try matching by scheduleOfValuesId
        // This ensures we capture all AP costs even if area/system IDs are missing
        // ALWAYS check fallback to ensure we capture all AP costs
        let fallbackAPCost = 0;
        let fallbackInvoiceCount = 0;
        
        // Sum AP costs for all SOV items in this area/system group
        group.sovItems.forEach(sov => {
          const sovId = sov._id?.toString();
          if (sovId && apCostBySOV.has(sovId)) {
            const sovAPCost = apCostBySOV.get(sovId);
            fallbackAPCost += sovAPCost.totalAPCost || 0;
            fallbackInvoiceCount += sovAPCost.invoiceCount || 0;
          }
        });
        
        // Use fallback AP costs if they're higher than what we got from area/system matching
        // This handles cases where AP costs don't have area/system IDs
        if (fallbackAPCost > costData.apCost) {
          const additionalAPCost = fallbackAPCost - costData.apCost;
          costData = {
            ...costData,
            apCost: fallbackAPCost,
            totalCost: costData.totalCost + additionalAPCost,
            invoiceCount: Math.max(costData.invoiceCount, fallbackInvoiceCount)
          };
        }

        const actualCost = costData?.totalCost || 0;
        const budgetAtCompletion = group.totalContractValue;

        // EVM Metrics
        const CV = earnedValue - actualCost; // Cost Variance
        const SV = earnedValue - (budgetAtCompletion * (approvedCTDPercent / 100)); // Schedule Variance (simplified)
        const CPI = actualCost > 0 ? earnedValue / actualCost : 0; // Cost Performance Index
        const SPI = (budgetAtCompletion * (approvedCTDPercent / 100)) > 0 
          ? earnedValue / (budgetAtCompletion * (approvedCTDPercent / 100)) 
          : 0; // Schedule Performance Index
        const EAC = CPI > 0 ? budgetAtCompletion / CPI : budgetAtCompletion; // Estimate at Completion
        const ETC = EAC - actualCost; // Estimate to Complete
        const VAC = budgetAtCompletion - EAC; // Variance at Completion
        const TCPI = (budgetAtCompletion - actualCost) !== 0 
          ? (budgetAtCompletion - earnedValue) / (budgetAtCompletion - actualCost) 
          : 0; // To-Complete Performance Index

        // Status determination
        let status = 'on_budget';
        if (CV < 0 && Math.abs(CV) > budgetAtCompletion * 0.1) {
          status = 'over_budget';
        } else if (CV < 0) {
          status = 'at_risk';
        }

        // Calculate variance percentages
        const costVariancePercent = actualCost > 0 ? (CV / actualCost) * 100 : 0;
        const scheduleVariancePercent = budgetAtCompletion > 0 ? (SV / budgetAtCompletion) * 100 : 0;

        // Get cost codes for this group
        const costCodes = [...new Set(group.sovItems.map(sov => sov.costCodeNumber || sov.costCode).filter(Boolean))];

        analysis.push({
          // Identification
          areaName: group.areaName,
          systemName: group.systemName,
          phaseName: group.phaseName,
          areaId: group.areaId,
          systemId: group.systemId,
          phaseId: group.phaseId,
          costCodes: costCodes,
          
          // Budget & Earned Value
          budgetAtCompletion: Math.round(budgetAtCompletion * 100) / 100,
          earnedValue: Math.round(earnedValue * 100) / 100,
          approvedCTDPercent: Math.round(approvedCTDPercent * 100) / 100,
          
          // Actual Costs
          laborCost: Math.round((costData.laborCost || 0) * 100) / 100,
          apCost: Math.round((costData.apCost || 0) * 100) / 100,
          actualCost: Math.round(actualCost * 100) / 100,
          totalHours: Math.round((costData.totalHours || 0) * 100) / 100,
          
          // Variances
          costVariance: Math.round(CV * 100) / 100,
          costVariancePercent: Math.round(costVariancePercent * 100) / 100,
          scheduleVariance: Math.round(SV * 100) / 100,
          scheduleVariancePercent: Math.round(scheduleVariancePercent * 100) / 100,
          
          // EVM Indices
          cpi: Math.round(CPI * 1000) / 1000,
          spi: Math.round(SPI * 1000) / 1000,
          
          // Forecasts
          estimateAtCompletion: Math.round(EAC * 100) / 100,
          estimateToComplete: Math.round(ETC * 100) / 100,
          varianceAtCompletion: Math.round(VAC * 100) / 100,
          tcpi: Math.round(TCPI * 1000) / 1000,
          
          // Status & Metadata
          status,
          invoiceCount: costData.invoiceCount || 0,
          timeEntryCount: costData.timeEntryCount || 0,
          sovItemCount: group.sovItems.length
        });

        totalBAC += budgetAtCompletion;
        totalEV += earnedValue;
        totalAC += actualCost;
      });

      // Calculate project-level EVM metrics
      // NOTE: totalEV is calculated from the latest progress report's approved CTD amounts
      // This ensures EV always reflects the most recent completion percentage (e.g., 86.45%)
      // regardless of the reportDate parameter used for cost filtering
      const projectCV = totalEV - totalAC;
      const projectCPI = totalAC > 0 ? totalEV / totalAC : 0;
      const projectEAC = projectCPI > 0 ? totalBAC / projectCPI : totalBAC;
      const projectETC = projectEAC - totalAC;
      const projectVAC = totalBAC - projectEAC;
      const projectTCPI = (totalBAC - totalAC) !== 0 ? (totalBAC - totalEV) / (totalBAC - totalAC) : 0;
      const overallProgress = totalBAC > 0 ? (totalEV / totalBAC) * 100 : 0;

      // Build trend data from historical progress reports
      const historicalReports = await ProgressReport.find({
        jobId: jobObjectId,
        status: 'approved',
        reportDate: { $lte: reportDate }
      })
        .sort({ reportDate: 1 })
        .select('reportDate summary')
        .lean();

      const trendData = historicalReports.map(report => ({
        date: report.reportDate,
        earnedValue: report.summary?.totalApprovedCTD?.amount || 0,
        approvedPercent: report.summary?.totalApprovedCTD?.percent || 0
      }));

      // Group analysis by requested grouping
      let groupedAnalysis = analysis;
      if (groupBy === 'system') {
        const systemMap = new Map();
        analysis.forEach(item => {
          const key = item.systemName || 'Unknown';
          if (!systemMap.has(key)) {
            systemMap.set(key, {
              systemName: key,
              systemId: item.systemId,
              items: [],
              budgetAtCompletion: 0,
              earnedValue: 0,
              actualCost: 0,
              laborCost: 0,
              apCost: 0
            });
          }
          const group = systemMap.get(key);
          group.items.push(item);
          group.budgetAtCompletion += item.budgetAtCompletion;
          group.earnedValue += item.earnedValue;
          group.actualCost += item.actualCost;
          group.laborCost += item.laborCost || 0;
          group.apCost += item.apCost || 0;
        });
        groupedAnalysis = Array.from(systemMap.values()).map(group => {
          const CV = group.earnedValue - group.actualCost;
          const CPI = group.actualCost > 0 ? group.earnedValue / group.actualCost : 0;
          const EAC = CPI > 0 ? group.budgetAtCompletion / CPI : group.budgetAtCompletion;
          const ETC = EAC - group.actualCost;
          const VAC = group.budgetAtCompletion - EAC;
          const TCPI = (group.budgetAtCompletion - group.actualCost) !== 0
            ? (group.budgetAtCompletion - group.earnedValue) / (group.budgetAtCompletion - group.actualCost)
            : 0;
          const approvedPercent = group.budgetAtCompletion > 0 ? (group.earnedValue / group.budgetAtCompletion) * 100 : 0;
          
          return {
            ...group,
            laborCost: Math.round(group.laborCost * 100) / 100,
            apCost: Math.round(group.apCost * 100) / 100,
            costVariance: Math.round(CV * 100) / 100,
            costVariancePercent: group.actualCost > 0 ? Math.round((CV / group.actualCost) * 100 * 100) / 100 : 0,
            cpi: Math.round(CPI * 1000) / 1000,
            spi: Math.round(approvedPercent / 100 * 1000) / 1000,
            estimateAtCompletion: Math.round(EAC * 100) / 100,
            estimateToComplete: Math.round(ETC * 100) / 100,
            varianceAtCompletion: Math.round(VAC * 100) / 100,
            tcpi: Math.round(TCPI * 1000) / 1000,
            approvedCTDPercent: Math.round(approvedPercent * 100) / 100,
            status: CV < 0 && Math.abs(CV) > group.budgetAtCompletion * 0.1 ? 'over_budget' :
                    CV < 0 ? 'at_risk' : 'on_budget'
          };
        });
      } else if (groupBy === 'area') {
        const areaMap = new Map();
        analysis.forEach(item => {
          const key = item.areaName || 'Unknown';
          if (!areaMap.has(key)) {
            areaMap.set(key, {
              areaName: key,
              areaId: item.areaId,
              items: [],
              budgetAtCompletion: 0,
              earnedValue: 0,
              actualCost: 0,
              laborCost: 0,
              apCost: 0
            });
          }
          const group = areaMap.get(key);
          group.items.push(item);
          group.budgetAtCompletion += item.budgetAtCompletion;
          group.earnedValue += item.earnedValue;
          group.actualCost += item.actualCost;
          group.laborCost += item.laborCost || 0;
          group.apCost += item.apCost || 0;
        });
        groupedAnalysis = Array.from(areaMap.values()).map(group => {
          const CV = group.earnedValue - group.actualCost;
          const CPI = group.actualCost > 0 ? group.earnedValue / group.actualCost : 0;
          const EAC = CPI > 0 ? group.budgetAtCompletion / CPI : group.budgetAtCompletion;
          const ETC = EAC - group.actualCost;
          const VAC = group.budgetAtCompletion - EAC;
          const TCPI = (group.budgetAtCompletion - group.actualCost) !== 0
            ? (group.budgetAtCompletion - group.earnedValue) / (group.budgetAtCompletion - group.actualCost)
            : 0;
          const approvedPercent = group.budgetAtCompletion > 0 ? (group.earnedValue / group.budgetAtCompletion) * 100 : 0;
          
          return {
            ...group,
            laborCost: Math.round(group.laborCost * 100) / 100,
            apCost: Math.round(group.apCost * 100) / 100,
            costVariance: Math.round(CV * 100) / 100,
            costVariancePercent: group.actualCost > 0 ? Math.round((CV / group.actualCost) * 100 * 100) / 100 : 0,
            cpi: Math.round(CPI * 1000) / 1000,
            spi: Math.round(approvedPercent / 100 * 1000) / 1000,
            estimateAtCompletion: Math.round(EAC * 100) / 100,
            estimateToComplete: Math.round(ETC * 100) / 100,
            varianceAtCompletion: Math.round(VAC * 100) / 100,
            tcpi: Math.round(TCPI * 1000) / 1000,
            approvedCTDPercent: Math.round(approvedPercent * 100) / 100,
            status: CV < 0 && Math.abs(CV) > group.budgetAtCompletion * 0.1 ? 'over_budget' :
                    CV < 0 ? 'at_risk' : 'on_budget'
          };
        });
      }

      // Calculate totals - ensure AP costs are properly included
      const totalLaborCost = analysis.reduce((sum, item) => sum + (item.laborCost || 0), 0);
      const totalAPCost = analysis.reduce((sum, item) => sum + (item.apCost || 0), 0);
      
      // Verify totals match - if AP costs seem low, check if we missed any via fallback matching
      // This ensures all AP costs are captured even if they weren't matched by area/system
      const totalAPCostFromMap = Array.from(costByAreaSystem.values()).reduce((sum, cost) => sum + (cost.apCost || 0), 0);
      const totalAPCostFromSOV = Array.from(apCostBySOV.values()).reduce((sum, cost) => sum + (cost.totalAPCost || 0), 0);
      
      // Use the higher value to ensure we capture all AP costs
      const verifiedTotalAPCost = Math.max(totalAPCost, totalAPCostFromMap, totalAPCostFromSOV);
      
      // Recalculate actual cost if needed
      const verifiedTotalAC = totalLaborCost + verifiedTotalAPCost;
      const verifiedTotalACFinal = verifiedTotalAC > totalAC ? verifiedTotalAC : totalAC;
      
      const totals = {
        budgetAtCompletion: Math.round(totalBAC * 100) / 100,
        earnedValue: Math.round(totalEV * 100) / 100,
        actualCost: Math.round(verifiedTotalACFinal * 100) / 100,
        laborCost: Math.round(totalLaborCost * 100) / 100,
        apCost: Math.round(verifiedTotalAPCost * 100) / 100,
        costVariance: Math.round((totalEV - verifiedTotalACFinal) * 100) / 100,
        costVariancePercent: verifiedTotalACFinal > 0 ? Math.round(((totalEV - verifiedTotalACFinal) / verifiedTotalACFinal) * 100 * 100) / 100 : 0,
        cpi: verifiedTotalACFinal > 0 ? Math.round((totalEV / verifiedTotalACFinal) * 1000) / 1000 : 0,
        spi: Math.round(overallProgress / 100 * 1000) / 1000, // Simplified SPI
        estimateAtCompletion: verifiedTotalACFinal > 0 && (totalEV / verifiedTotalACFinal) > 0 
          ? Math.round((totalBAC / (totalEV / verifiedTotalACFinal)) * 100) / 100 
          : Math.round(projectEAC * 100) / 100,
        estimateToComplete: verifiedTotalACFinal > 0 && (totalEV / verifiedTotalACFinal) > 0
          ? Math.round(((totalBAC / (totalEV / verifiedTotalACFinal)) - verifiedTotalACFinal) * 100) / 100
          : Math.round(projectETC * 100) / 100,
        varianceAtCompletion: verifiedTotalACFinal > 0 && (totalEV / verifiedTotalACFinal) > 0
          ? Math.round((totalBAC - (totalBAC / (totalEV / verifiedTotalACFinal))) * 100) / 100
          : Math.round(projectVAC * 100) / 100,
        tcpi: (totalBAC - verifiedTotalACFinal) !== 0 
          ? Math.round(((totalBAC - totalEV) / (totalBAC - verifiedTotalACFinal)) * 1000) / 1000 
          : 0,
        overallProgress: Math.round(overallProgress * 100) / 100
      };

      res.json({
        success: true,
        data: groupedAnalysis,
        totals,
        trends: trendData,
        meta: {
          asOfDate: reportDate,
          groupBy,
          lineItemCount: groupedAnalysis.length,
          onBudgetCount: groupedAnalysis.filter(item => item.status === 'on_budget').length,
          atRiskCount: groupedAnalysis.filter(item => item.status === 'at_risk').length,
          overBudgetCount: groupedAnalysis.filter(item => item.status === 'over_budget').length,
          latestProgressReportDate: latestProgressReport?.reportDate || null,
          progressReportNumber: latestProgressReport?.reportNumber || null
        }
      });
    } catch (error) {
      console.error('Error in getEarnedVsBurnedAnalysis:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error calculating earned vs burned analysis',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // GET /api/financial/:jobId/cost-breakdown
  getCostBreakdown: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { groupBy = 'costCode', period = 'month' } = req.query;

      let groupStage;
      switch (groupBy) {
        case 'system':
          groupStage = { $group: { _id: '$systemId' } };
          break;
        case 'area':
          groupStage = { $group: { _id: '$areaId' } };
          break;
        case 'phase':
          groupStage = { $group: { _id: '$phaseId' } };
          break;
        case 'craft':
          groupStage = { $group: { _id: '$craft' } };
          break;
        default:
          groupStage = { $group: { _id: '$costCode' } };
      }

      // Get labor costs by period
      const laborCostsByPeriod = await TimelogRegister.aggregate([
        { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: '%Y-%m', date: '$workDate' } },
              costCode: '$costCode'
            },
            totalHours: { $sum: '$totalHours' },
            totalCost: { $sum: '$totalCostWithBurden' },
            entries: { $sum: 1 }
          }
        },
        { $sort: { '_id.period': 1, '_id.costCode': 1 } }
      ]);

      // Get AP costs by period
      const apCostsByPeriod = await APRegister.aggregate([
        { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
        { $unwind: '$costCodeBreakdown' },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
              costCode: '$costCodeBreakdown.costCode'
            },
            totalAmount: { $sum: '$costCodeBreakdown.amount' },
            invoices: { $sum: 1 }
          }
        },
        { $sort: { '_id.period': 1, '_id.costCode': 1 } }
      ]);

      res.json({
        success: true,
        data: {
          laborCosts: laborCostsByPeriod,
          apCosts: apCostsByPeriod
        },
        meta: {
          groupBy,
          period
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating cost breakdown',
        error: error.message
      });
    }
  },

  // POST /api/financial/:jobId/progress-report
  // GET /api/financial/:jobId/progress-reports
  getProgressReports: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { status } = req.query; // 'all', 'active', 'archived' (invoiced)

      const filter = { jobId };
      if (status === 'active') {
        filter.status = { $ne: 'invoiced' };
      } else if (status === 'archived') {
        filter.status = 'invoiced';
      }

      const progressReports = await ProgressReport.find(filter)
        .populate(['jobId', 'projectId', 'completedBy'])
        .sort({ reportDate: -1 });

      res.json({
        success: true,
        data: progressReports
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching progress reports',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/progress-report/:reportId
  getProgressReport: async (req, res) => {
    try {
      const { jobId, reportId } = req.params;

      const progressReport = await ProgressReport.findOne({ _id: reportId, jobId })
        .populate(['jobId', 'projectId', 'completedBy'])
        .populate({
          path: 'lineItems.scheduleOfValuesId',
          populate: ['areaId', 'systemId']
        });

      if (!progressReport) {
        return res.status(404).json({
          success: false,
          message: 'Progress report not found'
        });
      }

      res.json({
        success: true,
        data: progressReport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching progress report',
        error: error.message
      });
    }
  },

  // POST /api/financial/:jobId/progress-report
  createProgressReport: async (req, res) => {
    try {
      const { jobId } = req.params;
      const reportData = req.body;

      // Get job and SOV line items
      const [job, sovLineItems] = await Promise.all([
        Job.findById(jobId).populate('projectId'),
        ScheduleOfValues.find({ jobId }).populate(['areaId', 'systemId'])
      ]);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Get previous progress report to populate previous complete values
      const previousReport = await ProgressReport.getPreviousReport(jobId, reportData.reportDate);

      // Build line items from SOV, grouped by Area and System
      const lineItemsMap = new Map();
      
      sovLineItems.forEach(sov => {
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
            assignedCost: sov.totalValue || 0,
            submittedCTD: {
              amount: 0,
              percent: 0
            },
            approvedCTD: {
              amount: 0,
              percent: 0
            },
            previousComplete: {
              amount: 0,
              percent: 0
            },
            holdbackPercent: 10
          });
        } else {
          // Aggregate costs for same area/system combination
          const existing = lineItemsMap.get(key);
          existing.assignedCost += sov.totalValue || 0;
        }
      });

      // If there's a previous report, populate previous complete values
      if (previousReport) {
        previousReport.lineItems.forEach(prevItem => {
          const key = `${prevItem.areaName}-${prevItem.systemName}`;
          if (lineItemsMap.has(key)) {
            const currentItem = lineItemsMap.get(key);
            currentItem.previousComplete = {
              amount: prevItem.approvedCTD?.amount || 0,
              percent: prevItem.approvedCTD?.percent || 0
            };
          }
        });
      }

      // If lineItems are provided in request, use them (for updates)
      const finalLineItems = reportData.lineItems && reportData.lineItems.length > 0
        ? reportData.lineItems
        : Array.from(lineItemsMap.values());

      const progressReport = new ProgressReport({
        reportNumber: reportData.reportNumber,
        reportDate: new Date(reportData.reportDate),
        reportPeriodStart: new Date(reportData.reportPeriodStart),
        reportPeriodEnd: new Date(reportData.reportPeriodEnd),
        jobId,
        projectId: job.projectId._id || job.projectId,
        completedBy: reportData.completedBy,
        completedByName: reportData.completedByName,
        lineItems: finalLineItems,
        status: reportData.status || 'draft'
      });

      await progressReport.save();
      await progressReport.populate(['jobId', 'projectId', 'completedBy']);

      res.status(201).json({
        success: true,
        data: progressReport
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating progress report',
        error: error.message
      });
    }
  },

  // PUT /api/financial/:jobId/progress-report/:reportId
  updateProgressReport: async (req, res) => {
    try {
      const { jobId, reportId } = req.params;
      const updateData = req.body;

      const progressReport = await ProgressReport.findOne({ _id: reportId, jobId });

      if (!progressReport) {
        return res.status(404).json({
          success: false,
          message: 'Progress report not found'
        });
      }

      // Update fields
      if (updateData.reportDate) progressReport.reportDate = new Date(updateData.reportDate);
      if (updateData.completedByName) progressReport.completedByName = updateData.completedByName;
      if (updateData.lineItems) progressReport.lineItems = updateData.lineItems;
      if (updateData.status) progressReport.status = updateData.status;

      await progressReport.save();
      await progressReport.populate(['jobId', 'projectId', 'completedBy']);

      res.json({
        success: true,
        data: progressReport
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating progress report',
        error: error.message
      });
    }
  },

  // DELETE /api/financial/:jobId/progress-report/:reportId
  deleteProgressReport: async (req, res) => {
    try {
      const { jobId, reportId } = req.params;

      const progressReport = await ProgressReport.findOne({ _id: reportId, jobId });

      if (!progressReport) {
        return res.status(404).json({
          success: false,
          message: 'Progress report not found'
        });
      }

      if (progressReport.status === 'invoiced') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete progress report that has been invoiced'
        });
      }

      await progressReport.deleteOne();

      res.json({
        success: true,
        message: 'Progress report deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting progress report',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/dashboard
  getFinancialDashboard: async (req, res) => {
    try {
      const { jobId } = req.params;
      
      // Get recent AP and timelog activity
      const [recentAP, recentTimelog] = await Promise.all([
        APRegister.find({ jobId }).sort({ receivedDate: -1 }).limit(5),
        TimelogRegister.find({ jobId }).populate('workerId', 'name').sort({ workDate: -1 }).limit(10)
      ]);

      res.json({
        success: true,
        data: {
          recentAP,
          recentTimelog
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching financial dashboard',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/monthly-cost-report
  getMonthlyCostReport: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { startMonth, endMonth } = req.query; // Format: 'YYYY-MM'

      const jobObjectId = mongoose.Types.ObjectId.isValid(jobId) 
        ? new mongoose.Types.ObjectId(jobId) 
        : jobId;

      // Get job to determine default date range
      const job = await Job.findById(jobObjectId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Get SOV items with area and system info
      const sovItems = await ScheduleOfValues.find({ jobId: jobObjectId })
        .populate(['areaId', 'systemId'])
        .lean();

      // Determine date range - use job dates as defaults if not provided
      let startDate, endDate;
      if (startMonth && endMonth) {
        startDate = new Date(startMonth + '-01');
        endDate = new Date(endMonth + '-01');
        // Set to last day of end month
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      } else {
        // Use job dates as defaults
        startDate = job.startDate ? new Date(job.startDate) : new Date('2024-01-01');
        endDate = job.endDate ? new Date(job.endDate) : new Date('2024-06-30');
        // Set to first day of start month and last day of end month
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      }

      // Generate months array dynamically
      const generateMonths = (start, end) => {
        const months = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const current = new Date(start);
        current.setDate(1); // Start of month
        
        while (current <= end) {
          const year = current.getFullYear();
          const month = current.getMonth();
          months.push({
            key: `${year}-${String(month + 1).padStart(2, '0')}`,
            label: monthNames[month],
            fullLabel: `${monthNames[month]} ${year}`
          });
          current.setMonth(current.getMonth() + 1);
        }
        return months;
      };

      const allMonths = generateMonths(startDate, endDate);

      // Get AP Register costs grouped by month and cost code
      const apCosts = await APRegister.aggregate([
        {
          $match: {
            jobId: jobObjectId,
            invoiceDate: { $gte: startDate, $lte: endDate }
          }
        },
        { $unwind: '$costCodeBreakdown' },
        {
          $group: {
            _id: {
              costCode: '$costCodeBreakdown.costCode',
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' }
            },
            amount: { $sum: '$costCodeBreakdown.amount' }
          }
        }
      ]);

      // Get TimelogRegister costs grouped by month and cost code
      // IMPORTANT: Only include approved entries to match Earned vs Burned calculation
      const laborCosts = await TimelogRegister.aggregate([
        {
          $match: {
            jobId: jobObjectId,
            status: 'approved', // Only approved entries to match CPI calculation
            workDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              costCode: '$costCode',
              year: { $year: '$workDate' },
              month: { $month: '$workDate' }
            },
            amount: { $sum: '$totalCostWithBurden' }
          }
        }
      ]);

      // Combine costs by cost code and month
      const monthlyCosts = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Process AP costs
      apCosts.forEach(item => {
        const costCode = item._id.costCode;
        const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        const monthName = monthNames[item._id.month - 1];
        
        if (!monthlyCosts[costCode]) {
          monthlyCosts[costCode] = {};
        }
        if (!monthlyCosts[costCode][monthKey]) {
          monthlyCosts[costCode][monthKey] = { month: monthName, amount: 0 };
        }
        monthlyCosts[costCode][monthKey].amount += item.amount;
      });

      // Process labor costs
      laborCosts.forEach(item => {
        const costCode = item._id.costCode;
        const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        const monthName = monthNames[item._id.month - 1];
        
        if (!monthlyCosts[costCode]) {
          monthlyCosts[costCode] = {};
        }
        if (!monthlyCosts[costCode][monthKey]) {
          monthlyCosts[costCode][monthKey] = { month: monthName, amount: 0 };
        }
        monthlyCosts[costCode][monthKey].amount += item.amount;
      });

      // Build report data grouped by cost code
      const reportData = [];
      let totalSOVBudget = 0;
      let totalSpent = 0;

      sovItems.forEach(sov => {
        const costCode = sov.costCodeNumber;
        const areaName = sov.areaId?.name || 'Unknown';
        const systemName = sov.systemId?.name || 'Unknown';
        const sovBudget = sov.totalValue || 0;
        totalSOVBudget += sovBudget;

        // Get monthly costs for this cost code
        const costsByMonth = monthlyCosts[costCode] || {};
        const monthKeys = Object.keys(costsByMonth).sort();
        
        // Calculate totals
        let totalToDate = 0;
        const monthlySpend = {};
        
        monthKeys.forEach(monthKey => {
          const cost = costsByMonth[monthKey];
          monthlySpend[cost.month] = Math.round(cost.amount * 100) / 100;
          totalToDate += cost.amount;
        });

        totalSpent += totalToDate;
        const remaining = sovBudget - totalToDate;
        const percentUsed = sovBudget > 0 ? (totalToDate / sovBudget) * 100 : 0;

        reportData.push({
          code: costCode,
          area: areaName,
          system: systemName,
          sovBudget: Math.round(sovBudget * 100) / 100,
          monthlySpend,
          totalToDate: Math.round(totalToDate * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          percentUsed: Math.round(percentUsed * 100) / 100
        });
      });

      // Sort by code
      reportData.sort((a, b) => a.code.localeCompare(b.code));

      // Calculate summary
      const remainingBudget = totalSOVBudget - totalSpent;
      const budgetUtilization = totalSOVBudget > 0 ? (totalSpent / totalSOVBudget) * 100 : 0;

      // Prepare chart data using dynamically generated months
      const chartData = {
        monthlyBreakdown: allMonths.map(month => {
          const monthData = { month: month.label, costs: {} };
          reportData.forEach(item => {
            monthData.costs[item.code] = item.monthlySpend[month.label] || 0;
          });
          return monthData;
        }),
        cumulative: allMonths.map((month, index) => {
          let cumulative = 0;
          for (let i = 0; i <= index; i++) {
            reportData.forEach(item => {
              cumulative += item.monthlySpend[allMonths[i].label] || 0;
            });
          }
          return {
            month: month.label,
            cumulative: Math.round(cumulative * 100) / 100,
            sovBudget: totalSOVBudget
          };
        })
      };

      res.json({
        success: true,
        data: {
          reportData,
          summary: {
            totalSOVBudget: Math.round(totalSOVBudget * 100) / 100,
            totalSpentToDate: Math.round(totalSpent * 100) / 100,
            remainingBudget: Math.round(remainingBudget * 100) / 100,
            budgetUtilization: Math.round(budgetUtilization * 100) / 100
          },
          chartData,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating monthly cost report',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/cost-to-complete
  getCostToCompleteReport: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { forecastPeriod } = req.query;

      const reportData = await generateCostToCompleteData(jobId, forecastPeriod);

      res.json({
        success: true,
        data: reportData
      });
    } catch (error) {
      if (error.message === 'Job not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('Invalid forecast period')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error generating cost to complete report',
        error: error.message
      });
    }
  },

  // POST /api/financial/:jobId/cost-to-complete/submit
  submitCostToCompleteForecast: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { forecastPeriod, lineItems, summary, progressReport, notes } = req.body;
      const status = 'submitted'; // Always submitted, no draft workflow

      // Get job to verify it exists and get projectId
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Get current user (in production, this would come from auth middleware)
      const currentUser = req.user || await User.findOne(); // Fallback for development

      const monthNumber = parseInt(forecastPeriod.replace('Month ', '')) || 1;

      // Check if the progress report is already used in another forecast
      if (progressReport?.id || progressReport?._id) {
        const progressReportId = progressReport.id || progressReport._id;
        const existingForecastWithReport = await CostToCompleteForecast.findOne({
          jobId,
          progressReportId: new mongoose.Types.ObjectId(progressReportId),
          status: { $ne: 'archived' }
        });

        if (existingForecastWithReport) {
          return res.status(400).json({
            success: false,
            message: `This progress report is already used in forecast "${existingForecastWithReport.forecastPeriod}". Each progress report can only be used once.`
          });
        }
      }

      // Check if forecast already exists for this period (any status except archived)
      const existingForecast = await CostToCompleteForecast.findOne({
        jobId,
        forecastPeriod,
        status: { $ne: 'archived' }
      });

      // Recalculate costToDate and earnedToDate to ensure accuracy
      // Use progress report date as cutoff, or current date if no progress report
      const costCutoffDate = progressReport?.reportDate 
        ? new Date(progressReport.reportDate)
        : new Date();
      costCutoffDate.setHours(23, 59, 59, 999);

      // Get ALL costs up to cutoff date (labor + AP)
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
              _id: null,
              totalCost: { $sum: { $ifNull: ['$totalCostWithBurden', '$totalCost', 0] } }
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
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ])
      ]);

      const timelogCost = timelogCosts.length > 0 ? timelogCosts[0].totalCost : 0;
      const apCost = apCosts.length > 0 ? apCosts[0].totalAmount : 0;
      const recalculatedCostToDate = timelogCost + apCost;

      // Recalculate earnedToDate from progress report if available
      let recalculatedEarnedToDate = summary.earnedToDate || 0;
      if (progressReport?.id || progressReport?._id) {
        const progressReportDoc = await ProgressReport.findById(progressReport.id || progressReport._id);
        if (progressReportDoc?.summary?.totalApprovedCTD?.amount) {
          recalculatedEarnedToDate = progressReportDoc.summary.totalApprovedCTD.amount;
        }
      }

      // Update summary with recalculated values
      const updatedSummary = {
        ...summary,
        costToDate: recalculatedCostToDate,
        earnedToDate: recalculatedEarnedToDate,
        // Recalculate CPI with updated values
        cpi: recalculatedCostToDate > 0 ? recalculatedEarnedToDate / recalculatedCostToDate : 0
      };

      // Recalculate line item costs if needed
      const updatedLineItems = lineItems.map(item => {
        // Keep the line item costToDate as-is since it's calculated per line item
        // The summary costToDate is the total across all line items
        return item;
      });

      let forecast;
      if (existingForecast) {
        // Update existing forecast
        existingForecast.lineItems = updatedLineItems;
        existingForecast.summary = updatedSummary;
        existingForecast.progressReportId = progressReport?.id || progressReport?._id || existingForecast.progressReportId;
        existingForecast.progressReportNumber = progressReport?.reportNumber || existingForecast.progressReportNumber;
        existingForecast.progressReportDate = progressReport?.reportDate ? new Date(progressReport.reportDate) : existingForecast.progressReportDate;
        existingForecast.status = status;
        existingForecast.notes = notes;
        
        if (status === 'submitted') {
          existingForecast.submittedBy = currentUser?._id;
          existingForecast.submittedAt = new Date();
        }
        if (status === 'approved') {
          existingForecast.approvedBy = currentUser?._id;
          existingForecast.approvedAt = new Date();
        }
        
        await existingForecast.save();
        forecast = existingForecast;
      } else {
        // Create new forecast
        forecast = await CostToCompleteForecast.create({
          jobId,
          projectId: job.projectId,
          forecastPeriod,
          monthNumber,
          progressReportId: progressReport?.id || progressReport?._id || null,
          progressReportNumber: progressReport?.reportNumber || null,
          progressReportDate: progressReport?.reportDate ? new Date(progressReport.reportDate) : new Date(),
          lineItems: updatedLineItems,
          summary: updatedSummary,
          status,
          createdBy: currentUser?._id,
          notes,
          ...(status === 'submitted' && {
            submittedBy: currentUser?._id,
            submittedAt: new Date()
          }),
          ...(status === 'approved' && {
            approvedBy: currentUser?._id,
            approvedAt: new Date()
          })
        });
      }

      res.json({
        success: true,
        message: existingForecast ? 'Forecast updated successfully' : 'Forecast created successfully',
        data: forecast
      });
    } catch (error) {
      console.error('Error submitting forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting forecast',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/cost-to-complete/forecasts
  // This endpoint returns BOTH saved forecasts AND generates data on-the-fly for periods without saved forecasts
  getCostToCompleteForecasts: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { status } = req.query;

      // Get job to determine available periods
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Calculate all available periods from job dates
      // BUT only include periods that have progress reports
      const jobStart = new Date(job.startDate);
      const jobEnd = new Date(job.endDate);
      const allPeriods = [];
      const current = new Date(jobStart);
      current.setDate(1);
      let monthNumber = 1;
      
      // First, get all approved progress reports to determine which periods exist
      const approvedReports = await ProgressReport.find({
        jobId,
        status: 'approved'
      }).sort({ reportDate: 1 });
      
      // Create a set of months that have progress reports
      const monthsWithReports = new Set();
      approvedReports.forEach(report => {
        const reportDate = new Date(report.reportDate);
        const monthKey = `${reportDate.getFullYear()}-${reportDate.getMonth()}`;
        monthsWithReports.add(monthKey);
      });
      
      // Only generate periods that have progress reports
      while (current <= jobEnd && monthNumber <= 12) {
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
        if (monthsWithReports.has(monthKey)) {
          allPeriods.push({
            number: monthNumber,
            label: `Month ${monthNumber}`,
            date: new Date(current)
          });
        }
        current.setMonth(current.getMonth() + 1);
        monthNumber++;
      }

      // Get saved forecasts
      const filter = { jobId };
      if (status && status !== 'all') {
        filter.status = status;
      } else {
        filter.status = { $ne: 'archived' };
      }

      const savedForecasts = await CostToCompleteForecast.find(filter)
        .populate('createdBy', 'name email')
        .populate('submittedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('progressReportId', 'reportNumber reportDate reportPeriodStart reportPeriodEnd')
        .sort({ monthNumber: 1, createdAt: -1 });

      // Create a map of saved forecasts by period
      const forecastsMap = new Map();
      savedForecasts.forEach(f => {
        forecastsMap.set(f.forecastPeriod, f);
      });

      // For periods without saved forecasts, we need to generate the data
      // We'll reuse the getCostToCompleteReport logic but call it internally
      const forecasts = await Promise.all(allPeriods.map(async (period) => {
        const saved = forecastsMap.get(period.label);
        
        if (saved) {
          // Return saved forecast with populated fields
          return saved;
        } else {
          // Generate forecast data on-the-fly using the helper function
          try {
            const reportData = await generateCostToCompleteData(jobId, period.label);
            
            if (reportData && reportData.summary && Object.keys(reportData.summary).length > 0) {
              return {
                _id: null, // No saved ID - this is generated
                jobId: job._id,
                projectId: job.projectId,
                forecastPeriod: period.label,
                monthNumber: period.number,
                progressReportId: reportData.progressReport?.id || reportData.progressReport?._id || null,
                progressReportNumber: reportData.progressReport?.reportNumber || null,
                progressReportDate: reportData.progressReport?.reportDate || null,
                lineItems: reportData.lineItems || [],
                summary: reportData.summary || {},
                status: 'not_created', // Special status indicating generated, not saved
                createdAt: null,
                updatedAt: null,
                createdBy: null,
                submittedBy: null,
                approvedBy: null
              };
            }
          } catch (err) {
            console.error(`Error generating forecast for ${period.label}:`, err.message);
          }
          
          // Return empty forecast if generation fails
          return {
            _id: null,
            jobId: job._id,
            projectId: job.projectId,
            forecastPeriod: period.label,
            monthNumber: period.number,
            progressReportId: null,
            progressReportNumber: null,
            progressReportDate: null,
            lineItems: [],
            summary: {},
            status: 'not_created',
            createdAt: null,
            updatedAt: null,
            createdBy: null,
            submittedBy: null,
            approvedBy: null
          };
        }
      }));

      res.json({
        success: true,
        data: forecasts
      });
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching forecasts',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/cost-to-complete/forecast/:forecastId
  getCostToCompleteForecast: async (req, res) => {
    try {
      const { jobId, forecastId } = req.params;

      const forecast = await CostToCompleteForecast.findOne({
        _id: forecastId,
        jobId
      })
        .populate('createdBy', 'name email')
        .populate('submittedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('progressReportId', 'reportNumber reportDate reportPeriodStart reportPeriodEnd');

      if (!forecast) {
        return res.status(404).json({
          success: false,
          message: 'Forecast not found'
        });
      }

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching forecast',
        error: error.message
      });
    }
  },

  // PUT /api/financial/:jobId/cost-to-complete/forecast/:forecastId
  updateCostToCompleteForecast: async (req, res) => {
    try {
      const { jobId, forecastId } = req.params;
      const { lineItems, summary, notes, status } = req.body;

      const forecast = await CostToCompleteForecast.findOne({
        _id: forecastId,
        jobId
      });

      if (!forecast) {
        return res.status(404).json({
          success: false,
          message: 'Forecast not found'
        });
      }

      // Recalculate costToDate and earnedToDate to ensure accuracy
      // Use progress report date as cutoff, or forecast's progress report date, or current date
      const costCutoffDate = forecast.progressReportDate 
        ? new Date(forecast.progressReportDate)
        : new Date();
      costCutoffDate.setHours(23, 59, 59, 999);

      // Get ALL costs up to cutoff date (labor + AP)
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
              _id: null,
              totalCost: { $sum: { $ifNull: ['$totalCostWithBurden', '$totalCost', 0] } }
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
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ])
      ]);

      const timelogCost = timelogCosts.length > 0 ? timelogCosts[0].totalCost : 0;
      const apCost = apCosts.length > 0 ? apCosts[0].totalAmount : 0;
      const recalculatedCostToDate = timelogCost + apCost;

      // Recalculate earnedToDate from progress report if available
      let recalculatedEarnedToDate = summary?.earnedToDate || forecast.summary?.earnedToDate || 0;
      if (forecast.progressReportId) {
        const progressReportDoc = await ProgressReport.findById(forecast.progressReportId);
        if (progressReportDoc?.summary?.totalApprovedCTD?.amount) {
          recalculatedEarnedToDate = progressReportDoc.summary.totalApprovedCTD.amount;
        }
      }

      // Update fields
      if (lineItems) forecast.lineItems = lineItems;
      if (summary) {
        // Update summary with recalculated values
        forecast.summary = {
          ...summary,
          costToDate: recalculatedCostToDate,
          earnedToDate: recalculatedEarnedToDate,
          // Recalculate CPI with updated values
          cpi: recalculatedCostToDate > 0 ? recalculatedEarnedToDate / recalculatedCostToDate : (summary.cpi || 0)
        };
      }
      if (notes !== undefined) forecast.notes = notes;
      if (status) {
        forecast.status = status;
        const currentUser = req.user || await User.findOne();
        
        if (status === 'submitted' && !forecast.submittedAt) {
          forecast.submittedBy = currentUser?._id;
          forecast.submittedAt = new Date();
        }
        if (status === 'approved' && !forecast.approvedAt) {
          forecast.approvedBy = currentUser?._id;
          forecast.approvedAt = new Date();
        }
      }

      await forecast.save();

      res.json({
        success: true,
        message: 'Forecast updated successfully',
        data: forecast
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating forecast',
        error: error.message
      });
    }
  },

  // DELETE /api/financial/:jobId/cost-to-complete/forecast/:forecastId
  deleteCostToCompleteForecast: async (req, res) => {
    try {
      const { jobId, forecastId } = req.params;

      const forecast = await CostToCompleteForecast.findOneAndDelete({
        _id: forecastId,
        jobId
      });

      if (!forecast) {
        return res.status(404).json({
          success: false,
          message: 'Forecast not found'
        });
      }

      res.json({
        success: true,
        message: 'Forecast deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting forecast',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/cost-to-complete/forecasts/analytics
  getCostToCompleteAnalytics: async (req, res) => {
    try {
      const { jobId } = req.params;

      const forecasts = await CostToCompleteForecast.find({
        jobId,
        status: { $in: ['submitted', 'approved'] }
      })
        .sort({ monthNumber: 1 })
        .select('monthNumber forecastPeriod summary createdAt');

      // Build analytics data
      const analytics = {
        trends: {
          months: [],
          forecastFinalCost: [],
          forecastFinalValue: [],
          marginAtCompletion: [],
          cpi: [],
          costToDate: [],
          earnedToDate: []
        },
        summary: {
          totalForecasts: forecasts.length,
          averageCPI: 0,
          averageMargin: 0,
          latestForecast: null
        }
      };

      let totalCPI = 0;
      let totalMargin = 0;
      let validForecasts = 0;

      forecasts.forEach(forecast => {
        const summary = forecast.summary || {};
        
        analytics.trends.months.push(forecast.forecastPeriod);
        analytics.trends.forecastFinalCost.push(summary.forecastFinalCost || 0);
        analytics.trends.forecastFinalValue.push(summary.forecastFinalValue || 0);
        analytics.trends.marginAtCompletion.push(summary.marginAtCompletion || 0);
        analytics.trends.cpi.push(summary.cpi || 0);
        analytics.trends.costToDate.push(summary.costToDate || 0);
        analytics.trends.earnedToDate.push(summary.earnedToDate || 0);

        if (summary.cpi) {
          totalCPI += summary.cpi;
          validForecasts++;
        }
        if (summary.marginAtCompletion) {
          totalMargin += summary.marginAtCompletion;
        }
      });

      if (validForecasts > 0) {
        analytics.summary.averageCPI = totalCPI / validForecasts;
        analytics.summary.averageMargin = totalMargin / validForecasts;
      }

      if (forecasts.length > 0) {
        analytics.summary.latestForecast = {
          period: forecasts[forecasts.length - 1].forecastPeriod,
          forecastFinalCost: forecasts[forecasts.length - 1].summary?.forecastFinalCost || 0,
          marginAtCompletion: forecasts[forecasts.length - 1].summary?.marginAtCompletion || 0,
          cpi: forecasts[forecasts.length - 1].summary?.cpi || 0
        };
      }

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching analytics',
        error: error.message
      });
    }
  },

  // GET /api/financial/:jobId/job-financial-summary
  getJobFinancialSummary: async (req, res) => {
    try {
      const { jobId } = req.params;
      
      // Get job info for SOV total value
      const job = await Job.findById(jobId).lean();
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Get SOV total value
      const sovResponse = await ScheduleOfValues.aggregate([
        { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$totalValue' }
          }
        }
      ]);
      const forecastedJobValue = sovResponse.length > 0 ? sovResponse[0].totalValue : (job.contractValue || 0);

      // Get all approved progress reports, sorted by date
      const progressReports = await ProgressReport.find({
        jobId: new mongoose.Types.ObjectId(jobId),
        status: 'approved'
      })
        .sort({ reportDate: 1 })
        .lean();

      // Get all forecasts (non-archived), sorted by month number
      const forecasts = await CostToCompleteForecast.find({
        jobId: new mongoose.Types.ObjectId(jobId),
        status: { $ne: 'archived' }
      })
        .sort({ monthNumber: 1 })
        .lean();

      // Build months based on FORECASTS (not progress reports)
      // FORECASTS are the source of truth for months since forecasted cost is managed there
      // This ensures consistency with Cost to Complete Summary which uses forecasts
      // Match progress reports to forecast months
      let months = [];
      
      if (forecasts.length > 0) {
        // Use forecasts as the source of truth
        months = forecasts.map((forecast, index) => {
        // Determine date range for this forecast month
        // Use progressReportDate if available, otherwise use forecast creation date
        let monthDate = new Date();
        let monthEnd = new Date();
        
        if (forecast.progressReportDate) {
          monthDate = new Date(forecast.progressReportDate);
          monthDate.setDate(1); // Start of month
          monthEnd = new Date(forecast.progressReportDate);
          monthEnd = new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
        } else if (forecast.createdAt) {
          monthDate = new Date(forecast.createdAt);
          monthDate.setDate(1);
          monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
        } else {
          // Fallback: use a default date based on monthNumber
          // Assume job started at some point and calculate from there
          monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - (forecasts.length - index - 1));
          monthDate.setDate(1);
          monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
        }

        // Find matching progress report for this forecast
        let progressReport = null;
        
        // Strategy 1: Match by progressReportId (most accurate)
        if (forecast.progressReportId) {
          progressReport = progressReports.find(pr => 
            pr._id.toString() === forecast.progressReportId.toString()
          );
        }
        
        // Strategy 2: Match by progressReportDate (fallback)
        if (!progressReport && forecast.progressReportDate) {
          const forecastDate = new Date(forecast.progressReportDate);
          progressReport = progressReports.find(pr => {
            const prDate = new Date(pr.reportDate);
            return prDate.getFullYear() === forecastDate.getFullYear() &&
                   prDate.getMonth() === forecastDate.getMonth();
          });
        }
        
        // Strategy 3: Match by date range (fallback)
        if (!progressReport) {
          progressReport = progressReports.find(pr => {
            const prDate = new Date(pr.reportDate);
            return prDate >= monthDate && prDate <= monthEnd;
          });
        }

        return {
          monthNumber: forecast.monthNumber || (index + 1),
          month: forecast.forecastPeriod || `Month ${index + 1}`,
          date: monthDate,
          monthEnd: monthEnd,
          progressReport: progressReport,
          forecast: forecast // Store the forecast for easy access
        };
      });
      } else {
        // Fallback: If no forecasts exist, use progress reports (legacy behavior)
        // This should rarely happen, but handle gracefully
        const monthMap = new Map();
        
        progressReports.forEach((pr) => {
          const prDate = new Date(pr.reportDate);
          const monthKey = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthMap.has(monthKey)) {
            const monthStart = new Date(prDate.getFullYear(), prDate.getMonth(), 1);
            const monthEnd = new Date(prDate.getFullYear(), prDate.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            
            monthMap.set(monthKey, {
              date: monthStart,
              monthEnd: monthEnd,
              progressReport: pr,
              reportDate: prDate
            });
          } else {
            const existing = monthMap.get(monthKey);
            if (prDate > existing.reportDate) {
              existing.progressReport = pr;
              existing.reportDate = prDate;
            }
          }
        });

        const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.date - b.date);
        months = sortedMonths.map((m, index) => ({
          monthNumber: index + 1,
          month: `Month ${index + 1}`,
          date: m.date,
          monthEnd: m.monthEnd,
          progressReport: m.progressReport,
          forecast: null // No forecast available
        }));
      }

      // Build month-by-month data
      const monthData = [];
      let previousRecognizedRevenue = 0;
      let previousInvoices = 0;

      for (const month of months) {
        const progressReport = month.progressReport;
        // Forecast is now directly available from the month object
        const forecastForMonth = month.forecast;

        // Get costs up to end of this month
        const [timelogCosts, apCosts] = await Promise.all([
          TimelogRegister.aggregate([
            {
              $match: {
                jobId: new mongoose.Types.ObjectId(jobId),
                status: 'approved',
                workDate: { $lte: month.monthEnd }
              }
            },
            {
              $group: {
                _id: null,
                totalCost: { $sum: { $ifNull: ['$totalCostWithBurden', '$totalCost', 0] } }
              }
            }
          ]),
          APRegister.aggregate([
            {
              $match: {
                jobId: new mongoose.Types.ObjectId(jobId),
                invoiceDate: { $lte: month.monthEnd }
              }
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' }
              }
            }
          ])
        ]);

        const timelogCost = timelogCosts.length > 0 ? timelogCosts[0].totalCost : 0;
        const apCost = apCosts.length > 0 ? apCosts[0].totalAmount : 0;
        const jobToDateCost = timelogCost + apCost;
        
        // Get previous month's cost for period calculation
        const previousMonthCost = monthData.length > 0 ? monthData[monthData.length - 1].jobToDateCost : 0;
        const actualCostThisPeriod = jobToDateCost - previousMonthCost;

        // Revenue recognition - totalApprovedCTD is CUMULATIVE (Complete To Date)
        // If no progress report for this month, use previous month's cumulative value
        const cumulativeRecognizedRevenue = progressReport?.summary?.totalApprovedCTD?.amount || previousRecognizedRevenue;
        const recognizedRevenueThisPeriod = cumulativeRecognizedRevenue - previousRecognizedRevenue;
        
        // Invoices - totalDueThisPeriod is incremental, but we need cumulative
        // If no progress report for this month, use previous month's cumulative invoices
        const invoicesThisPeriod = progressReport?.summary?.totalDueThisPeriod || 0;
        const cumulativeInvoices = progressReport ? (previousInvoices + invoicesThisPeriod) : previousInvoices;

        // Forecast data - ALWAYS use forecast summary since forecasts are the source of truth
        // Since months are now built from forecasts, every month should have a forecast
        let forecastedFinalCost = 0;
        let forecastedFinalValue = forecastedJobValue;
        
        if (forecastForMonth) {
          // Primary: Use forecast summary (most accurate)
          if (forecastForMonth.summary?.forecastFinalCost) {
            forecastedFinalCost = forecastForMonth.summary.forecastFinalCost;
          } else if (forecastForMonth.lineItems && forecastForMonth.lineItems.length > 0) {
            // Fallback: Calculate from lineItems
            forecastedFinalCost = forecastForMonth.lineItems.reduce((sum, item) => 
              sum + (item.forecastedFinalCost || item.totalCost || 0), 0
            );
          }
          
          // Get forecasted final value
          if (forecastForMonth.summary?.forecastFinalValue) {
            forecastedFinalValue = forecastForMonth.summary.forecastFinalValue;
          } else if (forecastForMonth.lineItems && forecastForMonth.lineItems.length > 0) {
            forecastedFinalValue = forecastForMonth.lineItems.reduce((sum, item) => 
              sum + (item.forecastedFinalValue || item.totalValue || 0), 0
            ) || forecastedJobValue;
          }
        } else {
          // This should not happen since months are built from forecasts
          // But handle gracefully: use previous month's forecast or calculate from progress
          console.warn(`No forecast found for month ${month.monthNumber} - using fallback calculation`);
          const progressPercent = cumulativeRecognizedRevenue > 0 && forecastedJobValue > 0
            ? (cumulativeRecognizedRevenue / forecastedJobValue) * 100
            : 0;
          
          if (progressPercent > 0 && jobToDateCost > 0 && cumulativeRecognizedRevenue > 0) {
            const cpi = cumulativeRecognizedRevenue / jobToDateCost;
            const remainingProgressPercent = 100 - progressPercent;
            
            if (cpi > 0 && remainingProgressPercent > 0) {
              const remainingCostAtCurrentRate = (jobToDateCost / progressPercent) * remainingProgressPercent;
              forecastedFinalCost = jobToDateCost + (remainingCostAtCurrentRate / cpi);
            } else {
              forecastedFinalCost = jobToDateCost / (progressPercent / 100);
            }
            forecastedFinalCost = Math.max(forecastedFinalCost, jobToDateCost * 1.05);
          } else {
            forecastedFinalCost = forecastedJobValue * 0.9;
          }
        }
        
        // Final safety check: forecast must be >= cost to date
        if (forecastedFinalCost < jobToDateCost) {
          forecastedFinalCost = jobToDateCost * 1.1;
        }
        const forecastedFee = forecastedFinalValue - forecastedFinalCost;
        const forecastedFeePercent = forecastedFinalValue > 0 ? (forecastedFee / forecastedFinalValue) * 100 : 0;

        // Fee calculations
        const recognizedFee = cumulativeRecognizedRevenue - jobToDateCost;
        const recognizedFeePercent = cumulativeRecognizedRevenue > 0 ? (recognizedFee / cumulativeRecognizedRevenue) * 100 : 0;
        const recognizedFeeThisPeriod = recognizedRevenueThisPeriod - actualCostThisPeriod;
        const recognizedFeePercentThisPeriod = recognizedRevenueThisPeriod > 0 ? (recognizedFeeThisPeriod / recognizedRevenueThisPeriod) * 100 : 0;

        // Over/Under Billing
        const overUnderBilling = cumulativeInvoices - cumulativeRecognizedRevenue;

        monthData.push({
          monthNumber: month.monthNumber,
          month: month.month,
          date: month.date,
          // Forecasts
          forecastedJobValue,
          forecastedFinalCost,
          forecastedFinalValue,
          forecastedFee,
          forecastedFeePercent: Math.round(forecastedFeePercent * 100) / 100,
          // Actuals
          jobToDateCost,
          jobCostThisPeriod: actualCostThisPeriod,
          // Revenue - cumulativeRecognizedRevenue is already cumulative from progress report
          recognizedRevenue: cumulativeRecognizedRevenue,
          recognizedRevenueThisPeriod,
          recognizedFee,
          recognizedFeePercent: Math.round(recognizedFeePercent * 100) / 100,
          recognizedFeeThisPeriod,
          recognizedFeePercentThisPeriod: Math.round(recognizedFeePercentThisPeriod * 100) / 100,
          // Invoicing
          jobToDateInvoices: cumulativeInvoices,
          invoicesThisPeriod,
          overUnderBilling,
          // Current
          currentRecognizedRevenue: cumulativeRecognizedRevenue,
          // Progress Report info
          progressReportNumber: progressReport?.reportNumber || null,
          progressReportDate: progressReport?.reportDate || null
        });

        // Update for next iteration
        previousRecognizedRevenue = cumulativeRecognizedRevenue;
        previousInvoices = cumulativeInvoices;
      }

      // Get monthly cost breakdown (labor vs materials) for additional insights
      const monthlyCostBreakdown = [];
      for (const month of months) {
        const [timelogMonthly, apMonthly] = await Promise.all([
          TimelogRegister.aggregate([
            {
              $match: {
                jobId: new mongoose.Types.ObjectId(jobId),
                status: 'approved',
                workDate: { 
                  $gte: month.date,
                  $lte: month.monthEnd
                }
              }
            },
            {
              $group: {
                _id: null,
                totalCost: { $sum: { $ifNull: ['$totalCostWithBurden', '$totalCost', 0] } }
              }
            }
          ]),
          APRegister.aggregate([
            {
              $match: {
                jobId: new mongoose.Types.ObjectId(jobId),
                invoiceDate: { 
                  $gte: month.date,
                  $lte: month.monthEnd
                }
              }
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' }
              }
            }
          ])
        ]);

        monthlyCostBreakdown.push({
          month: month.month,
          laborCost: timelogMonthly.length > 0 ? timelogMonthly[0].totalCost : 0,
          materialCost: apMonthly.length > 0 ? apMonthly[0].totalAmount : 0
        });
      }

      // Prepare chart data
      const costVsForecastData = monthData.map(m => ({
        month: m.month,
        forecastJobValue: m.forecastedJobValue,
        jobCost: m.jobToDateCost,
        forecastFinalCost: m.forecastedFinalCost
      }));

      const feeTrendData = monthData.map(m => ({
        month: m.month,
        forecastedFeePercent: m.forecastedFeePercent,
        recognizedFeePercent: m.recognizedFeePercent,
        recognizedFeePercentThisPeriod: m.recognizedFeePercentThisPeriod
      }));

      const latestMonth = monthData[monthData.length - 1];
      const latestForecastDistribution = latestMonth ? {
        forecastedFinalCost: latestMonth.forecastedFinalCost,
        forecastedFee: latestMonth.forecastedFee
      } : null;

      // Calculate totals
      const totals = {
        totalForecastedValue: forecastedJobValue,
        totalCostToDate: monthData.length > 0 ? monthData[monthData.length - 1].jobToDateCost : 0,
        totalRecognizedRevenue: monthData.length > 0 ? monthData[monthData.length - 1].recognizedRevenue : 0,
        totalInvoiced: monthData.length > 0 ? monthData[monthData.length - 1].jobToDateInvoices : 0,
        totalRecognizedFee: monthData.length > 0 ? monthData[monthData.length - 1].recognizedFee : 0
      };

      res.json({
        success: true,
        data: {
          summary: {
            months: monthData,
            totals
          },
          chartData: {
            costVsForecast: costVsForecastData,
            feeTrend: feeTrendData,
            latestForecastDistribution,
            monthlyCostBreakdown
          }
        }
      });
    } catch (error) {
      console.error('Error generating job financial summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating job financial summary',
        error: error.message
      });
    }
  }
};

// Helper function for currency formatting
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

module.exports = financialController;
