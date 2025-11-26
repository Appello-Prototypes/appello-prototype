/**
 * Comprehensive Tool Handlers Implementation
 * All handlers for AI tools - organized by category
 */

const Job = require('../../../models/Job');
const Task = require('../../../models/Task');
const TimeEntry = require('../../../models/TimeEntry');
const ScheduleOfValues = require('../../../models/ScheduleOfValues');
const ProgressReport = require('../../../models/ProgressReport');
const Project = require('../../../models/Project');
const PurchaseOrder = require('../../../models/PurchaseOrder');
const WorkOrder = require('../../../models/WorkOrder');
const MaterialRequest = require('../../../models/MaterialRequest');
const APRegister = require('../../../models/APRegister');
const User = require('../../../models/User');
const mongoose = require('mongoose');
const dataAccess = require('../dataAccess');
const analyticsEngine = require('../analyticsEngine');
const { resolveJobId, resolveProjectId } = require('./allTools');

// ============================================================================
// CATEGORY 1: JOB MANAGEMENT HANDLERS
// ============================================================================

const jobManagementHandlers = {
  async list_jobs(args) {
    const { 
      status, 
      projectId, 
      jobManager, 
      clientName, 
      minContractValue, 
      maxContractValue,
      startDateFrom,
      startDateTo,
      location,
      limit = 100 
    } = args || {};
    
    const filter = {};
    if (status) filter.status = status;
    if (projectId) {
      const resolvedProjectId = await resolveProjectId(projectId);
      if (resolvedProjectId) filter.projectId = resolvedProjectId;
    }
    if (jobManager) {
      const manager = await User.findOne({ 
        $or: [
          { name: { $regex: jobManager, $options: 'i' } },
          { _id: mongoose.Types.ObjectId.isValid(jobManager) ? jobManager : null }
        ]
      }).select('_id').lean();
      if (manager) filter.jobManager = manager._id;
    }
    if (clientName) filter['client.name'] = { $regex: clientName, $options: 'i' };
    if (minContractValue) filter.contractValue = { ...filter.contractValue, $gte: minContractValue };
    if (maxContractValue) filter.contractValue = { ...filter.contractValue, $lte: maxContractValue };
    if (startDateFrom || startDateTo) {
      filter.plannedStartDate = {};
      if (startDateFrom) filter.plannedStartDate.$gte = new Date(startDateFrom);
      if (startDateTo) filter.plannedStartDate.$lte = new Date(startDateTo);
    }
    if (location) {
      filter.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.province': { $regex: location, $options: 'i' } },
        { 'location.address': { $regex: location, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(filter)
      .populate('jobManager', 'name email')
      .populate('projectId', 'name projectNumber')
      .select('name jobNumber status contractValue overallProgress jobManager projectId client.name plannedStartDate plannedEndDate location')
      .lean()
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      success: true,
      total: jobs.length,
      jobs: jobs.map(job => ({
        id: job._id.toString(),
        jobNumber: job.jobNumber,
        name: job.name,
        status: job.status,
        contractValue: job.contractValue,
        progress: job.overallProgress || 0,
        jobManager: job.jobManager?.name,
        project: {
          id: job.projectId?._id?.toString(),
          name: job.projectId?.name,
          projectNumber: job.projectId?.projectNumber
        },
        client: job.client?.name,
        plannedStartDate: job.plannedStartDate,
        plannedEndDate: job.plannedEndDate,
        location: job.location
      }))
    };
  },

  async get_job(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const job = await Job.findById(jobId)
      .populate('jobManager', 'name email')
      .populate('estimator', 'name email')
      .populate('fieldSupervisor', 'name email')
      .populate('foremen', 'name email')
      .populate('projectId', 'name projectNumber')
      .lean();

    if (!job) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    return {
      success: true,
      job: {
        id: job._id.toString(),
        jobNumber: job.jobNumber,
        name: job.name,
        status: job.status,
        contractValue: job.contractValue,
        overallProgress: job.overallProgress || 0,
        description: job.description,
        client: job.client,
        location: job.location,
        plannedStartDate: job.plannedStartDate,
        plannedEndDate: job.plannedEndDate,
        actualStartDate: job.actualStartDate,
        actualEndDate: job.actualEndDate,
        jobManager: job.jobManager,
        estimator: job.estimator,
        fieldSupervisor: job.fieldSupervisor,
        foremen: job.foremen,
        project: job.projectId
      }
    };
  },

  async search_jobs(args) {
    const { query, jobManager, projectId, clientName } = args || {};
    const filter = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { jobNumber: { $regex: query, $options: 'i' } },
        { 'client.name': { $regex: query, $options: 'i' } }
      ];
    }

    if (jobManager) {
      const manager = await User.findOne({ name: { $regex: jobManager, $options: 'i' } }).select('_id').lean();
      if (manager) {
        filter.jobManager = manager._id;
      } else if (mongoose.Types.ObjectId.isValid(jobManager)) {
        filter.jobManager = jobManager;
      }
    }

    if (projectId) {
      const resolvedProjectId = await resolveProjectId(projectId);
      if (resolvedProjectId) filter.projectId = resolvedProjectId;
    }

    if (clientName) {
      filter['client.name'] = { $regex: clientName, $options: 'i' };
    }

    const jobs = await Job.find(filter)
      .populate('jobManager', 'name')
      .populate('projectId', 'name projectNumber')
      .select('name jobNumber status contractValue overallProgress jobManager projectId client.name')
      .lean()
      .limit(50)
      .sort({ createdAt: -1 });

    return {
      success: true,
      total: jobs.length,
      jobs: jobs.map(job => ({
        id: job._id.toString(),
        jobNumber: job.jobNumber,
        name: job.name,
        status: job.status,
        contractValue: job.contractValue,
        progress: job.overallProgress || 0,
        jobManager: job.jobManager?.name,
        project: job.projectId?.name,
        client: job.client?.name
      }))
    };
  },

  async get_job_summary(args) {
    const { status, projectId } = args || {};
    const filter = {};
    if (status) filter.status = status;
    if (projectId) {
      const resolvedProjectId = await resolveProjectId(projectId);
      if (resolvedProjectId) filter.projectId = resolvedProjectId;
    }

    const jobs = await Job.find(filter).lean();
    
    const summary = {
      totalJobs: jobs.length,
      totalContractValue: jobs.reduce((sum, j) => sum + (j.contractValue || 0), 0),
      statusBreakdown: {},
      averageProgress: 0,
      totalProgress: jobs.reduce((sum, j) => sum + (j.overallProgress || 0), 0)
    };

    jobs.forEach(job => {
      const stat = job.status || 'unknown';
      summary.statusBreakdown[stat] = (summary.statusBreakdown[stat] || 0) + 1;
    });

    summary.averageProgress = jobs.length > 0 ? summary.totalProgress / jobs.length : 0;

    return {
      success: true,
      summary
    };
  }
};

// ============================================================================
// CATEGORY 2: BUDGET & FINANCIAL HANDLERS
// ============================================================================

