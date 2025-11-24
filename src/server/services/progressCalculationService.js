/**
 * Progress Calculation Service
 * 
 * Handles progress tracking across Schedule of Values, Work Orders, and Tasks
 * 
 * Key Principles:
 * 1. Tasks are the bridge between Work Orders and SOV
 * 2. Progress flows: Tasks → SOV (primary), Work Orders → Tasks → SOV (organizational)
 * 3. Multiple paths: Direct links, cost code matching, manual entry
 */

const Task = require('../models/Task');
const WorkOrder = require('../models/WorkOrder');
const ScheduleOfValues = require('../models/ScheduleOfValues');
const TimeEntry = require('../models/TimeEntry');

const progressCalculationService = {
  /**
   * Calculate progress for a Schedule of Values line item
   * Uses multiple methods: direct task links, cost code matching, manual entry
   */
  async calculateSOVProgress(sovItemId, jobId) {
    const sovItem = await ScheduleOfValues.findById(sovItemId);
    if (!sovItem) {
      throw new Error('SOV item not found');
    }

    // Method 1: Direct task links (most accurate)
    const directTasks = await Task.find({
      scheduleOfValuesId: sovItemId,
      jobId: jobId || sovItem.jobId
    });

    // Method 2: Cost code matching (flexible fallback)
    const costCodeTasks = await Task.find({
      costCode: sovItem.costCodeNumber || sovItem.costCode,
      jobId: jobId || sovItem.jobId,
      scheduleOfValuesId: { $ne: sovItemId } // Not already counted in direct tasks
    });

    // Combine all tasks
    const allTasks = [...directTasks, ...costCodeTasks];

    // Calculate progress from tasks
    const taskProgress = this.calculateProgressFromTasks(allTasks, sovItem);

    // Get time entries for actual hours/costs
    const timeEntries = await TimeEntry.find({
      jobId: jobId || sovItem.jobId,
      costCode: sovItem.costCodeNumber || sovItem.costCode,
      status: 'approved'
    });

    const actualHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const actualCost = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);

    return {
      sovItemId: sovItem._id,
      sovItemDescription: sovItem.description,
      costCode: sovItem.costCodeNumber || sovItem.costCode,
      
      // Progress metrics
      completionPercentage: taskProgress.completionPercentage,
      earnedValue: taskProgress.earnedValue,
      
      // Task breakdown
      totalTasks: allTasks.length,
      completedTasks: taskProgress.completedTasks,
      inProgressTasks: taskProgress.inProgressTasks,
      notStartedTasks: taskProgress.notStartedTasks,
      
      // Time and cost
      estimatedHours: sovItem.budgetHours || 0,
      actualHours: actualHours,
      hoursVariance: (sovItem.budgetHours || 0) - actualHours,
      
      estimatedCost: sovItem.totalValue || 0,
      actualCost: actualCost,
      costVariance: (sovItem.totalValue || 0) - actualCost,
      
      // Progress sources
      progressSources: {
        directTaskLinks: directTasks.length,
        costCodeMatches: costCodeTasks.length,
        manualEntry: false // Would be set if manually entered
      },
      
      // Associated work orders (via tasks)
      workOrders: await this.getWorkOrdersForSOV(sovItemId, jobId || sovItem.jobId)
    };
  },

  /**
   * Calculate progress from tasks
   */
  calculateProgressFromTasks(tasks, sovItem) {
    if (!tasks || tasks.length === 0) {
      return {
        completionPercentage: 0,
        earnedValue: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        notStartedTasks: 0
      };
    }

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;

    // Calculate completion percentage
    // Method 1: Task count weighted
    const taskCountPercentage = (completedTasks + (inProgressTasks * 0.5)) / tasks.length * 100;

    // Method 2: Task completion percentage weighted
    const taskCompletionPercentage = tasks.reduce((sum, task) => {
      return sum + (task.completionPercentage || 0);
    }, 0) / tasks.length;

    // Method 3: Units installed (if applicable)
    let unitsPercentage = 0;
    if (sovItem && sovItem.quantity && sovItem.quantity > 0) {
      const totalUnitsInstalled = tasks.reduce((sum, task) => {
        return sum + (task.unitsInstalled || 0);
      }, 0);
      unitsPercentage = (totalUnitsInstalled / sovItem.quantity) * 100;
    }

    // Use the most appropriate method
    let completionPercentage = taskCompletionPercentage;
    if (unitsPercentage > 0 && sovItem && sovItem.quantity) {
      // Prefer units if available
      completionPercentage = unitsPercentage;
    } else if (taskCompletionPercentage === 0 && taskCountPercentage > 0) {
      // Fall back to task count if completion percentages aren't set
      completionPercentage = taskCountPercentage;
    }

    // Calculate earned value
    const earnedValue = (completionPercentage / 100) * (sovItem?.totalValue || 0);

    return {
      completionPercentage: Math.min(100, Math.max(0, completionPercentage)),
      earnedValue: earnedValue,
      completedTasks,
      inProgressTasks,
      notStartedTasks
    };
  },

  /**
   * Get work orders that contribute to a SOV item (via tasks)
   */
  async getWorkOrdersForSOV(sovItemId, jobId) {
    // Find tasks linked to this SOV item
    const tasks = await Task.find({
      scheduleOfValuesId: sovItemId,
      jobId: jobId,
      workOrderId: { $exists: true, $ne: null }
    }).select('workOrderId').distinct('workOrderId');

    if (tasks.length === 0) {
      return [];
    }

    // Get work orders
    const workOrders = await WorkOrder.find({
      _id: { $in: tasks },
      jobId: jobId
    }).select('workOrderNumber title status completionPercentage');

    return workOrders.map(wo => ({
      workOrderId: wo._id,
      workOrderNumber: wo.workOrderNumber,
      title: wo.title,
      status: wo.status,
      completionPercentage: wo.completionPercentage || 0
    }));
  },

  /**
   * Calculate progress for a Work Order (aggregated from tasks)
   */
  async calculateWorkOrderProgress(workOrderId) {
    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) {
      throw new Error('Work order not found');
    }

    // Get all tasks for this work order
    const tasks = await Task.find({ workOrderId: workOrderId });

    // Calculate progress from tasks
    const taskProgress = this.calculateProgressFromTasks(tasks, null);

    // Get time entries for actual hours/costs
    const taskIds = tasks.map(t => t._id);
    const timeEntries = await TimeEntry.find({
      taskId: { $in: taskIds },
      status: 'approved'
    });

    const actualHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const actualCost = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);

    // Calculate which SOV items this work order contributes to
    const sovContributions = await this.getSOVContributionsForWorkOrder(workOrderId);

    return {
      workOrderId: workOrder._id,
      workOrderNumber: workOrder.workOrderNumber,
      title: workOrder.title,
      
      // Progress metrics
      completionPercentage: taskProgress.completionPercentage,
      
      // Task breakdown
      totalTasks: tasks.length,
      completedTasks: taskProgress.completedTasks,
      inProgressTasks: taskProgress.inProgressTasks,
      notStartedTasks: taskProgress.notStartedTasks,
      
      // Time and cost
      estimatedHours: workOrder.estimatedHours || 0,
      actualHours: actualHours,
      hoursVariance: (workOrder.estimatedHours || 0) - actualHours,
      
      estimatedCost: workOrder.estimatedCost || workOrder.actualCost || 0,
      actualCost: actualCost,
      costVariance: (workOrder.estimatedCost || workOrder.actualCost || 0) - actualCost,
      
      // SOV contributions
      sovContributions: sovContributions
    };
  },

  /**
   * Get SOV items that a work order contributes to (via tasks)
   */
  async getSOVContributionsForWorkOrder(workOrderId) {
    // Find tasks for this work order that are linked to SOV items
    const tasks = await Task.find({
      workOrderId: workOrderId,
      scheduleOfValuesId: { $exists: true, $ne: null }
    }).select('scheduleOfValuesId completionPercentage').populate('scheduleOfValuesId', 'description costCodeNumber totalValue');

    // Group by SOV item
    const sovMap = new Map();
    
    tasks.forEach(task => {
      if (!task.scheduleOfValuesId) return;
      
      const sovId = task.scheduleOfValuesId._id.toString();
      if (!sovMap.has(sovId)) {
        sovMap.set(sovId, {
          sovItemId: task.scheduleOfValuesId._id,
          description: task.scheduleOfValuesId.description,
          costCode: task.scheduleOfValuesId.costCodeNumber,
          totalValue: task.scheduleOfValuesId.totalValue || 0,
          tasks: [],
          totalCompletionPercentage: 0
        });
      }
      
      const entry = sovMap.get(sovId);
      entry.tasks.push({
        taskId: task._id,
        completionPercentage: task.completionPercentage || 0
      });
      entry.totalCompletionPercentage += task.completionPercentage || 0;
    });

    // Calculate contribution for each SOV item
    return Array.from(sovMap.values()).map(entry => ({
      sovItemId: entry.sovItemId,
      description: entry.description,
      costCode: entry.costCode,
      totalValue: entry.totalValue,
      taskCount: entry.tasks.length,
      averageCompletionPercentage: entry.tasks.length > 0 
        ? entry.totalCompletionPercentage / entry.tasks.length 
        : 0,
      estimatedContribution: entry.totalValue * (entry.totalCompletionPercentage / entry.tasks.length / 100)
    }));
  },

  /**
   * Get progress summary for a job
   * Shows SOV progress with work order and task breakdowns
   */
  async getJobProgressSummary(jobId) {
    // Get all SOV items for the job
    const sovItems = await ScheduleOfValues.find({ jobId }).sort({ lineNumber: 1 });

    // Calculate progress for each SOV item
    const sovProgress = await Promise.all(
      sovItems.map(sov => this.calculateSOVProgress(sov._id, jobId))
    );

    // Get all work orders for the job
    const workOrders = await WorkOrder.find({ jobId });
    const workOrderProgress = await Promise.all(
      workOrders.map(wo => this.calculateWorkOrderProgress(wo._id))
    );

    // Calculate totals
    const totalSOVValue = sovItems.reduce((sum, sov) => sum + (sov.totalValue || 0), 0);
    const totalEarnedValue = sovProgress.reduce((sum, progress) => sum + (progress.earnedValue || 0), 0);
    const overallCompletionPercentage = totalSOVValue > 0 
      ? (totalEarnedValue / totalSOVValue) * 100 
      : 0;

    return {
      jobId,
      overallCompletionPercentage: Math.min(100, Math.max(0, overallCompletionPercentage)),
      totalSOVValue,
      totalEarnedValue,
      totalVariance: totalSOVValue - totalEarnedValue,
      
      sovProgress: sovProgress,
      workOrderProgress: workOrderProgress,
      
      // Summary stats
      totalSOVItems: sovItems.length,
      totalWorkOrders: workOrders.length,
      totalTasks: await Task.countDocuments({ jobId }),
      
      // Progress by source
      sovItemsWithTasks: sovProgress.filter(p => p.totalTasks > 0).length,
      sovItemsWithoutTasks: sovProgress.filter(p => p.totalTasks === 0).length,
      workOrdersWithTasks: workOrderProgress.filter(p => p.totalTasks > 0).length
    };
  }
};

module.exports = progressCalculationService;





