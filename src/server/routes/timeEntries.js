const express = require('express');
const { body } = require('express-validator');
const timeEntryController = require('../controllers/timeEntryController');

const router = express.Router();

// Validation middleware
const timeEntryValidation = [
  body('workerId')
    .isMongoId()
    .withMessage('Valid worker ID is required'),
  
  body('projectId')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  
  body('regularHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Regular hours must be between 0 and 24'),
  
  body('overtimeHours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Overtime hours must be between 0 and 24'),
  
  body('doubleTimeHours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Double time hours must be between 0 and 24'),
  
  body('costCode')
    .notEmpty()
    .withMessage('Cost code is required'),
  
  body('workDescription')
    .notEmpty()
    .withMessage('Work description is required')
    .isLength({ max: 500 })
    .withMessage('Work description must be less than 500 characters'),
  
  body('craft')
    .isIn(['insulation', 'painting', 'heat_tracing', 'fireproofing', 'general', 'equipment'])
    .withMessage('Valid craft is required')
];

const approvalValidation = [
  body('supervisorNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Supervisor notes must be less than 1000 characters')
];

const rejectionValidation = [
  body('rejectionReason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be less than 500 characters')
];

// Routes
router.get('/', timeEntryController.getAllTimeEntries);
router.post('/', timeEntryValidation, timeEntryController.createTimeEntry);

// Approval workflow
router.put('/:id/approve', approvalValidation, timeEntryController.approveTimeEntry);
router.put('/:id/reject', rejectionValidation, timeEntryController.rejectTimeEntry);

// Reporting endpoints
router.get('/cost-code-summary', timeEntryController.getCostCodeSummary);
router.get('/productivity-report', timeEntryController.getProductivityReport);

// Bulk operations
router.post('/bulk-create', timeEntryController.bulkCreateTimeEntries);

module.exports = router;