const budgetFinancialHandlers = {
  async get_job_metrics(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const metrics = await dataAccess.getJobMetrics(jobId);
    const evm = await analyticsEngine.calculateEVM(jobId);
    const variance = await analyticsEngine.calculateVariance(jobId);
    const health = await analyticsEngine.getJobHealthScore(jobId);

    return {
      success: true,
      job: metrics.job,
      metrics: metrics.metrics,
      evm: evm,
      variance: variance,
      health: health
    };
  },

  async get_budget_analysis(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const metrics = await dataAccess.getJobMetrics(jobId);
    const variance = await analyticsEngine.calculateVariance(jobId);
    const costCodeAnalysis = await dataAccess.getCostCodeAnalysis(jobId);

    return {
      success: true,
      job: {
        id: metrics.job.id,
        jobNumber: metrics.job.jobNumber,
        name: metrics.job.name
      },
      budget: {
        totalBudget: metrics.metrics.jobBudget,
        totalActual: metrics.metrics.totalCost,
        variance: variance.budgetVariance,
        variancePercent: metrics.metrics.budgetVariancePercent
      },
      costCodeBreakdown: costCodeAnalysis
    };
  },

  async get_cost_breakdown(args) {
    const { jobIdentifier, groupBy = 'costCode', startDate, endDate } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const filter = { jobId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const timeEntries = await TimeEntry.find(filter).lean();
    
    let breakdown = {};
    if (groupBy === 'costCode') {
      timeEntries.forEach(entry => {
        const code = entry.costCode || 'UNKNOWN';
        if (!breakdown[code]) {
          breakdown[code] = { costCode: code, hours: 0, cost: 0, entries: 0 };
        }
        breakdown[code].hours += entry.totalHours || 0;
        breakdown[code].cost += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
        breakdown[code].entries += 1;
      });
    } else if (groupBy === 'worker') {
      timeEntries.forEach(entry => {
        const workerId = entry.workerId?.toString() || 'UNKNOWN';
        if (!breakdown[workerId]) {
          breakdown[workerId] = { workerId, hours: 0, cost: 0, entries: 0 };
        }
        breakdown[workerId].hours += entry.totalHours || 0;
        breakdown[workerId].cost += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
        breakdown[workerId].entries += 1;
      });
    } else if (groupBy === 'date') {
      timeEntries.forEach(entry => {
        const date = entry.date.toISOString().split('T')[0];
        if (!breakdown[date]) {
          breakdown[date] = { date, hours: 0, cost: 0, entries: 0 };
        }
        breakdown[date].hours += entry.totalHours || 0;
        breakdown[date].cost += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
        breakdown[date].entries += 1;
      });
    }

    return {
      success: true,
      groupBy,
      breakdown: Object.values(breakdown),
      total: {
        hours: timeEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
        cost: timeEntries.reduce((sum, e) => sum + (e.totalCost || ((e.regularHours || 0) * 50 + (e.overtimeHours || 0) * 75)), 0)
      }
    };
  },

  async get_profitability_analysis(args) {
    const { jobIdentifier, compareToAverage = false } = args;
    
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (!jobId) {
        throw new Error(`Job not found: ${jobIdentifier}`);
      }

      const metrics = await dataAccess.getJobMetrics(jobId);
      const profit = metrics.job.contractValue - metrics.metrics.totalCost;
      const profitMargin = metrics.job.contractValue > 0 
        ? (profit / metrics.job.contractValue) * 100 
        : 0;

      let comparison = null;
      if (compareToAverage) {
        const allJobs = await Job.find({}).select('contractValue').lean();
        const allTimeEntries = await TimeEntry.find({}).lean();
        const totalContractValue = allJobs.reduce((sum, j) => sum + (j.contractValue || 0), 0);
        const totalCost = allTimeEntries.reduce((sum, e) => sum + (e.totalCost || ((e.regularHours || 0) * 50 + (e.overtimeHours || 0) * 75)), 0);
        const avgProfitMargin = totalContractValue > 0 ? ((totalContractValue - totalCost) / totalContractValue) * 100 : 0;
        
        comparison = {
          averageProfitMargin: avgProfitMargin,
          difference: profitMargin - avgProfitMargin
        };
      }

      return {
        success: true,
        job: {
          id: metrics.job.id,
          jobNumber: metrics.job.jobNumber,
          name: metrics.job.name
        },
        profitability: {
          contractValue: metrics.job.contractValue,
          totalCost: metrics.metrics.totalCost,
          profit: profit,
          profitMargin: profitMargin,
          isProfitable: profit > 0
        },
        comparison
      };
    } else {
      // Analyze all jobs
      const jobs = await Job.find({}).select('_id jobNumber name contractValue').lean();
      const profitability = await Promise.all(
        jobs.map(async (job) => {
          try {
            const metrics = await dataAccess.getJobMetrics(job._id.toString());
            const profit = metrics.job.contractValue - metrics.metrics.totalCost;
            const profitMargin = metrics.job.contractValue > 0 
              ? (profit / metrics.job.contractValue) * 100 
              : 0;
            
            return {
              jobId: job._id.toString(),
              jobNumber: job.jobNumber,
              name: job.name,
              contractValue: metrics.job.contractValue,
              totalCost: metrics.metrics.totalCost,
              profit: profit,
              profitMargin: profitMargin,
              isProfitable: profit > 0
            };
          } catch (error) {
            return null;
          }
        })
      );

      const valid = profitability.filter(p => p !== null);
      const profitable = valid.filter(p => p.isProfitable);
      const losingMoney = valid.filter(p => !p.isProfitable);

      return {
        success: true,
        totalJobs: valid.length,
        profitable: profitable.length,
        losingMoney: losingMoney.length,
        totalProfit: valid.reduce((sum, p) => sum + p.profit, 0),
        averageProfitMargin: valid.length > 0 
          ? valid.reduce((sum, p) => sum + p.profitMargin, 0) / valid.length 
          : 0,
        jobs: valid.sort((a, b) => b.profitMargin - a.profitMargin)
      };
    }
  },

  async get_cost_trends(args) {
    const { jobIdentifier, period = 'month' } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    const timeEntries = await TimeEntry.find({
      jobId,
      date: { $gte: startDate }
    }).sort({ date: 1 }).lean();

    const trends = [];
    const dailyCosts = {};
    
    timeEntries.forEach(entry => {
      const date = entry.date.toISOString().split('T')[0];
      if (!dailyCosts[date]) {
        dailyCosts[date] = 0;
      }
      dailyCosts[date] += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
    });

    Object.keys(dailyCosts).sort().forEach(date => {
      trends.push({
        date,
        cost: dailyCosts[date]
      });
    });

    // Calculate burn rate (average daily cost)
    const totalDays = trends.length;
    const totalCost = trends.reduce((sum, t) => sum + t.cost, 0);
    const burnRate = totalDays > 0 ? totalCost / totalDays : 0;

    // Calculate acceleration (comparing first half to second half)
    const midpoint = Math.floor(trends.length / 2);
    const firstHalfAvg = midpoint > 0 
      ? trends.slice(0, midpoint).reduce((sum, t) => sum + t.cost, 0) / midpoint 
      : 0;
    const secondHalfAvg = trends.length > midpoint
      ? trends.slice(midpoint).reduce((sum, t) => sum + t.cost, 0) / (trends.length - midpoint)
      : 0;
    const acceleration = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    return {
      success: true,
      period,
      trends,
      summary: {
        totalCost,
        averageDailyCost: burnRate,
        acceleration: acceleration,
        isAccelerating: acceleration > 0
      }
    };
  }
};

// ============================================================================
// CATEGORY 3: SCHEDULE & TIMELINE HANDLERS
// ============================================================================

const scheduleTimelineHandlers = {
  async get_schedule_analysis(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
    return {
      success: true,
      job: { id: jobId },
      ...scheduleAnalysis
    };
  },

  async get_timeline_details(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const job = await Job.findById(jobId)
      .select('jobNumber name plannedStartDate plannedEndDate actualStartDate actualEndDate')
      .lean();

    if (!job) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const now = new Date();
    const plannedDuration = job.plannedStartDate && job.plannedEndDate
      ? Math.ceil((job.plannedEndDate - job.plannedStartDate) / (1000 * 60 * 60 * 24))
      : null;
    const actualDuration = job.actualStartDate && job.actualEndDate
      ? Math.ceil((job.actualEndDate - job.actualStartDate) / (1000 * 60 * 60 * 24))
      : null;
    const daysRemaining = job.plannedEndDate
      ? Math.ceil((job.plannedEndDate - now) / (1000 * 60 * 60 * 24))
      : null;

    return {
      success: true,
      job: {
        id: job._id.toString(),
        jobNumber: job.jobNumber,
        name: job.name
      },
      timeline: {
        plannedStartDate: job.plannedStartDate,
        plannedEndDate: job.plannedEndDate,
        actualStartDate: job.actualStartDate,
        actualEndDate: job.actualEndDate,
        plannedDuration,
        actualDuration,
        daysRemaining,
        isStarted: !!job.actualStartDate,
        isCompleted: !!job.actualEndDate
      }
    };
  },

  async get_schedule_performance(args) {
    const { jobIdentifier, sortBy = 'variance' } = args;
    
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (!jobId) {
        throw new Error(`Job not found: ${jobIdentifier}`);
      }

      const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
      const job = await Job.findById(jobId).select('jobNumber name').lean();
      
      return {
        success: true,
        jobs: [{
          jobId,
          jobNumber: job?.jobNumber,
          name: job?.name,
          ...scheduleAnalysis
        }]
      };
    } else {
      // Get all jobs
      const jobs = await Job.find({}).select('_id jobNumber name').lean().limit(100);
      const performances = await Promise.all(
        jobs.map(async (job) => {
          try {
            const scheduleAnalysis = await dataAccess.getScheduleAnalysis(job._id.toString());
            return {
              jobId: job._id.toString(),
              jobNumber: job.jobNumber,
              name: job.name,
              ...scheduleAnalysis
            };
          } catch (error) {
            return null;
          }
        })
      );

      const valid = performances.filter(p => p !== null);
      
      // Sort based on sortBy parameter
      if (sortBy === 'variance') {
        valid.sort((a, b) => a.progressVariance - b.progressVariance);
      } else if (sortBy === 'progress') {
        valid.sort((a, b) => b.progress - a.progress);
      } else if (sortBy === 'daysRemaining') {
        valid.sort((a, b) => {
          const aDays = a.daysRemaining ?? Infinity;
          const bDays = b.daysRemaining ?? Infinity;
          return aDays - bDays;
        });
      }

      return {
        success: true,
        totalJobs: valid.length,
        jobs: valid
      };
    }
  }
};

// ============================================================================
// CATEGORY 4: PROGRESS & COMPLETION HANDLERS
// ============================================================================

