/**
 * Job Management Tools for AI Assistant
 * These tools are exposed to Claude via function calling
 * Can be migrated to MCP server later if needed
 */

const Job = require('../../../models/Job');
const Task = require('../../../models/Task');
const TimeEntry = require('../../../models/TimeEntry');
const ScheduleOfValues = require('../../../models/ScheduleOfValues');
const ProgressReport = require('../../../models/ProgressReport');
const Project = require('../../../models/Project');
const mongoose = require('mongoose');
const dataAccess = require('../dataAccess');
const analyticsEngine = require('../analyticsEngine');

/**
 * Resolve job identifier (ObjectId or job number) to ObjectId
 */
async function resolveJobId(jobIdentifier) {
  if (!jobIdentifier) return null;
  
  if (mongoose.Types.ObjectId.isValid(jobIdentifier) && jobIdentifier.length === 24) {
    return jobIdentifier;
  }
  
  const job = await Job.findOne({ jobNumber: jobIdentifier }).select('_id').lean();
  return job?._id?.toString() || null;
}

/**
 * Claude Function Calling Tools Definition
 * These are passed to Claude so it can call them dynamically
 * Format matches Anthropic's tool_use specification
 */
const jobTools = [
  {
    name: 'list_jobs',
    description: 'List all jobs in the system with optional filters. ALWAYS use this tool when user asks "what jobs can you access", "show me all jobs", "list jobs", or similar queries. This returns real-time data from the database.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['quoting', 'won', 'in_progress', 'on_hold', 'complete', 'closed', 'active'],
          description: 'Filter by job status (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of jobs to return (default: 100)',
          default: 100
        }
      },
      required: []
    }
  },
  {
    name: 'get_job',
    description: 'Get detailed information about a specific job by job number or ID. Use this when user asks about a specific job.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number (e.g., JOB-2025-ELEC-001) or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_job_metrics',
    description: 'Get comprehensive metrics and analytics for a specific job including budget, schedule, progress, and cost code breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number (e.g., JOB-2025-ELEC-001) or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_job_forecast',
    description: 'Get predictions and forecasts for a job including completion date and final cost estimates.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number (e.g., JOB-2025-ELEC-001) or job ID'
        },
        forecastType: {
          type: 'string',
          enum: ['completion', 'cost', 'both'],
          description: 'Type of forecast to generate',
          default: 'both'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'search_jobs',
    description: 'Search jobs by various criteria like name, client, job manager, or project.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query - searches job name, job number, client name'
        },
        jobManager: {
          type: 'string',
          description: 'Filter by job manager name or ID'
        },
        projectId: {
          type: 'string',
          description: 'Filter by project ID'
        }
      }
    }
  },
  {
    name: 'compare_jobs',
    description: 'Compare multiple jobs side by side. Use this when user asks to compare jobs.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of job numbers or IDs to compare',
          minItems: 2
        }
      },
      required: ['jobIdentifiers']
    }
  },
  {
    name: 'get_job_recommendations',
    description: 'Get actionable recommendations for a job based on current performance, budget variance, and schedule status.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number (e.g., JOB-2025-ELEC-001) or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'analyze_job_risk',
    description: 'Analyze risk factors for a specific job including budget variance, schedule delays, and overall health score. Use this when user asks about "at risk" jobs, "problematic" jobs, or "troubled" jobs.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number (e.g., JOB-2025-ELEC-001) or job ID. If not provided, analyzes all jobs.'
        }
      },
      required: []
    }
  },
  {
    name: 'find_at_risk_jobs',
    description: 'Find and rank all jobs by risk level based on budget variance, schedule delays, and health scores. Use this when user asks "which job is most at risk", "show me problematic jobs", or similar queries.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of at-risk jobs to return (default: 10)',
          default: 10
        },
        minRiskScore: {
          type: 'number',
          description: 'Minimum risk score threshold (0-100, lower = higher risk)',
          default: 70
        }
      },
      required: []
    }
  }
];

/**
 * Tool execution handlers
 */
