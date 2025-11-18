import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon
} from '@heroicons/react/24/outline'

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

export default function TaskTableView({ 
  tasks, 
  isLoading, 
  pagination, 
  page, 
  setPage,
  onTaskUpdate 
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' })

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    let aVal = a[sortConfig.key]
    let bVal = b[sortConfig.key]

    // Handle nested properties
    if (sortConfig.key === 'assignedTo') {
      aVal = a.assignedTo?.name || ''
      bVal = b.assignedTo?.name || ''
    } else if (sortConfig.key === 'jobId') {
      aVal = a.jobId?.jobNumber || a.jobId?.name || ''
      bVal = b.jobId?.jobNumber || b.jobId?.name || ''
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const SortableHeader = ({ children, sortKey }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? (
            <ArrowUpIcon className="w-4 h-4" />
          ) : (
            <ArrowDownIcon className="w-4 h-4" />
          )
        )}
      </div>
    </th>
  )

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loading...</th>
            </tr>
          </thead>
        </table>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader sortKey="title">Task</SortableHeader>
              <SortableHeader sortKey="status">Status</SortableHeader>
              <SortableHeader sortKey="priority">Priority</SortableHeader>
              <SortableHeader sortKey="costCode">Cost Code</SortableHeader>
              <SortableHeader sortKey="assignedTo">Assigned To</SortableHeader>
              <SortableHeader sortKey="jobId">Job</SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
              <SortableHeader sortKey="dueDate">Due Date</SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.map((task) => (
              <tr key={task._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/tasks/${task._id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {task.title}
                  </Link>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`badge ${getStatusColor(task.status)}`}>
                    {formatStatus(task.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`badge ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <CurrencyDollarIcon className="w-4 h-4 mr-1 text-gray-400" />
                    <span className="font-mono">{task.costCode}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <UserIcon className="w-4 h-4 mr-1 text-gray-400" />
                    {task.assignedTo?.name || 'Unassigned'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {task.jobId?.jobNumber || task.jobId?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {task.timesheet?.totalHours > 0 ? (
                      <div>
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="font-medium">
                            {task.timesheet.totalHours.toFixed(1)}h
                          </span>
                        </div>
                        {task.timesheet.overtimeHours > 0 && (
                          <span className="text-xs text-orange-600">
                            +{task.timesheet.overtimeHours.toFixed(1)}h OT
                          </span>
                        )}
                        {task.estimatedHours && (
                          <div className="text-xs text-gray-500 mt-1">
                            / {task.estimatedHours}h est.
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">
                        {task.estimatedHours ? `${task.estimatedHours}h est.` : '-'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${task.completionPercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {task.completionPercentage || 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{pagination.current}</span> of{' '}
                <span className="font-medium">{pagination.pages}</span> ({pagination.total} total)
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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

