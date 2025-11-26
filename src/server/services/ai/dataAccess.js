const Job = require('../../models/Job');
const Task = require('../../models/Task');
const TimeEntry = require('../../models/TimeEntry');
const ScheduleOfValues = require('../../models/ScheduleOfValues');
const ProgressReport = require('../../models/ProgressReport');
const Project = require('../../models/Project');
const User = require('../../models/User');

class JobDataAccess {
  /**
   * Get comprehensive job metrics
   */
  async getJobMetrics(jobId) {
    const job = await Job.findById(jobId)
      .populate('jobManager', 'name email')
      .populate('projectId', 'name projectNumber')
      .lean();

    if (!job) {
      throw new Error('Job not found');
    }

    // Get time entries for this job
    const timeEntries = await TimeEntry.find({ jobId })
      .populate('workerId', 'name')
      .lean();

    // Get tasks for this job
    const tasks = await Task.find({ jobId }).lean();

    // Get schedule of values
    const sov = await ScheduleOfValues.find({ jobId }).lean();

    // Get progress reports
    const progressReports = await ProgressReport.find({ jobId })
      .sort({ reportDate: -1 })
      .lean();

    // Calculate totals
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const totalCost = timeEntries.reduce((sum, entry) => {
      const regularCost = (entry.regularHours || 0) * 50; // Example rate
      const overtimeCost = (entry.overtimeHours || 0) * 75;
      return sum + regularCost + overtimeCost;
    }, 0);

    // Calculate cost code breakdown
    const costCodeBreakdown = {};
    timeEntries.forEach(entry => {
      const code = entry.costCode || 'UNKNOWN';
      if (!costCodeBreakdown[code]) {
        costCodeBreakdown[code] = {
          code,
          hours: 0,
          cost: 0,
          entries: []
        };
      }
      costCodeBreakdown[code].hours += entry.totalHours || 0;
      const entryCost = (entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75;
      costCodeBreakdown[code].cost += entryCost;
      costCodeBreakdown[code].entries.push(entry);
    });

    // Calculate progress - use overallProgress from job if available, otherwise calculate from tasks
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    // Prefer job.overallProgress if it exists and is valid, otherwise use taskProgress
    const progress = (job.overallProgress !== null && job.overallProgress !== undefined) 
      ? job.overallProgress 
      : taskProgress;

    // Calculate schedule variance
    const now = new Date();
    const plannedEnd = job.plannedEndDate || job.endDate;
    const actualEnd = job.actualEndDate;
    const daysRemaining = plannedEnd ? Math.ceil((plannedEnd - now) / (1000 * 60 * 60 * 24)) : null;
    const scheduleVariance = plannedEnd && actualEnd 
      ? Math.ceil((actualEnd - plannedEnd) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate budget variance
    const jobBudget = job.costCodes?.reduce((sum, cc) => sum + (cc.budgetCost || 0), 0) || 0;
    const budgetVariance = jobBudget - totalCost;
    const budgetVariancePercent = jobBudget > 0 ? (budgetVariance / jobBudget) * 100 : 0;

    return {
      job: {
        id: job._id.toString(),
        name: job.name,
        jobNumber: job.jobNumber,
        status: job.status,
        contractValue: job.contractValue,
        overallProgress: job.overallProgress || taskProgress,
        plannedStartDate: job.plannedStartDate || job.startDate,
        plannedEndDate: job.plannedEndDate || job.endDate,
        actualStartDate: job.actualStartDate,
        actualEndDate: job.actualEndDate,
        client: job.client,
        location: job.location,
        jobManager: job.jobManager,
        project: job.projectId
      },
      metrics: {
        totalHours,
        totalCost,
        jobBudget,
        budgetVariance,
        budgetVariancePercent,
        scheduleVariance,
        daysRemaining,
        taskProgress,
        completedTasks,
        totalTasks,
        costCodeBreakdown: Object.values(costCodeBreakdown),
        sovItems: sov.length,
        progressReports: progressReports.length
      },
      timeEntries: timeEntries.length,
      tasks: tasks.length,
      sov: sov.length
    };
  }

  /**
   * Get cost code analysis
   */
  async getCostCodeAnalysis(jobId) {
    const job = await Job.findById(jobId).lean();
    if (!job) {
      throw new Error('Job not found');
    }

    const timeEntries = await TimeEntry.find({ jobId }).lean();
    const costCodes = job.costCodes || [];

    const analysis = costCodes.map(cc => {
      const entries = timeEntries.filter(te => te.costCode === cc.code);
      const actualHours = entries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
      const actualCost = entries.reduce((sum, e) => {
        return sum + ((e.regularHours || 0) * 50 + (e.overtimeHours || 0) * 75);
      }, 0);

      const budgetHours = cc.budgetHours || 0;
      const budgetCost = cc.budgetCost || 0;
      const hoursVariance = budgetHours - actualHours;
      const costVariance = budgetCost - actualCost;
      const hoursVariancePercent = budgetHours > 0 ? (hoursVariance / budgetHours) * 100 : 0;
      const costVariancePercent = budgetCost > 0 ? (costVariance / budgetCost) * 100 : 0;

      return {
        code: cc.code,
        description: cc.description,
        category: cc.category,
        budgetHours,
        actualHours,
        hoursVariance,
        hoursVariancePercent,
        budgetCost,
        actualCost,
        costVariance,
        costVariancePercent,
        burnRate: actualHours > 0 && budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0,
        entries: entries.length
      };
    });

    return analysis;
  }

  /**
   * Get schedule analysis
   */
  async getScheduleAnalysis(jobId) {
    const job = await Job.findById(jobId).lean();
    if (!job) {
      throw new Error('Job not found');
    }

    const tasks = await Task.find({ jobId }).lean();
    const testPackages = job.testPackages || [];

    const now = new Date();
    const plannedStart = job.plannedStartDate || job.startDate;
    const plannedEnd = job.plannedEndDate || job.endDate;
    const actualStart = job.actualStartDate;
    const actualEnd = job.actualEndDate;

    // Calculate progress velocity
    const elapsedDays = plannedStart 
      ? Math.ceil((now - plannedStart) / (1000 * 60 * 60 * 24))
      : 0;
    const plannedDuration = plannedStart && plannedEnd
      ? Math.ceil((plannedEnd - plannedStart) / (1000 * 60 * 60 * 24))
      : 0;
    const progress = job.overallProgress || 0;
    const expectedProgress = plannedDuration > 0 ? (elapsedDays / plannedDuration) * 100 : 0;
    const progressVariance = progress - expectedProgress;

    // Test package status
    const testPackageStatus = {
      total: testPackages.length,
      completed: testPackages.filter(tp => tp.status === 'completed').length,
      inProgress: testPackages.filter(tp => tp.status === 'in_progress').length,
      notStarted: testPackages.filter(tp => tp.status === 'not_started').length
    };

    // Task status
    const taskStatus = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      notStarted: tasks.filter(t => t.status === 'not_started').length,
      onHold: tasks.filter(t => t.status === 'on_hold').length
    };

    // Overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < now;
    });

