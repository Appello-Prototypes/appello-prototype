import React, { useState, useCallback, useEffect } from 'react'
import GridLayout from 'react-grid-layout'
import { WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import '../../styles/grid-layout.css'
import Widget from './Widget'
import { WIDGET_TYPES, snapToStandardHeight } from './widgets'
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
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

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

export default function DashboardEditor({ 
  dashboard, 
  onSave, 
  onCancel,
  onDelete 
}) {
  const [layout, setLayout] = useState(dashboard?.layout || [])
  const [showAddWidget, setShowAddWidget] = useState(false)

  useEffect(() => {
    if (dashboard?.layout) {
      setLayout(dashboard.layout)
    }
  }, [dashboard])

  const handleLayoutChange = useCallback((newLayout) => {
    // Ensure all layout items have a type property and snap heights to standard blocks
    const validatedLayout = newLayout.map(item => {
      let updatedItem = { ...item }
      
      // Ensure type property
      if (!updatedItem.type && dashboard.layout) {
        const originalItem = dashboard.layout.find(orig => orig.i === item.i)
        if (originalItem && originalItem.type) {
          updatedItem.type = originalItem.type
        }
      }
      
      // Snap height to nearest standard block (2, 4, 6, 8)
      if (updatedItem.h) {
        updatedItem.h = snapToStandardHeight(updatedItem.h)
      }
      
      return updatedItem
    }).filter(item => item.type) // Remove items without type
    
    setLayout(validatedLayout)
  }, [dashboard])

  const handleResizeStop = useCallback((layout, oldItem, newItem) => {
    // Snap height to standard block when resizing stops
    const snappedHeight = snapToStandardHeight(newItem.h)
    const updatedLayout = layout.map(item => 
      item.i === newItem.i 
        ? { ...item, h: snappedHeight }
        : item
    )
    setLayout(updatedLayout)
  }, [])

  const handleAddWidget = (widgetType) => {
    const widgetMeta = WIDGET_TYPES[widgetType]
    if (!widgetMeta) {
      console.error('Invalid widget type:', widgetType)
      return
    }

    // Ensure height is snapped to standard block
    const standardHeight = snapToStandardHeight(widgetMeta.defaultSize.h)

    const newWidget = {
      i: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: 0,
      y: 0,
      w: widgetMeta.defaultSize.w,
      h: standardHeight, // Use standard block height
      type: widgetType, // Ensure type is always set
      config: { ...widgetMeta.defaultConfig },
    }

    // Find the lowest Y position to add widget at bottom
    const maxY = layout.reduce((max, item) => Math.max(max, (item.y || 0) + (item.h || 0)), 0)
    newWidget.y = maxY

    setLayout([...layout, newWidget])
    setShowAddWidget(false)
  }

  const handleRemoveWidget = (widgetId) => {
    setLayout(layout.filter(item => item.i !== widgetId))
  }

  const handleEditWidget = (widgetId) => {
    // TODO: Open widget configuration modal
    console.log('Edit widget:', widgetId)
  }

  const handleSave = () => {
    const updatedDashboard = {
      ...dashboard,
      layout,
      updatedAt: new Date().toISOString(),
    }
    onSave(updatedDashboard)
  }

  const renderWidget = (item) => {
    const WidgetComponent = WIDGET_COMPONENTS[item.type]
    if (!WidgetComponent) {
      console.error('Unknown widget type:', item.type, 'Available types:', Object.keys(WIDGET_COMPONENTS))
      return (
        <div className="card p-4 h-full">
          <div className="text-sm text-red-600">Unknown widget type: {item.type || 'undefined'}</div>
          <div className="text-xs text-gray-500 mt-2">Available: {Object.keys(WIDGET_COMPONENTS).join(', ')}</div>
        </div>
      )
    }

    return (
      <div className="h-full">
        <WidgetComponent
          key={item.i}
          id={item.i}
          config={item.config || {}}
          isEditing={true}
          onEdit={handleEditWidget}
          onRemove={handleRemoveWidget}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit Dashboard</h2>
          <p className="text-sm text-gray-500">{dashboard?.name || 'Untitled Dashboard'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddWidget(!showAddWidget)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Widget
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(dashboard.id)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            Save
          </button>
        </div>
      </div>

      {/* Add Widget Panel */}
      {showAddWidget && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add Widget</h3>
            <button
              onClick={() => setShowAddWidget(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(WIDGET_TYPES).map(([type, meta]) => (
              <button
                key={type}
                onClick={() => handleAddWidget(type)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
              >
                <div className="font-medium text-gray-900 mb-1">{meta.name}</div>
                <div className="text-sm text-gray-500">{meta.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="bg-gray-50 p-4 rounded-lg min-h-screen">
        {layout.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No widgets added yet</p>
            <button
              onClick={() => setShowAddWidget(true)}
              className="btn-primary"
            >
              Add Your First Widget
            </button>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            width={1200}
            onLayoutChange={handleLayoutChange}
            onResizeStop={handleResizeStop}
            isDraggable={true}
            isResizable={true}
            margin={[16, 16]}
            compactType="vertical"
            preventCollision={false}
            // Standard block heights: 2, 4, 6, 8 (multiples of 2)
            // Each block = 60px row height, so widgets snap to 120px, 240px, 360px, 480px
          >
            {layout.map((item) => (
              <div key={item.i} className="h-full">
                {renderWidget(item)}
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  )
}


