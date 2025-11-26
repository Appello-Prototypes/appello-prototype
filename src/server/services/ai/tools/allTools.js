/**
 * Comprehensive AI Tools Definition
 * All tools available to Claude for answering questions about job data
 * Organized by category with clear usage guidelines
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
 * Resolve project identifier
 */
async function resolveProjectId(projectIdentifier) {
  if (!projectIdentifier) return null;
  
  if (mongoose.Types.ObjectId.isValid(projectIdentifier) && projectIdentifier.length === 24) {
    return projectIdentifier;
  }
  
  const project = await Project.findOne({ projectNumber: projectIdentifier }).select('_id').lean();
  return project?._id?.toString() || null;
}

// ============================================================================
// CATEGORY 1: JOB MANAGEMENT TOOLS
// ============================================================================

const jobManagementTools = [
  {
    name: 'list_jobs',
    description: 'List all jobs in the system with optional filters. ALWAYS use this tool when user asks "what jobs can you access", "show me all jobs", "list jobs", "how many jobs", or similar queries. Returns real-time data from the database.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['quoting', 'won', 'in_progress', 'on_hold', 'complete', 'closed', 'active'],
          description: 'Filter by job status'
        },
        projectId: {
          type: 'string',
          description: 'Filter by project ID or project number'
        },
        jobManager: {
          type: 'string',
          description: 'Filter by job manager ID or name'
        },
        clientName: {
          type: 'string',
          description: 'Filter by client name'
        },
        minContractValue: {
          type: 'number',
          description: 'Minimum contract value filter'
        },
        maxContractValue: {
          type: 'number',
          description: 'Maximum contract value filter'
        },
        startDateFrom: {
          type: 'string',
          description: 'Filter jobs started from this date (YYYY-MM-DD)'
        },
        startDateTo: {
          type: 'string',
          description: 'Filter jobs started until this date (YYYY-MM-DD)'
        },
        location: {
          type: 'string',
          description: 'Filter by location (city, province, or address)'
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
    description: 'Get detailed information about a specific job by job number or ID. Use this when user asks about a specific job, wants job details, or asks "tell me about job X".',
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
    name: 'search_jobs',
    description: 'Search jobs by various criteria like name, client, job manager, or project. Use this when user wants to find jobs matching specific criteria or asks "find jobs with X", "show me jobs for client Y".',
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
          description: 'Filter by project ID or project number'
        },
        clientName: {
          type: 'string',
          description: 'Filter by client name'
        }
      },
      required: []
    }
  },
  {
    name: 'get_job_summary',
    description: 'Get a summary overview of all jobs including counts, total contract value, and status breakdown. Use when user asks "how many jobs", "what\'s our portfolio", "job summary", or similar aggregate queries.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['quoting', 'won', 'in_progress', 'on_hold', 'complete', 'closed'],
          description: 'Filter summary by status'
        },
        projectId: {
          type: 'string',
          description: 'Filter summary by project'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 2: BUDGET & FINANCIAL TOOLS
// ============================================================================

const budgetFinancialTools = [
  {
    name: 'get_job_metrics',
    description: 'Get comprehensive metrics and analytics for a specific job including budget, schedule, progress, cost code breakdown, and financial performance. Use this when user asks about budget, costs, financial status, or "show me metrics for job X".',
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
    name: 'get_budget_analysis',
    description: 'Get detailed budget analysis including budget vs actual, variance, and cost breakdown. Use when user asks "is job on budget", "budget variance", "budget vs actual", or similar budget-specific questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_cost_breakdown',
    description: 'Get detailed cost breakdown by cost code, category, or time period. Use when user asks "cost breakdown", "costs by cost code", "how much have we spent", or wants detailed cost analysis.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        groupBy: {
          type: 'string',
          enum: ['costCode', 'category', 'worker', 'date'],
          description: 'How to group the cost breakdown',
          default: 'costCode'
        },
        startDate: {
          type: 'string',
          description: 'Start date for cost analysis (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date for cost analysis (YYYY-MM-DD)'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_profitability_analysis',
    description: 'Calculate and analyze profitability for a job or multiple jobs. Use when user asks "profit margin", "is this job profitable", "which jobs are profitable", or wants profitability analysis.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional - if not provided, analyzes all jobs)'
        },
        compareToAverage: {
          type: 'boolean',
          description: 'Compare profitability to average across all jobs',
          default: false
        }
      },
      required: []
    }
  },
  {
    name: 'get_cost_trends',
    description: 'Analyze cost trends over time for a job. Use when user asks "cost trends", "how are costs trending", "burn rate", or wants to see cost changes over time.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        period: {
          type: 'string',
          enum: ['week', 'month', 'quarter', 'year', 'all'],
          description: 'Time period for trend analysis',
          default: 'month'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 3: SCHEDULE & TIMELINE TOOLS
// ============================================================================

const scheduleTimelineTools = [
  {
    name: 'get_schedule_analysis',
    description: 'Get detailed schedule analysis including planned vs actual dates, schedule variance, progress variance, and timeline metrics. Use when user asks "is job on schedule", "schedule variance", "how many days behind", or schedule-related questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_timeline_details',
    description: 'Get detailed timeline information including all planned and actual dates. Use when user asks "when did job start", "when will it finish", "planned dates", or wants timeline details.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_schedule_performance',
    description: 'Get schedule performance metrics for all jobs or a specific job. Use when user asks "which jobs are behind schedule", "schedule performance", or wants to compare schedule performance.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional - if not provided, returns all jobs)'
        },
        sortBy: {
          type: 'string',
          enum: ['variance', 'progress', 'daysRemaining'],
          description: 'How to sort the results',
          default: 'variance'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 4: PROGRESS & COMPLETION TOOLS
// ============================================================================

const progressCompletionTools = [
  {
    name: 'get_progress_details',
    description: 'Get detailed progress information including completion percentage, completed work, remaining work, and progress breakdown. Use when user asks "how complete is job", "what\'s the progress", "what work is done", or progress-related questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        includeBreakdown: {
          type: 'boolean',
          description: 'Include breakdown by phase, system, or area',
          default: true
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_progress_velocity',
    description: 'Calculate progress velocity (rate of progress over time). Use when user asks "how fast is job progressing", "progress rate", "is progress accelerating", or wants velocity metrics.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        period: {
          type: 'string',
          enum: ['week', 'month', 'quarter'],
          description: 'Time period for velocity calculation',
          default: 'month'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_progress_trends',
    description: 'Analyze progress trends over time using progress reports. Use when user asks "progress trends", "is progress accelerating", or wants to see progress changes over time.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 5: PERFORMANCE METRICS TOOLS
// ============================================================================

const performanceMetricsTools = [
  {
    name: 'get_evm_metrics',
    description: 'Get Earned Value Management (EVM) metrics including Planned Value, Earned Value, Actual Cost, CPI, SPI, and variance metrics. Use when user asks "EVM", "CPI", "SPI", "earned value", or wants performance indices.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_performance_indices',
    description: 'Get performance indices (CPI, SPI) for a job or compare across jobs. Use when user asks "cost performance index", "schedule performance index", "which jobs have best CPI", or wants performance comparisons.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional - if not provided, returns all jobs)'
        },
        sortBy: {
          type: 'string',
          enum: ['cpi', 'spi', 'both'],
          description: 'How to sort results',
          default: 'both'
        }
      },
      required: []
    }
  },
  {
    name: 'get_variance_analysis',
    description: 'Get comprehensive variance analysis including cost variance, schedule variance, and variance by cost code. Use when user asks "variance analysis", "what\'s the variance", "which cost codes have variance", or wants variance details.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        varianceType: {
          type: 'string',
          enum: ['cost', 'schedule', 'both'],
          description: 'Type of variance to analyze',
          default: 'both'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_health_score',
    description: 'Get job health score and health factors. Use when user asks "health score", "job health", "which jobs are unhealthy", or wants health assessment.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional - if not provided, returns all jobs)'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 6: RESOURCE & TEAM TOOLS
// ============================================================================

const resourceTeamTools = [
  {
    name: 'get_team_assignment',
    description: 'Get team assignment information including job manager, supervisor, foremen, and workers. Use when user asks "who\'s working on job", "who\'s the manager", "team members", or wants team information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_resource_utilization',
    description: 'Get resource utilization metrics including team size, hours by worker, and utilization rates. Use when user asks "how many people", "team size", "resource allocation", "utilization rate", or resource metrics.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional - if not provided, returns all jobs)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_team_performance',
    description: 'Get team performance metrics including productivity by worker, hours breakdown, and performance comparisons. Use when user asks "team performance", "productivity", "which workers are most productive", or team metrics.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        includeProductivity: {
          type: 'boolean',
          description: 'Include productivity metrics',
          default: true
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_hours_by_worker',
    description: 'Get hours breakdown by worker including regular hours, overtime, and total hours. Use when user asks "hours by worker", "show me hours by team member", or wants worker hour breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        workerId: {
          type: 'string',
          description: 'Specific worker ID to filter (optional)'
        },
        startDate: {
          type: 'string',
          description: 'Start date filter (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date filter (YYYY-MM-DD)'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 7: TASK & WORK MANAGEMENT TOOLS
// ============================================================================

const taskWorkManagementTools = [
  {
    name: 'get_tasks',
    description: 'Get tasks for a job with optional filters. Use when user asks "what tasks", "show me tasks", "task list", or wants task information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        status: {
          type: 'string',
          enum: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'],
          description: 'Filter by task status'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by priority'
        },
        assignedTo: {
          type: 'string',
          description: 'Filter by assigned worker ID or name'
        },
        includeOverdue: {
          type: 'boolean',
          description: 'Include overdue tasks',
          default: false
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_task_status',
    description: 'Get task status summary including counts by status, completion rate, and overdue tasks. Use when user asks "task status", "how many tasks complete", "task completion rate", or task status questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_task_progress',
    description: 'Get task progress breakdown and analysis. Use when user asks "task progress", "what tasks are done", "what\'s left to do", or task progress questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_overdue_tasks',
    description: 'Get list of overdue tasks. Use when user asks "overdue tasks", "what tasks are overdue", or wants overdue task information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional - if not provided, returns all overdue tasks)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_tasks_for_today',
    description: 'Get tasks due today or assigned to user for today. Use when user asks "what should I work on today", "tasks for today", or wants today\'s task list.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional)'
        },
        assignedTo: {
          type: 'string',
          description: 'Worker ID or name (optional)'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 8: RISK & HEALTH TOOLS
// ============================================================================

const riskHealthTools = [
  {
    name: 'analyze_job_risk',
    description: 'Analyze risk factors for a specific job including budget variance, schedule delays, and overall health score. Use when user asks about "at risk" jobs, "problematic" jobs, "troubled" jobs, or wants risk analysis for a specific job.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID. If not provided, analyzes all jobs.'
        }
      },
      required: []
    }
  },
  {
    name: 'find_at_risk_jobs',
    description: 'Find and rank all jobs by risk level based on budget variance, schedule delays, and health scores. ALWAYS use this tool when user asks "which job is most at risk", "show me problematic jobs", "what jobs are at risk", or similar queries.',
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
  },
  {
    name: 'get_risk_factors',
    description: 'Get detailed risk factors for a job. Use when user asks "what are the risk factors", "why is job at risk", "what\'s causing the risk", or wants detailed risk analysis.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 9: FORECASTING & PREDICTION TOOLS
// ============================================================================

const forecastingPredictionTools = [
  {
    name: 'get_job_forecast',
    description: 'Get predictions and forecasts for a job including completion date and final cost estimates. Use when user asks "when will job finish", "predicted completion", "forecast", "will we go over budget", or wants predictions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        forecastType: {
          type: 'string',
          enum: ['completion', 'cost', 'profitability', 'all'],
          description: 'Type of forecast to generate',
          default: 'all'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_cost_forecast',
    description: 'Get cost forecast and estimate at completion. Use when user asks "predicted final cost", "cost forecast", "estimate at completion", or cost predictions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_schedule_forecast',
    description: 'Get schedule forecast and predicted completion date. Use when user asks "when will job finish", "completion forecast", "schedule forecast", or schedule predictions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_profitability_forecast',
    description: 'Get profitability forecast including predicted profit margin. Use when user asks "profit forecast", "will this be profitable", "margin forecast", or profitability predictions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 10: COMPARISON & BENCHMARKING TOOLS
// ============================================================================

const comparisonBenchmarkingTools = [
  {
    name: 'compare_jobs',
    description: 'Compare multiple jobs side by side. Use when user asks to "compare jobs", "compare job A vs job B", "how does job compare", or wants job comparisons.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of job numbers or IDs to compare',
          minItems: 2
        },
        compareMetrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['budget', 'schedule', 'progress', 'profitability', 'health', 'all']
          },
          description: 'Which metrics to compare',
          default: ['all']
        }
      },
      required: ['jobIdentifiers']
    }
  },
  {
    name: 'compare_metrics',
    description: 'Compare specific metrics across jobs. Use when user asks "compare budgets", "compare schedules", "compare progress rates", or wants metric comparisons.',
    input_schema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: ['budget', 'schedule', 'progress', 'profitability', 'cpi', 'spi', 'health'],
          description: 'Metric to compare'
        },
        jobIdentifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Job numbers or IDs to compare (optional - if not provided, compares all jobs)'
        }
      },
      required: ['metric']
    }
  },
  {
    name: 'get_benchmarks',
    description: 'Get benchmark metrics including averages, best/worst performers. Use when user asks "what\'s the average", "best performing job", "worst performing job", "benchmarks", or wants benchmark data.',
    input_schema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: ['budget', 'schedule', 'progress', 'profitability', 'cpi', 'spi', 'health', 'all'],
          description: 'Metric to benchmark',
          default: 'all'
        },
        status: {
          type: 'string',
          enum: ['quoting', 'won', 'in_progress', 'on_hold', 'complete', 'closed'],
          description: 'Filter by job status for benchmarks'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 11: RECOMMENDATION & ACTION TOOLS
// ============================================================================

const recommendationActionTools = [
  {
    name: 'get_job_recommendations',
    description: 'Get actionable recommendations for a job based on current performance, budget variance, and schedule status. Use when user asks "what should I do", "recommendations", "how can we improve", "what actions should we take", or wants recommendations.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        recommendationType: {
          type: 'string',
          enum: ['budget', 'schedule', 'risk', 'all'],
          description: 'Type of recommendations to generate',
          default: 'all'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_action_items',
    description: 'Get prioritized action items for a job or across all jobs. Use when user asks "what should I focus on", "action items", "priorities", or wants actionable items.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional - if not provided, returns for all jobs)'
        },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low', 'all'],
          description: 'Filter by priority',
          default: 'all'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 12: COST CODE & LINE ITEM TOOLS
// ============================================================================

const costCodeLineItemTools = [
  {
    name: 'get_cost_codes',
    description: 'Get cost codes for a job with budget and actual information. Use when user asks "cost codes", "show me cost codes", "cost code breakdown", or wants cost code information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        includeVariance: {
          type: 'boolean',
          description: 'Include variance calculations',
          default: true
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_cost_code_analysis',
    description: 'Get detailed cost code analysis including budget vs actual, variance, and burn rate. Use when user asks "cost code analysis", "which cost codes are over budget", "cost code performance", or detailed cost code questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        costCode: {
          type: 'string',
          description: 'Specific cost code to analyze (optional)'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_cost_code_trends',
    description: 'Analyze cost code trends over time. Use when user asks "cost code trends", "how is cost code trending", "is cost code accelerating", or wants trend analysis.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        costCode: {
          type: 'string',
          description: 'Specific cost code (optional - if not provided, analyzes all)'
        },
        period: {
          type: 'string',
          enum: ['week', 'month', 'quarter'],
          description: 'Time period for trends',
          default: 'month'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 13: TIME TRACKING & LABOR TOOLS
// ============================================================================

const timeTrackingLaborTools = [
  {
    name: 'get_time_entries',
    description: 'Get time entries for a job with optional filters. Use when user asks "time entries", "show me hours", "time tracking", or wants time entry data.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        workerId: {
          type: 'string',
          description: 'Filter by worker ID or name'
        },
        costCode: {
          type: 'string',
          description: 'Filter by cost code'
        },
        startDate: {
          type: 'string',
          description: 'Start date filter (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date filter (YYYY-MM-DD)'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_labor_costs',
    description: 'Get labor cost analysis including total costs, costs by worker, and overtime analysis. Use when user asks "labor costs", "how much on labor", "labor cost breakdown", or labor cost questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        groupBy: {
          type: 'string',
          enum: ['worker', 'costCode', 'date'],
          description: 'How to group labor costs',
          default: 'worker'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_productivity_metrics',
    description: 'Get productivity metrics including productivity rate, hours per unit, and productivity comparisons. Use when user asks "productivity", "productivity rate", "hours per unit", or productivity questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        workerId: {
          type: 'string',
          description: 'Filter by specific worker (optional)'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_time_analysis',
    description: 'Analyze time tracking data including trends, variance, and burn rate. Use when user asks "time trends", "time variance", "burn rate", "are we ahead on hours", or time analysis questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        compareToBudget: {
          type: 'boolean',
          description: 'Compare actual hours to budget hours',
          default: true
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 14: CLIENT & PROJECT TOOLS
// ============================================================================

const clientProjectTools = [
  {
    name: 'get_client_jobs',
    description: 'Get all jobs for a specific client. Use when user asks "jobs for client X", "show me client jobs", or wants jobs filtered by client.',
    input_schema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Client name'
        },
        includeMetrics: {
          type: 'boolean',
          description: 'Include job metrics in response',
          default: false
        }
      },
      required: ['clientName']
    }
  },
  {
    name: 'get_project_jobs',
    description: 'Get all jobs for a specific project. Use when user asks "jobs in project X", "project jobs", or wants jobs filtered by project.',
    input_schema: {
      type: 'object',
      properties: {
        projectIdentifier: {
          type: 'string',
          description: 'Project number or project ID'
        },
        includeMetrics: {
          type: 'boolean',
          description: 'Include job metrics in response',
          default: false
        }
      },
      required: ['projectIdentifier']
    }
  },
  {
    name: 'get_project_portfolio',
    description: 'Get project portfolio summary including all projects with job counts and values. Use when user asks "all projects", "project portfolio", "project summary", or wants project overview.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['bidding', 'awarded', 'active', 'on_hold', 'completed', 'cancelled'],
          description: 'Filter by project status'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 15: SCHEDULE OF VALUES (SOV) TOOLS
// ============================================================================

const sovTools = [
  {
    name: 'get_sov',
    description: 'Get Schedule of Values for a job. Use when user asks "Schedule of Values", "SOV", "show me SOV", or wants SOV information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        includeProgress: {
          type: 'boolean',
          description: 'Include progress information',
          default: true
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_sov_progress',
    description: 'Get SOV progress including completion status and billing information. Use when user asks "SOV progress", "SOV completion", "how much billed on SOV", or SOV progress questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_sov_analysis',
    description: 'Analyze SOV performance including variance and completion rates. Use when user asks "SOV analysis", "SOV vs actual", "SOV variance", or wants SOV analysis.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 16: PROGRESS REPORT TOOLS
// ============================================================================

const progressReportTools = [
  {
    name: 'get_progress_reports',
    description: 'Get progress reports for a job. Use when user asks "progress reports", "show me reports", "latest report", or wants progress report information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of reports to return',
          default: 10
        },
        includeLatest: {
          type: 'boolean',
          description: 'Include only the latest report',
          default: false
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_progress_report_details',
    description: 'Get detailed information from a specific progress report. Use when user asks "what did report say", "report details", "what\'s in report", or wants report details.',
    input_schema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'Progress report ID'
        },
        reportNumber: {
          type: 'string',
          description: 'Progress report number (alternative to reportId)'
        },
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (required if using reportNumber)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_progress_report_trends',
    description: 'Analyze trends across multiple progress reports. Use when user asks "report trends", "compare reports", or wants trend analysis.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 17: PURCHASE ORDER TOOLS
// ============================================================================

const purchaseOrderTools = [
  {
    name: 'get_purchase_orders',
    description: 'Get purchase orders for a job. Use when user asks "purchase orders", "POs", "show me POs", or wants purchase order information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        status: {
          type: 'string',
          enum: ['draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'fully_received', 'cancelled', 'closed'],
          description: 'Filter by PO status'
        },
        poNumber: {
          type: 'string',
          description: 'Specific PO number to retrieve'
        }
      },
      required: []
    }
  },
  {
    name: 'get_po_costs',
    description: 'Get purchase order cost analysis. Use when user asks "PO costs", "how much on POs", "PO spending", or PO cost questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        compareToBudget: {
          type: 'boolean',
          description: 'Compare PO costs to budget',
          default: true
        }
      },
      required: ['jobIdentifier']
    }
  },
  {
    name: 'get_po_trends',
    description: 'Analyze purchase order trends over time. Use when user asks "PO trends", "PO spending trends", or wants trend analysis.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        }
      },
      required: ['jobIdentifier']
    }
  }
];

// ============================================================================
// CATEGORY 18: MATERIAL REQUEST TOOLS
// ============================================================================

const materialRequestTools = [
  {
    name: 'get_material_requests',
    description: 'Get material requests for a job. Use when user asks "material requests", "what materials needed", "material requirements", or wants material request information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'],
          description: 'Filter by request status'
        }
      },
      required: []
    }
  },
  {
    name: 'get_material_needs',
    description: 'Get material needs analysis including pending requests and required materials. Use when user asks "what materials do we need", "material needs", "materials required", or material needs questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        urgency: {
          type: 'string',
          enum: ['urgent', 'soon', 'all'],
          description: 'Filter by urgency',
          default: 'all'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 19: WORK ORDER TOOLS
// ============================================================================

const workOrderTools = [
  {
    name: 'get_work_orders',
    description: 'Get work orders for a job. Use when user asks "work orders", "WOs", "show me work orders", or wants work order information.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID'
        },
        status: {
          type: 'string',
          enum: ['draft', 'pending', 'issued', 'acknowledged', 'in_progress', 'completed', 'closed', 'cancelled'],
          description: 'Filter by work order status'
        },
        workOrderNumber: {
          type: 'string',
          description: 'Specific work order number'
        }
      },
      required: []
    }
  },
  {
    name: 'get_work_order_details',
    description: 'Get detailed information about a specific work order. Use when user asks "tell me about WO X", "work order details", or wants detailed WO information.',
    input_schema: {
      type: 'object',
      properties: {
        workOrderNumber: {
          type: 'string',
          description: 'Work order number'
        },
        workOrderId: {
          type: 'string',
          description: 'Work order ID (alternative to workOrderNumber)'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// CATEGORY 20: ACCOUNTS PAYABLE TOOLS
// ============================================================================

const accountsPayableTools = [
  {
    name: 'get_accounts_payable',
    description: 'Get accounts payable information including pending invoices and AP balance. Use when user asks "accounts payable", "AP", "pending invoices", "how much do we owe", or AP questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional)'
        },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'paid', 'overdue'],
          description: 'Filter by payment status'
        },
        vendorName: {
          type: 'string',
          description: 'Filter by vendor name'
        },
        includeOverdue: {
          type: 'boolean',
          description: 'Include overdue invoices',
          default: true
        }
      },
      required: []
    }
  },
  {
    name: 'get_ap_balance',
    description: 'Get accounts payable balance summary. Use when user asks "AP balance", "how much do we owe", "outstanding invoices", or AP balance questions.',
    input_schema: {
      type: 'object',
      properties: {
        jobIdentifier: {
          type: 'string',
          description: 'Job number or job ID (optional)'
        },
        groupBy: {
          type: 'string',
          enum: ['job', 'vendor', 'date'],
          description: 'How to group the balance',
          default: 'job'
        }
      },
      required: []
    }
  }
];