    return {
      plannedStart,
      plannedEnd,
      actualStart,
      actualEnd,
      plannedDuration,
      elapsedDays,
      progress,
      expectedProgress,
      progressVariance,
      daysRemaining: plannedEnd ? Math.ceil((plannedEnd - now) / (1000 * 60 * 60 * 24)) : null,
      scheduleVariance: plannedEnd && actualEnd
        ? Math.ceil((actualEnd - plannedEnd) / (1000 * 60 * 60 * 24))
        : null,
      testPackageStatus,
      taskStatus,
      overdueTasks: overdueTasks.length,
      overdueTasksList: overdueTasks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo
      }))
    };
  }

  /**
   * Get team performance
   */
  async getTeamPerformance(jobId) {
    const job = await Job.findById(jobId)
      .populate('jobManager', 'name email')
      .populate('fieldSupervisor', 'name email')
      .populate('foremen', 'name email')
      .lean();

    if (!job) {
      throw new Error('Job not found');
    }

    const timeEntries = await TimeEntry.find({ jobId })
      .populate('workerId', 'name email role')
      .lean();

    // Group by worker
    const workerPerformance = {};
    timeEntries.forEach(entry => {
      const workerId = entry.workerId?._id?.toString() || 'unknown';
      if (!workerPerformance[workerId]) {
        workerPerformance[workerId] = {
          worker: entry.workerId,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          entries: [],
          costCodes: {}
        };
      }
      workerPerformance[workerId].totalHours += entry.totalHours || 0;
      workerPerformance[workerId].regularHours += entry.regularHours || 0;
      workerPerformance[workerId].overtimeHours += entry.overtimeHours || 0;
      workerPerformance[workerId].entries.push(entry);

      const code = entry.costCode || 'UNKNOWN';
      if (!workerPerformance[workerId].costCodes[code]) {
        workerPerformance[workerId].costCodes[code] = { hours: 0, entries: 0 };
      }
      workerPerformance[workerId].costCodes[code].hours += entry.totalHours || 0;
      workerPerformance[workerId].costCodes[code].entries += 1;
    });

    return {
      jobManager: job.jobManager,
      fieldSupervisor: job.fieldSupervisor,
      foremen: job.foremen,
      workers: Object.values(workerPerformance).map(wp => ({
        worker: wp.worker,
        totalHours: wp.totalHours,
        regularHours: wp.regularHours,
        overtimeHours: wp.overtimeHours,
        overtimePercent: wp.totalHours > 0 ? (wp.overtimeHours / wp.totalHours) * 100 : 0,
        entries: wp.entries.length,
        costCodes: wp.costCodes
      }))
    };
  }

  /**
   * Get all jobs summary
   */
  async getAllJobsSummary(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.jobManager) query.jobManager = filters.jobManager;

    const jobs = await Job.find(query)
      .populate('jobManager', 'name')
      .populate('projectId', 'name projectNumber')
      .select('name jobNumber status contractValue overallProgress jobManager projectId client.name')
      .lean()
      .limit(100); // Limit for performance

    // Return lightweight summary without full metrics calculation for list view
    const summaries = jobs.map((job) => {
      return {
        id: job._id.toString(),
        name: job.name,
        jobNumber: job.jobNumber,
        status: job.status,
        contractValue: job.contractValue,
        progress: job.overallProgress || 0,
        jobManager: job.jobManager,
        project: job.projectId,
        client: job.client?.name
      };
    });

    return summaries;
  }
}

module.exports = new JobDataAccess();

