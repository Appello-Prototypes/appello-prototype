const WorkOrder = require('../models/WorkOrder');
const Task = require('../models/Task');
const Job = require('../models/Job');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Mock user for rapid prototyping (no auth)
const getMockUser = () => ({ id: '691a4252219b03abeec4f59f', role: 'admin' });

const workOrderController = {
  // GET /api/work-orders
  getAllWorkOrders: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        jobId,
        projectId,
        assignedTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (jobId) filter.jobId = jobId;
      if (projectId) filter.projectId = projectId;
      if (assignedTo) filter.assignedTo = assignedTo;
      
      if (search) {
        filter.$or = [
          { workOrderNumber: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Sort configuration
      const sortConfig = {};
      sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const workOrders = await WorkOrder.find(filter)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('jobId', 'name jobNumber')
        .populate('projectId', 'name projectNumber')
        .populate('systemId', 'name code')
        .populate('areaId', 'name code')
        .populate('phaseId', 'name code')
        .select('-metadata') // Exclude heavy metadata field for list view
        .sort(sortConfig)
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .maxTimeMS(process.env.NODE_ENV === 'production' ? 10000 : 5000);

      // Get task counts for each work order
      const workOrderIds = workOrders.map(wo => wo._id);
      const taskCounts = await Task.aggregate([
        { $match: { workOrderId: { $in: workOrderIds } } },
        {
          $group: {
            _id: '$workOrderId',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        }
      ]).option({ maxTimeMS: 5000 });

      const taskCountMap = {};
      taskCounts.forEach(tc => {
        taskCountMap[tc._id.toString()] = tc;
      });

      // Add task counts to work orders
      workOrders.forEach(wo => {
        const counts = taskCountMap[wo._id.toString()] || { totalTasks: 0, completedTasks: 0 };
        wo.taskCount = counts.totalTasks;
        wo.completedTaskCount = counts.completedTasks;
      });

      const total = await WorkOrder.countDocuments(filter).maxTimeMS(process.env.NODE_ENV === 'production' ? 10000 : 5000);

      res.json({
        success: true,
        data: {
          workOrders,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching work orders',
        error: error.message
      });
    }
  },

  // GET /api/work-orders/:id
  getWorkOrderById: async (req, res) => {
    try {
      const workOrder = await WorkOrder.findById(req.params.id)
        .populate('assignedTo', 'name email avatar phone')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('jobId', 'name jobNumber')
        .populate('projectId', 'name projectNumber')
        .populate('systemId', 'name code')
        .populate('areaId', 'name code')
        .populate('phaseId', 'name code')
        .populate('scheduleOfValuesId');

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      // Get associated tasks
      const tasks = await Task.find({ workOrderId: workOrder._id })
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .select('-metadata')
        .sort({ createdAt: -1 })
        .lean();

      // Calculate aggregated hours and costs from tasks
      const aggregatedData = tasks.reduce((acc, task) => {
        acc.totalEstimatedHours += task.estimatedHours || 0;
        acc.totalActualHours += task.actualHours || 0;
        return acc;
      }, { totalEstimatedHours: 0, totalActualHours: 0 });

      res.json({
        success: true,
        data: {
          ...workOrder.toObject(),
          tasks,
          aggregatedData
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching work order',
        error: error.message
      });
    }
  },

  // POST /api/work-orders
  createWorkOrder: async (req, res) => {
    try {
      const mockUser = getMockUser();
      
      const workOrderData = {
        ...req.body,
        createdBy: mockUser.id
      };

      // Auto-generate work order number if not provided
      if (!workOrderData.workOrderNumber) {
        const job = await Job.findById(workOrderData.jobId);
        if (!job) {
          return res.status(404).json({
            success: false,
            message: 'Job not found'
          });
        }

        // Generate unique work order number
        const timestamp = Date.now();
        const baseNumber = `WO-${job.jobNumber}-${timestamp}`;
        let workOrderNumber = baseNumber;
        let counter = 1;

        // Ensure uniqueness
        while (await WorkOrder.findOne({ workOrderNumber })) {
          workOrderNumber = `${baseNumber}-${counter}`;
          counter++;
        }

        workOrderData.workOrderNumber = workOrderNumber;
      }

      // Set projectId from job if not provided
      if (!workOrderData.projectId && workOrderData.jobId) {
        const job = await Job.findById(workOrderData.jobId);
        if (job && job.projectId) {
          workOrderData.projectId = job.projectId;
        }
      }

      const workOrder = new WorkOrder(workOrderData);
      await workOrder.save();

      // Populate before returning
      await workOrder.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'jobId', select: 'name jobNumber' },
        { path: 'projectId', select: 'name projectNumber' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Work order created successfully',
        data: workOrder
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Work order number already exists',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating work order',
        error: error.message
      });
    }
  },

  // PUT /api/work-orders/:id
  updateWorkOrder: async (req, res) => {
    try {
      const workOrder = await WorkOrder.findById(req.params.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      // Update fields
      Object.keys(req.body).forEach(key => {
        if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
          workOrder[key] = req.body[key];
        }
      });

      await workOrder.save();

      // Populate before returning
      await workOrder.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'approvedBy', select: 'name email' },
        { path: 'jobId', select: 'name jobNumber' },
        { path: 'projectId', select: 'name projectNumber' },
        { path: 'systemId', select: 'name code' },
        { path: 'areaId', select: 'name code' },
        { path: 'phaseId', select: 'name code' }
      ]);

      res.json({
        success: true,
        message: 'Work order updated successfully',
        data: workOrder
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating work order',
        error: error.message
      });
    }
  },

  // DELETE /api/work-orders/:id
  deleteWorkOrder: async (req, res) => {
    try {
      const workOrder = await WorkOrder.findById(req.params.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      // Check if work order has associated tasks
      const taskCount = await Task.countDocuments({ workOrderId: workOrder._id });
      
      if (taskCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete work order with ${taskCount} associated task(s). Please remove or reassign tasks first.`
        });
      }

      await workOrder.deleteOne();

      res.json({
        success: true,
        message: 'Work order deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting work order',
        error: error.message
      });
    }
  },

  // GET /api/work-orders/:id/tasks
  getWorkOrderTasks: async (req, res) => {
    try {
      const workOrder = await WorkOrder.findById(req.params.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      const tasks = await Task.find({ workOrderId: workOrder._id })
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('systemId', 'name code')
        .populate('areaId', 'name code')
        .populate('phaseId', 'name code')
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching work order tasks',
        error: error.message
      });
    }
  },

  // POST /api/work-orders/:id/add-task
  addTaskToWorkOrder: async (req, res) => {
    try {
      const { taskId } = req.body;
      const workOrder = await WorkOrder.findById(req.params.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Verify task belongs to same job
      if (task.jobId.toString() !== workOrder.jobId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Task must belong to the same job as the work order'
        });
      }

      task.workOrderId = workOrder._id;
      // Also update legacy workOrderNumber for backward compatibility
      if (!task.workOrderNumber) {
        task.workOrderNumber = workOrder.workOrderNumber;
      }
      await task.save();

      res.json({
        success: true,
        message: 'Task added to work order successfully',
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding task to work order',
        error: error.message
      });
    }
  },

  // POST /api/work-orders/:id/remove-task
  removeTaskFromWorkOrder: async (req, res) => {
    try {
      const { taskId } = req.body;
      const task = await Task.findById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      if (task.workOrderId?.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Task is not associated with this work order'
        });
      }

      task.workOrderId = null;
      await task.save();

      res.json({
        success: true,
        message: 'Task removed from work order successfully',
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error removing task from work order',
        error: error.message
      });
    }
  },

  // POST /api/work-orders/:id/update-status
  updateStatus: async (req, res) => {
    try {
      const { status, completionPercentage } = req.body;
      const workOrder = await WorkOrder.findById(req.params.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      workOrder.status = status;
      if (completionPercentage !== undefined) {
        workOrder.completionPercentage = completionPercentage;
      }

      if (status === 'completed' || status === 'closed') {
        workOrder.completedDate = new Date();
        workOrder.completionPercentage = 100;
      }

      await workOrder.save();

      res.json({
        success: true,
        message: 'Work order status updated successfully',
        data: workOrder
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating work order status',
        error: error.message
      });
    }
  },

  // POST /api/work-orders/:id/add-field-note
  addFieldNote: async (req, res) => {
    try {
      const { note } = req.body;
      const mockUser = getMockUser();
      const workOrder = await WorkOrder.findById(req.params.id);

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      await workOrder.addFieldNote(mockUser.id, note);

      res.json({
        success: true,
        message: 'Field note added successfully',
        data: workOrder
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding field note',
        error: error.message
      });
    }
  }
};

module.exports = workOrderController;