const progressCompletionHandlers = {
  async get_progress_details(args) {
    const { jobIdentifier, includeBreakdown = true } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const job = await Job.findById(jobId).select('jobNumber name overallProgress').lean();
    const tasks = await Task.find({ jobId }).lean();
    const testPackages = job.testPackages || [];

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const completedTestPackages = testPackages.filter(tp => tp.status === 'completed').length;
    const totalTestPackages = testPackages.length;

    const result = {
      success: true,
      job: {
        id: jobId,
        jobNumber: job.jobNumber,
        name: job.name
      },
      progress: {
        overallProgress: job.overallProgress || 0,
        taskProgress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        testPackageProgress: totalTestPackages > 0 ? (completedTestPackages / totalTestPackages) * 100 : 0
      },
      completed: {
        tasks: completedTasks,
        totalTasks,
        testPackages: completedTestPackages,
        totalTestPackages
      },
      remaining: {
        tasks: totalTasks - completedTasks,
        testPackages: totalTestPackages - completedTestPackages
      }
    };

    if (includeBreakdown) {
      result.breakdown = {
        tasksByStatus: {
          completed: completedTasks,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          notStarted: tasks.filter(t => t.status === 'not_started').length,
          onHold: tasks.filter(t => t.status === 'on_hold').length
        },
        testPackagesByStatus: {
          completed: completedTestPackages,
          inProgress: testPackages.filter(tp => tp.status === 'in_progress').length,
          notStarted: testPackages.filter(tp => tp.status === 'not_started').length
        }
      };
    }

    return result;
  },

  async get_progress_velocity(args) {
    const { jobIdentifier, period = 'month' } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const progressReports = await ProgressReport.find({ jobId })
      .sort({ reportDate: 1 })
      .lean();

    if (progressReports.length < 2) {
      return {
        success: true,
        velocity: null,
        message: 'Insufficient data for velocity calculation (need at least 2 progress reports)'
      };
    }

    const now = new Date();
    let cutoffDate = new Date();
    switch (period) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
    }

    const recentReports = progressReports.filter(pr => pr.reportDate >= cutoffDate);
    if (recentReports.length < 2) {
      return {
        success: true,
        velocity: null,
        message: `Insufficient data for ${period} period`
      };
    }

    const firstReport = recentReports[0];
    const lastReport = recentReports[recentReports.length - 1];
    const daysDiff = Math.ceil((lastReport.reportDate - firstReport.reportDate) / (1000 * 60 * 60 * 24));
    const progressDiff = lastReport.summary.totalApprovedCTD.percent - firstReport.summary.totalApprovedCTD.percent;
    const velocity = daysDiff > 0 ? progressDiff / daysDiff : 0; // % per day

    return {
      success: true,
      period,
      velocity: {
        percentPerDay: velocity,
        percentPerWeek: velocity * 7,
        percentPerMonth: velocity * 30,
        daysAnalyzed: daysDiff,
        progressChange: progressDiff,
        isAccelerating: recentReports.length >= 3 && velocity > 0
      },
      reports: {
        first: {
          date: firstReport.reportDate,
          progress: firstReport.summary.totalApprovedCTD.percent
        },
        last: {
          date: lastReport.reportDate,
          progress: lastReport.summary.totalApprovedCTD.percent
        }
      }
    };
  },

  async get_progress_trends(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const progressReports = await ProgressReport.find({ jobId })
      .sort({ reportDate: 1 })
      .lean();

    const trends = progressReports.map(pr => ({
      date: pr.reportDate,
      progress: pr.summary.totalApprovedCTD.percent,
      amount: pr.summary.totalApprovedCTD.amount
    }));

    // Calculate trend direction
    let trend = 'stable';
    let acceleration = 0;
    if (trends.length >= 3) {
      const firstThird = trends.slice(0, Math.floor(trends.length / 3));
      const lastThird = trends.slice(-Math.floor(trends.length / 3));
      const firstAvg = firstThird.reduce((sum, t) => sum + t.progress, 0) / firstThird.length;
      const lastAvg = lastThird.reduce((sum, t) => sum + t.progress, 0) / lastThird.length;
      acceleration = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;
      trend = acceleration > 5 ? 'accelerating' : acceleration < -5 ? 'decelerating' : 'stable';
    }

    return {
      success: true,
      trends,
      summary: {
        totalReports: trends.length,
        currentProgress: trends.length > 0 ? trends[trends.length - 1].progress : 0,
        trend,
        acceleration,
        isAccelerating: trend === 'accelerating'
      }
    };
  }
};

// ============================================================================
// CATEGORY 5: PERFORMANCE METRICS HANDLERS
// ============================================================================

const performanceMetricsHandlers = {
  async get_evm_metrics(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const evm = await analyticsEngine.calculateEVM(jobId);
    return {
      success: true,
      job: { id: jobId },
      evm
    };
  },

  async get_performance_indices(args) {
    const { jobIdentifier, sortBy = 'both' } = args;
    
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (!jobId) {
        throw new Error(`Job not found: ${jobIdentifier}`);
      }

      const evm = await analyticsEngine.calculateEVM(jobId);
      const job = await Job.findById(jobId).select('jobNumber name').lean();
      
      return {
        success: true,
        jobs: [{
          jobId,
          jobNumber: job?.jobNumber,
          name: job?.name,
          cpi: evm.costPerformanceIndex,
          spi: evm.schedulePerformanceIndex
        }]
      };
    } else {
      // Get all jobs
      const jobs = await Job.find({}).select('_id jobNumber name').lean().limit(100);
      const indices = await Promise.all(
        jobs.map(async (job) => {
          try {
            const evm = await analyticsEngine.calculateEVM(job._id.toString());
            return {
              jobId: job._id.toString(),
              jobNumber: job.jobNumber,
              name: job.name,
              cpi: evm.costPerformanceIndex,
              spi: evm.schedulePerformanceIndex
            };
          } catch (error) {
            return null;
          }
        })
      );

      const valid = indices.filter(i => i !== null);
      
      // Sort based on sortBy
      if (sortBy === 'cpi') {
        valid.sort((a, b) => b.cpi - a.cpi);
      } else if (sortBy === 'spi') {
        valid.sort((a, b) => b.spi - a.spi);
      } else if (sortBy === 'both') {
        // Sort by average of CPI and SPI
        valid.sort((a, b) => {
          const aAvg = (a.cpi + a.spi) / 2;
          const bAvg = (b.cpi + b.spi) / 2;
          return bAvg - aAvg;
        });
      }

      return {
        success: true,
        totalJobs: valid.length,
        jobs: valid
      };
    }
  },

  async get_variance_analysis(args) {
    const { jobIdentifier, varianceType = 'both' } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const variance = await analyticsEngine.calculateVariance(jobId);
    const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);

    const result = {
      success: true,
      job: { id: jobId }
    };

    if (varianceType === 'cost' || varianceType === 'both') {
      result.costVariance = variance.budgetVariance;
      result.costCodeVariances = variance.costCodeVariances;
    }

    if (varianceType === 'schedule' || varianceType === 'both') {
      result.scheduleVariance = variance.scheduleVariance;
      result.progressVariance = scheduleAnalysis.progressVariance;
    }

    return result;
  },

  async get_health_score(args) {
    const { jobIdentifier } = args;
    
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (!jobId) {
        throw new Error(`Job not found: ${jobIdentifier}`);
      }

      const health = await analyticsEngine.getJobHealthScore(jobId);
      const job = await Job.findById(jobId).select('jobNumber name').lean();
      
      return {
        success: true,
        jobs: [{
          jobId,
          jobNumber: job?.jobNumber,
          name: job?.name,
          ...health
        }]
      };
    } else {
      // Get all jobs
      const jobs = await Job.find({}).select('_id jobNumber name').lean().limit(100);
      const healthScores = await Promise.all(
        jobs.map(async (job) => {
          try {
            const health = await analyticsEngine.getJobHealthScore(job._id.toString());
            return {
              jobId: job._id.toString(),
              jobNumber: job.jobNumber,
              name: job.name,
              ...health
            };
          } catch (error) {
            return null;
          }
        })
      );

      const valid = healthScores.filter(h => h !== null);
      valid.sort((a, b) => a.score - b.score); // Lower score = worse health

      return {
        success: true,
        totalJobs: valid.length,
        jobs: valid
      };
    }
  }
};

// ============================================================================
// CATEGORY 6: RESOURCE & TEAM HANDLERS
// ============================================================================

const resourceTeamHandlers = {
  async get_team_assignment(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const job = await Job.findById(jobId)
      .populate('jobManager', 'name email')
      .populate('fieldSupervisor', 'name email')
      .populate('foremen', 'name email')
      .select('jobNumber name jobManager fieldSupervisor foremen')
      .lean();

    if (!job) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    // Get unique workers from time entries
    const timeEntries = await TimeEntry.find({ jobId })
      .populate('workerId', 'name email role')
      .select('workerId')
      .lean();

    const uniqueWorkers = {};
    timeEntries.forEach(entry => {
      if (entry.workerId && entry.workerId._id) {
        const workerId = entry.workerId._id.toString();
        if (!uniqueWorkers[workerId]) {
          uniqueWorkers[workerId] = entry.workerId;
        }
      }
    });

    return {
      success: true,
      job: {
        id: jobId,
        jobNumber: job.jobNumber,
        name: job.name
      },
      team: {
        jobManager: job.jobManager,
        fieldSupervisor: job.fieldSupervisor,
        foremen: job.foremen || [],
        workers: Object.values(uniqueWorkers)
      }
    };
  },

  async get_resource_utilization(args) {
    const { jobIdentifier } = args;
    
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (!jobId) {
        throw new Error(`Job not found: ${jobIdentifier}`);
      }

      const timeEntries = await TimeEntry.find({ jobId })
        .populate('workerId', 'name')
        .lean();

      const uniqueWorkers = new Set();
      timeEntries.forEach(entry => {
        if (entry.workerId && entry.workerId._id) {
          uniqueWorkers.add(entry.workerId._id.toString());
        }
      });

      const totalHours = timeEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
      const job = await Job.findById(jobId).select('jobNumber name').lean();

      return {
        success: true,
        job: {
          id: jobId,
          jobNumber: job?.jobNumber,
          name: job?.name
        },
        utilization: {
          teamSize: uniqueWorkers.size,
          totalHours,
          averageHoursPerWorker: uniqueWorkers.size > 0 ? totalHours / uniqueWorkers.size : 0,
          totalEntries: timeEntries.length
        }
      };
    } else {
      // All jobs
      const jobs = await Job.find({}).select('_id jobNumber name').lean().limit(100);
      const utilizations = await Promise.all(
        jobs.map(async (job) => {
          try {
            const timeEntries = await TimeEntry.find({ jobId: job._id }).lean();
            const uniqueWorkers = new Set();
            timeEntries.forEach(entry => {
              if (entry.workerId) {
                uniqueWorkers.add(entry.workerId.toString());
              }
            });
            const totalHours = timeEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
            
            return {
              jobId: job._id.toString(),
              jobNumber: job.jobNumber,
              name: job.name,
              teamSize: uniqueWorkers.size,
              totalHours,
              averageHoursPerWorker: uniqueWorkers.size > 0 ? totalHours / uniqueWorkers.size : 0
            };
          } catch (error) {
            return null;
          }
        })
      );

      const valid = utilizations.filter(u => u !== null);
      return {
        success: true,
        totalJobs: valid.length,
        jobs: valid
      };
    }
  },

  async get_team_performance(args) {
    const { jobIdentifier, includeProductivity = true } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const teamPerformance = await dataAccess.getTeamPerformance(jobId);
    const timeEntries = await TimeEntry.find({ jobId }).lean();
    
    const result = {
      success: true,
      job: { id: jobId },
      ...teamPerformance
    };

    if (includeProductivity) {
      // Add productivity calculations
      result.workers = teamPerformance.workers.map(worker => {
        const workerEntries = timeEntries.filter(e => 
          e.workerId && e.workerId._id && e.workerId._id.toString() === worker.worker._id.toString()
        );
        const totalUnits = workerEntries.reduce((sum, e) => 
          sum + (e.unitsCompleted?.quantity || 0), 0
        );
        const productivity = worker.totalHours > 0 ? totalUnits / worker.totalHours : 0;
        
        return {
          ...worker,
          productivity: {
            unitsPerHour: productivity,
            totalUnits
          }
        };
      });
    }

    return result;
  },

  async get_hours_by_worker(args) {
    const { jobIdentifier, workerId, startDate, endDate } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const filter = { jobId };
    if (workerId) {
      filter.workerId = mongoose.Types.ObjectId.isValid(workerId) ? workerId : null;
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const timeEntries = await TimeEntry.find(filter)
      .populate('workerId', 'name email')
      .lean();

    const workerHours = {};
    timeEntries.forEach(entry => {
      const workerId = entry.workerId?._id?.toString() || 'UNKNOWN';
      if (!workerHours[workerId]) {
        workerHours[workerId] = {
          worker: entry.workerId,
          regularHours: 0,
          overtimeHours: 0,
          doubleTimeHours: 0,
          totalHours: 0,
          entries: 0
        };
      }
      workerHours[workerId].regularHours += entry.regularHours || 0;
      workerHours[workerId].overtimeHours += entry.overtimeHours || 0;
      workerHours[workerId].doubleTimeHours += entry.doubleTimeHours || 0;
      workerHours[workerId].totalHours += entry.totalHours || 0;
      workerHours[workerId].entries += 1;
    });

    return {
      success: true,
      job: { id: jobId },
      workers: Object.values(workerHours)
    };
  }
};

