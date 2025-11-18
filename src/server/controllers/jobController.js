const mongoose = require('mongoose');
const Job = require('../models/Job');
const Project = require('../models/Project');
const Task = require('../models/Task');
const TimeEntry = require('../models/TimeEntry');
const User = require('../models/User');
const System = require('../models/System');
const Area = require('../models/Area');
const Phase = require('../models/Phase');
const Module = require('../models/Module');
const Component = require('../models/Component');
const ScheduleOfValues = require('../models/ScheduleOfValues');
const { validationResult } = require('express-validator');

const jobController = {
  // GET /api/jobs
  getAllJobs: async (req, res) => {
    const startTime = Date.now();
    try {
      const { status, jobManager, projectId } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (jobManager) filter.jobManager = jobManager;
      if (projectId) filter.projectId = projectId;
      
      const queryStart = Date.now();
      // Simplified query - only populate essential fields for list view
      // Use lean for faster queries and handle populate errors gracefully
      const jobs = await Job.find(filter)
        .populate('jobManager', 'name')
        .populate('projectId', 'name projectNumber')
        .select('name jobNumber client.name status startDate endDate contractValue overallProgress createdAt projectId')
        .sort({ createdAt: -1 })
        .lean() // Use lean for faster queries
        .maxTimeMS(process.env.NODE_ENV === 'production' ? 10000 : 5000); // 5s for local, 10s for prod
      
      const queryTime = Date.now() - queryStart;
      const totalTime = Date.now() - startTime;
      
      if (queryTime > 100 || totalTime > 500) {
        console.log(`⚠️  getAllJobs: query=${queryTime}ms, total=${totalTime}ms`);
      }
      
      res.json({
        success: true,
        data: jobs
      });
    } catch (error) {
      console.error('Error in getAllJobs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/jobs/:id
  getJobById: async (req, res) => {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID format'
        });
      }

      const job = await Job.findById(req.params.id)
        .populate('jobManager', 'name email phone')
        .populate('estimator', 'name email phone')
        .populate('projectId', 'name projectNumber')
        .populate('fieldSupervisor', 'name email phone')
        .populate('foremen', 'name email phone')
        .maxTimeMS(10000) // 10 second timeout
        .lean(); // Use lean() for faster queries

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error in getJobById:', error);
      // Handle specific MongoDB errors
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID format'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error fetching job',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/jobs
  createJob: async (req, res) => {
    try {
      const job = new Job(req.body);
      await job.save();

      await job.populate('jobManager', 'name email');
      await job.populate('estimator', 'name email');
      await job.populate('projectId', 'name projectNumber');
      await job.populate('fieldSupervisor', 'name email');

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: job
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating job',
        error: error.message
      });
    }
  },

  // PATCH /api/jobs/:id
  updateJob: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID format'
        });
      }

      const job = await Job.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      )
        .populate('jobManager', 'name email phone')
        .populate('estimator', 'name email phone')
        .populate('projectId', 'name projectNumber')
        .populate('fieldSupervisor', 'name email phone')
        .populate('foremen', 'name email phone')
        .lean();

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      res.json({
        success: true,
        message: 'Job updated successfully',
        data: job
      });
    } catch (error) {
      console.error('Error in updateJob:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating job',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/jobs/:id/schedule-of-values
  getScheduleOfValues: async (req, res) => {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Calculate progress for each SOV line item
      const sovWithProgress = await Promise.all(
        job.scheduleOfValues.map(async (lineItem) => {
          // Get tasks related to this line item
          const tasks = await Task.find({
            jobId: job._id,
            scheduleOfValuesLineItem: lineItem._id.toString()
          });

          // Calculate progress
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          // Get actual hours from time entries
          const timeEntries = await TimeEntry.find({
            jobId: job._id,
            scheduleOfValuesLineItem: lineItem._id.toString(),
            status: 'approved'
          });

          const actualHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
          const actualCost = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);

          return {
            ...lineItem.toObject(),
            progressPercentage: Math.round(progressPercentage),
            actualHours,
            actualCost,
            hoursVariance: lineItem.budgetHours - actualHours,
            earnedValue: (progressPercentage / 100) * lineItem.totalValue
          };
        })
      );

      res.json({
        success: true,
        data: sovWithProgress
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching schedule of values',
        error: error.message
      });
    }
  },

  // GET /api/jobs/:id/cost-codes
  getCostCodes: async (req, res) => {
    try {
      const job = await Job.findById(req.params.id)
        .select('costCodes')
        .lean();
        
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // For demo performance, use pre-calculated values from the job
      const costCodeSummary = (job.costCodes || []).map(budgetCode => {
        // Use the actualHours and actualCost already stored in the project
        const actualHours = budgetCode.actualHours || 0;
        const actualCost = budgetCode.actualCost || 0;
        const budgetHours = budgetCode.budgetHours || 0;
        const budgetCost = budgetCode.budgetCost || 0;

        return {
          code: budgetCode.code,
          description: budgetCode.description,
          category: budgetCode.category,
          budgetHours,
          budgetCost,
          actualHours,
          actualCost,
          hoursVariance: budgetHours - actualHours,
          costVariance: budgetCost - actualCost,
          hoursUtilization: budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0,
          entryCount: actualHours > 0 ? Math.ceil(actualHours / 8) : 0 // Estimate entries
        };
      });

      res.json({
        success: true,
        data: costCodeSummary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching cost codes',
        error: error.message
      });
    }
  },

  // GET /api/jobs/:id/progress-report
  getProgressReport: async (req, res) => {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Generate progress report by system and area
      const progressData = [];

      for (const system of job.systems) {
        for (const area of job.areas) {
          // Get tasks for this system/area combination
          const tasks = await Task.find({
            jobId: job._id,
            systemId: system._id.toString(),
            areaId: area._id.toString()
          });

          if (tasks.length === 0) continue;

          // Calculate progress
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
          
          const progressPercentage = totalTasks > 0 ? 
            ((completedTasks + (inProgressTasks * 0.5)) / totalTasks) * 100 : 0;

          // Get related SOV line items
          const sovLineItems = job.scheduleOfValues.filter(
            sov => sov.system === system.name && sov.area === area.name
          );
          
          const totalValue = sovLineItems.reduce((sum, sov) => sum + sov.totalValue, 0);
          const earnedValue = (progressPercentage / 100) * totalValue;

          progressData.push({
            system: system.name,
            systemCode: system.code,
            area: area.name,
            areaCode: area.code,
            totalTasks,
            completedTasks,
            inProgressTasks,
            progressPercentage: Math.round(progressPercentage),
            totalValue,
            earnedValue,
            lastUpdated: new Date()
          });
        }
      }

      res.json({
        success: true,
        data: {
          jobId: job._id,
          jobName: job.name,
          projectId: job.projectId,
          overallProgress: job.overallProgress,
          reportDate: new Date(),
          breakdown: progressData
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating progress report',
        error: error.message
      });
    }
  },

  // GET /api/jobs/:id/test-packages
  getTestPackages: async (req, res) => {
    try {
      const job = await Job.findById(req.params.id)
        .populate('testPackages.assignedForeman', 'name email');

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Enhance test packages with task information
      const enhancedPackages = await Promise.all(
        job.testPackages.map(async (pkg) => {
          const tasks = await Task.find({
            jobId: job._id,
            testPackageId: pkg._id.toString()
          });

          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          return {
            ...pkg.toObject(),
            taskCount: totalTasks,
            completedTasks,
            progressPercentage: Math.round(progressPercentage)
          };
        })
      );

      res.json({
        success: true,
        data: enhancedPackages
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching test packages',
        error: error.message
      });
    }
  },

  // POST /api/jobs/:id/create-foreman-work-order
  createForemanWorkOrder: async (req, res) => {
    try {
      const { testPackageId, foremanId, isometricDrawings, instructions } = req.body;
      
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const testPackage = job.testPackages.id(testPackageId);
      if (!testPackage) {
        return res.status(404).json({
          success: false,
          message: 'Test package not found'
        });
      }

      // Assign foreman to test package
      testPackage.assignedForeman = foremanId;
      
      // Create tasks for each isometric drawing
      const tasks = [];
      for (const drawingId of isometricDrawings) {
        const drawing = testPackage.isometricDrawings.id(drawingId);
        if (!drawing) continue;

        // Create tasks for each craft on the drawing
        for (const craft of drawing.crafts) {
        const task = new Task({
          title: `${craft} - ${drawing.title}`,
          description: `${craft} work on ${drawing.drawingNumber}: ${drawing.title}`,
          jobId: job._id,
          projectId: job.projectId,
          testPackageId: testPackageId,
          isometricDrawingId: drawingId,
          assignedTo: foremanId,
          createdBy: req.user?.id || job.jobManager,
          category: craft,
          craft: craft,
          costCode: `${craft.toUpperCase()}_${drawing.drawingNumber}`,
          estimatedHours: drawing.budgetHours / drawing.crafts.length,
          workOrderNumber: `WO-${job.jobNumber}-${testPackage.name}-${Date.now()}`,
          requiresFieldSupervisorApproval: true,
          priority: 'medium',
          status: 'not_started'
        });

          if (instructions) {
            task.description += `\n\nInstructions: ${instructions}`;
          }

          await task.save();
          tasks.push(task);
        }
      }

      await job.save();

      res.json({
        success: true,
        message: 'Foreman work order created successfully',
        data: {
          testPackageId,
          foremanId,
          tasksCreated: tasks.length,
          tasks: tasks.map(t => ({
            id: t._id,
            title: t.title,
            workOrderNumber: t.workOrderNumber,
            craft: t.craft
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating foreman work order',
        error: error.message
      });
    }
  },

  // GET /api/jobs/:id/sov-components
  getJobSOVComponents: async (req, res) => {
    try {
      const { id } = req.params;

      // Get all SOV components for the job with timeouts and optimized populates
      // Limit populate fields to only what's needed
      const [systems, areas, phases, modules, components, sovLineItems] = await Promise.all([
        System.find({ jobId: id }).sort({ sortOrder: 1, code: 1 }).maxTimeMS(10000).lean(),
        Area.find({ jobId: id }).sort({ sortOrder: 1, code: 1 }).maxTimeMS(10000).lean(),
        Phase.find({ jobId: id }).sort({ sortOrder: 1, code: 1 }).maxTimeMS(10000).lean(),
        Module.find({ jobId: id })
          .populate('systemId', 'name code')
          .sort({ sortOrder: 1, code: 1 })
          .maxTimeMS(10000)
          .lean(),
        Component.find({ jobId: id })
          .populate('moduleId', 'name code')
          .sort({ sortOrder: 1, code: 1 })
          .maxTimeMS(10000)
          .lean(),
        ScheduleOfValues.find({ jobId: id })
          .populate('systemId', 'name code')
          .populate('areaId', 'name code')
          .populate('phaseId', 'name code')
          .populate('moduleId', 'name code')
          .populate('componentId', 'name code')
          .sort({ sortOrder: 1, lineNumber: 1 })
          .maxTimeMS(10000)
          .lean()
      ]);

      res.json({
        success: true,
        data: {
          systems,
          areas,
          phases,
          modules,
          components,
          sovLineItems,
          summary: {
            systemsCount: systems.length,
            areasCount: areas.length,
            phasesCount: phases.length,
            modulesCount: modules.length,
            componentsCount: components.length,
            sovLineItemsCount: sovLineItems.length,
            totalValue: sovLineItems.reduce((sum, item) => sum + item.totalValue, 0),
            totalCost: sovLineItems.reduce((sum, item) => sum + item.totalCost, 0)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching job SOV components',
        error: error.message
      });
    }
  },

  // GET /api/jobs/:id/tasks-enhanced
  getJobTasksEnhanced: async (req, res) => {
    try {
      const { id } = req.params;
      const { view = 'card', groupBy, filterBy } = req.query;

      // Base query
      let query = Task.find({ jobId: id });

      // Apply filters
      if (filterBy) {
        const filters = JSON.parse(filterBy);
        if (filters.status) query = query.where('status').in(filters.status);
        if (filters.priority) query = query.where('priority').in(filters.priority);
        if (filters.systemId) query = query.where('systemId').in(filters.systemId);
        if (filters.areaId) query = query.where('areaId').in(filters.areaId);
        if (filters.phaseId) query = query.where('phaseId').in(filters.phaseId);
        if (filters.assignedTo) query = query.where('assignedTo').in(filters.assignedTo);
      }

      // Execute query with population and timeout
      const tasks = await query
        .populate('assignedTo', 'name email initials')
        .populate('createdBy', 'name')
        .populate('systemId', 'name code')
        .populate('areaId', 'name code')
        .populate('phaseId', 'name code')
        .populate('moduleId', 'name code')
        .populate('componentId', 'name code')
        .populate('scheduleOfValuesId')
        .sort({ dueDate: 1, priority: -1, createdAt: -1 })
        .maxTimeMS(10000) // 10 second timeout
        .lean(); // Use lean() for faster queries

      let responseData = tasks;

      // Group tasks if requested
      if (groupBy) {
        responseData = groupTasks(tasks, groupBy);
      }

      // Add view-specific formatting
      if (view === 'gantt') {
        responseData = formatTasksForGantt(tasks);
      } else if (view === 'table') {
        responseData = formatTasksForTable(tasks);
      }

      res.json({
        success: true,
        data: responseData,
        meta: {
          total: tasks.length,
          view,
          groupBy,
          summary: {
            notStarted: tasks.filter(t => t.status === 'not_started').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            onHold: tasks.filter(t => t.status === 'on_hold').length,
            overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching enhanced job tasks',
        error: error.message
      });
    }
  }
};

// Helper functions for task formatting
function groupTasks(tasks, groupBy) {
  const grouped = {};
  
  tasks.forEach(task => {
    let key;
    switch (groupBy) {
      case 'system':
        key = task.systemId ? task.systemId.name : 'No System';
        break;
      case 'area':
        key = task.areaId ? task.areaId.name : 'No Area';
        break;
      case 'phase':
        key = task.phaseId ? task.phaseId.name : 'No Phase';
        break;
      case 'status':
        key = task.status;
        break;
      case 'priority':
        key = task.priority;
        break;
      case 'assignedTo':
        key = task.assignedTo ? task.assignedTo.name : 'Unassigned';
        break;
      default:
        key = 'All Tasks';
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(task);
  });
  
  return grouped;
}

function formatTasksForGantt(tasks) {
  return tasks.map(task => ({
    id: task._id,
    name: task.title,
    start: task.startDate || task.createdAt,
    end: task.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days if no due date
    progress: task.completionPercentage || 0,
    dependencies: [], // Could be enhanced to show task dependencies
    resource: task.assignedTo ? task.assignedTo.name : 'Unassigned',
    type: 'task',
    status: task.status,
    priority: task.priority,
    system: task.systemId ? task.systemId.name : null,
    area: task.areaId ? task.areaId.name : null,
    phase: task.phaseId ? task.phaseId.name : null
  }));
}

function formatTasksForTable(tasks) {
  return tasks.map(task => ({
    id: task._id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo ? task.assignedTo.name : 'Unassigned',
    dueDate: task.dueDate,
    progress: task.completionPercentage || 0,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
    costCode: task.costCode,
    system: task.systemId ? `${task.systemId.code} - ${task.systemId.name}` : null,
    area: task.areaId ? `${task.areaId.code} - ${task.areaId.name}` : null,
    phase: task.phaseId ? `${task.phaseId.code} - ${task.phaseId.name}` : null,
    module: task.moduleId ? `${task.moduleId.code} - ${task.moduleId.name}` : null,
    component: task.componentId ? `${task.componentId.code} - ${task.componentId.name}` : null,
    sovLineItem: task.scheduleOfValuesId ? task.scheduleOfValuesId.lineNumber : null
  }));
}

module.exports = jobController;