// ============================================================================
// COMBINE ALL TOOLS
// ============================================================================

const allTools = [
  ...jobManagementTools,
  ...budgetFinancialTools,
  ...scheduleTimelineTools,
  ...progressCompletionTools,
  ...performanceMetricsTools,
  ...resourceTeamTools,
  ...taskWorkManagementTools,
  ...riskHealthTools,
  ...forecastingPredictionTools,
  ...comparisonBenchmarkingTools,
  ...recommendationActionTools,
  ...costCodeLineItemTools,
  ...timeTrackingLaborTools,
  ...clientProjectTools,
  ...sovTools,
  ...progressReportTools,
  ...purchaseOrderTools,
  ...materialRequestTools,
  ...workOrderTools,
  ...accountsPayableTools
];

module.exports = {
  allTools,
  jobManagementTools,
  budgetFinancialTools,
  scheduleTimelineTools,
  progressCompletionTools,
  performanceMetricsTools,
  resourceTeamTools,
  taskWorkManagementTools,
  riskHealthTools,
  forecastingPredictionTools,
  comparisonBenchmarkingTools,
  recommendationActionTools,
  costCodeLineItemTools,
  timeTrackingLaborTools,
  clientProjectTools,
  sovTools,
  progressReportTools,
  purchaseOrderTools,
  materialRequestTools,
  workOrderTools,
  accountsPayableTools,
  resolveJobId,
  resolveProjectId
};