// ============================================================================
// CATEGORY 7: TASK & WORK MANAGEMENT HANDLERS
// ============================================================================

const taskWorkManagementHandlers = {
  async get_tasks(args) {
    const { jobIdentifier, status, priority, assignedTo, includeOverdue = false } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const filter = { jobId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) {
      const user = await User.findOne({ 
        $or: [
          { name: { $regex: assignedTo, $options: 'i' } },
          { _id: mongoose.Types.ObjectId.isValid(assignedTo) ? assignedTo : null }
        ]
      }).select('_id').lean();
      if (user) filter.assignedTo = user._id;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    let result = tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      startDate: task.startDate,
      completionPercentage: task.completionPercentage,
      isOverdue: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
    }));

    if (!includeOverdue) {
      result = result.filter(t => !t.isOverdue || t.status === 'completed');
    }

    return {
      success: true,
      job: { id: jobId },
      total: result.length,
      tasks: result
    };
  },

  async get_task_status(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const tasks = await Task.find({ jobId }).lean();
    const now = new Date();

    const statusCounts = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0
    };

    let overdueCount = 0;
    tasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
      if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed') {
        overdueCount++;
      }
    });

    const completionRate = tasks.length > 0 
      ? (statusCounts.completed / tasks.length) * 100 
      : 0;

    return {
      success: true,
      job: { id: jobId },
      summary: {
        total: tasks.length,
        byStatus: statusCounts,
        completed: statusCounts.completed,
        completionRate,
        overdue: overdueCount
      }
    };
  },

  async get_task_progress(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const tasks = await Task.find({ jobId }).lean();
    
    const completed = tasks.filter(t => t.status === 'completed');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const notStarted = tasks.filter(t => t.status === 'not_started');
    const onHold = tasks.filter(t => t.status === 'on_hold');

    return {
      success: true,
      job: { id: jobId },
      progress: {
        completed: {
          count: completed.length,
          percentage: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
          tasks: completed.map(t => ({
            id: t._id.toString(),
            title: t.title,
            completedAt: t.updatedAt
          }))
        },
        inProgress: {
          count: inProgress.length,
          percentage: tasks.length > 0 ? (inProgress.length / tasks.length) * 100 : 0,
          tasks: inProgress.map(t => ({
            id: t._id.toString(),
            title: t.title,
            completionPercentage: t.completionPercentage
          }))
        },
        notStarted: {
          count: notStarted.length,
          percentage: tasks.length > 0 ? (notStarted.length / tasks.length) * 100 : 0
        },
        onHold: {
          count: onHold.length,
          percentage: tasks.length > 0 ? (onHold.length / tasks.length) * 100 : 0
        }
      }
    };
  },

  async get_overdue_tasks(args) {
    const { jobIdentifier } = args;
    
    const filter = {
      dueDate: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] }
    };

    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }

    const overdueTasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('jobId', 'jobNumber name')
      .lean();

    return {
      success: true,
      total: overdueTasks.length,
      tasks: overdueTasks.map(task => ({
        id: task._id.toString(),
        title: task.title,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo,
        job: task.jobId ? {
          id: task.jobId._id.toString(),
          jobNumber: task.jobId.jobNumber,
          name: task.jobId.name
        } : null,
        daysOverdue: task.dueDate 
          ? Math.ceil((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24))
          : 0
      }))
    };
  },

  async get_tasks_for_today(args) {
    const { jobIdentifier, assignedTo } = args;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = {
      dueDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ['completed', 'cancelled'] }
    };

    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }

    if (assignedTo) {
      const user = await User.findOne({ 
        $or: [
          { name: { $regex: assignedTo, $options: 'i' } },
          { _id: mongoose.Types.ObjectId.isValid(assignedTo) ? assignedTo : null }
        ]
      }).select('_id').lean();
      if (user) filter.assignedTo = user._id;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('jobId', 'jobNumber name')
      .lean();

    return {
      success: true,
      date: today.toISOString().split('T')[0],
      total: tasks.length,
      tasks: tasks.map(task => ({
        id: task._id.toString(),
        title: task.title,
        priority: task.priority,
        assignedTo: task.assignedTo,
        job: task.jobId ? {
          id: task.jobId._id.toString(),
          jobNumber: task.jobId.jobNumber,
          name: task.jobId.name
        } : null
      }))
    };
  }
};

// ============================================================================
// CATEGORY 8: RISK & HEALTH HANDLERS (Already exists in jobTools.js)
// ============================================================================
// These are imported from jobTools.js

// ============================================================================
// CATEGORY 9: FORECASTING & PREDICTION HANDLERS (Already exists in jobTools.js)
// ============================================================================
// These are imported from jobTools.js

// ============================================================================
// CATEGORY 10: COMPARISON & BENCHMARKING HANDLERS (Already exists in jobTools.js)
// ============================================================================
// These are imported from jobTools.js

// ============================================================================
// CATEGORY 11: RECOMMENDATION & ACTION HANDLERS (Already exists in jobTools.js)
// ============================================================================
// These are imported from jobTools.js

// ============================================================================
// CATEGORY 12: COST CODE & LINE ITEM HANDLERS
// ============================================================================

const costCodeLineItemHandlers = {
  async get_cost_codes(args) {
    const { jobIdentifier, includeVariance = true } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const job = await Job.findById(jobId).select('costCodes').lean();
    if (!job) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const costCodes = job.costCodes || [];
    let result = costCodes.map(cc => ({
      code: cc.code,
      description: cc.description,
      category: cc.category,
      budgetHours: cc.budgetHours || 0,
      budgetCost: cc.budgetCost || 0
    }));

    if (includeVariance) {
      const costCodeAnalysis = await dataAccess.getCostCodeAnalysis(jobId);
      result = result.map(cc => {
        const analysis = costCodeAnalysis.find(a => a.code === cc.code);
        return {
          ...cc,
          actualHours: analysis?.actualHours || 0,
          actualCost: analysis?.actualCost || 0,
          hoursVariance: analysis?.hoursVariance || 0,
          costVariance: analysis?.costVariance || 0,
          hoursVariancePercent: analysis?.hoursVariancePercent || 0,
          costVariancePercent: analysis?.costVariancePercent || 0
        };
      });
    }

    return {
      success: true,
      job: { id: jobId },
      costCodes: result
    };
  },

  async get_cost_code_analysis(args) {
    const { jobIdentifier, costCode } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const costCodeAnalysis = await dataAccess.getCostCodeAnalysis(jobId);
    
    let result = costCodeAnalysis;
    if (costCode) {
      result = costCodeAnalysis.filter(cc => cc.code === costCode);
    }

    return {
      success: true,
      job: { id: jobId },
      costCodes: result
    };
  },

  async get_cost_code_trends(args) {
    const { jobIdentifier, costCode, period = 'month' } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    const filter = { jobId, date: { $gte: startDate } };
    if (costCode) filter.costCode = costCode;

    const timeEntries = await TimeEntry.find(filter).sort({ date: 1 }).lean();
    
    const trends = [];
    const dailyData = {};
    
    timeEntries.forEach(entry => {
      const date = entry.date.toISOString().split('T')[0];
      const code = entry.costCode || 'UNKNOWN';
      const key = `${date}_${code}`;
      
      if (!dailyData[key]) {
        dailyData[key] = { date, costCode: code, hours: 0, cost: 0 };
      }
      dailyData[key].hours += entry.totalHours || 0;
      dailyData[key].cost += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
    });

    Object.keys(dailyData).sort().forEach(key => {
      trends.push(dailyData[key]);
    });

    return {
      success: true,
      period,
      costCode: costCode || 'all',
      trends
    };
  }
};

// ============================================================================
// CATEGORY 13: TIME TRACKING & LABOR HANDLERS
// ============================================================================

