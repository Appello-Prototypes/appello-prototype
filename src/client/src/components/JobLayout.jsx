import React, { useState, useEffect } from 'react'
import { useParams, useLocation, Link, Outlet } from 'react-router-dom'
import { 
  HomeIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ListBulletIcon,
  CurrencyDollarIcon,
  ArrowLeftIcon,
  ScaleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BriefcaseIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const JobLayout = () => {
  const { jobId } = useParams()
  const location = useLocation()
  const [jobData, setJobData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [financialMetrics, setFinancialMetrics] = useState(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({
    'operations': true,
    'financial-reporting': true
  })

  const statusOptions = [
    { value: 'quoting', label: 'Quoting', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    { value: 'won', label: 'Won', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    { value: 'in_progress', label: 'In Progress', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    { value: 'on_hold', label: 'On Hold', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    { value: 'complete', label: 'Complete', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    { value: 'closed', label: 'Closed', color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-800' }
  ]

  const getStatusConfig = (status) => {
    // Map old status values to new ones for backward compatibility
    const statusMap = {
      'bidding': 'quoting',
      'awarded': 'won',
      'active': 'in_progress',
      'on_hold': 'on_hold',
      'completed': 'complete',
      'cancelled': 'closed'
    }
    const mappedStatus = statusMap[status] || status
    return statusOptions.find(s => s.value === mappedStatus) || statusOptions[0]
  }

  const menuCategories = [
    {
      id: 'overview-setup',
      name: 'Overview & Setup',
      icon: HomeIcon,
      items: [
        {
          id: 'overview',
          name: 'Overview',
          icon: HomeIcon,
          path: `/jobs/${jobId}`,
          description: 'Job dashboard and summary'
        },
        {
          id: 'specifications',
          name: 'Specifications',
          icon: DocumentTextIcon,
          path: `/jobs/${jobId}/specifications`,
          description: 'Product selection specifications for systems and areas'
        }
      ]
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: BriefcaseIcon,
      items: [
        {
          id: 'tasks',
          name: 'Tasks',
          icon: WrenchScrewdriverIcon,
          path: `/jobs/${jobId}/tasks-enhanced`,
          description: 'Task management with SOV integration'
        },
        {
          id: 'work-orders',
          name: 'Work Orders',
          icon: ListBulletIcon,
          path: `/jobs/${jobId}/work-orders`,
          description: 'Work orders and documentation'
        }
      ]
    },
    {
      id: 'financial-reporting',
      name: 'Financial & Reporting',
      icon: BanknotesIcon,
      items: [
        {
          id: 'job-financial-summary',
          name: 'Job Financial Summary',
          icon: ChartBarIcon,
          path: `/jobs/${jobId}/job-financial-summary`,
          description: 'Month-by-month financial performance summary'
        },
        {
          id: 'progress-reports',
          name: 'Progress Reports',
          icon: DocumentTextIcon,
          path: `/jobs/${jobId}/progress-reports`,
          description: 'Progress reports and monthly billing'
        },
        {
          id: 'earned-vs-burned',
          name: 'Earned vs Burned',
          icon: ScaleIcon,
          path: `/jobs/${jobId}/earned-vs-burned`,
          description: 'EVM financial performance analysis'
        },
        {
          id: 'cost-to-complete',
          name: 'Cost to Complete',
          icon: ChartBarIcon,
          path: `/jobs/${jobId}/cost-to-complete`,
          description: 'Monthly forecast entry and analysis'
        },
        {
          id: 'sov-line-items',
          name: 'Schedule of Values',
          icon: CurrencyDollarIcon,
          path: `/jobs/${jobId}/sov-line-items`,
          description: 'Manage SOV line items and cost codes'
        },
        {
          id: 'monthly-cost-report',
          name: 'Monthly Cost Report',
          icon: ChartBarIcon,
          path: `/jobs/${jobId}/monthly-cost-report`,
          description: 'Detailed monthly cost analysis by cost code'
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
        }
      ]
    }
  ]

  // Flatten all tabs for active tab detection
  const jobTabs = menuCategories.flatMap(category => category.items)

  useEffect(() => {
    if (jobId) {
      fetchJobData()
    }
  }, [jobId])

  useEffect(() => {
    if (jobData) {
      fetchFinancialMetrics()
    }
  }, [jobData])

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

  const fetchFinancialMetrics = async () => {
    try {
      const [
        earnedVsBurnedResponse,
        progressReportsResponse,
        sovResponse
      ] = await Promise.all([
        api.get(`/api/financial/${jobId}/earned-vs-burned`).catch(() => ({ data: { totals: {} } })),
        api.get(`/api/financial/${jobId}/progress-reports?status=approved`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/jobs/${jobId}/sov-components`).catch(() => ({ data: { data: { summary: {} } } }))
      ])

      const evm = earnedVsBurnedResponse.data?.totals || {}
      const progressReports = progressReportsResponse.data?.data || []
      const latestPR = progressReports.length > 0 ? progressReports[0] : null
      const sovSummary = sovResponse.data?.data?.summary || {}

      const totalBudget = sovSummary.totalValue || 0
      const totalSpent = evm.actualCost || 0
      const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
      const cpi = evm.cpi || 0
      const progressPercent = latestPR?.summary?.calculatedPercentCTD || 0
      // Contract Value should be the SOV total (dynamic), fallback to job's contractValue if SOV not available
      const contractValue = totalBudget > 0 ? totalBudget : (jobData?.contractValue || 0)

      setFinancialMetrics({
        cpi,
        budgetUtilization,
        totalBudget,
        totalSpent,
        progressPercent,
        latestPR,
        contractValue
      })
    } catch (error) {
      console.error('Error fetching financial metrics:', error)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await api.patch(`/api/jobs/${jobId}`, { status: newStatus })
      setJobData(response.data.data)
      setStatusDropdownOpen(false)
      toast.success('Status updated successfully')
    } catch (error) {
      toast.error('Failed to update status')
      console.error('Error updating status:', error)
    }
  }

  // Get current status for display (with backward compatibility)
  const getCurrentStatus = () => {
    const statusMap = {
      'bidding': 'quoting',
      'awarded': 'won',
      'active': 'in_progress',
      'on_hold': 'on_hold',
      'completed': 'complete',
      'cancelled': 'closed'
    }
    return statusMap[jobData?.status] || jobData?.status || 'quoting'
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
    if (currentPath.includes('/sov-line-items')) return 'sov-line-items'
    if (currentPath.includes('/progress-reports')) return 'progress-reports'
    if (currentPath.includes('/earned-vs-burned')) return 'earned-vs-burned'
    if (currentPath.includes('/monthly-cost-report')) return 'monthly-cost-report'
    if (currentPath.includes('/job-financial-summary')) return 'job-financial-summary'
    if (currentPath.includes('/cost-to-complete')) return 'cost-to-complete'
    if (currentPath.includes('/ap-register')) return 'ap-register'
    if (currentPath.includes('/timelog-register')) return 'timelog-register'
    if (currentPath.includes('/work-orders')) return 'work-orders'
    
    
    // Default to overview for job root
    return 'overview'
  }

  const activeTab = getActiveTab()

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const getActiveCategory = () => {
    const currentPath = location.pathname
    for (const category of menuCategories) {
      for (const item of category.items) {
        if (currentPath === item.path || currentPath.includes(item.path.split('/').pop())) {
          return category.id
        }
      }
    }
    return 'overview-setup'
  }

  const activeCategory = getActiveCategory()

  // Auto-expand category if it contains the active tab
  useEffect(() => {
    if (activeCategory && !expandedCategories[activeCategory]) {
      setExpandedCategories(prev => ({
        ...prev,
        [activeCategory]: true
      }))
    }
  }, [activeCategory])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      // Check if click is outside any dropdown menu
      if (!target.closest('.category-dropdown') && !target.closest('.category-button')) {
        // Close all expanded categories except those with inline display
        setExpandedCategories(prev => {
          const updated = { ...prev }
          // Close operations and financial-reporting categories (they have dropdowns)
          updated['operations'] = false
          updated['financial-reporting'] = false
          return updated
        })
      }
      // Close status dropdown if clicking outside
      if (!target.closest('[data-status-dropdown]')) {
        setStatusDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0.0%'
    return `${value.toFixed(1)}%`
  }

  const getCPIStatus = (cpi) => {
    if (cpi >= 1.0) return { color: 'green', icon: CheckCircleIcon, label: 'On Budget' }
    if (cpi >= 0.9) return { color: 'yellow', icon: ExclamationTriangleIcon, label: 'At Risk' }
    return { color: 'red', icon: XCircleIcon, label: 'Over Budget' }
  }

  const getBudgetStatus = (percent) => {
    if (percent < 75) return { color: 'green', label: 'Healthy' }
    if (percent < 90) return { color: 'yellow', label: 'Caution' }
    return { color: 'red', label: 'Critical' }
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
        <div className="px-6 py-5">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link to="/jobs" className="hover:text-gray-700">Jobs</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{jobData.name}</span>
          </nav>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{jobData.name}</h1>
                {/* Status Dropdown */}
                <div className="relative" data-status-dropdown>
                  <button
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusConfig(jobData.status).bgColor} ${getStatusConfig(jobData.status).textColor} hover:opacity-90 transition-opacity`}
                  >
                    {getStatusConfig(jobData.status).label}
                    <ChevronDownIcon className="h-4 w-4 ml-1.5" />
                  </button>
                  {statusDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1" data-status-dropdown>
                      {statusOptions.map((option) => {
                        const currentStatus = getCurrentStatus()
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleStatusChange(option.value)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center ${
                              currentStatus === option.value ? 'bg-gray-50' : ''
                            }`}
                          >
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${option.bgColor}`} />
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {jobData.jobNumber} • {jobData.client.name}
              </p>

              {/* Key Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                {/* Location */}
                {(jobData.location?.city || jobData.location?.province || jobData.location?.address) && (
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 mb-0.5">Location</dt>
                      <dd className="text-sm text-gray-900">
                        {[jobData.location?.city, jobData.location?.province].filter(Boolean).join(', ') || jobData.location?.address || 'Not specified'}
                      </dd>
                    </div>
                  </div>
                )}

                {/* Dates - Planned vs Actual */}
                <div className="space-y-2">
                  <dt className="text-xs font-medium text-gray-500">Timeline</dt>
                  <dd className="space-y-1.5">
                    {/* Start Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-16">Start:</span>
                      <div className="flex-1">
                        <span className="text-gray-700">
                          {jobData.plannedStartDate 
                            ? new Date(jobData.plannedStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : jobData.startDate 
                              ? new Date(jobData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Not set'}
                        </span>
                        {jobData.actualStartDate && (
                          <span className="ml-2 text-gray-500 text-xs">
                            (Actual: {new Date(jobData.actualStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                          </span>
                        )}
                      </div>
                    </div>
                    {/* End Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-16">End:</span>
                      <div className="flex-1">
                        <span className="text-gray-700">
                          {jobData.plannedEndDate 
                            ? new Date(jobData.plannedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : jobData.endDate 
                              ? new Date(jobData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Not set'}
                        </span>
                        {jobData.actualEndDate && (
                          <span className="ml-2 text-gray-500 text-xs">
                            (Actual: {new Date(jobData.actualEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                          </span>
                        )}
                      </div>
                    </div>
                  </dd>
                </div>

                {/* Team Members */}
                <div className="space-y-2">
                  <dt className="text-xs font-medium text-gray-500">Team</dt>
                  <dd className="space-y-1.5">
                    {/* Project Manager */}
                    {jobData.jobManager && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 w-20">PM:</span>
                        <span className="text-gray-900">{jobData.jobManager?.name || 'Not assigned'}</span>
                      </div>
                    )}
                    {/* Estimator */}
                    {jobData.estimator && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 w-20">Estimator:</span>
                        <span className="text-gray-900">{jobData.estimator?.name || 'Not assigned'}</span>
                      </div>
                    )}
                    {/* Customer Contact */}
                    {jobData.client?.contact && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 w-20">Contact:</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-900">{jobData.client.contact}</span>
                          {jobData.client?.email && (
                            <a 
                              href={`mailto:${jobData.client.email}`}
                              className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {jobData.client.email}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </dd>
                </div>
              </div>

              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Progress with actual data */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <dt className="text-xs font-medium text-gray-500 mb-1.5">Progress</dt>
                  <dd className="mt-1">
                    <div className="flex items-center mb-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all" 
                          style={{ width: `${Math.min(100, Math.max(0, financialMetrics?.progressPercent || jobData.overallProgress || 0))}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {formatPercent(financialMetrics?.progressPercent || jobData.overallProgress || 0)}
                      </span>
                    </div>
                    {financialMetrics?.latestPR && (
                      <p className="text-xs text-gray-500">
                        Report #{financialMetrics.latestPR.reportNumber}
                      </p>
                    )}
                  </dd>
                </div>

                {/* CPI Indicator */}
                {financialMetrics?.cpi > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <dt className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                      CPI
                      {React.createElement(getCPIStatus(financialMetrics.cpi).icon, {
                        className: `h-3 w-3 ${
                          getCPIStatus(financialMetrics.cpi).color === 'green' ? 'text-green-500' :
                          getCPIStatus(financialMetrics.cpi).color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                        }`
                      })}
                    </dt>
                    <dd className="mt-1">
                      <span className={`text-lg font-bold ${
                        getCPIStatus(financialMetrics.cpi).color === 'green' ? 'text-green-600' :
                        getCPIStatus(financialMetrics.cpi).color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {financialMetrics.cpi.toFixed(2)}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {getCPIStatus(financialMetrics.cpi).label}
                      </p>
                    </dd>
                  </div>
                )}

                {/* Budget Utilization */}
                {financialMetrics?.totalBudget > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <dt className="text-xs font-medium text-gray-500 mb-1.5">Budget</dt>
                    <dd className="mt-1">
                      <div className="flex items-center mb-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`h-2.5 rounded-full transition-all ${
                              getBudgetStatus(financialMetrics.budgetUtilization).color === 'green' ? 'bg-green-500' :
                              getBudgetStatus(financialMetrics.budgetUtilization).color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, financialMetrics.budgetUtilization))}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {formatPercent(financialMetrics.budgetUtilization)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(financialMetrics.totalSpent)} / {formatCurrency(financialMetrics.totalBudget)}
                      </p>
                    </dd>
                  </div>
                )}

                {/* Contract Value */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <dt className="text-xs font-medium text-gray-500 mb-1.5">Contract Value</dt>
                  <dd className="mt-1">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(financialMetrics?.contractValue || financialMetrics?.totalBudget || jobData?.contractValue || 0)}
                    </span>
                    {financialMetrics?.totalBudget > 0 ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Calculated from SOV
                      </p>
                    ) : jobData?.contractValue ? (
                      <p className="text-xs text-gray-400 mt-0.5 italic">
                        From job record (no SOV data)
                      </p>
                    ) : null}
                  </dd>
                </div>
              </div>
            </div>

            <div className="ml-4">
              <Link
                to="/jobs"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Jobs
              </Link>
            </div>
          </div>
        </div>

        {/* Job Menu - Categorized Navigation */}
        <div className="border-t border-gray-200 bg-gray-50">
          <nav className="px-6" aria-label="Job sections">
            <div className="flex flex-wrap items-end gap-x-1">
              {menuCategories.map((category) => {
                const CategoryIcon = category.icon
                const isCategoryActive = activeCategory === category.id
                // Operations should always show as dropdown, not inline
                const showInline = category.items.length <= 2 && category.id !== 'operations'
                const isExpanded = expandedCategories[category.id] || showInline
                
                return (
                  <div key={category.id} className="relative">
                    {showInline ? (
                      // Inline display for categories with 2 or fewer items
                      <div className="flex items-center">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon
                          const isItemActive = activeTab === item.id
                          
                          return (
                            <Link
                              key={item.id}
                              to={item.path}
                              className={`${
                                isItemActive
                                  ? 'border-blue-500 text-blue-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              } whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm flex items-center group transition-colors`}
                              title={item.description}
                            >
                              <ItemIcon className="h-5 w-5 mr-2" />
                              {item.name}
                            </Link>
                          )
                        })}
                      </div>
                    ) : (
                      // Dropdown display for categories with more items
                      <>
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className={`category-button ${
                            isCategoryActive
                              ? 'text-blue-600 border-blue-500'
                              : 'text-gray-700 border-transparent hover:text-gray-900 hover:border-gray-300'
                          } whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm flex items-center group transition-colors`}
                        >
                          <CategoryIcon className="h-5 w-5 mr-2" />
                          <span>{category.name}</span>
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 ml-2" />
                          )}
                        </button>

                        {/* Category Dropdown Menu */}
                        {isExpanded && (
                          <div className="category-dropdown absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-2">
                            {category.items.map((item) => {
                              const ItemIcon = item.icon
                              const isItemActive = activeTab === item.id
                              
                              return (
                                <Link
                                  key={item.id}
                                  to={item.path}
                                  className={`${
                                    isItemActive
                                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500'
                                      : 'text-gray-700 hover:bg-gray-50'
                                  } flex items-center px-4 py-2 text-sm transition-colors`}
                                  title={item.description}
                                  onClick={() => {
                                    // Close dropdown after selection on mobile
                                    if (window.innerWidth < 768) {
                                      setExpandedCategories(prev => ({
                                        ...prev,
                                        [category.id]: false
                                      }))
                                    }
                                  }}
                                >
                                  <ItemIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                                  <span className="flex-1">{item.name}</span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
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
