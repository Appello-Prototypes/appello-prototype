const express = require('express');
const { body } = require('express-validator');
const jobController = require('../controllers/jobController');

const router = express.Router();

// Validation middleware
const jobValidation = [
  body('name')
    .notEmpty()
    .withMessage('Job name is required')
    .isLength({ max: 200 })
    .withMessage('Job name must be less than 200 characters'),
  
  body('jobNumber')
    .notEmpty()
    .withMessage('Job number is required')
    .isLength({ max: 50 })
    .withMessage('Job number must be less than 50 characters'),
  
  body('projectId')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('client.name')
    .notEmpty()
    .withMessage('Client name is required'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required'),
  
  body('contractValue')
    .isNumeric()
    .withMessage('Contract value must be a number'),
  
  body('jobManager')
    .isMongoId()
    .withMessage('Valid job manager ID is required')
];

// Routes
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);
router.post('/', jobController.createJob);
router.patch('/:id', jobController.updateJob);

// Job-specific data endpoints
router.get('/:id/schedule-of-values', jobController.getScheduleOfValues);
router.get('/:id/cost-codes', jobController.getCostCodes);
router.get('/:id/progress-report', jobController.getProgressReport);
router.get('/:id/test-packages', jobController.getTestPackages);

// Work order creation
router.post('/:id/create-foreman-work-order', jobController.createForemanWorkOrder);

// SOV and enhanced task views
router.get('/:id/sov-components', jobController.getJobSOVComponents);
router.get('/:id/tasks-enhanced', jobController.getJobTasksEnhanced);

module.exports = router;
