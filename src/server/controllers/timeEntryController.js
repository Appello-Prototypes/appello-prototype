const TimeEntry = require('../models/TimeEntry');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { validationResult } = require('express-validator');

const timeEntryController = {
  // GET /api/time-entries
  getAllTimeEntries: async (req, res) => {
    try {
      const {
        projectId,
        jobId,
        workerId,
        costCode,
        startDate,
        endDate,
        status,
        page = 1,
        limit = 20
      } = req.query;

      const filter = {};
      
      if (projectId) filter.projectId = projectId;
      if (jobId) filter.jobId = jobId;
      if (workerId) filter.workerId = workerId;
      if (costCode) filter.costCode = costCode;
      if (status) filter.status = status;
      
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const timeEntries = await TimeEntry.find(filter)
        .populate('workerId', 'name email')
        .populate('projectId', 'name projectNumber')
        .populate('taskId', 'title')
        .populate('submittedBy', 'name')
        .populate('approvedBy', 'name')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .maxTimeMS(10000) // 10 second timeout
        .lean(); // Use lean() for faster queries

      const total = await TimeEntry.countDocuments(filter);

      res.json({
        success: true,
        data: {
          timeEntries,
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
        message: 'Error fetching time entries',
        error: error.message
      });
    }
  },

  // POST /api/time-entries
  createTimeEntry: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Validate project and cost code exist
      const project = await Project.findById(req.body.projectId);
      if (!project) {
        return res.status(400).json({
          success: false,
          message: 'Project not found'
        });
      }

      const costCode = project.costCodes.find(cc => cc.code === req.body.costCode);
      if (!costCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cost code for this project'
        });
      }

      const timeEntry = new TimeEntry({
        ...req.body,
        costCodeDescription: costCode.description,
        status: 'submitted' // Auto-submit for field workers
      });

      await timeEntry.save();

      // Populate the created entry
      await timeEntry.populate('workerId', 'name email');
      await timeEntry.populate('projectId', 'name projectNumber');
      
      res.status(201).json({
        success: true,
        message: 'Time entry created successfully',
        data: timeEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating time entry',
        error: error.message
      });
    }
  },

  // PUT /api/time-entries/:id/approve
  approveTimeEntry: async (req, res) => {
    try {
      const { supervisorNotes } = req.body;
      
      const timeEntry = await TimeEntry.findById(req.params.id);
      if (!timeEntry) {
        return res.status(404).json({
          success: false,
          message: 'Time entry not found'
        });
      }

      if (timeEntry.status !== 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Time entry is not in submitted status'
        });
      }

      timeEntry.status = 'approved';
      timeEntry.approvedBy = req.user?.id;
      timeEntry.approvedAt = new Date();
      if (supervisorNotes) {
        timeEntry.supervisorNotes = supervisorNotes;
      }

      await timeEntry.save();

      // Update project cost code actuals
      const project = await Project.findById(timeEntry.projectId);
      if (project) {
        const costCode = project.costCodes.find(cc => cc.code === timeEntry.costCode);
        if (costCode) {
          costCode.actualHours += timeEntry.totalHours;
          costCode.actualCost += timeEntry.totalCost || 0;
          await project.save();
        }
      }

      res.json({
        success: true,
        message: 'Time entry approved successfully',
        data: timeEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error approving time entry',
        error: error.message
      });
    }
  },

  // PUT /api/time-entries/:id/reject
  rejectTimeEntry: async (req, res) => {
    try {
      const { rejectionReason } = req.body;
      
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const timeEntry = await TimeEntry.findById(req.params.id);
      if (!timeEntry) {
        return res.status(404).json({
          success: false,
          message: 'Time entry not found'
        });
      }

      timeEntry.status = 'rejected';
      timeEntry.rejectionReason = rejectionReason;
      timeEntry.approvedBy = req.user?.id;
      timeEntry.approvedAt = new Date();

      await timeEntry.save();

      res.json({
        success: true,
        message: 'Time entry rejected',
        data: timeEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error rejecting time entry',
        error: error.message
      });
    }
  },

  // GET /api/time-entries/cost-code-summary
  getCostCodeSummary: async (req, res) => {
    try {
      const { projectId, startDate, endDate } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required'
        });
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const summary = await TimeEntry.getCostCodeSummary(projectId, start, end);

      res.json({
        success: true,
        data: {
          projectId,
          startDate: start,
          endDate: end,
          summary
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating cost code summary',
        error: error.message
      });
    }
  },

  // GET /api/time-entries/productivity-report
  getProductivityReport: async (req, res) => {
    try {
      const { projectId, workerId, costCode, startDate, endDate } = req.query;

      const filter = { status: 'approved' };
      if (projectId) filter.projectId = projectId;
      if (workerId) filter.workerId = workerId;
      if (costCode) filter.costCode = costCode;
      
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const productivity = await TimeEntry.aggregate([
        { $match: filter },
        {
          $match: {
            'unitsCompleted.quantity': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: {
              costCode: '$costCode',
              unit: '$unitsCompleted.unit',
              workerId: '$workerId'
            },
            totalHours: { $sum: '$totalHours' },
            totalUnits: { $sum: '$unitsCompleted.quantity' },
            avgProductivity: { $avg: { $divide: ['$unitsCompleted.quantity', '$totalHours'] } },
            entryCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.workerId',
            foreignField: '_id',
            as: 'worker'
          }
        },
        {
          $project: {
            costCode: '$_id.costCode',
            unit: '$_id.unit',
            workerName: { $arrayElemAt: ['$worker.name', 0] },
            totalHours: 1,
            totalUnits: 1,
            avgProductivity: 1,
            unitsPerHour: { $divide: ['$totalUnits', '$totalHours'] },
            entryCount: 1
          }
        },
        { $sort: { costCode: 1, workerName: 1 } }
      ]);

      res.json({
        success: true,
        data: productivity
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating productivity report',
        error: error.message
      });
    }
  },

  // POST /api/time-entries/bulk-create
  bulkCreateTimeEntries: async (req, res) => {
    try {
      const { entries } = req.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Entries array is required'
        });
      }

      const results = {
        created: [],
        errors: []
      };

      for (let i = 0; i < entries.length; i++) {
        try {
          const entryData = entries[i];
          
          // Validate project exists
          const project = await Project.findById(entryData.projectId);
          if (!project) {
            results.errors.push({
              index: i,
              error: 'Project not found',
              data: entryData
            });
            continue;
          }

          // Validate cost code
          const costCode = project.costCodes.find(cc => cc.code === entryData.costCode);
          if (!costCode) {
            results.errors.push({
              index: i,
              error: 'Invalid cost code for this project',
              data: entryData
            });
            continue;
          }

          const timeEntry = new TimeEntry({
            ...entryData,
            costCodeDescription: costCode.description,
            entryMethod: 'bulk_import',
            status: 'submitted'
          });

          await timeEntry.save();
          results.created.push(timeEntry);

        } catch (error) {
          results.errors.push({
            index: i,
            error: error.message,
            data: entries[i]
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk import completed: ${results.created.length} created, ${results.errors.length} errors`,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error in bulk time entry creation',
        error: error.message
      });
    }
  }
};

module.exports = timeEntryController;
