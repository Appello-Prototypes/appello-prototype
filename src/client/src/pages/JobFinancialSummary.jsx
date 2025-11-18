import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  DocumentArrowDownIcon,
  FunnelIcon,
  ChartBarIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'

const JobFinancialSummary = () => {
  const { jobId } = useParams()
  const [summaryData, setSummaryData] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [jobInfo, setJobInfo] = useState(null)

  useEffect(() => {
    if (jobId) {
      fetchJobInfo()
      fetchSummaryData()
    }
  }, [jobId])

  const fetchJobInfo = async () => {
    try {
      const response = await api.get(`/api/jobs/${jobId}`)
      setJobInfo(response.data.data)
    } catch (error) {
      console.error('Error fetching job info:', error)
    }
  }

  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/financial/${jobId}/job-financial-summary`)
      setSummaryData(response.data.data.summary)
      setChartData(response.data.data.chartData)
    } catch (error) {
      toast.error('Failed to load job financial summary')
      console.error('Error fetching job financial summary:', error)
    } finally {
      setLoading(false)
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
    return `${value.toFixed(2)}%`
  }

  const exportData = () => {
    if (!summaryData || !summaryData.months) return

    const headers = [
      'Category',
      ...summaryData.months.map(m => m.month)
    ]

    const categories = [
      { name: 'Forecasted Job Value ($)', key: 'forecastedJobValue' },
      { name: 'Forecasted Final Cost ($)', key: 'forecastedFinalCost' },
      { name: 'Forecasted Fee ($)', key: 'forecastedFee' },
      { name: 'Forecasted Fee %', key: 'forecastedFeePercent' },
      { name: 'Job To Date Cost ($)', key: 'jobToDateCost' },
      { name: 'Recognized Revenue ($)', key: 'recognizedRevenue' },
      { name: 'Recognized Fee ($)', key: 'recognizedFee' },
      { name: 'Job To Date Invoices ($)', key: 'jobToDateInvoices' },
      { name: 'Over/Under Billing ($)', key: 'overUnderBilling' },
      { name: 'Current Recognized Revenue ($)', key: 'currentRecognizedRevenue' },
      { name: 'Job Cost This Period ($)', key: 'jobCostThisPeriod' },
      { name: 'Recognized Fee (This Month) ($)', key: 'recognizedFeeThisPeriod' },
      { name: 'Fee % (This Month)', key: 'recognizedFeePercentThisPeriod' }
    ]

    const rows = categories.map(cat => [
      cat.name,
      ...summaryData.months.map(m => {
        const value = m[cat.key]
        if (cat.key.includes('Percent')) {
          return value ? formatPercent(value) : '0.0%'
        }
        return value ? formatCurrency(value) : '$0'
      })
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `job-financial-summary-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Data exported successfully')
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!summaryData || !summaryData.months || summaryData.months.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Data Available</h3>
        <p className="text-gray-500">This job doesn't have any financial data yet.</p>
      </div>
    )
  }

  const months = summaryData.months
  const totals = summaryData.totals
  const latestMonth = months[months.length - 1]

  // Calculate key insights
  const costVariance = latestMonth ? latestMonth.jobToDateCost - latestMonth.forecastedFinalCost : 0
  const revenueVariance = latestMonth ? latestMonth.recognizedRevenue - latestMonth.forecastedJobValue : 0
  const feeVariance = latestMonth ? latestMonth.recognizedFee - latestMonth.forecastedFee : 0
  const isOverBudget = costVariance > 0
  const isUnderBilled = latestMonth?.overUnderBilling < 0

  // Prepare enhanced chart data
  const enhancedCostVsForecast = chartData?.costVsForecast?.map(m => ({
    ...m,
    costVariance: m.jobCost - m.forecastFinalCost,
    revenueVariance: m.forecastJobValue - m.jobCost
  })) || []

  const marginTrendData = months.map(m => ({
    month: m.month,
    forecastedMargin: m.forecastedFeePercent,
    recognizedMargin: m.recognizedFeePercent,
    marginVariance: m.recognizedFeePercent - m.forecastedFeePercent
  }))

  const revenueVsCostData = months.map(m => ({
    month: m.month,
    recognizedRevenue: m.recognizedRevenue,
    jobCost: m.jobToDateCost,
    invoices: m.jobToDateInvoices
  }))

  const varianceData = months.map(m => ({
    month: m.month,
    costVariance: m.jobToDateCost - (m.forecastedFinalCost || 0),
    revenueVariance: m.recognizedRevenue - m.forecastedJobValue,
    feeVariance: m.recognizedFee - (m.forecastedFee || 0)
  }))

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label, type = 'currency' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {type === 'currency' ? formatCurrency(entry.value) : `${entry.value.toFixed(2)}%`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Financial Summary</h1>
          {jobInfo && (
            <p className="mt-1 text-sm text-gray-500">
              {jobInfo.name} • {jobInfo.jobNumber}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Full Financial Summary (Month-by-Month)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Category
                </th>
                {months.map((month) => (
                  <th key={month.monthNumber} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    {month.month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Forecasted Job Value */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Forecasted Job Value ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-gray-900">
                    {formatCurrency(month.forecastedJobValue)}
                  </td>
                ))}
              </tr>

              {/* Forecasted Final Cost */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Forecasted Final Cost ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-gray-900">
                    {month.forecastedFinalCost > 0 ? formatCurrency(month.forecastedFinalCost) : '-'}
                  </td>
                ))}
              </tr>

              {/* Forecasted Fee */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Forecasted Fee ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-gray-900">
                    {month.forecastedFee > 0 ? formatCurrency(month.forecastedFee) : '-'}
                  </td>
                ))}
              </tr>

              {/* Forecasted Fee %} */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Forecasted Fee %
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-gray-900">
                    {month.forecastedFeePercent > 0 ? formatPercent(month.forecastedFeePercent) : '-'}
                  </td>
                ))}
              </tr>

              {/* Job To Date Cost */}
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 z-10">
                  Job To Date Cost ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                    {formatCurrency(month.jobToDateCost)}
                  </td>
                ))}
              </tr>

              {/* Recognized Revenue */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Recognized Revenue ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                    {formatCurrency(month.recognizedRevenue)}
                  </td>
                ))}
              </tr>

              {/* Recognized Fee */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Recognized Fee ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className={`px-4 py-3 text-sm text-right font-medium ${
                    month.recognizedFee >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(month.recognizedFee)}
                  </td>
                ))}
              </tr>

              {/* Job To Date Invoices */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Job To Date Invoices ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                    {formatCurrency(month.jobToDateInvoices)}
                  </td>
                ))}
              </tr>

              {/* Over/Under Billing */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Over/Under Billing ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className={`px-4 py-3 text-sm text-right font-medium ${
                    month.overUnderBilling >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(month.overUnderBilling)}
                  </td>
                ))}
              </tr>

              {/* Current Recognized Revenue */}
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 z-10">
                  Current Recognized Revenue ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-gray-900">
                    {formatCurrency(month.currentRecognizedRevenue)}
                  </td>
                ))}
              </tr>

              {/* Job Cost This Period */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Job Cost This Period ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className="px-4 py-3 text-sm text-right text-gray-900">
                    {formatCurrency(month.jobCostThisPeriod)}
                  </td>
                ))}
              </tr>

              {/* Recognized Fee (This Month) */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Recognized Fee (This Month) ($)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className={`px-4 py-3 text-sm text-right ${
                    month.recognizedFeeThisPeriod >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(month.recognizedFeeThisPeriod)}
                  </td>
                ))}
              </tr>

              {/* Fee % (This Month) */}
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  Fee % (This Month)
                </td>
                {months.map((month) => (
                  <td key={month.monthNumber} className={`px-4 py-3 text-sm text-right ${
                    month.recognizedFeePercentThisPeriod >= 0 ? 'text-gray-900' : 'text-red-600'
                  }`}>
                    {formatPercent(month.recognizedFeePercentThisPeriod)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics Summary Cards */}
      {latestMonth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <dt className="text-sm font-medium text-gray-500">Cost Variance</dt>
              {costVariance >= 0 ? (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
            </div>
            <dd className={`text-2xl font-bold ${
              costVariance >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(Math.abs(costVariance))}
            </dd>
            <p className="text-xs text-gray-500 mt-1">
              {costVariance >= 0 ? 'Over forecast' : 'Under forecast'}
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <dt className="text-sm font-medium text-gray-500">Recognized Fee</dt>
              {latestMonth.recognizedFee >= 0 ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
            </div>
            <dd className={`text-2xl font-bold ${
              latestMonth.recognizedFee >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(latestMonth.recognizedFee)}
            </dd>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercent(latestMonth.recognizedFeePercent)} margin
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <dt className="text-sm font-medium text-gray-500">Over/Under Billing</dt>
              {latestMonth.overUnderBilling >= 0 ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <dd className={`text-2xl font-bold ${
              latestMonth.overUnderBilling >= 0 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {formatCurrency(Math.abs(latestMonth.overUnderBilling))}
            </dd>
            <p className="text-xs text-gray-500 mt-1">
              {latestMonth.overUnderBilling >= 0 ? 'Over-billed' : 'Under-billed'}
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <dt className="text-sm font-medium text-gray-500">Fee Variance</dt>
              {feeVariance >= 0 ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
            </div>
            <dd className={`text-2xl font-bold ${
              feeVariance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(feeVariance))}
            </dd>
            <p className="text-xs text-gray-500 mt-1">
              vs Forecasted Fee
            </p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="space-y-6">
          {/* Row 1: Cost vs Forecast and Fee Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Cost vs Forecast Over Time */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Job Cost vs Forecast Over Time</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Compare actual costs to forecasted values to track performance
                  </p>
                </div>
                <div className="group relative">
                  <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                  <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <strong>Forecast Job Value:</strong> Total contract value (constant)<br/>
                    <strong>Job Cost:</strong> Cumulative actual costs (labor + materials)<br/>
                    <strong>Forecast Final Cost:</strong> Projected total cost at completion
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={enhancedCostVsForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip type="currency" />} />
                  <Legend />
                  <ReferenceLine y={latestMonth?.forecastedJobValue} stroke="#f59e0b" strokeDasharray="3 3" label="Contract Value" />
                  <Line 
                    type="monotone" 
                    dataKey="forecastJobValue" 
                    name="Forecast Job Value ($)"
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="jobCost" 
                    name="Job Cost ($)"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecastFinalCost" 
                    name="Forecast Final Cost ($)"
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>Interpretation:</strong> Job Cost should stay below Forecast Final Cost. 
                  If Job Cost exceeds Forecast Final Cost, the job is trending over budget.
                </p>
              </div>
            </div>

            {/* Fee % Trend */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Fee % Trend</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Track margin percentage over time (Fee = Revenue - Cost)
                  </p>
                </div>
                <div className="group relative">
                  <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                  <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <strong>Recognized Fee %:</strong> Actual margin based on recognized revenue<br/>
                    <strong>Forecasted Fee %:</strong> Projected margin from forecasts<br/>
                    <strong>Target:</strong> Typically 15-25% for healthy projects
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.feeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<CustomTooltip type="percent" />} />
                  <Legend />
                  <ReferenceLine y={15} stroke="#10b981" strokeDasharray="2 2" label="15% Target" />
                  <ReferenceLine y={25} stroke="#10b981" strokeDasharray="2 2" label="25% Target" />
                  <Area 
                    type="monotone" 
                    dataKey="recognizedFeePercent" 
                    name="Recognized Fee %"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="forecastedFeePercent" 
                    name="Forecasted Fee %"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>Interpretation:</strong> Fee % should remain stable or improve over time. 
                  Declining fee % indicates cost overruns or revenue recognition issues.
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: Revenue vs Cost and Variance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Cost Comparison */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Revenue vs Cost Comparison</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Track recognized revenue, actual costs, and invoicing over time
                  </p>
                </div>
                <div className="group relative">
                  <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                  <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <strong>Recognized Revenue:</strong> Revenue approved for billing<br/>
                    <strong>Job Cost:</strong> Cumulative actual costs<br/>
                    <strong>Invoices:</strong> Amounts actually invoiced to client<br/>
                    Gap between Revenue and Cost = Fee
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={revenueVsCostData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip type="currency" />} />
                  <Legend />
                  <Bar dataKey="jobCost" name="Job Cost ($)" fill="#ef4444" fillOpacity={0.7} />
                  <Bar dataKey="recognizedRevenue" name="Recognized Revenue ($)" fill="#10b981" fillOpacity={0.7} />
                  <Line 
                    type="monotone" 
                    dataKey="invoices" 
                    name="Invoices ($)"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>Interpretation:</strong> Revenue should exceed costs (green bars above red). 
                  Invoices should align with recognized revenue for proper cash flow.
                </p>
              </div>
            </div>

            {/* Variance Analysis */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Variance Analysis</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Compare actual performance vs forecasts (positive = better than forecast)
                  </p>
                </div>
                <div className="group relative">
                  <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                  <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <strong>Cost Variance:</strong> Actual Cost - Forecast Cost (negative = over budget)<br/>
                    <strong>Revenue Variance:</strong> Actual Revenue - Contract Value<br/>
                    <strong>Fee Variance:</strong> Actual Fee - Forecast Fee<br/>
                    Positive = Better than forecast
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={varianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip type="currency" />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
                  <Bar dataKey="costVariance" name="Cost Variance ($)" fill="#ef4444" />
                  <Bar dataKey="revenueVariance" name="Revenue Variance ($)" fill="#10b981" />
                  <Bar dataKey="feeVariance" name="Fee Variance ($)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>Interpretation:</strong> Bars above zero line = performing better than forecast. 
                  Bars below zero = underperforming vs forecast.
                </p>
              </div>
            </div>
          </div>

          {/* Row 3: Margin Trend and Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Margin Trend (Forecasted vs Recognized) */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Margin Trend Comparison</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Compare forecasted margin vs actual recognized margin
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={marginTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<CustomTooltip type="percent" />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={1} strokeDasharray="2 2" />
                  <Line 
                    type="monotone" 
                    dataKey="forecastedMargin" 
                    name="Forecasted Margin %"
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recognizedMargin" 
                    name="Recognized Margin %"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>Interpretation:</strong> Recognized margin should track close to forecasted margin. 
                  Large gaps indicate forecast accuracy issues or cost control problems.
                </p>
              </div>
            </div>

            {/* Monthly Cost Breakdown (Labor vs Materials) */}
            {chartData?.monthlyCostBreakdown && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Monthly Cost Breakdown</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Labor costs vs material costs by month
                    </p>
                  </div>
                  <div className="group relative">
                    <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <strong>Labor Cost:</strong> From timelog entries (approved)<br/>
                      <strong>Material Cost:</strong> From AP invoices<br/>
                      Helps identify cost drivers and trends
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.monthlyCostBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip type="currency" />} />
                    <Legend />
                    <Bar dataKey="laborCost" name="Labor Cost ($)" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="materialCost" name="Material Cost ($)" stackId="a" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-700">
                    <strong>Interpretation:</strong> Shows cost composition over time. 
                    Labor-heavy months may indicate productivity issues, while material spikes may indicate procurement timing.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Forecast Distribution */}
          <div className="grid grid-cols-1 gap-6">
            {/* Forecast Distribution (Latest Month) */}
            {chartData.latestForecastDistribution && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Forecast Distribution (Latest Month)</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Breakdown of forecasted job value into cost and fee
                    </p>
                  </div>
                  <div className="group relative">
                    <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <strong>Forecasted Final Cost:</strong> Total projected costs<br/>
                      <strong>Forecasted Fee:</strong> Projected profit margin<br/>
                      Based on latest Cost to Complete forecast
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Forecasted Final Cost', 
                            value: chartData.latestForecastDistribution.forecastedFinalCost,
                            label: `Cost: ${formatCurrency(chartData.latestForecastDistribution.forecastedFinalCost)}`
                          },
                          { 
                            name: 'Forecasted Fee', 
                            value: chartData.latestForecastDistribution.forecastedFee,
                            label: `Fee: ${formatCurrency(chartData.latestForecastDistribution.forecastedFee)}`
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) => 
                          `${name}\n${(percent * 100).toFixed(1)}% (${formatCurrency(value)})`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-700">
                    <strong>Interpretation:</strong> Shows how the total contract value is split between 
                    projected costs (blue) and projected profit/fee (green). Larger fee slice = better margin.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default JobFinancialSummary

