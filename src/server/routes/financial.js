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
router.post('/:jobId/progress-report', [
  body('reportNumber').notEmpty().withMessage('Report number is required'),
  body('reportDate').isISO8601().withMessage('Valid report date is required'),
  body('reportPeriodStart').isISO8601().withMessage('Valid period start date is required'),
  body('reportPeriodEnd').isISO8601().withMessage('Valid period end date is required'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required')
], financialController.createProgressReport);

// Financial Dashboard
router.get('/:jobId/dashboard', financialController.getFinancialDashboard);

module.exports = router;
