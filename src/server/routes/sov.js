const express = require('express');
const { body } = require('express-validator');
const sovController = require('../controllers/sovController');

const router = express.Router();

// Validation middleware for components
const componentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 200 })
    .withMessage('Name must be less than 200 characters'),
  
  body('code')
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ max: 50 })
    .withMessage('Code must be less than 50 characters'),
  
  body('jobId')
    .isMongoId()
    .withMessage('Valid job ID is required'),
  
  body('projectId')
    .isMongoId()
    .withMessage('Valid project ID is required')
];

// SOV Line Item validation
const sovLineItemValidation = [
  body('lineNumber')
    .notEmpty()
    .withMessage('Line number is required'),
  
  body('costCode')
    .notEmpty()
    .withMessage('Cost code is required'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required'),
  
  body('totalCost')
    .isFloat({ min: 0 })
    .withMessage('Total cost must be a positive number'),
  
  body('margin')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Margin must be between 0 and 100'),
  
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  
  body('unit')
    .isIn(['LF', 'SF', 'EA', 'CY', 'TON', 'HR', 'LS', 'LB', 'GAL', 'FT', 'YD', 'SQ'])
    .withMessage('Invalid unit of measure'),
  
  body('jobId')
    .isMongoId()
    .withMessage('Valid job ID is required'),
  
  body('projectId')
    .isMongoId()
    .withMessage('Valid project ID is required')
];

// Systems routes
router.post('/systems', componentValidation, sovController.createSystem);
router.get('/systems', sovController.getSystems);
router.put('/systems/:id', componentValidation, sovController.updateSystem);
router.delete('/systems/:id', sovController.deleteSystem);

// Areas routes
router.post('/areas', componentValidation, sovController.createArea);
router.get('/areas', sovController.getAreas);
router.put('/areas/:id', componentValidation, sovController.updateArea);
router.delete('/areas/:id', sovController.deleteArea);

// Phases routes
router.post('/phases', componentValidation, sovController.createPhase);
router.get('/phases', sovController.getPhases);
router.put('/phases/:id', componentValidation, sovController.updatePhase);
router.delete('/phases/:id', sovController.deletePhase);

// Modules routes
router.post('/modules', componentValidation, sovController.createModule);
router.get('/modules', sovController.getModules);
router.put('/modules/:id', componentValidation, sovController.updateModule);
router.delete('/modules/:id', sovController.deleteModule);

// Components routes
router.post('/components', componentValidation, sovController.createComponent);
router.get('/components', sovController.getComponents);
router.put('/components/:id', componentValidation, sovController.updateComponent);
router.delete('/components/:id', sovController.deleteComponent);

// Schedule of Values line items
router.post('/line-items', sovLineItemValidation, sovController.createSOVLineItem);
router.get('/line-items', sovController.getSOVLineItems);
router.put('/line-items/:id', sovLineItemValidation, sovController.updateSOVLineItem);
router.delete('/line-items/:id', sovController.deleteSOVLineItem);

// Bulk operations
router.post('/bulk-create', [
  body('type')
    .isIn(['system', 'area', 'phase', 'module', 'component'])
    .withMessage('Invalid component type'),
  body('components')
    .isArray({ min: 1 })
    .withMessage('Components array is required')
], sovController.bulkCreateComponents);

// Job initialization
router.post('/jobs/:jobId/initialize', sovController.initializeJobSOV);

module.exports = router;
