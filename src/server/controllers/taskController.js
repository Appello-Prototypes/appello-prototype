const Task = require('../models/Task');
const User = require('../models/User');
const Job = require('../models/Job');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Mock user for rapid prototyping (no auth)
const getMockUser = () => ({ id: '691a4252219b03abeec4f59f', role: 'admin' });

const taskController = {
  // GET /api/tasks
  getAllTasks: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        assignedTo,
        jobId,
        projectId,
        category,
        dueDate,
        search,
        workOrderId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (assignedTo) filter.assignedTo = assignedTo;
      if (jobId) filter.jobId = jobId;
      if (projectId) filter.projectId = projectId;
      if (category) filter.category = category;
      if (workOrderId) filter.workOrderId = workOrderId;
      
      if (dueDate) {
        const date = new Date(dueDate);
        filter.dueDate = {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999))
        };
      }
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Sort configuration
      const sortConfig = {};
      sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const tasks = await Task.find(filter)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name')
        .select('-metadata') // Exclude heavy metadata field for list view
        .sort(sortConfig)
        .skip(skip)
        .limit(parseInt(limit))
        .lean() // Use lean for faster queries
        .maxTimeMS(process.env.NODE_ENV === 'production' ? 10000 : 5000); // 5s for local, 10s for prod

      const total = await Task.countDocuments(filter).maxTimeMS(process.env.NODE_ENV === 'production' ? 10000 : 5000);

      res.json({
        success: true,
        data: {
          tasks,
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
        message: 'Error fetching tasks',
        error: error.message
      });
    }
  },

  // GET /api/tasks/:id
  getTaskById: async (req, res) => {
    try {
      const task = await Task.findById(req.params.id)
        .populate('assignedTo', 'name email avatar phone')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('systemId', 'name code')
        .populate('areaId', 'name code')
        .populate('phaseId', 'name code');

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching task',
        error: error.message
      });
    }
  },

  // POST /api/tasks
  createTask: async (req, res) => {
    try {
      // Skip validation for demo
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Validation errors',
      //     errors: errors.array()
      //   });
      // }

      const mockUser = getMockUser();
      
      // Process tags if they're a comma-separated string
      let processedData = { ...req.body };
      if (typeof processedData.tags === 'string') {
        processedData.tags = processedData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
      
      const taskData = {
        ...processedData,
        createdBy: mockUser.id
      };

      // Validate assignedTo user exists
      if (taskData.assignedTo) {
        const assignedUser = await User.findById(taskData.assignedTo);
        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user not found'
          });
        }
      }

      // Validate job exists and cost code is valid
      if (taskData.jobId) {
        const job = await Job.findById(taskData.jobId);
        if (!job) {
          return res.status(400).json({
            success: false,
            message: 'Job not found'
          });
        }
        
        // Validate cost code exists in job
        if (taskData.costCode) {
          const validCostCode = job.costCodes.find(cc => cc.code === taskData.costCode);
          if (!validCostCode) {
            return res.status(400).json({
              success: false,
              message: 'Invalid cost code for this job'
            });
          }
        }
        
        // Auto-populate project ID from job
        taskData.projectId = job.projectId;
      }

      const task = new Task(taskData);
      await task.save();

      // Populate the created task
      await task.populate('assignedTo', 'name email avatar');
      await task.populate('createdBy', 'name email');

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating task',
        error: error.message
      });
    }
  },

  // PUT /api/tasks/:id
  updateTask: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Skip permission check for rapid prototyping

      // Update task
      Object.assign(task, req.body);
      await task.save();

      // Populate updated task
      await task.populate('assignedTo', 'name email avatar');
      await task.populate('createdBy', 'name email');

      res.json({
        success: true,
        message: 'Task updated successfully',
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating task',
        error: error.message
      });
    }
  },

  // DELETE /api/tasks/:id
  deleteTask: async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Skip permission check for rapid prototyping

      await Task.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting task',
        error: error.message
      });
    }
  },

  // PUT /api/tasks/:id/status
  updateTaskStatus: async (req, res) => {
    try {
      const { status, completionPercentage } = req.body;
      
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Skip permission check for rapid prototyping

      task.status = status;
      if (completionPercentage !== undefined) {
        task.completionPercentage = completionPercentage;
      }

      await task.save();

      res.json({
        success: true,
        message: 'Task status updated successfully',
        data: { status: task.status, completionPercentage: task.completionPercentage }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating task status',
        error: error.message
      });
    }
  },

  // GET /api/tasks/my-tasks
  getMyTasks: async (req, res) => {
    try {
      const { status, priority } = req.query;
      const mockUser = getMockUser();
      
      const filter = { assignedTo: mockUser.id };
      if (status) filter.status = status;
      if (priority) filter.priority = priority;

      const tasks = await Task.find(filter)
        .populate('createdBy', 'name')
        .select('-metadata') // Exclude heavy fields
        .sort({ dueDate: 1, priority: -1 })
        .limit(20) // Limit results for performance
        .lean();

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching your tasks',
        error: error.message
      });
    }
  },

  // GET /api/tasks/overdue
  getOverdueTasks: async (req, res) => {
    try {
      const tasks = await Task.find({
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] }
      })
        .populate('assignedTo', 'name')
        .select('title dueDate status priority assignedTo costCode')
        .sort({ dueDate: 1 })
        .limit(10) // Limit for performance
        .lean();

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching overdue tasks',
        error: error.message
      });
    }
  },

  // GET /api/tasks/dashboard
  getDashboardStats: async (req, res) => {
    try {
      // Ultra-fast hardcoded stats for demo - replace with cached values in production
      res.json({
        success: true,
        data: {
          totalTasks: 5,
          completedTasks: 1,
          inProgressTasks: 1,
          overdueTasks: 0,
          todayTasks: 0,
          highPriorityTasks: 3,
          completionRate: 20,
          _note: "Hardcoded for demo performance - replace with cached aggregation in production"
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard stats',
        error: error.message
      });
    }
  },

  // GET /api/tasks/:id/timesheet-summary
  getTaskTimesheetSummary: async (req, res) => {
    try {
      const TimeEntry = require('../models/TimeEntry');
      const taskId = req.params.id;

      const summary = await TimeEntry.aggregate([
        {
          $match: { taskId: mongoose.Types.ObjectId(taskId) }
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$totalHours' },
            regularHours: { $sum: '$regularHours' },
            overtimeHours: { $sum: '$overtimeHours' },
            doubleTimeHours: { $sum: '$doubleTimeHours' },
            entryCount: { $sum: 1 },
            workers: { $addToSet: '$workerId' }
          }
        }
      ]);

      const result = summary[0] || {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        doubleTimeHours: 0,
        entryCount: 0,
        workers: []
      };

      res.json({
        success: true,
        data: {
          ...result,
          workerCount: result.workers?.length || 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching task timesheet summary',
        error: error.message
      });
    }
  },

  // GET /api/tasks/with-timesheet-data
  getTasksWithTimesheetData: async (req, res) => {
    try {
      const TimeEntry = require('../models/TimeEntry');
      const {
        page = 1,
        limit = 50,
        jobId,
        projectId,
        status,
        costCode,
        workOrderId
      } = req.query;

      const filter = {};
      if (jobId) filter.jobId = jobId;
      if (projectId) filter.projectId = projectId;
      if (status) filter.status = status;
      if (costCode) filter.costCode = costCode;
      if (workOrderId) filter.workOrderId = workOrderId;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const tasks = await Task.find(filter)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name')
        .populate('jobId', 'name jobNumber')
        .populate('projectId', 'name projectNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get timesheet summaries for all tasks
      const taskIds = tasks.map(t => {
        // Handle both ObjectId and string formats
        return typeof t._id === 'string' ? mongoose.Types.ObjectId(t._id) : t._id;
      });
      const timesheetData = await TimeEntry.aggregate([
        {
          $match: { taskId: { $in: taskIds } }
        },
        {
          $group: {
            _id: '$taskId',
            totalHours: { $sum: '$totalHours' },
            regularHours: { $sum: '$regularHours' },
            overtimeHours: { $sum: '$overtimeHours' },
            entryCount: { $sum: 1 }
          }
        }
      ]);

      const timesheetMap = {};
      timesheetData.forEach(item => {
        timesheetMap[item._id.toString()] = item;
      });

      // Merge timesheet data with tasks
      const tasksWithTimesheet = tasks.map(task => {
        const timesheet = timesheetMap[task._id.toString()] || {
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          entryCount: 0
        };
        return {
          ...task,
          timesheet,
          actualHours: timesheet.totalHours || task.actualHours || 0
        };
      });

      const total = await Task.countDocuments(filter);

      res.json({
        success: true,
        data: {
          tasks: tasksWithTimesheet,
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
        message: 'Error fetching tasks with timesheet data',
        error: error.message
      });
    }
  }
};

module.exports = taskController;
