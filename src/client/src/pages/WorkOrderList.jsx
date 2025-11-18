import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { workOrderAPI, jobAPI } from '../services/api'

const getStatusColor = (status) => {
  const colors = {
    draft: 'text-gray-600 bg-gray-100',
    pending: 'text-yellow-600 bg-yellow-100',
    issued: 'text-blue-600 bg-blue-100',
    acknowledged: 'text-indigo-600 bg-indigo-100',
    in_progress: 'text-blue-600 bg-blue-100',
    completed: 'text-green-600 bg-green-100',
    closed: 'text-gray-600 bg-gray-100',
    cancelled: 'text-red-600 bg-red-100'
  }
  return colors[status] || colors.draft
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
    case 'closed':
      return <CheckCircleIcon className="h-5 w-5" />
    case 'cancelled':
      return <XCircleIcon className="h-5 w-5" />
    case 'on_hold':
      return <PauseCircleIcon className="h-5 w-5" />
    case 'in_progress':
      return <ClockIcon className="h-5 w-5" />
    default:
      return <DocumentTextIcon className="h-5 w-5" />
  }
}

const getPriorityColor = (priority) => {
  const colors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100'
  }
  return colors[priority] || colors.medium
}

const formatStatus = (status) => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function WorkOrderList() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignedTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-orders', jobId, filters, page],
    queryFn: () => workOrderAPI.getWorkOrders({ 
      jobId, 
      ...filters, 
      page, 
      limit: 20 
    }).then(res => res.data.data),
    keepPreviousData: true,
    staleTime: 30 * 1000,
    enabled: !!jobId
  })

  const { data: jobData } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobAPI.getJob(jobId).then(res => res.data.data),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000
  })

  const workOrders = data?.workOrders || []
  const pagination = data?.pagination || {}
  const job = jobData

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading work orders: {error.message}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          {job && (
            <p className="mt-1 text-sm text-gray-500">
              {job.name} ({job.jobNumber})
            </p>
          )}
        </div>
        <Link
          to={`/work-orders/create?jobId=${jobId}`}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Work Order
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search work orders..."
              className="form-input pl-10"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="issued">Issued</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
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

          {/* Sort */}
          <select
            className="form-select"
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-')
              setFilters(prev => ({ ...prev, sortBy, sortOrder }))
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="dueDate-asc">Due Date (Earliest)</option>
            <option value="dueDate-desc">Due Date (Latest)</option>
            <option value="workOrderNumber-asc">Work Order # (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : workOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.status || filters.priority || filters.search
              ? 'Try adjusting your filters'
              : 'Get started by creating a new work order'}
          </p>
          {!filters.status && !filters.priority && !filters.search && (
            <div className="mt-6">
              <Link
                to={`/work-orders/create?jobId=${jobId}`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Work Order
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {workOrders.map((workOrder) => (
              <div
                key={workOrder._id}
                className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/work-orders/${workOrder._id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {workOrder.workOrderNumber}
                      </h3>
                      <span className={`badge ${getStatusColor(workOrder.status)}`}>
                        {formatStatus(workOrder.status)}
                      </span>
                      <span className={`badge ${getPriorityColor(workOrder.priority)}`}>
                        {workOrder.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium mb-1">{workOrder.title}</p>
                    {workOrder.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {workOrder.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      {workOrder.issuedBy && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          Issued by: {workOrder.issuedBy}
                        </span>
                      )}
                      {workOrder.assignedTo && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          Assigned: {workOrder.assignedTo?.name || 'Unassigned'}
                        </span>
                      )}
                      {workOrder.dueDate && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          Due: {format(new Date(workOrder.dueDate), 'MMM d, yyyy')}
                        </span>
                      )}
                      {workOrder.taskCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <DocumentTextIcon className="h-4 w-4" />
                          {workOrder.taskCount} task{workOrder.taskCount !== 1 ? 's' : ''}
                          {workOrder.completedTaskCount !== undefined && workOrder.completedTaskCount > 0 && (
                            <span className="text-green-600">
                              ({workOrder.completedTaskCount} completed)
                            </span>
                          )}
                        </span>
                      )}
                      {workOrder.completionPercentage > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircleIcon className="h-4 w-4" />
                          {workOrder.completionPercentage}% complete
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2">
                    {workOrder.estimatedHours && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Est. Hours</div>
                        <div className="font-semibold text-gray-900">
                          {workOrder.estimatedHours}
                        </div>
                      </div>
                    )}
                    {workOrder.actualHours > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Actual Hours</div>
                        <div className={`font-semibold ${
                          workOrder.actualHours > (workOrder.estimatedHours || 0)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {workOrder.actualHours.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} work orders
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

