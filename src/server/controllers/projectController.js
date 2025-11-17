const Project = require('../models/Project');
const Task = require('../models/Task');
const TimeEntry = require('../models/TimeEntry');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const projectController = {
  // GET /api/projects
  getAllProjects: async (req, res) => {
    try {
      const { status, projectManager } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (projectManager) filter.projectManager = projectManager;
      
      // Simplified query - only populate essential fields for list view
      const projects = await Project.find(filter)
        .populate('projectManager', 'name')
        .select('name projectNumber client.name status startDate endDate totalContractValue overallProgress createdAt')
        .sort({ createdAt: -1 })
        .lean(); // Use lean for faster queries
      
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching projects',
        error: error.message
      });
    }
  },

  // GET /api/projects/:id
  getProjectById: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id)
        .populate('projectManager', 'name email phone')
        .populate('fieldSupervisor', 'name email phone')
        .populate('foremen', 'name email phone');

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching project',
        error: error.message
      });
    }
  },

  // POST /api/projects
  createProject: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const project = new Project(req.body);
      await project.save();

      await project.populate('projectManager', 'name email');
      await project.populate('fieldSupervisor', 'name email');

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating project',
        error: error.message
      });
    }
  },

  // GET /api/projects/:id/schedule-of-values
  getScheduleOfValues: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Calculate progress for each SOV line item
      const sovWithProgress = await Promise.all(
        project.scheduleOfValues.map(async (lineItem) => {
          // Get tasks related to this line item
          const tasks = await Task.find({
            projectId: project._id,
            scheduleOfValuesLineItem: lineItem._id.toString()
          });

          // Calculate progress
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          // Get actual hours from time entries
          const timeEntries = await TimeEntry.find({
            projectId: project._id,
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

  // GET /api/projects/:id/cost-codes
  getCostCodes: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id)
        .select('costCodes')
        .lean();
        
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // For demo performance, use pre-calculated values from the project
      const costCodeSummary = (project.costCodes || []).map(budgetCode => {
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

  // GET /api/projects/:id/progress-report
  getProgressReport: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Generate progress report by system and area
      const progressData = [];

      for (const system of project.systems) {
        for (const area of project.areas) {
          // Get tasks for this system/area combination
          const tasks = await Task.find({
            projectId: project._id,
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
          const sovLineItems = project.scheduleOfValues.filter(
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
          projectId: project._id,
          projectName: project.name,
          overallProgress: project.overallProgress,
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

  // GET /api/projects/:id/test-packages
  getTestPackages: async (req, res) => {
    try {
      const project = await Project.findById(req.params.id)
        .populate('testPackages.assignedForeman', 'name email');

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Enhance test packages with task information
      const enhancedPackages = await Promise.all(
        project.testPackages.map(async (pkg) => {
          const tasks = await Task.find({
            projectId: project._id,
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

  // POST /api/projects/:id/create-foreman-work-order
  createForemanWorkOrder: async (req, res) => {
    try {
      const { testPackageId, foremanId, isometricDrawings, instructions } = req.body;
      
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const testPackage = project.testPackages.id(testPackageId);
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
            projectId: project._id,
            testPackageId: testPackageId,
            isometricDrawingId: drawingId,
            assignedTo: foremanId,
            createdBy: req.user?.id || project.projectManager,
            category: craft,
            craft: craft,
            costCode: `${craft.toUpperCase()}_${drawing.drawingNumber}`,
            estimatedHours: drawing.budgetHours / drawing.crafts.length,
            workOrderNumber: `WO-${project.projectNumber}-${testPackage.name}-${Date.now()}`,
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

      await project.save();

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
  }
};

module.exports = projectController;
