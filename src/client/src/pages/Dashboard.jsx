import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  FireIcon,
} from '@heroicons/react/24/outline'
import { taskAPI, api } from '../services/api'
import { formatDistanceToNow, format } from 'date-fns'

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => taskAPI.getDashboardStats().then(res => res.data.data),
  })

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-dashboard'],
    queryFn: () => api.get('/api/projects').then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs-dashboard'],
    queryFn: () => api.get('/api/jobs').then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const { data: overdueTasks, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-tasks'],
    queryFn: () => taskAPI.getOverdueTasks().then(res => res.data.data),
    staleTime: 30 * 1000,
  })

  const { data: myTasks, isLoading: myTasksLoading } = useQuery({
    queryKey: ['my-tasks-preview'],
    queryFn: () => taskAPI.getMyTasks({ status: 'in_progress' }).then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const { data: recentTimeEntries, isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['recent-time-entries'],
    queryFn: () => api.get('/api/time-entries?limit=5').then(res => res.data.data.timeEntries),
    staleTime: 30 * 1000,
  })

  const statCards = [
    {
      name: 'Total Tasks',
      value: stats?.totalTasks || 0,
      icon: ClipboardDocumentListIcon,
      color: 'blue',
      href: '/tasks'
    },
    {
      name: 'Completed',
      value: stats?.completedTasks || 0,
      icon: CheckCircleIcon,
      color: 'green',
      href: '/tasks?status=completed'
    },
    {
      name: 'In Progress',
      value: stats?.inProgressTasks || 0,
      icon: ClockIcon,
      color: 'yellow',
      href: '/tasks?status=in_progress'
    },
    {
      name: 'Overdue',
      value: stats?.overdueTasks || 0,
      icon: ExclamationTriangleIcon,
      color: 'red',
      href: '/tasks/overdue'
    },
    {
      name: 'Due Today',
      value: stats?.todayTasks || 0,
      icon: CalendarIcon,
      color: 'purple',
      href: '/tasks?due=today'
    },
    {
      name: 'High Priority',
      value: stats?.highPriorityTasks || 0,
      icon: FireIcon,
      color: 'orange',
      href: '/tasks?priority=high'
    },
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
    }
    return colors[color] || colors.blue
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'badge-green',
      medium: 'badge-yellow',
      high: 'badge-orange',
      critical: 'badge-red',
    }
    return badges[priority] || badges.medium
  }

  const getStatusBadge = (status) => {
    const badges = {
      not_started: 'badge-gray',
      in_progress: 'badge-blue',
      completed: 'badge-green',
      on_hold: 'badge-yellow',
      cancelled: 'badge-red',
    }
    return badges[status] || badges.gray
  }

  if (statsLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow h-24"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your tasks and team progress
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            to="/tasks/create"
            className="btn-primary"
          >
            Create Task
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm font-medium text-gray-500">{stat.name}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Completion Rate */}
      {stats && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Completion Rate</h3>
          <div className="flex items-center">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                ></div>
              </div>
            </div>
            <div className="ml-4 text-2xl font-bold text-gray-900">
              {stats.completionRate}%
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {stats.completedTasks} of {stats.totalTasks} tasks completed
          </p>
        </div>
      )}

      {/* Active Projects & Jobs Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        {!projectsLoading && projects && projects.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Active Projects</h3>
              <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
            
            <div className="space-y-3">
              {projects.slice(0, 2).map((project) => (
                <Link
                  key={project._id}
                  to={`/projects/${project._id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                    <span className="text-lg font-bold text-purple-600">{project.overallProgress}%</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {project.projectNumber} • {project.client?.name}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${project.overallProgress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Total Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.totalContractValue)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Jobs */}
        {!jobsLoading && jobs && jobs.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Active Jobs</h3>
              <Link to="/jobs" className="text-sm text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
            
            <div className="space-y-3">
              {jobs.slice(0, 2).map((job) => (
                <Link
                  key={job._id}
                  to={`/jobs/${job._id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 truncate">{job.name}</h4>
                    <span className="text-lg font-bold text-blue-600">{job.overallProgress}%</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {job.jobNumber} • {job.client?.name}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${job.overallProgress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Job Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(job.contractValue)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Active Tasks */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">My Active Tasks</h3>
              <Link to="/my-tasks" className="text-sm text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {myTasksLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            ) : myTasks && myTasks.length > 0 ? (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task._id}
                    to={`/tasks/${task._id}`}
                    className="block hover:bg-gray-50 p-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {task.dueDate ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true }) : 'No due date'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`badge ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`badge ${getStatusBadge(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No active tasks</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any tasks in progress.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Time Entries */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Time Entries</h3>
              <Link to="/time-entry" className="text-sm text-blue-600 hover:text-blue-500">
                Log Time
              </Link>
            </div>
          </div>
          <div className="p-6">
            {timeEntriesLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            ) : recentTimeEntries && recentTimeEntries.length > 0 ? (
              <div className="space-y-3">
                {recentTimeEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.costCode} - {entry.totalHours}h
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {entry.workDescription}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.workerId?.name} • {format(new Date(entry.date), 'MMM d')}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={`badge text-xs ${
                        entry.status === 'approved' ? 'badge-green' :
                        entry.status === 'submitted' ? 'badge-blue' : 'badge-gray'
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No time entries</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start logging your work hours
                </p>
                <Link to="/time-entry" className="mt-3 btn-primary inline-flex">
                  Log Time Entry
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Tasks Section */}
      {overdueTasks && overdueTasks.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Overdue Tasks</h3>
              <span className="badge badge-red">{overdueTasks.length}</span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {overdueTasks.slice(0, 5).map((task) => (
                <Link
                  key={task._id}
                  to={`/tasks/${task._id}`}
                  className="block hover:bg-red-50 p-3 rounded-lg transition-colors border-l-4 border-red-400"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      <p className="text-sm text-red-600">
                        Overdue by {formatDistanceToNow(new Date(task.dueDate))}
                      </p>
                      <p className="text-xs text-gray-500">
                        Assigned to: {task.assignedTo?.name}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={`badge ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