const timeTrackingLaborHandlers = {
  async get_time_entries(args) {
    const { jobIdentifier, workerId, costCode, startDate, endDate } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const filter = { jobId };
    if (workerId) {
      filter.workerId = mongoose.Types.ObjectId.isValid(workerId) ? workerId : null;
    }
    if (costCode) filter.costCode = costCode;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const timeEntries = await TimeEntry.find(filter)
      .populate('workerId', 'name email')
      .sort({ date: -1 })
      .lean();

    return {
      success: true,
      job: { id: jobId },
      total: timeEntries.length,
      entries: timeEntries.map(entry => ({
        id: entry._id.toString(),
        date: entry.date,
        worker: entry.workerId,
        costCode: entry.costCode,
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        totalHours: entry.totalHours,
        totalCost: entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75)
      }))
    };
  },

  async get_labor_costs(args) {
    const { jobIdentifier, groupBy = 'worker' } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const timeEntries = await TimeEntry.find({ jobId })
      .populate('workerId', 'name email')
      .lean();

    let breakdown = {};
    
    if (groupBy === 'worker') {
      timeEntries.forEach(entry => {
        const workerId = entry.workerId?._id?.toString() || 'UNKNOWN';
        if (!breakdown[workerId]) {
          breakdown[workerId] = {
            worker: entry.workerId,
            regularHours: 0,
            overtimeHours: 0,
            totalHours: 0,
            regularCost: 0,
            overtimeCost: 0,
            totalCost: 0
          };
        }
        breakdown[workerId].regularHours += entry.regularHours || 0;
        breakdown[workerId].overtimeHours += entry.overtimeHours || 0;
        breakdown[workerId].totalHours += entry.totalHours || 0;
        breakdown[workerId].regularCost += (entry.regularHours || 0) * 50;
        breakdown[workerId].overtimeCost += (entry.overtimeHours || 0) * 75;
        breakdown[workerId].totalCost += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
      });
    } else if (groupBy === 'costCode') {
      timeEntries.forEach(entry => {
        const code = entry.costCode || 'UNKNOWN';
        if (!breakdown[code]) {
          breakdown[code] = {
            costCode: code,
            totalHours: 0,
            totalCost: 0
          };
        }
        breakdown[code].totalHours += entry.totalHours || 0;
        breakdown[code].totalCost += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
      });
    } else if (groupBy === 'date') {
      timeEntries.forEach(entry => {
        const date = entry.date.toISOString().split('T')[0];
        if (!breakdown[date]) {
          breakdown[date] = {
            date,
            totalHours: 0,
            totalCost: 0
          };
        }
        breakdown[date].totalHours += entry.totalHours || 0;
        breakdown[date].totalCost += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
      });
    }

    const total = {
      totalHours: timeEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
      totalCost: timeEntries.reduce((sum, e) => sum + (e.totalCost || ((e.regularHours || 0) * 50 + (e.overtimeHours || 0) * 75)), 0)
    };

    return {
      success: true,
      job: { id: jobId },
      groupBy,
      breakdown: Object.values(breakdown),
      total
    };
  },

  async get_productivity_metrics(args) {
    const { jobIdentifier, workerId } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const filter = { jobId };
    if (workerId) {
      filter.workerId = mongoose.Types.ObjectId.isValid(workerId) ? workerId : null;
    }

    const timeEntries = await TimeEntry.find(filter)
      .populate('workerId', 'name email')
      .lean();

    const productivity = {};
    timeEntries.forEach(entry => {
      if (entry.unitsCompleted && entry.unitsCompleted.quantity && entry.totalHours > 0) {
        const workerId = entry.workerId?._id?.toString() || 'UNKNOWN';
        const unit = entry.unitsCompleted.unit || 'unit';
        const key = `${workerId}_${unit}`;
        
        if (!productivity[key]) {
          productivity[key] = {
            worker: entry.workerId,
            unit,
            totalHours: 0,
            totalUnits: 0,
            entries: 0
          };
        }
        productivity[key].totalHours += entry.totalHours;
        productivity[key].totalUnits += entry.unitsCompleted.quantity;
        productivity[key].entries += 1;
      }
    });

    const metrics = Object.values(productivity).map(p => ({
      worker: p.worker,
      unit: p.unit,
      totalHours: p.totalHours,
      totalUnits: p.totalUnits,
      unitsPerHour: p.totalHours > 0 ? p.totalUnits / p.totalHours : 0,
      hoursPerUnit: p.totalUnits > 0 ? p.totalHours / p.totalUnits : 0
    }));

    return {
      success: true,
      job: { id: jobId },
      productivity: metrics
    };
  },

  async get_time_analysis(args) {
    const { jobIdentifier, compareToBudget = true } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const timeEntries = await TimeEntry.find({ jobId }).lean();
    const job = await Job.findById(jobId).select('costCodes').lean();

    const totalHours = timeEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const totalBudgetHours = job?.costCodes?.reduce((sum, cc) => sum + (cc.budgetHours || 0), 0) || 0;
    const hoursVariance = totalBudgetHours - totalHours;
    const hoursVariancePercent = totalBudgetHours > 0 ? (hoursVariance / totalBudgetHours) * 100 : 0;

    // Calculate burn rate (hours per day)
    const dates = timeEntries.map(e => e.date).sort();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const daysDiff = firstDate && lastDate
      ? Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1
      : 1;
    const burnRate = daysDiff > 0 ? totalHours / daysDiff : 0;

    const result = {
      success: true,
      job: { id: jobId },
      analysis: {
        totalHours,
        totalBudgetHours,
        hoursVariance,
        hoursVariancePercent,
        burnRate,
        averageHoursPerDay: burnRate
      }
    };

    if (compareToBudget) {
      result.budgetComparison = {
        budgetHours: totalBudgetHours,
        actualHours: totalHours,
        variance: hoursVariance,
        variancePercent: hoursVariancePercent,
        isOnTrack: hoursVariancePercent >= -10 && hoursVariancePercent <= 10
      };
    }

    return result;
  }
};

// ============================================================================
// CATEGORY 14: CLIENT & PROJECT HANDLERS
// ============================================================================

const clientProjectHandlers = {
  async get_client_jobs(args) {
    const { clientName, includeMetrics = false } = args;
    if (!clientName) {
      throw new Error('clientName is required');
    }

    const jobs = await Job.find({ 'client.name': { $regex: clientName, $options: 'i' } })
      .populate('jobManager', 'name')
      .populate('projectId', 'name projectNumber')
      .select('jobNumber name status contractValue overallProgress jobManager projectId client')
      .lean();

    let result = jobs.map(job => ({
      id: job._id.toString(),
      jobNumber: job.jobNumber,
      name: job.name,
      status: job.status,
      contractValue: job.contractValue,
      progress: job.overallProgress || 0,
      jobManager: job.jobManager?.name,
      project: job.projectId
    }));

    if (includeMetrics) {
      result = await Promise.all(
        result.map(async (job) => {
          try {
            const metrics = await dataAccess.getJobMetrics(job.id);
            return {
              ...job,
              metrics: {
                totalCost: metrics.metrics.totalCost,
                budgetVariance: metrics.metrics.budgetVariancePercent
              }
            };
          } catch (error) {
            return job;
          }
        })
      );
    }

    return {
      success: true,
      client: clientName,
      total: result.length,
      jobs: result
    };
  },

  async get_project_jobs(args) {
    const { projectIdentifier, includeMetrics = false } = args;
    if (!projectIdentifier) {
      throw new Error('projectIdentifier is required');
    }

    const projectId = await resolveProjectId(projectIdentifier);
    if (!projectId) {
      throw new Error(`Project not found: ${projectIdentifier}`);
    }

    const jobs = await Job.find({ projectId })
      .populate('jobManager', 'name')
      .select('jobNumber name status contractValue overallProgress jobManager')
      .lean();

    let result = jobs.map(job => ({
      id: job._id.toString(),
      jobNumber: job.jobNumber,
      name: job.name,
      status: job.status,
      contractValue: job.contractValue,
      progress: job.overallProgress || 0,
      jobManager: job.jobManager?.name
    }));

    if (includeMetrics) {
      result = await Promise.all(
        result.map(async (job) => {
          try {
            const metrics = await dataAccess.getJobMetrics(job.id);
            return {
              ...job,
              metrics: {
                totalCost: metrics.metrics.totalCost,
                budgetVariance: metrics.metrics.budgetVariancePercent
              }
            };
          } catch (error) {
            return job;
          }
        })
      );
    }

    return {
      success: true,
      project: { id: projectId },
      total: result.length,
      jobs: result
    };
  },

  async get_project_portfolio(args) {
    const { status } = args || {};
    const filter = {};
    if (status) filter.status = status;

    const projects = await Project.find(filter)
      .populate('projectManager', 'name')
      .select('name projectNumber totalContractValue status projectManager startDate endDate overallProgress')
      .lean();

    const portfolio = await Promise.all(
      projects.map(async (project) => {
        const jobs = await Job.find({ projectId: project._id }).select('_id jobNumber status').lean();
        return {
          id: project._id.toString(),
          name: project.name,
          projectNumber: project.projectNumber,
          totalContractValue: project.totalContractValue,
          status: project.status,
          projectManager: project.projectManager,
          startDate: project.startDate,
          endDate: project.endDate,
          overallProgress: project.overallProgress || 0,
          jobCount: jobs.length,
          jobs: jobs.map(j => ({
            id: j._id.toString(),
            jobNumber: j.jobNumber,
            status: j.status
          }))
        };
      })
    );

    return {
      success: true,
      total: portfolio.length,
      projects: portfolio
    };
  }
};

// ============================================================================
// CATEGORY 15: SCHEDULE OF VALUES (SOV) HANDLERS
// ============================================================================

