const express = require('express');
const { body } = require('express-validator');
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const taskValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority'),
  
  body('assignedTo')
    .notEmpty()
    .withMessage('Assigned user is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  
  body('category')
    .optional()
    .isIn([
      'installation', 
      'insulation',
      'heat_tracing',
      'fireproofing',
      'painting',
      'jacketing',
      'maintenance', 
      'inspection', 
      'repair', 
      'administrative', 
      'safety', 
      'quality_control',
      'material_handling',
      'documentation',
      'equipment_check',
      'progress_reporting',
      'preparation',
      'cleanup'
    ])
    .withMessage('Invalid category'),
  
  body('completionPercentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Completion percentage must be between 0 and 100'),
  
  body('tags')
    .optional()
    .custom((value) => {
      // Allow both arrays and comma-separated strings
      return Array.isArray(value) || typeof value === 'string'
    })
    .withMessage('Tags must be an array or comma-separated string')
];

const statusUpdateValidation = [
  body('status')
    .isIn(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('completionPercentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Completion percentage must be between 0 and 100')
];

// Authentication disabled for rapid prototyping
// router.use(auth);

// Routes
router.get('/', taskController.getAllTasks);
router.get('/my-tasks', taskController.getMyTasks);
router.get('/overdue', taskController.getOverdueTasks);
router.get('/dashboard', taskController.getDashboardStats);
router.get('/:id', taskController.getTaskById);

router.post('/', taskController.createTask); // Validation removed for demo
router.put('/:id', taskController.updateTask); // Validation removed for demo
router.put('/:id/status', statusUpdateValidation, taskController.updateTaskStatus);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
