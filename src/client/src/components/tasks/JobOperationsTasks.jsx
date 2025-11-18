import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Squares2X2Icon, 
  TableCellsIcon, 
  ChartBarIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { taskAPI, jobAPI, workOrderAPI } from '../../services/api'
import TaskCardView from './TaskCardView'
import TaskTableView from './TaskTableView'
import TaskGanttView from './TaskGanttView'

const VIEWS = {
  CARD: 'card',
  TABLE: 'table',
  GANTT: 'gantt'
}

export default function JobOperationsTasks() {
  const { jobId } = useParams()
  const [view, setView] = useState(VIEWS.CARD)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    costCode: '',
    assignedTo: '',
    workOrderId: ''
  })
  const [page, setPage] = useState(1)

  // Fetch tasks with timesheet data - automatically filtered by jobId
  const { data: tasksData, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks-operations', jobId, filters, page],
    queryFn: () => taskAPI.getTasksWithTimesheetData({ 
      jobId, // Automatically filter by current job
      ...filters, 
      page, 
      limit: view === VIEWS.GANTT ? 100 : 20 
    }).then(res => res.data.data),
    keepPreviousData: true,
    staleTime: 30 * 1000,
    enabled: !!jobId, // Only fetch if jobId exists
  })

  // Fetch job details for cost codes
  const { data: jobData } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobAPI.getJob(jobId).then(res => res.data.data),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch cost codes for the current job
  const { data: costCodesData } = useQuery({
    queryKey: ['job-cost-codes', jobId],
    queryFn: () => jobAPI.getJobCostCodes(jobId).then(res => res.data.data),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch work orders for the current job
  const { data: workOrdersData } = useQuery({
    queryKey: ['work-orders', jobId],
    queryFn: () => workOrderAPI.getWorkOrders({ jobId }).then(res => res.data.data),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  })

  const tasks = tasksData?.tasks || []
  const pagination = tasksData?.pagination || {}
  const costCodes = costCodesData || []
  const workOrders = workOrdersData?.workOrders || []
  const jobName = jobData?.name || jobData?.jobNumber || ''

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleViewChange = (newView) => {
    setView(newView)
    setPage(1)
  }

  const renderView = () => {
    switch (view) {
      case VIEWS.CARD:
        return (
          <TaskCardView 
            tasks={tasks} 
            isLoading={isLoading}
            onTaskUpdate={refetch}
          />
        )
      case VIEWS.TABLE:
        return (
          <TaskTableView 
            tasks={tasks}
            isLoading={isLoading}
            pagination={pagination}
            page={page}
            setPage={setPage}
            onTaskUpdate={refetch}
          />
        )
      case VIEWS.GANTT:
        return (
          <TaskGanttView 
            tasks={tasks}
            isLoading={isLoading}
            onTaskUpdate={refetch}
          />
        )
      default:
        return null
    }
  }

  if (!jobId) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">No job selected</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewChange(VIEWS.CARD)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              view === VIEWS.CARD
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Squares2X2Icon className="w-5 h-5 mr-2" />
            Card View
          </button>
          <button
            onClick={() => handleViewChange(VIEWS.TABLE)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              view === VIEWS.TABLE
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TableCellsIcon className="w-5 h-5 mr-2" />
            Table View
          </button>
          <button
            onClick={() => handleViewChange(VIEWS.GANTT)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              view === VIEWS.GANTT
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Gantt Chart
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="form-input pl-10 w-64"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <button
            onClick={() => {/* Toggle filter panel */}}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <FunnelIcon className="w-5 h-5 mr-2" />
            Filters
          </button>
          <Link 
            to={`/tasks/create?jobId=${jobId}`}
            className="btn-primary"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Task
          </Link>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Cost Code Filter */}
          <select
            className="form-select"
            value={filters.costCode}
            onChange={(e) => handleFilterChange('costCode', e.target.value)}
          >
            <option value="">All Cost Codes</option>
            {costCodes.map(cc => (
              <option key={cc.code} value={cc.code}>
                {cc.code} - {cc.description}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            className="form-select"
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Work Order Filter */}
          <select
            className="form-select"
            value={filters.workOrderId}
            onChange={(e) => handleFilterChange('workOrderId', e.target.value)}
          >
            <option value="">All Work Orders</option>
            {workOrders.map(wo => (
              <option key={wo._id} value={wo._id}>
                {wo.workOrderNumber} - {wo.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-6 bg-red-50 border border-red-200">
          <div className="text-red-800">
            <p className="font-medium">Error loading tasks</p>
            <p className="text-sm mt-1">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 btn-primary bg-red-600 hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* View Content */}
      {!error && (
        <>
          {tasks.length === 0 && !isLoading && (
            <div className="card p-12 text-center">
              <p className="text-gray-500 mb-4">No tasks found for this job</p>
              <Link 
                to={`/tasks/create?jobId=${jobId}`}
                className="btn-primary inline-flex"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create First Task
              </Link>
            </div>
          )}
          {renderView()}
        </>
      )}
    </div>
  )
}

