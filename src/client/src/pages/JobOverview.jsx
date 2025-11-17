import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import {
  WrenchScrewdriverIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

const JobOverview = () => {
  const { jobId } = useParams()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobId) {
      fetchDashboardData()
    }
  }, [jobId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch job dashboard data
      const [tasksResponse, sovResponse, timeEntriesResponse] = await Promise.all([
        api.get(`/api/jobs/${jobId}/tasks-enhanced`),
        api.get(`/api/jobs/${jobId}/sov-components`),
        api.get('/api/time-entries', { params: { jobId } })
      ])

      setDashboardData({
        tasks: tasksResponse.data,
        sov: sovResponse.data.data,
        timeEntries: timeEntriesResponse.data.data.timeEntries || []
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const taskSummary = dashboardData?.tasks?.meta?.summary || {}
  const sovSummary = dashboardData?.sov?.summary || {}
  const timeEntries = dashboardData?.timeEntries || []
  
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
  const totalCost = timeEntries.reduce((sum, entry) => sum + entry.totalCost, 0)

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Tasks</div>
              <div className="text-2xl font-bold text-gray-900">{dashboardData?.tasks?.meta?.total || 0}</div>
              <div className="text-xs text-gray-500 mt-1">
                {taskSummary.completed || 0} completed, {taskSummary.inProgress || 0} in progress
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">SOV Value</div>
              <div className="text-2xl font-bold text-gray-900">
                ${(sovSummary.totalValue || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {sovSummary.sovLineItemsCount || 0} line items
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Hours</div>
              <div className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-1">
                ${totalCost.toLocaleString()} cost
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">SOV Components</div>
              <div className="text-2xl font-bold text-gray-900">
                {(sovSummary.systemsCount || 0) + (sovSummary.areasCount || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {sovSummary.systemsCount || 0} systems, {sovSummary.areasCount || 0} areas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Tasks</h3>
              <Link 
                to={`/jobs/${jobId}/tasks-enhanced`}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.tasks?.data?.slice(0, 5).map((task) => (
              <div key={task._id || task.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {task.assignedTo?.name || task.assignedTo} • {task.costCode}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                  {task.completionPercentage > 0 && (
                    <span className="text-xs text-gray-500">{task.completionPercentage}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Time Entries */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Time Entries</h3>
              <Link 
                to={`/jobs/${jobId}/time-tracking`}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            {timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No time entries yet</p>
                <Link
                  to={`/time-entry?jobId=${jobId}`}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                >
                  Log first entry
                </Link>
              </div>
            ) : (
              timeEntries.slice(0, 5).map((entry) => (
                <div key={entry._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {entry.costCode} - {entry.totalHours}h
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {entry.workDescription}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.workerId?.name} • {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                      entry.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
          to={`/jobs/${jobId}/tasks-enhanced`}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
          <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900">Manage Tasks</div>
          <div className="text-xs text-gray-500 mt-1">View, filter, and organize</div>
        </Link>
        
        <Link 
          to={`/jobs/${jobId}/sov-setup`}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
          <CogIcon className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900">SOV Setup</div>
          <div className="text-xs text-gray-500 mt-1">Configure components</div>
        </Link>
        
        <Link 
          to={`/jobs/${jobId}/sov-line-items`}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
          <CurrencyDollarIcon className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900">Schedule of Values</div>
          <div className="text-xs text-gray-500 mt-1">Manage line items</div>
        </Link>
        
        <Link 
          to={`/jobs/${jobId}/time-tracking`}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
          <ClockIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900">Time Tracking</div>
          <div className="text-xs text-gray-500 mt-1">View time entries</div>
        </Link>
      </div>
    </div>
  )
}

export default JobOverview
