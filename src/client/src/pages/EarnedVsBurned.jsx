import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'
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
  ComposedChart,
  Cell
} from 'recharts'

const EarnedVsBurned = () => {
  const { jobId } = useParams()
  const [analysis, setAnalysis] = useState([])
  const [totals, setTotals] = useState({})
  const [trends, setTrends] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState('areaSystem') // areaSystem, system, area
  const [asOfDate, setAsOfDate] = useState('')

  useEffect(() => {
    if (jobId) {
      fetchEarnedVsBurnedData()
    }
  }, [jobId, groupBy, asOfDate])

  const fetchEarnedVsBurnedData = async () => {
    try {
      setLoading(true)
      const params = { groupBy: groupBy === 'areaSystem' ? 'costCode' : groupBy }
      if (asOfDate) params.asOfDate = asOfDate
      const response = await api.get(`/api/financial/${jobId}/earned-vs-burned`, { params })
      setAnalysis(response.data.data)
      setTotals(response.data.totals)
      setTrends(response.data.trends || [])
      setMeta(response.data.meta)
    } catch (error) {
      toast.error('Failed to load earned vs burned analysis')
      console.error('Error fetching earned vs burned:', error)
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
    return `${value.toFixed(1)}%`
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'on_budget':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'at_risk':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'over_budget':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ChartBarIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_budget':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'over_budget':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCPIColor = (cpi) => {
    if (cpi >= 1.0) return 'text-green-600'
    if (cpi >= 0.9) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCPIBadgeColor = (cpi) => {
    if (cpi >= 1.0) return 'bg-green-100 text-green-800'
    if (cpi >= 0.9) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // Prepare chart data
  const evmChartData = trends.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    earnedValue: t.earnedValue || 0,
    approvedPercent: t.approvedPercent || 0
  }))

  const costBreakdownData = [
    { name: 'Labor', value: totals.laborCost || 0, color: '#3b82f6' },
    { name: 'Materials', value: totals.apCost || 0, color: '#10b981' }
  ]

  const topVariances = [...analysis]
    .sort((a, b) => Math.abs(b.costVariance || 0) - Math.abs(a.costVariance || 0))
    .slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const overallHealthStatus = totals.cpi >= 1.0 ? 'on_budget' :
                             totals.cpi >= 0.9 ? 'at_risk' : 'over_budget'

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earned Value Management (EVM)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive earned value analysis based on approved progress reports
            {meta.latestProgressReportDate && (
              <span className="ml-2">
                • Latest Report: {new Date(meta.latestProgressReportDate).toLocaleDateString()}
                {meta.progressReportNumber && ` (${meta.progressReportNumber})`}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="areaSystem">By Area/System</option>
            <option value="system">By System</option>
            <option value="area">By Area</option>
          </select>
          <button
            onClick={() => {
              const csv = [
                ['Area', 'System', 'BAC', 'Earned Value', 'Actual Cost', 'CV', 'CPI', 'EAC', 'Status'],
                ...analysis.map(item => [
                  item.areaName || '',
                  item.systemName || '',
                  item.budgetAtCompletion || 0,
                  item.earnedValue || 0,
                  item.actualCost || 0,
                  item.costVariance || 0,
                  item.cpi || 0,
                  item.estimateAtCompletion || 0,
                  item.status || ''
                ])
              ].map(row => row.join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `earned-vs-burned-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              window.URL.revokeObjectURL(url)
              toast.success('Report exported')
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* EVM Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Budget at Completion */}
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Budget at Completion (BAC)</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totals.budgetAtCompletion)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-10 w-10 text-blue-500 opacity-50" />
          </div>
        </div>

        {/* Earned Value */}
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Earned Value (EV)</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totals.earnedValue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercent(totals.overallProgress)} complete
              </p>
            </div>
            <ArrowUpIcon className="h-10 w-10 text-green-500 opacity-50" />
          </div>
        </div>

        {/* Actual Cost */}
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Actual Cost (AC)</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totals.actualCost)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Labor: {formatCurrency(totals.laborCost)} | AP: {formatCurrency(totals.apCost)}
              </p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-purple-500 opacity-50" />
          </div>
        </div>

        {/* Cost Variance */}
        <div className={`bg-white shadow rounded-lg p-6 border-l-4 ${
          totals.costVariance >= 0 ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Cost Variance (CV)</p>
              <p className={`text-2xl font-bold mt-2 ${
                totals.costVariance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(totals.costVariance))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercent(totals.costVariancePercent)} {totals.costVariance >= 0 ? 'under' : 'over'} budget
              </p>
            </div>
            {totals.costVariance >= 0 ? (
              <ArrowUpIcon className="h-10 w-10 text-green-500 opacity-50" />
            ) : (
              <ArrowDownIcon className="h-10 w-10 text-red-500 opacity-50" />
            )}
          </div>
        </div>
      </div>

      {/* EVM Performance Indices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">CPI</p>
          <p className={`text-2xl font-bold ${getCPIColor(totals.cpi)}`}>
            {totals.cpi?.toFixed(3) || '0.000'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Cost Performance</p>
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded mt-2 ${getCPIBadgeColor(totals.cpi)}`}>
            {totals.cpi >= 1.0 ? 'On Budget' : totals.cpi >= 0.9 ? 'At Risk' : 'Over Budget'}
          </span>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">SPI</p>
          <p className={`text-2xl font-bold ${getCPIColor(totals.spi)}`}>
            {totals.spi?.toFixed(3) || '0.000'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Schedule Performance</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">EAC</p>
          <p className={`text-xl font-bold ${
            totals.estimateAtCompletion <= totals.budgetAtCompletion ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(totals.estimateAtCompletion)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Estimate at Completion</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">ETC</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(totals.estimateToComplete)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Estimate to Complete</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">VAC</p>
          <p className={`text-xl font-bold ${
            totals.varianceAtCompletion >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(totals.varianceAtCompletion)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Variance at Completion</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">TCPI</p>
          <p className={`text-xl font-bold ${getCPIColor(totals.tcpi)}`}>
            {totals.tcpi?.toFixed(3) || '0.000'}
          </p>
          <p className="text-xs text-gray-500 mt-1">To-Complete CPI</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earned Value Trend */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Earned Value Trend</h3>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evmChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="earnedValue" 
                  name="Earned Value" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2" />
                <p>No trend data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costBreakdownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
              <Bar dataKey="value">
                {costBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center gap-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-sm text-gray-700">
                Labor: {formatPercent((totals.laborCost / totals.actualCost) * 100)}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-gray-700">
                Materials: {formatPercent((totals.apCost / totals.actualCost) * 100)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {groupBy === 'system' ? 'System' : groupBy === 'area' ? 'Area' : 'Area/System'} Analysis ({analysis.length} items)
            </h3>
            <div className="text-sm text-gray-500">
              {meta.onBudgetCount} on budget • {meta.atRiskCount} at risk • {meta.overBudgetCount} over budget
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {groupBy === 'system' ? 'System' : groupBy === 'area' ? 'Area' : 'Area/System'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BAC
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EV
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AC
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CV
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPI
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EAC
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAC
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-500">
                    No data available. Ensure progress reports are approved.
                  </td>
                </tr>
              ) : (
                analysis.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {groupBy === 'system' ? item.systemName : 
                         groupBy === 'area' ? item.areaName :
                         `${item.areaName || 'Unknown'} / ${item.systemName || 'Unknown'}`}
                      </div>
                      {item.phaseName && (
                        <div className="text-xs text-gray-500">Phase: {item.phaseName}</div>
                      )}
                      {item.costCodes && item.costCodes.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Codes: {item.costCodes.slice(0, 3).join(', ')}
                          {item.costCodes.length > 3 && ` +${item.costCodes.length - 3}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(item.budgetAtCompletion)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      {formatCurrency(item.earnedValue)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(item.actualCost)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      item.costVariance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(item.costVariance)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${getCPIColor(item.cpi)}`}>
                      {item.cpi?.toFixed(3) || '0.000'}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right ${
                      item.estimateAtCompletion <= item.budgetAtCompletion ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(item.estimateAtCompletion)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      item.varianceAtCompletion >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(item.varianceAtCompletion)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1">{item.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                totals.cpi >= 1.0 ? 'bg-green-500' : totals.cpi >= 0.9 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Cost Performance</p>
                <p className="text-sm text-gray-600">
                  CPI of {totals.cpi?.toFixed(3)} indicates{' '}
                  {totals.cpi >= 1.0 ? 'the project is performing under budget' :
                   totals.cpi >= 0.9 ? 'the project is at risk of going over budget' :
                   'the project is over budget'}.{' '}
                  {totals.cpi < 1.0 && `For every $1 spent, only ${formatCurrency(totals.cpi)} of value is earned.`}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                totals.varianceAtCompletion >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Forecast at Completion</p>
                <p className="text-sm text-gray-600">
                  Project is forecasted to complete at {formatCurrency(totals.estimateAtCompletion)},{' '}
                  {totals.varianceAtCompletion >= 0 ? 'under' : 'over'} budget by{' '}
                  {formatCurrency(Math.abs(totals.varianceAtCompletion))}.
                </p>
              </div>
            </div>

            {totals.tcpi > 1.0 && (
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2 bg-yellow-500"></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">To-Complete Performance</p>
                  <p className="text-sm text-gray-600">
                    TCPI of {totals.tcpi?.toFixed(3)} indicates that to meet budget, future work must be performed{' '}
                    {formatPercent((totals.tcpi - 1) * 100)} more efficiently than planned.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Variances</h3>
          <div className="space-y-3">
            {topVariances.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.areaName} / {item.systemName}
                  </p>
                  <p className="text-xs text-gray-500">
                    CPI: {item.cpi?.toFixed(3)} • EAC: {formatCurrency(item.estimateAtCompletion)}
                  </p>
                </div>
                <div className={`text-sm font-bold ${
                  item.costVariance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(item.costVariance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EarnedVsBurned
