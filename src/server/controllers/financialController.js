const mongoose = require('mongoose');
const APRegister = require('../models/APRegister');
const TimelogRegister = require('../models/TimelogRegister');
const ProgressReport = require('../models/ProgressReport');
const ScheduleOfValues = require('../models/ScheduleOfValues');
const Job = require('../models/Job');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const financialController = {
  // GET /api/financial/:jobId/ap-register
  getAPRegister: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { startDate, endDate, vendor, costCode, status } = req.query;

      const filter = { jobId };
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
          select: 'lineNumber description totalValue'
        })
        .sort({ invoiceDate: -1 });

      // Calculate summary
      const summary = await APRegister.aggregate([
        { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
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
      ]);

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
          select: 'lineNumber description totalValue'
        })
        .sort({ workDate: -1 });

      // Calculate summary by cost code
      const summary = await TimelogRegister.getCostByJob(jobId, startDate, endDate);

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
      const { asOfDate = new Date() } = req.query;

      // Get SOV line items
      const sovLineItems = await ScheduleOfValues.find({ jobId })
        .populate(['systemId', 'areaId', 'phaseId']);

      // Get cost data from AP and Timelog
      const [apCosts, laborCosts] = await Promise.all([
        APRegister.aggregate([
          { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
          { $unwind: '$costCodeBreakdown' },
          {
            $group: {
              _id: '$costCodeBreakdown.costCode',
              totalAPCost: { $sum: '$costCodeBreakdown.amount' },
              invoiceCount: { $sum: 1 }
            }
          }
        ]),
        TimelogRegister.aggregate([
          { $match: { jobId: new mongoose.Types.ObjectId(jobId), status: 'approved' } },
          {
            $group: {
              _id: '$costCode',
              totalHours: { $sum: '$totalHours' },
              totalCost: { $sum: '$totalCostWithBurden' },
              entries: { $sum: 1 }
            }
          }
        ])
      ]);

      // Combine cost data
      const costByCode = {};
      apCosts.forEach(ap => {
        costByCode[ap._id] = {
          costCode: ap._id,
          apCost: ap.totalAPCost,
          laborCost: 0,
          totalCost: ap.totalAPCost
        };
      });

      laborCosts.forEach(labor => {
        if (costByCode[labor._id]) {
          costByCode[labor._id].laborCost = labor.totalCost;
          costByCode[labor._id].totalCost += labor.totalCost;
        } else {
          costByCode[labor._id] = {
            costCode: labor._id,
            apCost: 0,
            laborCost: labor.totalCost,
            totalCost: labor.totalCost
          };
        }
      });

      // Create earned vs burned analysis
      const analysis = sovLineItems.map(sovItem => {
        const costData = costByCode[sovItem.costCode] || { apCost: 0, laborCost: 0, totalCost: 0 };
        const earnedValue = (sovItem.percentComplete / 100) * sovItem.totalValue;
        const variance = earnedValue - costData.totalCost;
        const variancePercent = costData.totalCost > 0 ? (variance / costData.totalCost) * 100 : 0;

        return {
          lineNumber: sovItem.lineNumber,
          costCode: sovItem.costCode,
          description: sovItem.description,
          system: sovItem.systemId?.name,
          area: sovItem.areaId?.name,
          phase: sovItem.phaseId?.name,
          contractValue: sovItem.totalValue,
          percentComplete: sovItem.percentComplete,
          earnedValue,
          apCost: costData.apCost,
          laborCost: costData.laborCost,
          totalCost: costData.totalCost,
          variance,
          variancePercent,
          status: variancePercent >= 0 ? 'on_budget' : 
                  variancePercent >= -10 ? 'at_risk' : 'over_budget'
        };
      });

      // Calculate totals
      const totals = {
        contractValue: sovLineItems.reduce((sum, item) => sum + item.totalValue, 0),
        earnedValue: analysis.reduce((sum, item) => sum + item.earnedValue, 0),
        apCost: analysis.reduce((sum, item) => sum + item.apCost, 0),
        laborCost: analysis.reduce((sum, item) => sum + item.laborCost, 0),
        totalCost: analysis.reduce((sum, item) => sum + item.totalCost, 0)
      };
      
      totals.variance = totals.earnedValue - totals.totalCost;
      totals.variancePercent = totals.totalCost > 0 ? (totals.variance / totals.totalCost) * 100 : 0;
      totals.overallProgress = totals.contractValue > 0 ? (totals.earnedValue / totals.contractValue) * 100 : 0;

      res.json({
        success: true,
        data: analysis,
        totals,
        meta: {
          asOfDate,
          lineItemCount: analysis.length,
          onBudgetCount: analysis.filter(item => item.status === 'on_budget').length,
          atRiskCount: analysis.filter(item => item.status === 'at_risk').length,
          overBudgetCount: analysis.filter(item => item.status === 'over_budget').length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error calculating earned vs burned analysis',
        error: error.message
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
  createProgressReport: async (req, res) => {
    try {
      const { jobId } = req.params;
      const reportData = req.body;

      // Get current costs for automatic calculation
      const [apCosts, laborCosts, sovLineItems] = await Promise.all([
        APRegister.aggregate([
          { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
          { $unwind: '$costCodeBreakdown' },
          {
            $group: {
              _id: '$costCodeBreakdown.costCode',
              totalAmount: { $sum: '$costCodeBreakdown.amount' }
            }
          }
        ]),
        TimelogRegister.getCostByJob(jobId),
        ScheduleOfValues.find({ jobId })
      ]);

      // Auto-populate cost data in progress report
      const enhancedLineItems = reportData.lineItems.map(item => {
        const apCost = apCosts.find(ap => ap._id === item.costCode)?.totalAmount || 0;
        const laborCost = laborCosts.find(lc => lc._id === item.costCode)?.totalCost || 0;
        const totalCost = apCost + laborCost;

        return {
          ...item,
          costThisPeriod: totalCost - (item.previousCostToDate || 0),
          laborCostThisPeriod: laborCost,
          materialCostThisPeriod: apCost
        };
      });

      const progressReport = new ProgressReport({
        ...reportData,
        jobId,
        lineItems: enhancedLineItems
      });

      await progressReport.save();
      await progressReport.populate(['jobId', 'projectId', 'submittedBy']);

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

  // GET /api/financial/:jobId/progress-reports
  getProgressReports: async (req, res) => {
    try {
      const { jobId } = req.params;

      const progressReports = await ProgressReport.find({ jobId })
        .populate(['jobId', 'projectId', 'submittedBy', 'reviewedBy', 'approvedBy'])
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
  }
};

module.exports = financialController;
