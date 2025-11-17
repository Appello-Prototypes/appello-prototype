const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/projectController');

const router = express.Router();

// Validation middleware
const projectValidation = [
  body('name')
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 200 })
    .withMessage('Project name must be less than 200 characters'),
  
  body('projectNumber')
    .notEmpty()
    .withMessage('Project number is required')
    .isLength({ max: 50 })
    .withMessage('Project number must be less than 50 characters'),
  
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
  
  body('projectManager')
    .isMongoId()
    .withMessage('Valid project manager ID is required')
];

// Routes
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', projectValidation, projectController.createProject);

// Project-specific data endpoints
router.get('/:id/schedule-of-values', projectController.getScheduleOfValues);
router.get('/:id/cost-codes', projectController.getCostCodes);
router.get('/:id/progress-report', projectController.getProgressReport);
router.get('/:id/test-packages', projectController.getTestPackages);

// Work order creation
router.post('/:id/create-foreman-work-order', [
  body('testPackageId').isMongoId().withMessage('Valid test package ID required'),
  body('foremanId').isMongoId().withMessage('Valid foreman ID required'),
  body('isometricDrawings').isArray().withMessage('Isometric drawings array required')
], projectController.createForemanWorkOrder);

module.exports = router;
