import React, { useState, useEffect } from 'react'
import { useParams, useLocation, Link, Outlet } from 'react-router-dom'
import { 
  HomeIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  ListBulletIcon,
  CurrencyDollarIcon,
  ArrowLeftIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const JobLayout = () => {
  const { jobId } = useParams()
  const location = useLocation()
  const [jobData, setJobData] = useState(null)
  const [loading, setLoading] = useState(true)

  const jobTabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: HomeIcon,
      path: `/jobs/${jobId}`,
      description: 'Job dashboard and summary'
    },
    {
      id: 'tasks',
      name: 'Tasks',
      icon: WrenchScrewdriverIcon,
      path: `/jobs/${jobId}/tasks-enhanced`,
      description: 'Task management with SOV integration'
    },
    {
      id: 'sov-setup',
      name: 'SOV Setup',
      icon: CogIcon,
      path: `/jobs/${jobId}/sov-setup`,
      description: 'Configure systems, areas, phases'
    },
    {
      id: 'sov-line-items',
      name: 'Schedule of Values',
      icon: CurrencyDollarIcon,
      path: `/jobs/${jobId}/sov-line-items`,
      description: 'Manage SOV line items and cost codes'
    },
    {
      id: 'progress-report',
      name: 'Progress Report',
      icon: ChartBarIcon,
      path: `/jobs/${jobId}/progress-report`,
      description: 'Progress tracking and reporting'
    },
    {
      id: 'earned-vs-burned',
      name: 'Earned vs Burned',
      icon: ScaleIcon,
      path: `/jobs/${jobId}/earned-vs-burned`,
      description: 'Financial performance analysis'
    },
    {
      id: 'ap-register',
      name: 'AP Register',
      icon: DocumentTextIcon,
      path: `/jobs/${jobId}/ap-register`,
      description: 'Accounts payable register and vendor invoices'
    },
    {
      id: 'timelog-register',
      name: 'Timelog Register',
      icon: ClockIcon,
      path: `/jobs/${jobId}/timelog-register`,
      description: 'Detailed timelog register and labor analysis'
    },
    {
      id: 'work-orders',
      name: 'Work Orders',
      icon: ListBulletIcon,
      path: `/jobs/${jobId}/work-orders`,
      description: 'Work orders and documentation'
    }
  ]

  useEffect(() => {
    if (jobId) {
      fetchJobData()
    }
  }, [jobId])

  const fetchJobData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/jobs/${jobId}`)
      setJobData(response.data.data)
    } catch (error) {
      toast.error('Failed to load job data')
      console.error('Error fetching job data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActiveTab = () => {
    const currentPath = location.pathname
    
    // Check for exact matches first
    for (const tab of jobTabs) {
      if (currentPath === tab.path) {
        return tab.id
      }
    }
    
    // Check for partial matches (for sub-routes)
    if (currentPath.includes('/tasks-enhanced')) return 'tasks'
    if (currentPath.includes('/sov-setup')) return 'sov-setup'
    if (currentPath.includes('/sov-line-items')) return 'sov-line-items'
    if (currentPath.includes('/progress-report')) return 'progress-report'
    if (currentPath.includes('/earned-vs-burned')) return 'earned-vs-burned'
    if (currentPath.includes('/ap-register')) return 'ap-register'
    if (currentPath.includes('/timelog-register')) return 'timelog-register'
    if (currentPath.includes('/work-orders')) return 'work-orders'
    
    
    // Default to overview for job root
    return 'overview'
  }

  const activeTab = getActiveTab()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!jobData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Job not found</h3>
        <p className="text-gray-500">The job you're looking for doesn't exist.</p>
        <Link 
          to="/jobs" 
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Job Header - Always Visible */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link to="/jobs" className="hover:text-gray-700">Jobs</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{jobData.name}</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{jobData.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {jobData.jobNumber} • {jobData.client.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {jobData.status}
              </span>
              <Link
                to="/jobs"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Jobs
              </Link>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Progress</dt>
              <dd className="mt-1">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${jobData.overallProgress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{jobData.overallProgress}%</span>
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(jobData.startDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(jobData.endDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contract Value</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatCurrency(jobData.contractValue)}</dd>
            </div>
          </div>
        </div>

        {/* Job Tabs - Fixed Navigation */}
        <div className="border-t border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Job sections">
            {jobTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center group`}
                  title={tab.description}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        <Outlet />
      </div>
    </div>
  )
}

export default JobLayout
