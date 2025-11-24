// Widget registry - exports all available widgets
export { default as TaskStatsWidget } from './TaskStatsWidget'
export { default as JobPerformanceWidget } from './JobPerformanceWidget'
export { default as TimeTrackingWidget } from './TimeTrackingWidget'
export { default as ProjectsWidget } from './ProjectsWidget'
export { default as MyTasksWidget } from './MyTasksWidget'
export { default as CompletionRateWidget } from './CompletionRateWidget'

// Tier 1 - Critical Widgets
export { default as PortfolioPerformanceWidget } from './PortfolioPerformanceWidget'
export { default as JobFinancialHealthWidget } from './JobFinancialHealthWidget'
export { default as EarnedValueManagementWidget } from './EarnedValueManagementWidget'
export { default as AccountsPayableWidget } from './AccountsPayableWidget'
export { default as BudgetUtilizationWidget } from './BudgetUtilizationWidget'
export { default as CostBreakdownWidget } from './CostBreakdownWidget'
export { default as RevenueRecognitionWidget } from './RevenueRecognitionWidget'
export { default as SchedulePerformanceWidget } from './SchedulePerformanceWidget'
export { default as ProgressReportStatusWidget } from './ProgressReportStatusWidget'

// Comprehensive Table Widget
export { default as JobPerformanceTableWidget } from './JobPerformanceTableWidget'

// Standard block heights (multiples of 2 for clean alignment)
export const STANDARD_HEIGHTS = [2, 4, 6, 8]

// Helper function to snap height to nearest standard block
export const snapToStandardHeight = (height) => {
  return STANDARD_HEIGHTS.reduce((prev, curr) => 
    Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
  )
}

// Widget metadata for the editor
export const WIDGET_TYPES = {
  // Existing Widgets
  taskStats: {
    name: 'Task Statistics',
    description: 'Display task counts (total, completed, in progress, overdue, etc.)',
    defaultConfig: {
      statType: 'totalTasks',
      showLink: true,
    },
    defaultSize: { w: 2, h: 2 }, // Small widget - 2 blocks
  },
  jobPerformance: {
    name: 'Job Performance',
    description: 'Show job performance metrics including CPI and progress',
    defaultConfig: {
      displayType: 'summary', // 'summary' or 'table'
      maxItems: 5,
    },
    defaultSize: { w: 4, h: 4 }, // Medium widget - 4 blocks
  },
  timeTracking: {
    name: 'Time Tracking',
    description: 'Display time entry summaries or recent entries',
    defaultConfig: {
      displayType: 'summary', // 'summary' or 'recent'
      maxItems: 5,
    },
    defaultSize: { w: 3, h: 4 }, // Medium widget - 4 blocks
  },
  projects: {
    name: 'Projects',
    description: 'List active projects with progress',
    defaultConfig: {
      maxItems: 3,
      showProgress: true,
    },
    defaultSize: { w: 3, h: 6 }, // Large widget - 6 blocks
  },
  myTasks: {
    name: 'My Tasks',
    description: 'Display your personal tasks',
    defaultConfig: {
      status: 'in_progress',
      maxItems: 5,
    },
    defaultSize: { w: 3, h: 6 }, // Large widget - 6 blocks
  },
  completionRate: {
    name: 'Completion Rate',
    description: 'Show overall task completion percentage',
    defaultConfig: {
      showDetails: true,
    },
    defaultSize: { w: 2, h: 2 }, // Small widget - 2 blocks
  },
  
  // Tier 1 - Critical Widgets
  portfolioPerformance: {
    name: 'Portfolio Performance',
    description: 'Overall portfolio metrics across all jobs (CPI, SPI, margin, etc.)',
    defaultConfig: {},
    defaultSize: { w: 4, h: 6 }, // Large widget - 6 blocks
  },
  jobFinancialHealth: {
    name: 'Job Financial Health',
    description: 'Comprehensive financial health card for a specific job (CPI, SPI, budget, margin)',
    defaultConfig: {
      jobId: null, // Will use current job context if available
    },
    defaultSize: { w: 4, h: 6 }, // Large widget - 6 blocks
  },
  earnedValueManagement: {
    name: 'Earned Value Management',
    description: 'Complete EVM metrics (BAC, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI)',
    defaultConfig: {
      jobId: null,
    },
    defaultSize: { w: 6, h: 8 }, // Extra large widget - 8 blocks
  },
  accountsPayable: {
    name: 'Accounts Payable',
    description: 'AP summary with outstanding amounts, status breakdown, and aging analysis',
    defaultConfig: {
      jobId: null,
      displayType: 'summary', // 'summary' or 'detailed'
      maxItems: 10,
    },
    defaultSize: { w: 4, h: 6 }, // Large widget - 6 blocks
  },
  budgetUtilization: {
    name: 'Budget Utilization',
    description: 'Budget spent vs remaining with utilization percentage and visual breakdown',
    defaultConfig: {
      jobId: null,
    },
    defaultSize: { w: 3, h: 4 }, // Medium widget - 4 blocks
  },
  costBreakdown: {
    name: 'Cost Breakdown',
    description: 'Cost breakdown by category (labor vs materials) with percentages',
    defaultConfig: {
      jobId: null,
      breakdownType: 'category', // 'category', 'costCode', 'system'
    },
    defaultSize: { w: 3, h: 4 }, // Medium widget - 4 blocks
  },
  revenueRecognition: {
    name: 'Revenue Recognition',
    description: 'Recognized revenue, invoiced amounts, holdback, and over/under billing status',
    defaultConfig: {
      jobId: null,
    },
    defaultSize: { w: 3, h: 4 }, // Medium widget - 4 blocks
  },
  schedulePerformance: {
    name: 'Schedule Performance',
    description: 'Schedule Performance Index (SPI) and schedule variance with status',
    defaultConfig: {
      jobId: null,
    },
    defaultSize: { w: 3, h: 4 }, // Medium widget - 4 blocks
  },
  progressReportStatus: {
    name: 'Progress Report Status',
    description: 'Progress report status breakdown, latest report, and approved CTD totals',
    defaultConfig: {
      jobId: null,
    },
    defaultSize: { w: 3, h: 6 }, // Large widget - 6 blocks
  },
  
  // Comprehensive Table Widget
  jobPerformanceTable: {
    name: 'Job Performance Table',
    description: 'Comprehensive table showing all key job metrics with visual indicators (CPI, SPI, Budget, Progress, etc.)',
    defaultConfig: {
      filterStatus: 'all', // 'all', 'on_budget', 'at_risk', 'over_budget'
    },
    defaultSize: { w: 12, h: 8 }, // Full width, extra large - 8 blocks
  },
}

