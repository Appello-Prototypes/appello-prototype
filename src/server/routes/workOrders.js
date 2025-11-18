const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/workOrderController');

// GET /api/work-orders - Get all work orders with filters
router.get('/', workOrderController.getAllWorkOrders);

// GET /api/work-orders/:id - Get single work order by ID
router.get('/:id', workOrderController.getWorkOrderById);

// POST /api/work-orders - Create new work order
router.post('/', workOrderController.createWorkOrder);

// PUT /api/work-orders/:id - Update work order
router.put('/:id', workOrderController.updateWorkOrder);

// DELETE /api/work-orders/:id - Delete work order
router.delete('/:id', workOrderController.deleteWorkOrder);

// GET /api/work-orders/:id/tasks - Get all tasks for a work order
router.get('/:id/tasks', workOrderController.getWorkOrderTasks);

// POST /api/work-orders/:id/add-task - Add existing task to work order
router.post('/:id/add-task', workOrderController.addTaskToWorkOrder);

// POST /api/work-orders/:id/remove-task - Remove task from work order
router.post('/:id/remove-task', workOrderController.removeTaskFromWorkOrder);

// POST /api/work-orders/:id/update-status - Update work order status
router.post('/:id/update-status', workOrderController.updateStatus);

// POST /api/work-orders/:id/add-field-note - Add field note to work order
router.post('/:id/add-field-note', workOrderController.addFieldNote);

module.exports = router;

