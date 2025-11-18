import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ScaleIcon,
  MapPinIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart } from 'recharts'

export default function JobList() {
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/api/jobs').then(res => res.data.data)
  })

  const [financialMetrics, setFinancialMetrics] = useState({})
  const [viewMode, setViewMode] = useState('card') // 'card' or 'table'

  // Fetch financial metrics for all jobs
  useEffect(() => {
    if (!jobs || jobs.length === 0) return

    const fetchAllMetrics = async () => {
      const metricsPromises = jobs.map(async (job) => {
        try {
          const [
            earnedVsBurnedResponse,
            progressReportsResponse,
            sovResponse,
            timelogResponse,
            apRegisterResponse
          ] = await Promise.all([
            api.get(`/api/financial/${job._id}/earned-vs-burned`).catch(() => ({ data: { totals: {} } })),
            api.get(`/api/financial/${job._id}/progress-reports`).catch(() => ({ data: { data: [] } })),
            api.get(`/api/jobs/${job._id}/sov-components`).catch(() => ({ data: { data: { summary: {} } } })),
            api.get(`/api/financial/${job._id}/timelog-register`).catch(() => ({ data: { data: [], meta: {} } })),
            api.get(`/api/financial/${job._id}/ap-register`).catch(() => ({ data: { data: [] } }))
          ])

          const evm = earnedVsBurnedResponse.data?.totals || {}
          const progressReports = progressReportsResponse.data?.data || []
          const approvedPRs = progressReports.filter(pr => pr.status === 'approved')
          const latestPR = approvedPRs.length > 0 ? approvedPRs[0] : null
          const sovSummary = sovResponse.data?.data?.summary || {}
          const timelogEntries = timelogResponse.data?.data || []
          const timelogMeta = timelogResponse.data?.meta || {}
          const apEntries = apRegisterResponse.data?.data || []

          const totalBudget = sovSummary.totalValue || 0
          const totalSpent = evm.actualCost || 0
          const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
          const cpi = evm.cpi || 0
          const progressPercent = latestPR?.summary?.calculatedPercentCTD || job.overallProgress || 0
          const contractValue = totalBudget > 0 ? totalBudget : (job.contractValue || 0)
          const costVariance = evm.costVariance || 0

          // Calculate additional metrics
          const totalHours = timelogMeta.totalHours || timelogEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0)
          const safetyIncidents = timelogEntries.reduce((sum, entry) => sum + (entry.safetyIncidents?.length || 0), 0)
          const progressReportsCount = progressReports.length

          // Build labor distribution curve (hours by month) - shows S-curve pattern
          const laborDistribution = []
          const monthlyHours = {}
          const jobStart = job.plannedStartDate ? new Date(job.plannedStartDate) : (job.startDate ? new Date(job.startDate) : new Date())
          const jobEnd = job.plannedEndDate ? new Date(job.plannedEndDate) : (job.endDate ? new Date(job.endDate) : new Date())
          
          // Group timelog entries by month
          timelogEntries.forEach(entry => {
            if (!entry.workDate) return
            const workDate = new Date(entry.workDate)
            const monthKey = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}`
            
            if (!monthlyHours[monthKey]) {
              monthlyHours[monthKey] = { hours: 0, date: new Date(workDate.getFullYear(), workDate.getMonth(), 1) }
            }
            monthlyHours[monthKey].hours += entry.totalHours || 0
          })
          
          // Build monthly data for last 6 months or job duration (whichever is shorter)
          // Use jobEnd (or now if job hasn't ended) as the reference point
          const now = new Date()
          const referenceDate = jobEnd > now ? now : jobEnd
          const jobDurationMonths = Math.ceil((referenceDate - jobStart) / (1000 * 60 * 60 * 24 * 30))
          const monthsToShow = Math.min(6, Math.max(1, jobDurationMonths))
          
          for (let i = monthsToShow - 1; i >= 0; i--) {
            const monthDate = new Date(referenceDate)
            monthDate.setMonth(monthDate.getMonth() - i)
            monthDate.setDate(1)
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
            
            laborDistribution.push({
              month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
              hours: monthlyHours[monthKey]?.hours || 0
            })
          }

          // Build monthly cost chart (costs by month) - Labor + Materials
          const monthlyCosts = []
          const monthlyCostData = {}
          
          // Add timelog (labor) costs by month
          timelogEntries.forEach(entry => {
            if (!entry.workDate) return
            const workDate = new Date(entry.workDate)
            const monthKey = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}`
            
            if (!monthlyCostData[monthKey]) {
              monthlyCostData[monthKey] = { labor: 0, materials: 0, date: new Date(workDate.getFullYear(), workDate.getMonth(), 1) }
            }
            monthlyCostData[monthKey].labor += entry.totalCostWithBurden || entry.totalCost || 0
          })
          
          // Add AP (materials) costs by month
          apEntries.forEach(entry => {
            if (!entry.invoiceDate) return
            const invoiceDate = new Date(entry.invoiceDate)
            const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`
            
            if (!monthlyCostData[monthKey]) {
              monthlyCostData[monthKey] = { labor: 0, materials: 0, date: new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 1) }
            }
            monthlyCostData[monthKey].materials += entry.totalAmount || 0
          })
          
          // Build monthly cost data for same period
          // Use same referenceDate and monthsToShow as labor distribution
          for (let i = monthsToShow - 1; i >= 0; i--) {
            const monthDate = new Date(referenceDate)
            monthDate.setMonth(monthDate.getMonth() - i)
            monthDate.setDate(1)
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
            const monthData = monthlyCostData[monthKey] || { labor: 0, materials: 0 }
            
            monthlyCosts.push({
              month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
              labor: monthData.labor,
              materials: monthData.materials,
              total: monthData.labor + monthData.materials
            })
          }
          
          // Calculate trends for indicators
          const laborTrend = laborDistribution.length >= 2 
            ? (laborDistribution[laborDistribution.length - 1].hours - laborDistribution[laborDistribution.length - 2].hours)
            : 0
          const costTrend = monthlyCosts.length >= 2
            ? (monthlyCosts[monthlyCosts.length - 1].total - monthlyCosts[monthlyCosts.length - 2].total)
            : 0
          
          // Determine if trends are good or bad
          // For labor: Increasing is good (more work happening), but decreasing before 90% complete is concerning
          // For cost: Increasing cost >20% month-over-month is high risk
          const laborTrendStatus = laborTrend > 0 ? 'increasing' : laborTrend < 0 ? 'decreasing' : 'stable'
          const prevMonthCost = monthlyCosts.length >= 2 ? monthlyCosts[monthlyCosts.length - 2].total : 0
          const costTrendStatus = costTrend > 0 && prevMonthCost > 0 ? 
            (costTrend / prevMonthCost > 0.2 ? 'high' : 'normal') : 'normal'

          return {
            jobId: job._id,
            cpi,
            budgetUtilization,
            totalBudget,
            totalSpent,
            progressPercent,
            latestPR,
            contractValue,
            costVariance,
            totalHours,
            safetyIncidents,
            progressReportsCount,
            laborDistribution,
            monthlyCosts,
            laborTrend,
            costTrend,
            laborTrendStatus,
            costTrendStatus
          }
        } catch (error) {
          console.error(`Error fetching metrics for job ${job._id}:`, error)
          return {
            jobId: job._id,
            cpi: 0,
            budgetUtilization: 0,
            totalBudget: 0,
            totalSpent: 0,
            progressPercent: job.overallProgress || 0,
            latestPR: null,
            contractValue: job.contractValue || 0,
            costVariance: 0,
            totalHours: 0,
            safetyIncidents: 0,
            progressReportsCount: 0,
            laborDistribution: [],
            monthlyCosts: [],
            laborTrend: 0,
            costTrend: 0,
            laborTrendStatus: 'stable',
            costTrendStatus: 'normal'
          }
        }
      })

      const results = await Promise.all(metricsPromises)
      const metricsMap = {}
      results.forEach(result => {
        metricsMap[result.jobId] = result
      })
      setFinancialMetrics(metricsMap)
    }

    fetchAllMetrics()
  }, [jobs])

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
    if (amount === null || amount === undefined || isNaN(amount)) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
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

  // Calculate overall job health and priority
  const getJobHealth = (metrics, job) => {
    const issues = []
    let priority = 'low'
    let healthStatus = 'good'
    
    // CPI issues
    if (metrics.cpi > 0 && metrics.cpi < 0.9) {
      issues.push({
        type: 'financial',
        severity: 'critical',
        message: `CPI ${metrics.cpi.toFixed(2)} - Spending more than earning`,
        action: 'Review costs and productivity immediately'
      })
      priority = 'critical'
      healthStatus = 'critical'
    } else if (metrics.cpi > 0 && metrics.cpi < 1.0) {
      issues.push({
        type: 'financial',
        severity: 'warning',
        message: `CPI ${metrics.cpi.toFixed(2)} - At risk of going over budget`,
        action: 'Monitor costs closely'
      })
      if (priority !== 'critical') priority = 'high'
      if (healthStatus === 'good') healthStatus = 'at-risk'
    }
    
    // Budget utilization issues
    if (metrics.budgetUtilization > 90 && metrics.progressPercent < 90) {
      issues.push({
        type: 'financial',
        severity: 'critical',
        message: `${formatPercent(metrics.budgetUtilization)} budget spent but only ${formatPercent(metrics.progressPercent)} complete`,
        action: 'Budget running out faster than work completion'
      })
      if (priority !== 'critical') priority = 'critical'
      if (healthStatus !== 'critical') healthStatus = 'critical'
    } else if (metrics.budgetUtilization > 75 && metrics.progressPercent < 75) {
      issues.push({
        type: 'financial',
        severity: 'warning',
        message: 'Spending ahead of progress',
        action: 'Review cost efficiency'
      })
      if (priority === 'low') priority = 'high'
      if (healthStatus === 'good') healthStatus = 'at-risk'
    }
    
    // Safety issues
    if (metrics.safetyIncidents > 0) {
      issues.push({
        type: 'safety',
        severity: 'critical',
        message: `${metrics.safetyIncidents} safety incident${metrics.safetyIncidents > 1 ? 's' : ''} reported`,
        action: 'Review safety protocols immediately'
      })
      if (priority === 'low') priority = 'high'
      if (healthStatus === 'good') healthStatus = 'at-risk'
    }
    
    // Labor trend issues
    if (metrics.laborTrendStatus === 'decreasing' && metrics.progressPercent < 90) {
      issues.push({
        type: 'operations',
        severity: 'warning',
        message: 'Labor hours decreasing before job completion',
        action: 'Check if work is slowing down or behind schedule'
      })
      if (priority === 'low') priority = 'medium'
      if (healthStatus === 'good') healthStatus = 'at-risk'
    }
    
    // Cost trend issues
    if (metrics.costTrendStatus === 'high') {
      issues.push({
        type: 'financial',
        severity: 'warning',
        message: 'Monthly costs increased >20%',
        action: 'Investigate cost drivers'
      })
      if (priority === 'low') priority = 'high'
      if (healthStatus === 'good') healthStatus = 'at-risk'
    }
    
    return {
      healthStatus, // 'good', 'at-risk', 'critical'
      priority, // 'low', 'medium', 'high', 'critical'
      issues,
      isHealthy: healthStatus === 'good' && issues.length === 0
    }
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
        {/* View Toggle */}
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <span className="text-sm text-gray-500 mr-2">View:</span>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'card'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Squares2X2Icon className="h-4 w-4" />
                <span>Cards</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <TableCellsIcon className="h-4 w-4" />
                <span>Table</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Job List - Card or Table View */}
      {jobs && jobs.length > 0 ? (
        viewMode === 'card' ? (
          <div className="space-y-3">
            {jobs.map((job) => {
            const metrics = financialMetrics[job._id] || {}
            const cpiStatus = metrics.cpi > 0 ? getCPIStatus(metrics.cpi) : null
            const budgetStatus = metrics.budgetUtilization > 0 ? getBudgetStatus(metrics.budgetUtilization) : null
            const progressPercent = metrics.progressPercent || job.overallProgress || 0
            const jobHealth = getJobHealth(metrics, job)
            
            // Determine border color based on health
            const borderColor = jobHealth.healthStatus === 'critical' ? 'border-red-500' :
                               jobHealth.healthStatus === 'at-risk' ? 'border-yellow-500' :
                               'border-green-500'
            
            return (
              <Link
                key={job._id}
                to={`/jobs/${job._id}`}
                className={`card p-4 hover:shadow-lg hover:border-blue-400 transition-all duration-200 block border-l-4 ${borderColor} relative cursor-pointer group`}
              >
                {/* Job Health Badge */}
                {jobHealth.healthStatus !== 'good' && (
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold ${
                    jobHealth.healthStatus === 'critical' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {jobHealth.healthStatus === 'critical' ? '⚠️ CRITICAL' : '⚠️ AT RISK'}
                  </div>
                )}
                
                {jobHealth.isHealthy && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    ✓ HEALTHY
                  </div>
                )}
                {/* Job Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {job.name}
                        </h3>
                        <span className={`badge ${getStatusColor(job.status)} flex-shrink-0 text-xs`}>
                          {job.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600">
                        #{job.jobNumber} • {job.client?.name}
                        {(job.location?.city || job.location?.province) && (
                          <span className="ml-2">• {[job.location?.city, job.location?.province].filter(Boolean).join(', ')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Critical Issues Alert */}
                {jobHealth.issues.length > 0 && (
                  <div className={`mb-3 p-2 rounded-lg border-l-4 ${
                    jobHealth.healthStatus === 'critical' ? 'bg-red-50 border-red-500' :
                    'bg-yellow-50 border-yellow-500'
                  }`}>
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${
                        jobHealth.healthStatus === 'critical' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 mb-0.5">
                          {jobHealth.healthStatus === 'critical' ? 'Critical Issues' : 'Attention Needed'}
                        </div>
                        {jobHealth.issues.slice(0, 1).map((issue, idx) => (
                          <div key={idx} className="text-xs text-gray-700">
                            <span className="font-medium">• {issue.message}</span>
                          </div>
                        ))}
                        {jobHealth.issues.length > 1 && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            +{jobHealth.issues.length - 1} more issue{jobHealth.issues.length - 1 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* KPI Metrics Grid - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {/* Progress */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <dt className="text-xs font-medium text-gray-500 mb-1.5">Progress</dt>
                    <dd className="mt-1">
                      <div className="flex items-center mb-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {formatPercent(progressPercent)}
                        </span>
                      </div>
                      {metrics.latestPR && (
                        <p className="text-xs text-gray-500 truncate">
                          PR #{metrics.latestPR.reportNumber}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {progressPercent >= 90 ? '✓ Nearly complete' : progressPercent >= 50 ? '→ On track' : '→ Early stage'}
                      </p>
                    </dd>
                  </div>

                  {/* CPI Indicator */}
                  {cpiStatus && metrics.cpi > 0 ? (
                    <div className={`bg-gray-50 rounded-lg p-3 border-2 ${
                      cpiStatus.color === 'green' ? 'border-green-300' :
                      cpiStatus.color === 'yellow' ? 'border-yellow-300' : 'border-red-300'
                    }`}>
                      <dt className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                        CPI (Cost Performance)
                        {React.createElement(cpiStatus.icon, {
                          className: `h-3 w-3 ${
                            cpiStatus.color === 'green' ? 'text-green-500' :
                            cpiStatus.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                          }`
                        })}
                      </dt>
                      <dd className="mt-1">
                        <span className={`text-lg font-bold ${
                          cpiStatus.color === 'green' ? 'text-green-600' :
                          cpiStatus.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {metrics.cpi.toFixed(2)}
                        </span>
                        <p className="text-xs font-medium mt-0.5">
                          {cpiStatus.color === 'green' ? '✓ On budget - earning ≥ spending' :
                           cpiStatus.color === 'yellow' ? '⚠ At risk - spending slightly more than earning' :
                           '✗ Over budget - spending more than earning'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {metrics.cpi >= 1.0 ? 'Good' : metrics.cpi >= 0.9 ? 'Watch costs' : 'Take action'}
                        </p>
                      </dd>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <dt className="text-xs font-medium text-gray-500 mb-1.5">CPI</dt>
                      <dd className="mt-1">
                        <span className="text-lg font-bold text-gray-400">N/A</span>
                        <p className="text-xs text-gray-400 mt-0.5">No progress data</p>
                      </dd>
                    </div>
                  )}

                  {/* Budget Utilization */}
                  {budgetStatus && metrics.totalBudget > 0 ? (
                    <div className={`bg-gray-50 rounded-lg p-3 border-2 ${
                      budgetStatus.color === 'green' ? 'border-green-300' :
                      budgetStatus.color === 'yellow' ? 'border-yellow-300' : 'border-red-300'
                    }`}>
                      <dt className="text-xs font-medium text-gray-500 mb-1.5">Budget Used</dt>
                      <dd className="mt-1">
                        <div className="flex items-center mb-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                budgetStatus.color === 'green' ? 'bg-green-500' :
                                budgetStatus.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, metrics.budgetUtilization))}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {formatPercent(metrics.budgetUtilization)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {formatCurrency(metrics.totalSpent)} / {formatCurrency(metrics.totalBudget)}
                        </p>
                        <p className="text-xs font-medium mt-0.5">
                          {budgetStatus.color === 'green' ? '✓ Healthy spending' :
                           budgetStatus.color === 'yellow' ? '⚠ Monitor closely' :
                           '✗ Critical - budget nearly exhausted'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatCurrency(metrics.totalBudget - metrics.totalSpent)} remaining
                        </p>
                      </dd>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <dt className="text-xs font-medium text-gray-500 mb-1.5">Budget</dt>
                      <dd className="mt-1">
                        <span className="text-sm font-bold text-gray-400">N/A</span>
                        <p className="text-xs text-gray-400 mt-0.5">No SOV data</p>
                      </dd>
                    </div>
                  )}

                  {/* Contract Value */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <dt className="text-xs font-medium text-gray-500 mb-1.5">Contract Value</dt>
                    <dd className="mt-1">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(metrics.contractValue || job.contractValue || 0)}
                      </span>
                      {metrics.totalBudget > 0 ? (
                        <p className="text-xs text-gray-500 mt-0.5">
                          From SOV
                        </p>
                      ) : job.contractValue ? (
                        <p className="text-xs text-gray-400 mt-0.5 italic">
                          Job record
                        </p>
                      ) : null}
                    </dd>
                  </div>
                </div>

                {/* Additional Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 pt-2 border-t border-gray-200">
                  {/* Hours Logged */}
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {metrics.totalHours ? metrics.totalHours.toFixed(0) : '0'}
                      </div>
                      <div className="text-xs text-gray-500">Hours</div>
                    </div>
                  </div>

                  {/* Safety Incidents */}
                  <div className="flex items-center space-x-2">
                    <ShieldExclamationIcon className={`h-4 w-4 flex-shrink-0 ${
                      metrics.safetyIncidents > 0 ? 'text-red-500' : 'text-gray-400'
                    }`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${
                        metrics.safetyIncidents > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {metrics.safetyIncidents || 0}
                      </div>
                      <div className="text-xs text-gray-500">Safety</div>
                    </div>
                  </div>

                  {/* Forms Submitted (Progress Reports) */}
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {metrics.progressReportsCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">Reports</div>
                    </div>
                  </div>

                  {/* Cost Variance Indicator */}
                  <div className="flex items-center space-x-2">
                    <ScaleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      {metrics.costVariance !== undefined && metrics.costVariance !== 0 ? (
                        <>
                          <div className={`text-sm font-medium ${
                            metrics.costVariance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {metrics.costVariance >= 0 ? '✓' : '⚠'} {formatCurrency(Math.abs(metrics.costVariance))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {metrics.costVariance >= 0 ? 'Under' : 'Over'} budget
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-gray-400">N/A</div>
                          <div className="text-xs text-gray-400">No variance</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mini Charts Row - Hidden in compact card view */}
                {false && (metrics.laborDistribution?.length > 0 || metrics.monthlyCosts?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    {/* Labor Distribution Curve */}
                    {metrics.laborDistribution?.length > 0 && metrics.laborDistribution.some(d => d.hours > 0) && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-gray-700">Labor Hours by Month</div>
                          {metrics.laborTrendStatus === 'increasing' && (
                            <div className="flex items-center text-xs text-green-600">
                              <ArrowUpIcon className="h-3 w-3 mr-1" />
                              <span>Good</span>
                            </div>
                          )}
                          {metrics.laborTrendStatus === 'decreasing' && metrics.progressPercent < 90 && (
                            <div className="flex items-center text-xs text-yellow-600">
                              <ArrowDownIcon className="h-3 w-3 mr-1" />
                              <span>Watch</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>So what?</strong> Shows if labor is distributed properly. 
                          {metrics.laborTrendStatus === 'increasing' ? ' ✓ Good - hours increasing as work progresses' :
                           metrics.laborTrendStatus === 'decreasing' && metrics.progressPercent < 90 ? ' ⚠ Bad - hours dropping before completion (may indicate delays)' :
                           ' → Stable'}
                        </div>
                        <ResponsiveContainer width="100%" height={100}>
                          <AreaChart data={metrics.laborDistribution}>
                            <defs>
                              <linearGradient id={`laborGradient-${job._id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area 
                              type="monotone" 
                              dataKey="hours" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              fill={`url(#laborGradient-${job._id})`}
                              dot={{ r: 3, fill: '#3b82f6' }}
                            />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis hide />
                            <Tooltip 
                              formatter={(value) => `${value.toFixed(0)} hrs`}
                              contentStyle={{ fontSize: '12px', padding: '4px 8px', backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Monthly Cost Chart */}
                    {metrics.monthlyCosts?.length > 0 && metrics.monthlyCosts.some(d => d.total > 0) && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-gray-700">Monthly Costs</div>
                          {metrics.costTrendStatus === 'high' && (
                            <div className="flex items-center text-xs text-red-600">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              <span>High</span>
                            </div>
                          )}
                          {metrics.costTrendStatus === 'normal' && (
                            <div className="flex items-center text-xs text-green-600">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              <span>OK</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>So what?</strong> Labor (blue) + Materials (orange). 
                          {metrics.costTrendStatus === 'high' ? ' ⚠ Bad - costs spiking (>20% increase). Investigate why.' :
                           ' ✓ Good - costs stable or increasing gradually with progress'}
                        </div>
                        <ResponsiveContainer width="100%" height={100}>
                          <ComposedChart data={metrics.monthlyCosts}>
                            <defs>
                              <linearGradient id={`costGradient-${job._id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Bar dataKey="labor" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="materials" stackId="a" fill="#f97316" radius={[2, 2, 0, 0]} />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis hide />
                            <Tooltip 
                              formatter={(value, name) => [
                                formatCurrency(value),
                                name === 'labor' ? 'Labor' : 'Materials'
                              ]}
                              contentStyle={{ fontSize: '12px', padding: '4px 8px', backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Info Row */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(job.endDate), { addSuffix: true })}</span>
                    </div>
                    {job.jobManager && (
                      <div className="flex items-center space-x-1">
                        <UserGroupIcon className="h-3 w-3" />
                        <span>{job.jobManager.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-blue-600 group-hover:text-blue-700 font-medium">
                    <span className="text-sm">View Details</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        ) : (
          /* Table View */
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPI
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget Used
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contract Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Health
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job) => {
                    const metrics = financialMetrics[job._id] || {}
                    const cpiStatus = metrics.cpi > 0 ? getCPIStatus(metrics.cpi) : null
                    const budgetStatus = metrics.budgetUtilization > 0 ? getBudgetStatus(metrics.budgetUtilization) : null
                    const progressPercent = metrics.progressPercent || job.overallProgress || 0
                    const jobHealth = getJobHealth(metrics, job)
                    
                    return (
                      <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link 
                            to={`/jobs/${job._id}`}
                            className="group flex items-center space-x-3 cursor-pointer"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                {job.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                #{job.jobNumber} • {job.client?.name}
                              </div>
                              {job.location?.city && (
                                <div className="text-xs text-gray-400 flex items-center space-x-1 mt-0.5">
                                  <MapPinIcon className="h-3 w-3" />
                                  <span>{[job.location?.city, job.location?.province].filter(Boolean).join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${getStatusColor(job.status)}`}>
                            {job.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all" 
                                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {formatPercent(progressPercent)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cpiStatus && metrics.cpi > 0 ? (
                            <div className="flex items-center space-x-2">
                              {React.createElement(cpiStatus.icon, {
                                className: `h-4 w-4 ${
                                  cpiStatus.color === 'green' ? 'text-green-500' :
                                  cpiStatus.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                                }`
                              })}
                              <span className={`text-sm font-semibold ${
                                cpiStatus.color === 'green' ? 'text-green-600' :
                                cpiStatus.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {metrics.cpi.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {budgetStatus && metrics.totalBudget > 0 ? (
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${
                                      budgetStatus.color === 'green' ? 'bg-green-500' :
                                      budgetStatus.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, metrics.budgetUtilization))}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {formatPercent(metrics.budgetUtilization)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatCurrency(metrics.totalSpent)} / {formatCurrency(metrics.totalBudget)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(metrics.contractValue || job.contractValue || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`px-2 py-1 rounded-full text-xs font-bold inline-block ${
                            jobHealth.healthStatus === 'critical' ? 'bg-red-100 text-red-800' :
                            jobHealth.healthStatus === 'at-risk' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {jobHealth.healthStatus === 'critical' ? '⚠️ Critical' :
                             jobHealth.healthStatus === 'at-risk' ? '⚠️ At Risk' :
                             '✓ Healthy'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            to={`/jobs/${job._id}`}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1 group"
                          >
                            <span>View</span>
                            <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
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