const toolHandlers = {
  async list_jobs(args) {
    const { status, limit = 100 } = args || {};
    const filter = {};
    if (status) filter.status = status;

    const jobs = await Job.find(filter)
      .populate('jobManager', 'name')
      .populate('projectId', 'name projectNumber')
      .select('name jobNumber status contractValue overallProgress jobManager projectId client.name plannedStartDate plannedEndDate')
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
        plannedEndDate: job.plannedEndDate
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

  async get_job_forecast(args) {
    const { jobIdentifier, forecastType = 'both' } = args;
    if (!jobIdentifier) {
      throw new Error('jobIdentifier is required');
    }

    const jobId = await resolveJobId(jobIdentifier);
    if (!jobId) {
      throw new Error(`Job not found: ${jobIdentifier}`);
    }

    const metrics = await dataAccess.getJobMetrics(jobId);
    const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
    const evm = await analyticsEngine.calculateEVM(jobId);

    const forecast = {};

    if (forecastType === 'completion' || forecastType === 'both') {
      const now = new Date();
      const plannedEnd = scheduleAnalysis.plannedEnd;
      const daysRemaining = plannedEnd 
        ? Math.ceil((plannedEnd - now) / (1000 * 60 * 60 * 24))
        : null;
      
      forecast.completion = {
        predictedCompletionDate: plannedEnd && daysRemaining
          ? new Date(now.getTime() + (daysRemaining * 1.2) * 24 * 60 * 60 * 1000).toISOString()
          : null,
        daysRemaining,
        confidence: 0.75,
        factors: {
          currentProgress: metrics.metrics.taskProgress,
          progressVariance: scheduleAnalysis.progressVariance,
          schedulePerformanceIndex: evm.schedulePerformanceIndex
        }
      };
    }

    if (forecastType === 'cost' || forecastType === 'both') {
      forecast.cost = {
        predictedFinalCost: evm.estimateAtCompletion,
        varianceAtCompletion: evm.varianceAtCompletion,
        confidence: 0.75,
        factors: {
          currentCost: metrics.metrics.totalCost,
          costPerformanceIndex: evm.costPerformanceIndex,
          budgetVariance: metrics.metrics.budgetVariancePercent
        }
      };
    }

    return {
      success: true,
      forecast
    };
  },

  async search_jobs(args) {
    const { query, jobManager, projectId } = args || {};
    const filter = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { jobNumber: { $regex: query, $options: 'i' } },
        { 'client.name': { $regex: query, $options: 'i' } }
      ];
    }

    if (jobManager) {
      // Try to find by name first
      const User = require('../../../models/User');
      const manager = await User.findOne({ name: { $regex: jobManager, $options: 'i' } }).select('_id').lean();
      if (manager) {
        filter.jobManager = manager._id;
      } else if (mongoose.Types.ObjectId.isValid(jobManager)) {
        filter.jobManager = jobManager;
      }
    }

    if (projectId) {
      filter.projectId = projectId;
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

  async compare_jobs(args) {
    const { jobIdentifiers } = args;
    if (!jobIdentifiers || jobIdentifiers.length < 2) {
      throw new Error('At least 2 job identifiers required for comparison');
    }

    const resolvedIds = await Promise.all(
      jobIdentifiers.map(id => resolveJobId(id))
    );

    const validIds = resolvedIds.filter(id => id !== null);
    if (validIds.length < 2) {
      throw new Error('Could not resolve enough valid jobs for comparison');
    }

    const comparison = await analyticsEngine.compareJobs(validIds);
    return {
      success: true,
      ...comparison
    };
  },

  async get_job_recommendations(args) {
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
    const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
    const health = await analyticsEngine.getJobHealthScore(jobId);

    const recommendations = [];
    
    if (variance.budgetVariance.percent < -5) {
      recommendations.push({
        priority: 'high',
        category: 'budget',
        action: 'Review cost code performance and identify areas for cost reduction',
        reason: `Budget variance is ${variance.budgetVariance.percent.toFixed(1)}%`,
        impact: `Current variance: $${Math.abs(variance.budgetVariance.total).toLocaleString()}`
      });
    }

    if (scheduleAnalysis.progressVariance < -10) {
      recommendations.push({
        priority: 'high',
        category: 'schedule',
        action: 'Accelerate work on critical path items',
        reason: `Progress is ${Math.abs(scheduleAnalysis.progressVariance).toFixed(1)}% behind schedule`,
        impact: `Days behind: ${Math.abs(scheduleAnalysis.scheduleVariance?.days || 0)}`
      });
    }

    if (scheduleAnalysis.overdueTasks > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'tasks',
        action: `Address ${scheduleAnalysis.overdueTasks} overdue tasks`,
        reason: 'Overdue tasks may impact schedule',
        impact: `${scheduleAnalysis.overdueTasks} tasks need attention`
      });
    }

    if (health.score < 70) {
      recommendations.push({
        priority: 'high',
        category: 'overall',
        action: 'Review overall job health and address critical issues',
        reason: `Job health score is ${health.score}/100`,
        impact: 'Multiple areas need attention'
      });
    }

    return {
      success: true,
      job: {
        id: jobId,
        jobNumber: metrics.job.jobNumber,
        name: metrics.job.name
      },
      health,
      recommendations,
      metrics: {
        budgetVariance: variance.budgetVariance,
        scheduleVariance: scheduleAnalysis.progressVariance
      }
    };
  },

  async analyze_job_risk(args) {
    const { jobIdentifier } = args || {};
    
    if (jobIdentifier) {
      // Analyze specific job
      const jobId = await resolveJobId(jobIdentifier);
      if (!jobId) {
        throw new Error(`Job not found: ${jobIdentifier}`);
      }

      const metrics = await dataAccess.getJobMetrics(jobId);
      const variance = await analyticsEngine.calculateVariance(jobId);
      const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
      const health = await analyticsEngine.getJobHealthScore(jobId);
      const evm = await analyticsEngine.calculateEVM(jobId);

      // Calculate risk score (lower = higher risk)
      let riskScore = health.score || 100;
      const riskFactors = [];

      // Budget risk
      if (variance.budgetVariance.percent < -5) {
        riskScore -= 20;
        riskFactors.push({
          type: 'budget',
          severity: variance.budgetVariance.percent < -10 ? 'high' : 'medium',
          description: `Budget variance: ${variance.budgetVariance.percent.toFixed(1)}%`,
          impact: `$${Math.abs(variance.budgetVariance.total).toLocaleString()} over budget`
        });
      }

      // Schedule risk
      if (scheduleAnalysis.progressVariance < -10) {
        riskScore -= 15;
        riskFactors.push({
          type: 'schedule',
          severity: scheduleAnalysis.progressVariance < -20 ? 'high' : 'medium',
          description: `Progress variance: ${scheduleAnalysis.progressVariance.toFixed(1)}%`,
          impact: `${Math.abs(scheduleAnalysis.scheduleVariance?.days || 0)} days behind schedule`
        });
      }

      // Overdue tasks risk
      if (scheduleAnalysis.overdueTasks > 0) {
        riskScore -= 10;
        riskFactors.push({
          type: 'tasks',
          severity: scheduleAnalysis.overdueTasks > 5 ? 'high' : 'medium',
          description: `${scheduleAnalysis.overdueTasks} overdue tasks`,
          impact: 'May impact schedule and quality'
        });
      }

      // Cost performance risk
      if (evm.costPerformanceIndex < 0.9) {
        riskScore -= 15;
        riskFactors.push({
          type: 'cost_performance',
          severity: evm.costPerformanceIndex < 0.8 ? 'high' : 'medium',
          description: `Cost Performance Index: ${evm.costPerformanceIndex.toFixed(2)}`,
          impact: 'Spending more than planned for work completed'
        });
      }

      riskScore = Math.max(0, Math.min(100, riskScore));

      return {
        success: true,
        job: {
          id: jobId,
          jobNumber: metrics.job.jobNumber,
          name: metrics.job.name
        },
        riskScore,
        riskLevel: riskScore < 50 ? 'high' : riskScore < 70 ? 'medium' : 'low',
        riskFactors,
        metrics: {
          budgetVariance: variance.budgetVariance,
          scheduleVariance: scheduleAnalysis.progressVariance,
          healthScore: health.score,
          costPerformanceIndex: evm.costPerformanceIndex,
          schedulePerformanceIndex: evm.schedulePerformanceIndex
        }
      };
    } else {
      // Analyze all jobs
      return await toolHandlers.find_at_risk_jobs({});
    }
  },

  async find_at_risk_jobs(args) {
    const { limit = 10, minRiskScore = 70 } = args || {};

    // Get all jobs
    const allJobs = await Job.find({})
      .select('_id jobNumber name status contractValue overallProgress')
      .lean()
      .limit(100);

    // Analyze each job's risk
    const jobRisks = await Promise.all(
      allJobs.map(async (job) => {
        try {
          const jobId = job._id.toString();
          const variance = await analyticsEngine.calculateVariance(jobId);
          const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);
          const health = await analyticsEngine.getJobHealthScore(jobId);
          const evm = await analyticsEngine.calculateEVM(jobId);
          
          // Get job to access overallProgress (use job from outer scope)
          const jobProgress = job.overallProgress || 0;

          // Calculate risk score
          let riskScore = health.score || 100;
          
          // Budget risk (only if significantly over budget)
          if (variance.budgetVariance.percent < -5) riskScore -= 20;
          else if (variance.budgetVariance.percent < -2) riskScore -= 10;
          
          // Schedule risk (only if significantly behind)
          // Use absolute value and reasonable thresholds
          const absProgressVariance = Math.abs(scheduleAnalysis.progressVariance);
          if (absProgressVariance > 20) riskScore -= 15;
          else if (absProgressVariance > 10) riskScore -= 10;
          
          // Overdue tasks risk
          if (scheduleAnalysis.overdueTasks > 5) riskScore -= 15;
          else if (scheduleAnalysis.overdueTasks > 0) riskScore -= 10;
          
          // Cost performance risk (CPI < 0.9 is bad, CPI > 1.1 might also indicate issues)
          if (evm.costPerformanceIndex > 0 && evm.costPerformanceIndex < 0.9) riskScore -= 15;
          else if (evm.costPerformanceIndex > 0 && evm.costPerformanceIndex < 0.95) riskScore -= 10;

          riskScore = Math.max(0, Math.min(100, riskScore));

          return {
            jobId: jobId,
            jobNumber: job.jobNumber,
            name: job.name,
            status: job.status,
            contractValue: job.contractValue,
            progress: job.overallProgress || 0,
            riskScore,
            riskLevel: riskScore < 50 ? 'high' : riskScore < 70 ? 'medium' : 'low',
            factors: {
              budgetVariance: variance.budgetVariance.percent,
              scheduleVariance: scheduleAnalysis.progressVariance,
              overdueTasks: scheduleAnalysis.overdueTasks,
              costPerformanceIndex: evm.costPerformanceIndex,
              healthScore: health.score
            }
          };
        } catch (error) {
          console.error(`Error analyzing risk for job ${job.jobNumber}:`, error);
          return null;
        }
      })
    );

    // Filter and sort by risk
    const validRisks = jobRisks.filter(r => r !== null);
    const atRiskJobs = validRisks
      .filter(job => job.riskScore < minRiskScore)
      .sort((a, b) => a.riskScore - b.riskScore) // Lower score = higher risk
      .slice(0, limit);

    return {
      success: true,
      totalJobsAnalyzed: validRisks.length,
      atRiskJobsCount: atRiskJobs.length,
      jobs: atRiskJobs,
      summary: {
        highRisk: atRiskJobs.filter(j => j.riskLevel === 'high').length,
        mediumRisk: atRiskJobs.filter(j => j.riskLevel === 'medium').length,
        lowRisk: atRiskJobs.filter(j => j.riskLevel === 'low').length
      }
    };
  }
};

module.exports = {
  jobTools,
  toolHandlers,
  resolveJobId
};

