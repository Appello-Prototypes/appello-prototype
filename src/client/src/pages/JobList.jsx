import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'

export default function JobList() {
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/api/jobs').then(res => res.data.data)
  })

  const getStatusColor = (status) => {
    const colors = {
      bidding: 'bg-yellow-100 text-yellow-800',
      awarded: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-gray-100 text-gray-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.active
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading jobs</div>
        <button onClick={() => window.location.reload()} className="btn-primary">
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
            Jobs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your ICI construction jobs with integrated task management and cost code tracking
          </p>
        </div>
      </div>

      {/* Job Cards */}
      {jobs && jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job._id}
              to={`/jobs/${job._id}`}
              className="card p-6 hover:shadow-md transition-all duration-200 block"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Job Header */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {job.name}
                        </h3>
                        <span className={`badge ${getStatusColor(job.status)}`}>
                          {job.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        #{job.jobNumber} • {job.client?.name}
                      </p>
                      
                      {job.projectId && (
                        <p className="text-xs text-gray-500 mb-2">
                          Project: {job.projectId.name} (#{job.projectId.projectNumber})
                        </p>
                      )}
                      
                      {job.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {job.description}
                        </p>
                      )}
                      
                      {/* Job Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {formatCurrency(job.contractValue)}
                            </div>
                            <div className="text-gray-500">Job Value</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {formatDistanceToNow(new Date(job.endDate), { addSuffix: true })}
                            </div>
                            <div className="text-gray-500">Due</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <UserGroupIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {job.jobManager?.name}
                            </div>
                            <div className="text-gray-500">Job Manager</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <ChartBarIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {job.overallProgress}%
                            </div>
                            <div className="text-gray-500">Complete</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Progress</span>
                          <span className="text-xs font-medium text-gray-900">{job.overallProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.overallProgress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="mt-4 flex items-center space-x-6 text-xs text-gray-500">
                        <span>Active Job</span>
                        <span>Value: {formatCurrency(job.contractValue)}</span>
                        <span>Manager: {job.jobManager?.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Jobs will appear here when created within projects
          </p>
          <div className="mt-6">
            <Link to="/projects" className="btn-primary">
              View Projects
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
