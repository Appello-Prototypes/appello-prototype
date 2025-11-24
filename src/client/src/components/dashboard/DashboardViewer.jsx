import React, { useMemo } from 'react'
import GridLayout from 'react-grid-layout'
import { WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import '../../styles/grid-layout.css'
import TaskStatsWidget from './widgets/TaskStatsWidget'
import JobPerformanceWidget from './widgets/JobPerformanceWidget'
import TimeTrackingWidget from './widgets/TimeTrackingWidget'
import ProjectsWidget from './widgets/ProjectsWidget'
import MyTasksWidget from './widgets/MyTasksWidget'
import CompletionRateWidget from './widgets/CompletionRateWidget'
import PortfolioPerformanceWidget from './widgets/PortfolioPerformanceWidget'
import JobFinancialHealthWidget from './widgets/JobFinancialHealthWidget'
import EarnedValueManagementWidget from './widgets/EarnedValueManagementWidget'
import AccountsPayableWidget from './widgets/AccountsPayableWidget'
import BudgetUtilizationWidget from './widgets/BudgetUtilizationWidget'
import CostBreakdownWidget from './widgets/CostBreakdownWidget'
import RevenueRecognitionWidget from './widgets/RevenueRecognitionWidget'
import SchedulePerformanceWidget from './widgets/SchedulePerformanceWidget'
import ProgressReportStatusWidget from './widgets/ProgressReportStatusWidget'
import JobPerformanceTableWidget from './widgets/JobPerformanceTableWidget'

const ResponsiveGridLayout = WidthProvider(GridLayout)

const WIDGET_COMPONENTS = {
  taskStats: TaskStatsWidget,
  jobPerformance: JobPerformanceWidget,
  timeTracking: TimeTrackingWidget,
  projects: ProjectsWidget,
  myTasks: MyTasksWidget,
  completionRate: CompletionRateWidget,
  portfolioPerformance: PortfolioPerformanceWidget,
  jobFinancialHealth: JobFinancialHealthWidget,
  earnedValueManagement: EarnedValueManagementWidget,
  accountsPayable: AccountsPayableWidget,
  budgetUtilization: BudgetUtilizationWidget,
  costBreakdown: CostBreakdownWidget,
  revenueRecognition: RevenueRecognitionWidget,
  schedulePerformance: SchedulePerformanceWidget,
  progressReportStatus: ProgressReportStatusWidget,
  jobPerformanceTable: JobPerformanceTableWidget,
}

// Debug: Log widget components to verify they're loaded
if (typeof window !== 'undefined') {
  console.log('Widget Components Loaded:', Object.keys(WIDGET_COMPONENTS))
  console.log('Widget Components:', WIDGET_COMPONENTS)
}

export default function DashboardViewer({ dashboard }) {
  const layout = useMemo(() => dashboard?.layout || [], [dashboard])

  const renderWidget = (item) => {
    // Debug: Log the item to see what we're working with
    if (!item.type) {
      console.error('Widget item missing type:', item)
    }
    
    const WidgetComponent = WIDGET_COMPONENTS[item.type]
    if (!WidgetComponent) {
      console.error('Unknown widget type:', item.type, 'Item:', item, 'Available types:', Object.keys(WIDGET_COMPONENTS))
      return (
        <div className="card p-4 h-full">
          <div className="text-sm text-red-600">Unknown widget type: {item.type || 'undefined'}</div>
          <div className="text-xs text-gray-500 mt-2">Available: {Object.keys(WIDGET_COMPONENTS).join(', ')}</div>
          <div className="text-xs text-gray-400 mt-1">Item data: {JSON.stringify(item)}</div>
        </div>
      )
    }

    return (
      <div className="h-full">
        <WidgetComponent
          key={item.i}
          id={item.i}
          config={item.config || {}}
          isEditing={false}
        />
      </div>
    )
  }

  if (!dashboard || layout.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No dashboard configured</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg min-h-screen">
      <ResponsiveGridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={60}
        width={1200}
        isDraggable={false}
        isResizable={false}
        margin={[16, 16]}
        compactType="vertical"
        preventCollision={false}
      >
        {layout.map((item) => (
          <div key={item.i} className="h-full">
            {renderWidget(item)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}

