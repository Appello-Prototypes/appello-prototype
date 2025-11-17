import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import {
  WrenchScrewdriverIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

function ProjectDashboard() {
  const { projectId, jobId } = useParams()
  const [displayData, setDisplayData] = useState(null)
  const [loading, setLoading] = useState(true)

  const isJobView = !!jobId
  const id = jobId || projectId

  // Mock data for demo
  useEffect(() => {
    setTimeout(() => {
      setDisplayData({
        name: isJobView ? 'Process Unit A - Thermal Insulation' : 'Suncor Energy Petrochemical Expansion',
        projectNumber: isJobView ? 'JOB-2024-INS-002' : 'PROJ-2024-SUNCOR-001',
        client: { name: 'Suncor Energy' },
        status: 'active',
        overallProgress: isJobView ? 18 : 15,
        startDate: '2024-11-01',
        endDate: isJobView ? '2025-05-30' : '2025-12-30',
        contractValue: isJobView ? 2850000 : 8500000
      })
      setLoading(false)
    }, 500)
  }, [isJobView])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!displayData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isJobView ? 'Job' : 'Project'} not found
        </h3>
        <p className="text-gray-500">
          The {isJobView ? 'job' : 'project'} you're looking for doesn't exist.
        </p>
        <Link 
          to={isJobView ? "/jobs" : "/projects"} 
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to {isJobView ? 'Jobs' : 'Projects'}
        </Link>
      </div>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayData.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {displayData.projectNumber} • {displayData.client.name}
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {displayData.status}
            </span>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Progress</dt>
              <dd className="mt-1">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${displayData.overallProgress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{displayData.overallProgress}%</span>
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{displayData.startDate}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{displayData.endDate}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contract Value</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatCurrency(displayData.contractValue)}</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`grid gap-4 ${isJobView ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7' : 'grid-cols-2 md:grid-cols-4'}`}>
        <Link 
          to={`/tasks?${isJobView ? 'jobId' : 'projectId'}=${id}`} 
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
          <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900">View Tasks</div>
        </Link>
        
        <Link 
          to={`/time-entry?${isJobView ? 'jobId' : 'projectId'}=${id}`} 
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
          <ClockIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900">Time Tracking</div>
        </Link>
        
        {isJobView && (
          <Link 
            to={`/jobs/${jobId}/progress-report`} 
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
          >
            <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Progress Report</div>
          </Link>
        )}
        
        <Link 
          to={isJobView ? `/jobs/${jobId}/work-orders` : `/projects/${projectId}/jobs`} 
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
          <DocumentTextIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900">{isJobView ? 'Work Orders' : 'Jobs'}</div>
        </Link>
        
        {isJobView && (
          <>
            <Link 
              to={`/jobs/${jobId}/sov-setup`} 
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <DocumentTextIcon className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">SOV Setup</div>
            </Link>
            
            <Link 
              to={`/jobs/${jobId}/sov-line-items`} 
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <DocumentTextIcon className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">SOV Line Items</div>
            </Link>
            
            <Link 
              to={`/jobs/${jobId}/tasks-enhanced`} 
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
            >
              <WrenchScrewdriverIcon className="h-8 w-8 text-teal-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">Enhanced Tasks</div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default ProjectDashboard