const sovHandlers = {
  async get_sov(args) {
    const { jobIdentifier, includeProgress = true } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const sov = await ScheduleOfValues.find({ jobId })
      .sort({ sortOrder: 1, lineNumber: 1 })
      .lean();

    let result = sov.map(item => ({
      id: item._id.toString(),
      lineNumber: item.lineNumber,
      description: item.description,
      costCode: item.costCode || item.costCodeNumber,
      quantity: item.quantity,
      unit: item.unit,
      totalValue: item.totalValue || item.totalCost,
      status: item.status
    }));

    if (includeProgress) {
      result = result.map(item => {
        const sovItem = sov.find(s => s._id.toString() === item.id);
        return {
          ...item,
          quantityComplete: sovItem?.quantityComplete || 0,
          percentComplete: sovItem?.percentComplete || 0,
          valueEarned: sovItem?.valueEarned || 0
        };
      });
    }

    return {
      success: true,
      job: { id: jobId },
      total: result.length,
      items: result
    };
  },

  async get_sov_progress(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const sov = await ScheduleOfValues.find({ jobId }).lean();
    const totalValue = sov.reduce((sum, item) => sum + (item.totalValue || item.totalCost || 0), 0);
    const totalEarned = sov.reduce((sum, item) => sum + (item.valueEarned || 0), 0);
    const billingPercentage = totalValue > 0 ? (totalEarned / totalValue) * 100 : 0;

    return {
      success: true,
      job: { id: jobId },
      progress: {
        totalValue,
        totalEarned,
        billingPercentage,
        itemsComplete: sov.filter(item => item.status === 'completed').length,
        totalItems: sov.length
      },
      items: sov.map(item => ({
        lineNumber: item.lineNumber,
        description: item.description,
        totalValue: item.totalValue || item.totalCost,
        valueEarned: item.valueEarned || 0,
        percentComplete: item.percentComplete || 0,
        status: item.status
      }))
    };
  },

  async get_sov_analysis(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const sov = await ScheduleOfValues.find({ jobId }).lean();
    const timeEntries = await TimeEntry.find({ jobId }).lean();

    // Calculate actual costs by cost code
    const actualCostsByCode = {};
    timeEntries.forEach(entry => {
      const code = entry.costCode || 'UNKNOWN';
      if (!actualCostsByCode[code]) {
        actualCostsByCode[code] = 0;
      }
      actualCostsByCode[code] += entry.totalCost || ((entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75);
    });

    const analysis = sov.map(item => {
      const code = item.costCode || item.costCodeNumber || 'UNKNOWN';
      const actualCost = actualCostsByCode[code] || 0;
      const sovValue = item.totalValue || item.totalCost || 0;
      const variance = sovValue - actualCost;
      const variancePercent = sovValue > 0 ? (variance / sovValue) * 100 : 0;

      return {
        lineNumber: item.lineNumber,
        description: item.description,
        costCode: code,
        sovValue,
        actualCost,
        variance,
        variancePercent,
        percentComplete: item.percentComplete || 0,
        status: item.status
      };
    });

    return {
      success: true,
      job: { id: jobId },
      analysis
    };
  }
};

// ============================================================================
// CATEGORY 16: PROGRESS REPORT HANDLERS
// ============================================================================

const progressReportHandlers = {
  async get_progress_reports(args) {
    const { jobIdentifier, limit = 10, includeLatest = false } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    let reports = await ProgressReport.find({ jobId })
      .sort({ reportDate: -1 })
      .limit(includeLatest ? 1 : limit)
      .lean();

    return {
      success: true,
      job: { id: jobId },
      total: reports.length,
      reports: reports.map(report => ({
        id: report._id.toString(),
        reportNumber: report.reportNumber,
        reportDate: report.reportDate,
        status: report.status,
        summary: report.summary
      }))
    };
  },

  async get_progress_report_details(args) {
    const { reportId, reportNumber, jobIdentifier } = args;
    
    // If no args provided, get latest report for a sample job
    if (!reportId && !reportNumber && !jobIdentifier) {
      const Job = require('../../../models/Job');
      const sampleJob = await Job.findOne({}).select('_id').lean();
      if (sampleJob) {
        const latestReport = await ProgressReport.findOne({ jobId: sampleJob._id })
          .sort({ reportDate: -1 })
          .lean();
        if (latestReport) {
          return {
            success: true,
            report: {
              id: latestReport._id.toString(),
              reportNumber: latestReport.reportNumber,
              reportDate: latestReport.reportDate,
              reportPeriodStart: latestReport.reportPeriodStart,
              reportPeriodEnd: latestReport.reportPeriodEnd,
              status: latestReport.status,
              summary: latestReport.summary,
              lineItems: latestReport.lineItems
            }
          };
        }
      }
      throw new Error('No progress reports found. Please provide reportId or (reportNumber and jobIdentifier)');
    }
    
    let report;
    if (reportId) {
      report = await ProgressReport.findById(reportId).lean();
    } else if (reportNumber && jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      report = await ProgressReport.findOne({ jobId, reportNumber }).lean();
    } else {
      throw new Error('Either reportId or (reportNumber and jobIdentifier) is required');
    }

    if (!report) {
      throw new Error('Progress report not found');
    }

    return {
      success: true,
      report: {
        id: report._id.toString(),
        reportNumber: report.reportNumber,
        reportDate: report.reportDate,
        reportPeriodStart: report.reportPeriodStart,
        reportPeriodEnd: report.reportPeriodEnd,
        status: report.status,
        summary: report.summary,
        lineItems: report.lineItems
      }
    };
  },

  async get_progress_report_trends(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const reports = await ProgressReport.find({ jobId })
      .sort({ reportDate: 1 })
      .lean();

    const trends = reports.map(report => ({
      date: report.reportDate,
      progress: report.summary.totalApprovedCTD.percent,
      amount: report.summary.totalApprovedCTD.amount,
      dueThisPeriod: report.summary.totalDueThisPeriod
    }));

    return {
      success: true,
      job: { id: jobId },
      trends
    };
  }
};

// ============================================================================
// CATEGORY 17: PURCHASE ORDER HANDLERS
// ============================================================================

const purchaseOrderHandlers = {
  async get_purchase_orders(args) {
    const { jobIdentifier, status, poNumber } = args;
    
    const filter = {};
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }
    if (status) filter.status = status;
    if (poNumber) filter.poNumber = poNumber;

    const pos = await PurchaseOrder.find(filter)
      .populate('supplierId', 'name')
      .populate('buyerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      total: pos.length,
      purchaseOrders: pos.map(po => ({
        id: po._id.toString(),
        poNumber: po.poNumber,
        supplier: po.supplierId?.name,
        buyer: po.buyerId?.name,
        total: po.total,
        status: po.status,
        requiredByDate: po.requiredByDate,
        lineItems: po.lineItems?.length || 0
      }))
    };
  },

  async get_po_costs(args) {
    const { jobIdentifier, compareToBudget = true } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const pos = await PurchaseOrder.find({ jobId }).lean();
    const totalPOCost = pos.reduce((sum, po) => sum + (po.total || 0), 0);

    const result = {
      success: true,
      job: { id: jobId },
      costs: {
        totalPOCost,
        poCount: pos.length,
        averagePOCost: pos.length > 0 ? totalPOCost / pos.length : 0
      }
    };

    if (compareToBudget) {
      const job = await Job.findById(jobId).select('costCodes').lean();
      const materialBudget = job?.costCodes
        ?.filter(cc => cc.category === 'material')
        .reduce((sum, cc) => sum + (cc.budgetCost || 0), 0) || 0;
      
      result.budgetComparison = {
        materialBudget,
        actualPOCost: totalPOCost,
        variance: materialBudget - totalPOCost,
        variancePercent: materialBudget > 0 ? ((materialBudget - totalPOCost) / materialBudget) * 100 : 0
      };
    }

    return result;
  },

  async get_po_trends(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const pos = await PurchaseOrder.find({ jobId })
      .sort({ createdAt: 1 })
      .lean();

    const trends = pos.map(po => ({
      date: po.createdAt,
      poNumber: po.poNumber,
      total: po.total,
      status: po.status
    }));

    return {
      success: true,
      job: { id: jobId },
      trends
    };
  }
};

// ============================================================================
// CATEGORY 18: MATERIAL REQUEST HANDLERS
// ============================================================================

const materialRequestHandlers = {
  async get_material_requests(args) {
    const { jobIdentifier, status } = args;
    
    const filter = {};
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }
    if (status) filter.status = status;

    const requests = await MaterialRequest.find(filter)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      total: requests.length,
      requests: requests.map(req => ({
        id: req._id.toString(),
        requestNumber: req.requestNumber,
        requestedBy: req.requestedBy?.name,
        requiredByDate: req.requiredByDate,
        priority: req.priority,
        status: req.status,
        lineItems: req.lineItems?.length || 0
      }))
    };
  },

  async get_material_needs(args) {
    const { jobIdentifier, urgency = 'all' } = args;
    
    const filter = { status: { $in: ['pending', 'approved'] } };
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }
    if (urgency === 'urgent') {
      filter.priority = 'urgent';
    } else if (urgency === 'soon') {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 7);
      filter.requiredByDate = { $lte: soonDate };
    }

    const requests = await MaterialRequest.find(filter)
      .populate('requestedBy', 'name')
      .sort({ requiredByDate: 1 })
      .lean();

    return {
      success: true,
      total: requests.length,
      needs: requests.map(req => ({
        id: req._id.toString(),
        requestNumber: req.requestNumber,
        requiredByDate: req.requiredByDate,
        priority: req.priority,
        status: req.status,
        lineItems: req.lineItems || []
      }))
    };
  }
};

// ============================================================================
// CATEGORY 19: WORK ORDER HANDLERS
// ============================================================================

