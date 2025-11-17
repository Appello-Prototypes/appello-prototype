import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline'
import { taskAPI } from '../services/api'
import { formatDistanceToNow, format } from 'date-fns'

export default function TaskList() {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    category: '',
    assignedTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', filters, page],
    queryFn: () => taskAPI.getTasks({ ...filters, page, limit: 10 }).then(res => res.data.data),
    keepPreviousData: true,
    staleTime: 30 * 1000, // 30 seconds
  })

  const tasks = data?.tasks || []
  const pagination = data?.pagination || {}

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filtering
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

  const getStatusColor = (status) => {
    const colors = {
      not_started: 'text-gray-600 bg-gray-100',
      in_progress: 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100',
      on_hold: 'text-yellow-600 bg-yellow-100',
      cancelled: 'text-red-600 bg-red-100'
    }
    return colors[status] || colors.not_started
  }

  const formatStatus = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading tasks</div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            All Tasks
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all tasks across your projects
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link to="/tasks/create" className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Task
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
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
            <option value="priority-desc">Priority (High to Low)</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="space-x-2">
                  <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.status || filters.priority 
              ? 'Try adjusting your filters'
              : 'Get started by creating a new task'
            }
          </p>
          {(!filters.search && !filters.status && !filters.priority) && (
            <div className="mt-6">
              <Link to="/tasks/create" className="btn-primary">
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Task
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Link
              key={task._id}
              to={`/tasks/${task._id}`}
              className="card p-6 hover:shadow-md transition-all duration-200 block"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {task.title}
                    </h3>
                    <span className={`badge ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`badge ${getStatusColor(task.status)}`}>
                      {formatStatus(task.status)}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="font-medium">Assigned to:</span>
                      <span className="ml-1">{task.assignedTo?.name}</span>
                    </div>
                    
                    {task.dueDate && (
                      <div className="flex items-center">
                        <span className="font-medium">Due:</span>
                        <span className={`ml-1 ${task.isOverdue ? 'text-red-600 font-medium' : ''}`}>
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <span className="font-medium">Created:</span>
                      <span className="ml-1">
                        {format(new Date(task.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  {task.tags && task.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {task.tags.map((tag, index) => (
                        <span key={index} className="badge badge-gray text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {task.completionPercentage > 0 && (
                  <div className="ml-6 flex-shrink-0">
                    <div className="w-16 h-16 relative">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="2"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray={`${task.completionPercentage}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-900">
                          {task.completionPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{pagination.current}</span> of{' '}
                <span className="font-medium">{pagination.pages}</span> ({pagination.total} total tasks)
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {/* Page numbers would go here */}
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
