const express = require('express');
const { body } = require('express-validator');
const financialController = require('../controllers/financialController');

const router = express.Router();

// AP Register routes
router.get('/:jobId/ap-register', financialController.getAPRegister);

// Timelog Register routes  
router.get('/:jobId/timelog-register', financialController.getTimelogRegister);

// Earned vs Burned Analysis
router.get('/:jobId/earned-vs-burned', financialController.getEarnedVsBurnedAnalysis);

// Cost Breakdown and Analytics
router.get('/:jobId/cost-breakdown', financialController.getCostBreakdown);

// Progress Reports
router.get('/:jobId/progress-reports', financialController.getProgressReports);
router.get('/:jobId/progress-report/:reportId', financialController.getProgressReport);
router.post('/:jobId/progress-report', [
  body('reportNumber').notEmpty().withMessage('Report number is required'),
  body('reportDate').isISO8601().withMessage('Valid report date is required'),
  body('reportPeriodStart').isISO8601().withMessage('Valid period start date is required'),
  body('reportPeriodEnd').isISO8601().withMessage('Valid period end date is required')
], financialController.createProgressReport);
router.put('/:jobId/progress-report/:reportId', financialController.updateProgressReport);
router.delete('/:jobId/progress-report/:reportId', financialController.deleteProgressReport);

// Financial Dashboard
router.get('/:jobId/dashboard', financialController.getFinancialDashboard);

// Monthly Cost Report
router.get('/:jobId/monthly-cost-report', financialController.getMonthlyCostReport);

// Cost to Complete Report
router.get('/:jobId/cost-to-complete', financialController.getCostToCompleteReport);
router.post('/:jobId/cost-to-complete/submit', financialController.submitCostToCompleteForecast);

// Cost to Complete Forecasts
router.get('/:jobId/cost-to-complete/forecasts', financialController.getCostToCompleteForecasts);
router.get('/:jobId/cost-to-complete/forecast/:forecastId', financialController.getCostToCompleteForecast);
router.put('/:jobId/cost-to-complete/forecast/:forecastId', financialController.updateCostToCompleteForecast);
router.delete('/:jobId/cost-to-complete/forecast/:forecastId', financialController.deleteCostToCompleteForecast);
router.get('/:jobId/cost-to-complete/forecasts/analytics', financialController.getCostToCompleteAnalytics);

// Job Financial Summary
router.get('/:jobId/job-financial-summary', financialController.getJobFinancialSummary);

module.exports = router;