const workOrderHandlers = {
  async get_work_orders(args) {
    const { jobIdentifier, status, workOrderNumber } = args;
    
    const filter = {};
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }
    if (status) filter.status = status;
    if (workOrderNumber) filter.workOrderNumber = workOrderNumber;

    const workOrders = await WorkOrder.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      total: workOrders.length,
      workOrders: workOrders.map(wo => ({
        id: wo._id.toString(),
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        status: wo.status,
        priority: wo.priority,
        assignedTo: wo.assignedTo,
        dueDate: wo.dueDate,
        completionPercentage: wo.completionPercentage
      }))
    };
  },

  async get_work_order_details(args) {
    const { workOrderNumber, workOrderId } = args;
    
    // If no args provided, get first work order for a sample job
    if (!workOrderId && !workOrderNumber) {
      const Job = require('../../../models/Job');
      const sampleJob = await Job.findOne({}).select('_id').lean();
      if (sampleJob) {
        const firstWO = await WorkOrder.findOne({ jobId: sampleJob._id })
          .populate('assignedTo', 'name email')
          .populate('jobId', 'jobNumber name')
          .lean();
        if (firstWO) {
          return {
            success: true,
            workOrder: {
              id: firstWO._id.toString(),
              workOrderNumber: firstWO.workOrderNumber,
              title: firstWO.title,
              description: firstWO.description,
              status: firstWO.status,
              priority: firstWO.priority,
              assignedTo: firstWO.assignedTo,
              job: firstWO.jobId,
              dueDate: firstWO.dueDate,
              completionPercentage: firstWO.completionPercentage,
              estimatedHours: firstWO.estimatedHours,
              actualHours: firstWO.actualHours,
              estimatedCost: firstWO.estimatedCost,
              actualCost: firstWO.actualCost
            }
          };
        }
      }
      throw new Error('No work orders found. Please provide workOrderId or workOrderNumber');
    }
    
    let workOrder;
    if (workOrderId) {
      workOrder = await WorkOrder.findById(workOrderId)
        .populate('assignedTo', 'name email')
        .populate('jobId', 'jobNumber name')
        .lean();
    } else if (workOrderNumber) {
      workOrder = await WorkOrder.findOne({ workOrderNumber })
        .populate('assignedTo', 'name email')
        .populate('jobId', 'jobNumber name')
        .lean();
    } else {
      throw new Error('Either workOrderId or workOrderNumber is required');
    }

    if (!workOrder) {
      throw new Error('Work order not found');
    }

    return {
      success: true,
      workOrder: {
        id: workOrder._id.toString(),
        workOrderNumber: workOrder.workOrderNumber,
        title: workOrder.title,
        description: workOrder.description,
        status: workOrder.status,
        priority: workOrder.priority,
        assignedTo: workOrder.assignedTo,
        job: workOrder.jobId,
        dueDate: workOrder.dueDate,
        completionPercentage: workOrder.completionPercentage,
        estimatedHours: workOrder.estimatedHours,
        actualHours: workOrder.actualHours,
        estimatedCost: workOrder.estimatedCost,
        actualCost: workOrder.actualCost
      }
    };
  }
};

// ============================================================================
// CATEGORY 20: ACCOUNTS PAYABLE HANDLERS
// ============================================================================

const accountsPayableHandlers = {
  async get_accounts_payable(args) {
    const { jobIdentifier, status, vendorName, includeOverdue = true } = args;
    
    const filter = {};
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }
    if (status) {
      if (status === 'overdue') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $ne: 'paid' };
      } else {
        filter.status = status;
      }
    }
    if (vendorName) {
      filter['vendor.name'] = { $regex: vendorName, $options: 'i' };
    }

    const ap = await APRegister.find(filter)
      .sort({ dueDate: 1 })
      .lean();

    let result = ap.map(item => ({
      id: item._id.toString(),
      invoiceNumber: item.invoiceNumber,
      vendor: item.vendor?.name,
      invoiceAmount: item.invoiceAmount,
      dueDate: item.dueDate,
      status: item.status,
      jobId: item.jobId?.toString()
    }));

    if (!includeOverdue) {
      result = result.filter(item => {
        if (!item.dueDate) return true;
        return new Date(item.dueDate) >= new Date() || item.status === 'paid';
      });
    }

    return {
      success: true,
      total: result.length,
      accountsPayable: result
    };
  },

  async get_ap_balance(args) {
    const { jobIdentifier, groupBy = 'job' } = args;
    
    const filter = { status: { $ne: 'paid' } };
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (jobId) filter.jobId = jobId;
    }

    const ap = await APRegister.find(filter).lean();
    
    let balance = {};
    
    if (groupBy === 'job') {
      ap.forEach(item => {
        const jobId = item.jobId?.toString() || 'UNASSIGNED';
        if (!balance[jobId]) {
          balance[jobId] = { jobId, total: 0, count: 0 };
        }
        balance[jobId].total += item.invoiceAmount || 0;
        balance[jobId].count += 1;
      });
    } else if (groupBy === 'vendor') {
      ap.forEach(item => {
        const vendor = item.vendor?.name || 'UNKNOWN';
        if (!balance[vendor]) {
          balance[vendor] = { vendor, total: 0, count: 0 };
        }
        balance[vendor].total += item.invoiceAmount || 0;
        balance[vendor].count += 1;
      });
    } else if (groupBy === 'date') {
      ap.forEach(item => {
        const month = item.dueDate ? new Date(item.dueDate).toISOString().substring(0, 7) : 'UNKNOWN';
        if (!balance[month]) {
          balance[month] = { month, total: 0, count: 0 };
        }
        balance[month].total += item.invoiceAmount || 0;
        balance[month].count += 1;
      });
    }

    const totalBalance = ap.reduce((sum, item) => sum + (item.invoiceAmount || 0), 0);

    return {
      success: true,
      totalBalance,
      breakdown: Object.values(balance)
    };
  }
};

// ============================================================================
// IMPORT EXISTING HANDLERS FROM jobTools.js
// ============================================================================

const { toolHandlers: existingHandlers } = require('./jobTools');

// ============================================================================
// COMBINE ALL HANDLERS
// ============================================================================

