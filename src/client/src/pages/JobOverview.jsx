import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import {
  WrenchScrewdriverIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ScaleIcon,
  BanknotesIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

const JobOverview = () => {
  const { jobId } = useParams()
  const [dashboardData, setDashboardData] = useState(null)
  const [financialData, setFinancialData] = useState(null)
  const [workforceData, setWorkforceData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobId) {
      fetchDashboardData()
    }
  }, [jobId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all dashboard data including financial metrics
      const [
        tasksResponse,
        sovResponse,
        timeEntriesResponse,
        earnedVsBurnedResponse,
        apRegisterResponse,
        timelogResponse,
        progressReportsResponse,
        costToCompleteResponse
      ] = await Promise.all([
        api.get(`/api/jobs/${jobId}/tasks-enhanced`),
        api.get(`/api/jobs/${jobId}/sov-components`),
        api.get('/api/time-entries', { params: { jobId } }),
        api.get(`/api/financial/${jobId}/earned-vs-burned`).catch(() => ({ data: { totals: {}, meta: {} } })),
        api.get(`/api/financial/${jobId}/ap-register`).catch(() => ({ data: { meta: {}, summary: [] } })),
        api.get(`/api/financial/${jobId}/timelog-register`).catch(() => ({ data: { meta: {}, summary: [] } })),
        api.get(`/api/financial/${jobId}/progress-reports?status=approved`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/financial/${jobId}/cost-to-complete/forecasts`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/jobs/${jobId}`).catch(() => ({ data: { data: null } }))
      ])

      setDashboardData({
        tasks: tasksResponse.data,
        sov: sovResponse.data.data,
        timeEntries: timeEntriesResponse.data.data.timeEntries || []
      })

      // Extract financial metrics
      const evmTotals = earnedVsBurnedResponse.data?.totals || {}
      const apMeta = apRegisterResponse.data?.meta || {}
      const timelogMeta = timelogResponse.data?.meta || {}
      const progressReports = progressReportsResponse.data?.data || []
      const latestProgressReport = progressReports.length > 0 ? progressReports[0] : null
      const forecasts = costToCompleteResponse.data?.data || []
      const latestForecast = forecasts
        .filter(f => f.status !== 'archived' && f.summary && Object.keys(f.summary).length > 0)
        .sort((a, b) => (b.monthNumber || 0) - (a.monthNumber || 0))[0]

      setFinancialData({
        evm: evmTotals,
        ap: apMeta,
        timelog: timelogMeta,
        latestProgressReport,
        latestForecast: latestForecast?.summary || null,
        forecasts: forecasts
      })

      // Fetch workforce/labor curve data
      const jobInfo = (await api.get(`/api/jobs/${jobId}`).catch(() => ({ data: { data: null } }))).data.data
      if (jobInfo) {
        await fetchWorkforceData(jobInfo)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkforceData = async (jobInfo) => {
    try {
      // Get all timelog entries for this job
      const timelogResponse = await api.get(`/api/financial/${jobId}/timelog-register`)
      const timelogEntries = timelogResponse.data.data || []

      // Get SOV items to calculate planned hours
      const sovResponse = await api.get(`/api/jobs/${jobId}/sov-components`)
      const sovItems = sovResponse.data.data?.lineItems || []

      // Calculate job duration in weeks
      const jobStart = new Date(jobInfo.startDate)
      const jobEnd = new Date(jobInfo.endDate)
      const jobDurationWeeks = Math.ceil((jobEnd - jobStart) / (1000 * 60 * 60 * 24 * 7))
      
      // Group timelog entries by week and cost code
      const laborByWeek = new Map()
      const costCodeTotals = new Map()

      timelogEntries.forEach(entry => {
        if (!entry.workDate) return
        
        const workDate = new Date(entry.workDate)
        const weekStart = new Date(workDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0)
        
        const weekKey = weekStart.toISOString().split('T')[0]
        const costCode = entry.costCode || 'UNKNOWN'
        
        if (!laborByWeek.has(weekKey)) {
          laborByWeek.set(weekKey, new Map())
        }
        
        const weekData = laborByWeek.get(weekKey)
        if (!weekData.has(costCode)) {
          weekData.set(costCode, { hours: 0, cost: 0, entries: 0 })
        }
        
        const costCodeData = weekData.get(costCode)
        costCodeData.hours += entry.totalHours || 0
        costCodeData.cost += entry.totalCostWithBurden || entry.totalCost || 0
        costCodeData.entries += 1

        // Track totals by cost code
        if (!costCodeTotals.has(costCode)) {
          costCodeTotals.set(costCode, {
            totalHours: 0,
            totalCost: 0,
            name: entry.costCodeName || costCode
          })
        }
        const total = costCodeTotals.get(costCode)
        total.totalHours += entry.totalHours || 0
        total.totalCost += entry.totalCostWithBurden || entry.totalCost || 0
      })

      // Calculate planned labor curve (S-curve distribution)
      // Typical S-curve: slow start, ramp up, peak, slow finish
      const plannedCurve = []
      for (let week = 0; week < jobDurationWeeks; week++) {
        const progress = week / jobDurationWeeks
        // S-curve formula: 3x^2 - 2x^3 (normalized S-curve)
        const sCurveFactor = 3 * progress * progress - 2 * progress * progress * progress
        plannedCurve.push({
          week: week + 1,
          weekStart: new Date(jobStart.getTime() + week * 7 * 24 * 60 * 60 * 1000),
          sCurveFactor
        })
      }

      // Build chart data - aggregate by week
      const chartData = []
      const sortedWeeks = Array.from(laborByWeek.keys()).sort()
      
      // Get top cost codes by total hours
      const topCostCodes = Array.from(costCodeTotals.entries())
        .sort((a, b) => b[1].totalHours - a[1].totalHours)
        .slice(0, 5) // Top 5 cost codes
        .map(([code]) => code)

      sortedWeeks.forEach((weekKey, index) => {
        const weekData = laborByWeek.get(weekKey)
        const weekDate = new Date(weekKey)
        const weekNumber = Math.floor((weekDate - jobStart) / (1000 * 60 * 60 * 24 * 7)) + 1
        const progress = weekNumber / jobDurationWeeks
        const sCurveFactor = 3 * progress * progress - 2 * progress * progress * progress

        const dataPoint = {
          week: weekNumber,
          date: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          plannedHours: 0, // Will calculate based on total budgeted hours
          actualHours: 0,
          plannedCost: 0,
          actualCost: 0,
          sCurveFactor
        }

        // Sum actual hours and cost for all cost codes this week
        weekData.forEach((data, costCode) => {
          dataPoint.actualHours += data.hours
          dataPoint.actualCost += data.cost
          
          // Add individual cost code data for top codes
          if (topCostCodes.includes(costCode)) {
            dataPoint[`${costCode}_hours`] = data.hours
            dataPoint[`${costCode}_cost`] = data.cost
          }
        })

        chartData.push(dataPoint)
      })

      // Calculate total budgeted hours from SOV (estimate: assume 30% of SOV value is labor)
      // Or use actual total hours as baseline
      const totalActualHours = Array.from(costCodeTotals.values())
        .reduce((sum, total) => sum + total.totalHours, 0)
      
      // Distribute planned hours using S-curve (cumulative distribution)
      // S-curve gives cumulative progress, so we need to calculate weekly increments
      let previousCumulative = 0
      chartData.forEach((point, index) => {
        // Calculate cumulative planned hours up to this point
        const cumulativePlannedHours = totalActualHours * point.sCurveFactor
        // Weekly hours = difference from previous cumulative
        point.plannedHours = Math.max(0, cumulativePlannedHours - previousCumulative)
        previousCumulative = cumulativePlannedHours
        
        // Estimate cost based on average hourly rate
        const avgHourlyRate = totalActualHours > 0 
          ? (Array.from(costCodeTotals.values()).reduce((sum, total) => sum + total.totalCost, 0) / totalActualHours)
          : 50
        point.plannedCost = point.plannedHours * avgHourlyRate
      })

      setWorkforceData({
        chartData,
        costCodeTotals: Array.from(costCodeTotals.entries()).map(([code, data]) => ({
          code,
          ...data
        })),
        topCostCodes,
        totalHours: totalActualHours,
        jobDurationWeeks
      })
    } catch (error) {
      console.error('Error fetching workforce data:', error)
      setWorkforceData(null)
    }
  }

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

  // Helper functions for status indicators
  const getCPIStatus = (cpi) => {
    if (cpi >= 1.0) return { color: 'green', label: 'On Budget', icon: CheckCircleIcon }
    if (cpi >= 0.9) return { color: 'yellow', label: 'At Risk', icon: ExclamationTriangleIcon }
    return { color: 'red', label: 'Over Budget', icon: XCircleIcon }
  }

  const getBudgetUtilizationStatus = (percent) => {
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

  const taskSummary = dashboardData?.tasks?.meta?.summary || {}
  const sovSummary = dashboardData?.sov?.summary || {}
  const timeEntries = dashboardData?.timeEntries || []
  
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
  const totalCost = timeEntries.reduce((sum, entry) => sum + entry.totalCost, 0)

  // Financial calculations
  const evm = financialData?.evm || {}
  const apMeta = financialData?.ap || {}
  const timelogMeta = financialData?.timelog || {}
  const latestPR = financialData?.latestProgressReport
  const latestForecast = financialData?.latestForecast

  const totalBudget = sovSummary.totalValue || 0
  const totalSpent = (evm.actualCost || 0)
  const laborCost = evm.laborCost || timelogMeta.totalCost || 0
  const materialsCost = evm.apCost || apMeta.totalAmount || 0
  const remainingBudget = totalBudget - totalSpent
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const outstandingAP = (apMeta.totalAmount || 0) - (apMeta.paidAmount || 0)
  const cpi = evm.cpi || 0
  const costVariance = evm.costVariance || 0
  const earnedValue = evm.earnedValue || 0
  const actualCost = evm.actualCost || 0
  const marginAtCompletion = latestForecast?.marginAtCompletion || null
  const progressPercent = latestPR?.summary?.calculatedPercentCTD || 0

  const cpiStatus = getCPIStatus(cpi)
  const budgetStatus = getBudgetUtilizationStatus(budgetUtilization)

  return (
    <div className="space-y-6">
      {/* Financial Health Dashboard - Tier 1 Critical Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Financial Health Dashboard</h2>
          <Link 
            to={`/jobs/${jobId}/earned-vs-burned`}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View Detailed Analysis →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CPI Card */}
          <Link 
            to={`/jobs/${jobId}/earned-vs-burned`}
            className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Cost Performance Index</div>
              {React.createElement(cpiStatus.icon, {
                className: `h-6 w-6 ${
                  cpiStatus.color === 'green' ? 'text-green-500' :
                  cpiStatus.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                }`
              })}
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              cpiStatus.color === 'green' ? 'text-green-600' :
              cpiStatus.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {cpi > 0 ? cpi.toFixed(3) : 'N/A'}
            </div>
            <div className={`text-xs font-medium ${
              cpiStatus.color === 'green' ? 'text-green-700' :
              cpiStatus.color === 'yellow' ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {cpiStatus.label}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {cpi > 0 ? `For every $1 spent, ${formatCurrency(cpi)} earned` : 'No progress data'}
            </div>
          </Link>

          {/* Cost Variance Card */}
          <Link 
            to={`/jobs/${jobId}/earned-vs-burned`}
            className={`bg-white shadow rounded-lg p-6 border-l-4 ${
              costVariance >= 0 ? 'border-green-500' : 'border-red-500'
            } hover:shadow-lg transition-shadow cursor-pointer`}
            title="Cost Variance = Earned Value - Actual Cost (EVM metric)"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Cost Variance (EVM)</div>
              {costVariance >= 0 ? (
                <ArrowUpIcon className="h-6 w-6 text-green-500" />
              ) : (
                <ArrowDownIcon className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              costVariance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(costVariance))}
            </div>
            <div className={`text-xs font-medium ${
              costVariance >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {costVariance >= 0 ? 'Under Budget' : 'Over Budget'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              EV: {formatCurrency(earnedValue)} - AC: {formatCurrency(actualCost)}
            </div>
            <div className="text-xs text-gray-400 mt-1 italic">
              Based on earned value, not total budget
            </div>
          </Link>

          {/* Margin at Completion Card */}
          <Link 
            to={`/jobs/${jobId}/cost-to-complete`}
            className={`bg-white shadow rounded-lg p-6 border-l-4 ${
              marginAtCompletion !== null && marginAtCompletion >= 0 ? 'border-green-500' : 'border-purple-500'
            } hover:shadow-lg transition-shadow cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Margin @ Completion</div>
              <ScaleIcon className="h-6 w-6 text-purple-500" />
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              marginAtCompletion !== null && marginAtCompletion >= 0 ? 'text-green-600' : 'text-purple-600'
            }`}>
              {marginAtCompletion !== null ? formatCurrency(marginAtCompletion) : 'N/A'}
            </div>
            <div className={`text-xs font-medium ${
              marginAtCompletion !== null && marginAtCompletion >= 0 ? 'text-green-700' : 'text-purple-700'
            }`}>
              {marginAtCompletion !== null 
                ? `${formatPercent(latestForecast?.marginAtCompletionPercent || 0)} projected margin`
                : 'No forecast available'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {latestForecast ? 'From latest forecast' : 'Create forecast to view'}
            </div>
          </Link>

          {/* Budget Utilization Card */}
          <div className="bg-white shadow rounded-lg p-6 border-l-4 border-orange-500"
          title="Budget Utilization = Actual Cost Spent / Total Budget"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Budget Utilization</div>
              <ChartBarIcon className={`h-6 w-6 ${
                budgetStatus.color === 'green' ? 'text-green-500' :
                budgetStatus.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
              }`} />
            </div>
            <div className="text-3xl font-bold mb-2 text-gray-900">
              {formatPercent(budgetUtilization)}
            </div>
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    budgetStatus.color === 'green' ? 'bg-green-500' :
                    budgetStatus.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, budgetUtilization))}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {formatCurrency(remainingBudget)} remaining of {formatCurrency(totalBudget)} budget
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Spent: {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Performance - Tier 2 Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Progress & Performance</h2>
          <Link 
            to={`/jobs/${jobId}/progress-reports`}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View All Reports →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Progress Card */}
          <Link 
            to={`/jobs/${jobId}/progress-reports`}
            className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Overall Progress</div>
              <ChartBarIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="text-3xl font-bold mb-2 text-gray-900">
              {formatPercent(progressPercent)}
            </div>
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {latestPR 
                ? `From Progress Report #${latestPR.reportNumber} - ${new Date(latestPR.reportDate).toLocaleDateString()}`
                : 'No progress reports yet'}
            </div>
          </Link>

          {/* Earned Value vs Actual Cost Card */}
          <Link 
            to={`/jobs/${jobId}/earned-vs-burned`}
            className="bg-white shadow rounded-lg p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="text-sm font-medium text-gray-500 mb-3">Earned Value vs Actual Cost</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Earned Value</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(earnedValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Actual Cost</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(actualCost)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Difference</span>
                  <span className={`text-sm font-bold ${
                    costVariance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(costVariance)}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Latest Progress Report Card */}
          <Link 
            to={`/jobs/${jobId}/progress-reports`}
            className="bg-white shadow rounded-lg p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Latest Progress Report</div>
              <DocumentTextIcon className="h-6 w-6 text-purple-500" />
            </div>
            {latestPR ? (
              <>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  Report #{latestPR.reportNumber}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(latestPR.reportDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    latestPR.status === 'approved' ? 'bg-green-100 text-green-800' :
                    latestPR.status === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {latestPR.status}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">No progress reports yet</div>
            )}
          </Link>
        </div>
      </div>

      {/* Cost Summary - Tier 3 Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cost Summary</h2>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-gray-700 font-medium mb-1">Understanding the Difference:</p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li><strong>Cost Variance ({formatCurrency(Math.abs(costVariance))}):</strong> Earned Value ({formatCurrency(earnedValue)}) - Actual Cost ({formatCurrency(actualCost)}) = Performance metric</li>
                <li><strong>Remaining Budget ({formatCurrency(remainingBudget)}):</strong> Total Budget ({formatCurrency(totalBudget)}) - Actual Cost ({formatCurrency(totalSpent)}) = Cash remaining</li>
                <li>The {formatCurrency(Math.abs(totalBudget - earnedValue))} difference = Unearned portion of contract ({formatPercent(progressPercent)} complete, not 100%)</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-4">
            <Link 
              to={`/jobs/${jobId}/ap-register`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              AP Register →
            </Link>
            <Link 
              to={`/jobs/${jobId}/timelog-register`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Timelog Register →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Budget Card */}
          <Link 
            to={`/jobs/${jobId}/sov-line-items`}
            className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Total Budget</div>
              <CurrencyDollarIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(totalBudget)}
            </div>
            <div className="text-xs text-gray-500">
              Contract value • {sovSummary.sovLineItemsCount || 0} line items
            </div>
          </Link>

          {/* Total Spent to Date Card */}
          <div className="bg-white shadow rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Spent to Date</div>
              <ChartBarIcon className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(totalSpent)}
            </div>
            <div className="text-xs text-gray-500">
              Labor: {formatCurrency(laborCost)} • Materials: {formatCurrency(materialsCost)}
            </div>
          </div>

          {/* Remaining Budget Card */}
          <div className={`bg-white shadow rounded-lg p-6 border-l-4 ${
            remainingBudget >= 0 ? 'border-green-500' : 'border-red-500'
          }`}
          title="Remaining Budget = Total Budget - Actual Cost Spent"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Remaining Budget</div>
              <CurrencyDollarIcon className={`h-6 w-6 ${
                remainingBudget >= 0 ? 'text-green-500' : 'text-red-500'
              }`} />
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(remainingBudget)}
            </div>
            <div className="text-xs text-gray-500">
              {formatPercent(100 - budgetUtilization)} of budget remaining
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Budget: {formatCurrency(totalBudget)} - Spent: {formatCurrency(totalSpent)}
            </div>
          </div>

          {/* Outstanding AP Card */}
          <Link 
            to={`/jobs/${jobId}/ap-register`}
            className="bg-white shadow rounded-lg p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Outstanding AP</div>
              <BanknotesIcon className="h-6 w-6 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(outstandingAP)}
            </div>
            <div className="text-xs text-gray-500">
              {apMeta.total ? `${apMeta.total - (apMeta.paidCount || 0)} invoices pending` : 'No AP data'}
            </div>
          </Link>
        </div>
      </div>

      {/* Workforce Metrics - Labor Curve Analysis */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Workforce Metrics</h2>
          <Link 
            to={`/jobs/${jobId}/timelog-register`}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View Detailed Analysis →
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Labor Hours Card */}
          <Link 
            to={`/jobs/${jobId}/timelog-register`}
            className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Total Labor Hours</div>
              <ClockIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {workforceData?.totalHours?.toFixed(1) || totalHours.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">
              {workforceData?.costCodeTotals?.length || 0} cost codes active
            </div>
          </Link>

          {/* Average Weekly Hours Card */}
          <div className="bg-white shadow rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Avg Weekly Hours</div>
              <ChartBarIcon className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {workforceData?.chartData?.length > 0 
                ? (workforceData.totalHours / Math.max(workforceData.chartData.length, 1)).toFixed(1)
                : '0'}
            </div>
            <div className="text-xs text-gray-500">
              Over {workforceData?.chartData?.length || 0} weeks
            </div>
          </div>

          {/* Top Cost Code Card */}
          <div className="bg-white shadow rounded-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Top Cost Code</div>
              <UserIcon className="h-6 w-6 text-purple-500" />
            </div>
            {workforceData?.costCodeTotals?.length > 0 ? (
              <>
                <div className="text-lg font-bold text-gray-900 mb-1">
                  {workforceData.costCodeTotals[0].code}
                </div>
                <div className="text-xs text-gray-500">
                  {workforceData.costCodeTotals[0].totalHours.toFixed(1)} hrs • {workforceData.costCodeTotals[0].name}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">No data</div>
            )}
          </div>

          {/* Labor Efficiency Card */}
          <div className="bg-white shadow rounded-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Labor Efficiency</div>
              <ChartBarIcon className="h-6 w-6 text-orange-500" />
            </div>
            {workforceData?.chartData?.length > 0 ? (
              <>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(() => {
                    const recentWeeks = workforceData.chartData.slice(-4)
                    const avgActual = recentWeeks.reduce((sum, w) => sum + w.actualHours, 0) / recentWeeks.length
                    const avgPlanned = recentWeeks.reduce((sum, w) => sum + w.plannedHours, 0) / recentWeeks.length
                    return avgPlanned > 0 ? ((avgActual / avgPlanned) * 100).toFixed(0) : '100'
                  })()}%
                </div>
                <div className="text-xs text-gray-500">
                  Recent 4-week average vs planned
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">No data</div>
            )}
          </div>
        </div>

        {/* Labor Curve Charts */}
        {workforceData?.chartData && workforceData.chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Labor Hours Curve - Actual vs Planned */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Labor Hours Curve</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={workforceData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'plannedHours' || name === 'actualHours') {
                        return [`${value.toFixed(1)} hrs`, name === 'plannedHours' ? 'Planned (S-Curve)' : 'Actual']
                      }
                      return value
                    }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="plannedHours" 
                    name="Planned (S-Curve)"
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actualHours" 
                    name="Actual Hours"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700 font-medium mb-1">What is a Good Labor Curve?</p>
                <p className="text-xs text-gray-600">
                  An ideal S-curve shows: <strong>Slow start</strong> (mobilization), <strong>Ramp up</strong> (increasing productivity), 
                  <strong> Peak</strong> (maximum output), and <strong>Slow finish</strong> (punch list/closeout). 
                  Compare your actual curve to identify if labor is front-loaded (risky) or back-loaded (delays).
                </p>
              </div>
            </div>

            {/* Top Cost Codes Breakdown */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Cost Codes by Hours</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workforceData.costCodeTotals.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="code" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(1)} hrs`}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                  />
                  <Legend />
                  <Bar dataKey="totalHours" fill="#3b82f6" name="Total Hours" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {workforceData.costCodeTotals.slice(0, 5).map((item, index) => (
                  <div key={item.code} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                      }`} />
                      <span className="font-medium">{item.code}</span>
                      <span className="text-gray-500 text-xs">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.totalHours.toFixed(1)} hrs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cost Code Summary Table */}
        {workforceData?.costCodeTotals && workforceData.costCodeTotals.length > 0 && (
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Labor Summary by Cost Code</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost/Hr</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workforceData.costCodeTotals.slice(0, 10).map((item) => (
                    <tr key={item.code} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.totalHours.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                        {item.totalHours > 0 ? formatCurrency(item.totalCost / item.totalHours) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {workforceData.costCodeTotals.length > 10 && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <Link 
                  to={`/jobs/${jobId}/timelog-register`}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all {workforceData.costCodeTotals.length} cost codes →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions - Financial Reports */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
            to={`/jobs/${jobId}/earned-vs-burned`}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
          >
            <ScaleIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Earned vs Burned</div>
            <div className="text-xs text-gray-500 mt-1">EVM analysis</div>
          </Link>
          
          <Link 
            to={`/jobs/${jobId}/cost-to-complete`}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
            <ChartBarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Cost to Complete</div>
            <div className="text-xs text-gray-500 mt-1">Forecast analysis</div>
        </Link>
        
        <Link 
            to={`/jobs/${jobId}/ap-register`}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
            <BanknotesIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">AP Register</div>
            <div className="text-xs text-gray-500 mt-1">Vendor invoices</div>
        </Link>
        
        <Link 
            to={`/jobs/${jobId}/progress-reports`}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-center"
        >
            <DocumentTextIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Progress Reports</div>
            <div className="text-xs text-gray-500 mt-1">Monthly billing</div>
        </Link>
        </div>
      </div>
    </div>
  )
}

export default JobOverview