const allToolHandlers = {
  // Job Management
  ...jobManagementHandlers,
  
  // Budget & Financial
  ...budgetFinancialHandlers,
  
  // Schedule & Timeline
  ...scheduleTimelineHandlers,
  
  // Progress & Completion
  ...progressCompletionHandlers,
  
  // Performance Metrics
  ...performanceMetricsHandlers,
  
  // Resource & Team
  ...resourceTeamHandlers,
  
  // Task & Work Management
  ...taskWorkManagementHandlers,
  
  // Risk & Health (from existing + new)
  analyze_job_risk: existingHandlers.analyze_job_risk,
  find_at_risk_jobs: existingHandlers.find_at_risk_jobs,
  
  async get_risk_factors(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const riskAnalysis = await existingHandlers.analyze_job_risk({ jobIdentifier });
    return {
      success: true,
      job: { id: jobId },
      riskFactors: riskAnalysis.riskFactors || [],
      riskScore: riskAnalysis.riskScore,
      riskLevel: riskAnalysis.riskLevel,
      metrics: riskAnalysis.metrics
    };
  },
  
  // Forecasting (from existing + new)
  get_job_forecast: existingHandlers.get_job_forecast,
  
  async get_cost_forecast(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const forecast = await existingHandlers.get_job_forecast({ jobIdentifier, forecastType: 'cost' });
    return {
      success: true,
      job: { id: await resolveJobId(jobIdentifier) },
      forecast: forecast.forecast.cost
    };
  },

  async get_schedule_forecast(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const forecast = await existingHandlers.get_job_forecast({ jobIdentifier, forecastType: 'completion' });
    return {
      success: true,
      job: { id: await resolveJobId(jobIdentifier) },
      forecast: forecast.forecast.completion
    };
  },

  async get_profitability_forecast(args) {
    const { jobIdentifier } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const metrics = await dataAccess.getJobMetrics(jobId);
    const evm = await analyticsEngine.calculateEVM(jobId);
    const profit = metrics.job.contractValue - metrics.metrics.totalCost;
    const currentMargin = metrics.job.contractValue > 0 
      ? (profit / metrics.job.contractValue) * 100 
      : 0;
    
    // Forecast final profitability based on EAC
    const forecastProfit = metrics.job.contractValue - evm.estimateAtCompletion;
    const forecastMargin = metrics.job.contractValue > 0 
      ? (forecastProfit / metrics.job.contractValue) * 100 
      : 0;

    return {
      success: true,
      job: { id: jobId },
      forecast: {
        currentProfit: profit,
        currentMargin,
        forecastProfit,
        forecastMargin,
        isProfitable: forecastProfit > 0,
        confidence: 0.75
      }
    };
  },
  
  // Comparison (from existing + new)
  async compare_jobs(args) {
    const { jobIdentifiers } = args;
    if (!jobIdentifiers || !Array.isArray(jobIdentifiers) || jobIdentifiers.length < 2) {
      throw new Error('jobIdentifiers must be an array with at least 2 job identifiers');
    }
    return await existingHandlers.compare_jobs(args);
  },
  
  async compare_metrics(args) {
    const { metric, jobIdentifiers } = args;
    if (!metric) {
      throw new Error('metric is required');
    }

    let jobsToCompare = [];
    if (jobIdentifiers && jobIdentifiers.length > 0) {
      const resolvedIds = await Promise.all(
        jobIdentifiers.map(id => resolveJobId(id))
      );
      jobsToCompare = resolvedIds.filter(id => id !== null);
    } else {
      const allJobs = await Job.find({}).select('_id').lean().limit(100);
      jobsToCompare = allJobs.map(j => j._id.toString());
    }

    if (jobsToCompare.length === 0) {
      throw new Error('No valid jobs found for comparison');
    }

    const comparisons = await Promise.all(
      jobsToCompare.map(async (jobId) => {
        try {
          const job = await Job.findById(jobId).select('jobNumber name').lean();
          if (metric === 'budget' || metric === 'all') {
            const metrics = await dataAccess.getJobMetrics(jobId);
            return {
              jobId,
              jobNumber: job?.jobNumber,
              name: job?.name,
              budget: {
                contractValue: metrics.job.contractValue,
                totalCost: metrics.metrics.totalCost,
                variance: metrics.metrics.budgetVariance,
                variancePercent: metrics.metrics.budgetVariancePercent
              }
            };
          } else if (metric === 'schedule' || metric === 'all') {
            const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
            return {
              jobId,
              jobNumber: job?.jobNumber,
              name: job?.name,
              schedule: {
                progress: scheduleAnalysis.progress,
                progressVariance: scheduleAnalysis.progressVariance,
                daysRemaining: scheduleAnalysis.daysRemaining
              }
            };
          } else if (metric === 'profitability' || metric === 'all') {
            const metrics = await dataAccess.getJobMetrics(jobId);
            const profit = metrics.job.contractValue - metrics.metrics.totalCost;
            return {
              jobId,
              jobNumber: job?.jobNumber,
              name: job?.name,
              profitability: {
                profit,
                margin: metrics.job.contractValue > 0 ? (profit / metrics.job.contractValue) * 100 : 0
              }
            };
          } else if (metric === 'cpi' || metric === 'all') {
            const evm = await analyticsEngine.calculateEVM(jobId);
            return {
              jobId,
              jobNumber: job?.jobNumber,
              name: job?.name,
              cpi: evm.costPerformanceIndex
            };
          } else if (metric === 'spi' || metric === 'all') {
            const evm = await analyticsEngine.calculateEVM(jobId);
            return {
              jobId,
              jobNumber: job?.jobNumber,
              name: job?.name,
              spi: evm.schedulePerformanceIndex
            };
          } else if (metric === 'health' || metric === 'all') {
            const health = await analyticsEngine.getJobHealthScore(jobId);
            return {
              jobId,
              jobNumber: job?.jobNumber,
              name: job?.name,
              health: health.score,
              status: health.status
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );

    const valid = comparisons.filter(c => c !== null);
    return {
      success: true,
      metric,
      totalJobs: valid.length,
      comparisons: valid
    };
  },

  async get_benchmarks(args) {
    const { metric = 'all', status } = args || {};
    
    const filter = {};
    if (status) filter.status = status;

    const jobs = await Job.find(filter).select('_id jobNumber name').lean().limit(100);
    
    const benchmarks = {
      totalJobs: jobs.length
    };

    if (metric === 'budget' || metric === 'all') {
      const budgetData = await Promise.all(
        jobs.map(async (job) => {
          try {
            const metrics = await dataAccess.getJobMetrics(job._id.toString());
            return {
              budgetVariance: metrics.metrics.budgetVariancePercent,
              totalCost: metrics.metrics.totalCost
            };
          } catch (error) {
            return null;
          }
        })
      );
      const valid = budgetData.filter(b => b !== null);
      benchmarks.budget = {
        averageVariance: valid.length > 0 
          ? valid.reduce((sum, b) => sum + b.budgetVariance, 0) / valid.length 
          : 0,
        averageCost: valid.length > 0
          ? valid.reduce((sum, b) => sum + b.totalCost, 0) / valid.length
          : 0
      };
    }

    if (metric === 'schedule' || metric === 'all') {
      const scheduleData = await Promise.all(
        jobs.map(async (job) => {
          try {
            const scheduleAnalysis = await dataAccess.getScheduleAnalysis(job._id.toString());
            return {
              progress: scheduleAnalysis.progress,
              progressVariance: scheduleAnalysis.progressVariance
            };
          } catch (error) {
            return null;
          }
        })
      );
      const valid = scheduleData.filter(s => s !== null);
      benchmarks.schedule = {
        averageProgress: valid.length > 0
          ? valid.reduce((sum, s) => sum + s.progress, 0) / valid.length
          : 0,
        averageVariance: valid.length > 0
          ? valid.reduce((sum, s) => sum + s.progressVariance, 0) / valid.length
          : 0
      };
    }

    if (metric === 'profitability' || metric === 'all') {
      const profitabilityData = await Promise.all(
        jobs.map(async (job) => {
          try {
            const metrics = await dataAccess.getJobMetrics(job._id.toString());
            const profit = metrics.job.contractValue - metrics.metrics.totalCost;
            return {
              profit,
              margin: metrics.job.contractValue > 0 ? (profit / metrics.job.contractValue) * 100 : 0
            };
          } catch (error) {
            return null;
          }
        })
      );
      const valid = profitabilityData.filter(p => p !== null);
      benchmarks.profitability = {
        averageMargin: valid.length > 0
          ? valid.reduce((sum, p) => sum + p.margin, 0) / valid.length
          : 0,
        totalProfit: valid.reduce((sum, p) => sum + p.profit, 0)
      };
    }

    if (metric === 'cpi' || metric === 'all') {
      const cpiData = await Promise.all(
        jobs.map(async (job) => {
          try {
            const evm = await analyticsEngine.calculateEVM(job._id.toString());
            return evm.costPerformanceIndex;
          } catch (error) {
            return null;
          }
        })
      );
      const valid = cpiData.filter(c => c !== null && c > 0);
      benchmarks.cpi = {
        average: valid.length > 0
          ? valid.reduce((sum, c) => sum + c, 0) / valid.length
          : 0,
        best: valid.length > 0 ? Math.max(...valid) : 0,
        worst: valid.length > 0 ? Math.min(...valid) : 0
      };
    }

    if (metric === 'spi' || metric === 'all') {
      const spiData = await Promise.all(
        jobs.map(async (job) => {
          try {
            const evm = await analyticsEngine.calculateEVM(job._id.toString());
            return evm.schedulePerformanceIndex;
          } catch (error) {
            return null;
          }
        })
      );
      const valid = spiData.filter(s => s !== null && s > 0);
      benchmarks.spi = {
        average: valid.length > 0
          ? valid.reduce((sum, s) => sum + s, 0) / valid.length
          : 0,
        best: valid.length > 0 ? Math.max(...valid) : 0,
        worst: valid.length > 0 ? Math.min(...valid) : 0
      };
    }

    if (metric === 'health' || metric === 'all') {
      const healthData = await Promise.all(
        jobs.map(async (job) => {
          try {
            const health = await analyticsEngine.getJobHealthScore(job._id.toString());
            return health.score;
          } catch (error) {
            return null;
          }
        })
      );
      const valid = healthData.filter(h => h !== null);
      benchmarks.health = {
        average: valid.length > 0
          ? valid.reduce((sum, h) => sum + h, 0) / valid.length
          : 0,
        best: valid.length > 0 ? Math.max(...valid) : 0,
        worst: valid.length > 0 ? Math.min(...valid) : 0
      };
    }

    return {
      success: true,
      benchmarks
    };
  },
  
  // Recommendations (from existing + new)
  get_job_recommendations: existingHandlers.get_job_recommendations,
  
  async get_action_items(args) {
    const { jobIdentifier, priority = 'all' } = args;
    
    const actionItems = [];
    
    if (jobIdentifier) {
      const jobId = await resolveJobId(jobIdentifier);
      if (!jobId) {
        throw new Error(`Job not found: ${jobIdentifier}`);
      }

      const recommendations = await existingHandlers.get_job_recommendations({ jobIdentifier });
      const overdueTasks = await taskWorkManagementHandlers.get_overdue_tasks({ jobIdentifier });
      
      recommendations.recommendations.forEach(rec => {
        if (priority === 'all' || priority === rec.priority) {
          actionItems.push({
            type: 'recommendation',
            priority: rec.priority,
            category: rec.category,
            action: rec.action,
            reason: rec.reason,
            impact: rec.impact
          });
        }
      });

      overdueTasks.tasks.forEach(task => {
        actionItems.push({
          type: 'overdue_task',
          priority: 'high',
          action: `Complete overdue task: ${task.title}`,
          reason: `Task is ${task.daysOverdue} days overdue`,
          task: task
        });
      });
    } else {
      // All jobs
      const jobs = await Job.find({}).select('_id jobNumber name').lean().limit(100);
      for (const job of jobs) {
        try {
          const recommendations = await existingHandlers.get_job_recommendations({ 
            jobIdentifier: job.jobNumber 
          });
          const overdueTasks = await taskWorkManagementHandlers.get_overdue_tasks({ 
            jobIdentifier: job.jobNumber 
          });

          recommendations.recommendations.forEach(rec => {
            if (priority === 'all' || priority === rec.priority) {
              actionItems.push({
                job: {
                  id: job._id.toString(),
                  jobNumber: job.jobNumber,
                  name: job.name
                },
                type: 'recommendation',
                priority: rec.priority,
                category: rec.category,
                action: rec.action,
                reason: rec.reason
              });
            }
          });

          overdueTasks.tasks.forEach(task => {
            actionItems.push({
              job: {
                id: job._id.toString(),
                jobNumber: job.jobNumber,
                name: job.name
              },
              type: 'overdue_task',
              priority: 'high',
              action: `Complete overdue task: ${task.title}`,
              task: task
            });
          });
        } catch (error) {
          // Continue with next job
        }
      }
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    actionItems.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

    return {
      success: true,
      total: actionItems.length,
      actionItems: actionItems.slice(0, 50) // Limit to 50 items
    };
  },
  
  // Cost Code & Line Item
  ...costCodeLineItemHandlers,
  
  // Time Tracking & Labor
  ...timeTrackingLaborHandlers,
  
  // Client & Project
  ...clientProjectHandlers,
  
  // Schedule of Values
  ...sovHandlers,
  
  // Progress Reports
  ...progressReportHandlers,
  
  // Purchase Orders
  ...purchaseOrderHandlers,
  
  // Material Requests
  ...materialRequestHandlers,
  
  // Work Orders
  ...workOrderHandlers,
  
  // Accounts Payable
  ...accountsPayableHandlers
};

module.exports = allToolHandlers;

