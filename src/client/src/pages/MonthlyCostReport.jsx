import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

const MonthlyCostReport = () => {
  const { jobId } = useParams()
  const [reportData, setReportData] = useState([])
  const [summary, setSummary] = useState({})
  const [chartData, setChartData] = useState({})
  const [loading, setLoading] = useState(true)
  const [jobInfo, setJobInfo] = useState(null)
  const [startMonth, setStartMonth] = useState('')
  const [endMonth, setEndMonth] = useState('')

  // Utility function to generate months between two dates
  const generateMonths = (start, end) => {
    const months = []
    const startDate = new Date(start + '-01')
    const endDate = new Date(end + '-01')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const current = new Date(startDate)
    while (current <= endDate) {
      const year = current.getFullYear()
      const month = current.getMonth()
      months.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: monthNames[month],
        fullLabel: `${monthNames[month]} ${year}`
      })
      current.setMonth(current.getMonth() + 1)
    }
    return months
  }

  // Fetch job info to set default date range
  useEffect(() => {
    if (jobId) {
      api.get(`/api/jobs/${jobId}`)
        .then(res => {
          const job = res.data.data
          setJobInfo(job)
          if (!startMonth && job.startDate) {
            const start = new Date(job.startDate)
            const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
            setStartMonth(startStr)
          }
          if (!endMonth && job.endDate) {
            const end = new Date(job.endDate)
            const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`
            setEndMonth(endStr)
          }
        })
        .catch(err => console.error('Error fetching job info:', err))
    }
  }, [jobId])

  // Generate months array for current date range
  const monthsInRange = startMonth && endMonth ? generateMonths(startMonth, endMonth) : []

  useEffect(() => {
    if (jobId && startMonth && endMonth) {
      fetchReportData()
    }
  }, [jobId, startMonth, endMonth])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/financial/${jobId}/monthly-cost-report`, {
        params: { startMonth, endMonth }
      })
      setReportData(response.data.data.reportData)
      setSummary(response.data.data.summary)
      setChartData(response.data.data.chartData)
    } catch (error) {
      toast.error('Failed to load monthly cost report')
      console.error('Error fetching monthly cost report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getProgressBarColor = (percent) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 75) return 'bg-orange-500'
    if (percent >= 50) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const exportData = () => {
    // Dynamic CSV export based on date range
    const monthHeaders = monthsInRange.map(m => m.label)
    const headers = ['Code', 'Area', 'System', 'SOV Budget', ...monthHeaders, 'Total to Date', 'Remaining', '% Used']
    const rows = reportData.map(item => {
      const monthValues = monthsInRange.map(m => item.monthlySpend[m.label] || 0)
      return [
        item.code,
        item.area,
        item.system,
        item.sovBudget,
        ...monthValues,
        item.totalToDate,
        item.remaining,
        item.percentUsed.toFixed(1)
      ]
    })
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monthly-cost-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Prepare stacked bar chart data - transform to format recharts expects
  const stackedChartData = (chartData.monthlyBreakdown || []).map(monthData => {
    const data = { month: monthData.month }
    Object.keys(monthData.costs || {}).forEach(code => {
      data[code] = monthData.costs[code]
    })
    return data
  })
  const costCodes = reportData.map(item => item.code)
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  // Prepare cumulative line chart data
  const cumulativeChartData = chartData.cumulative || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Cost Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last Updated: {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Start:</label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">End:</label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <button
            onClick={exportData}
            className="btn-secondary flex items-center gap-2"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Export Data
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <FunnelIcon className="h-4 w-4" />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Month-over-Month Cost Analysis Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Month-over-Month Cost Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">Review actual costs vs budget across systems and areas</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SOV Budget ($)</th>
                {monthsInRange.length > 0 ? (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={monthsInRange.length}>
                    Monthly Spend ({monthsInRange[0]?.label} - {monthsInRange[monthsInRange.length - 1]?.label})
                  </th>
                ) : (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Spend</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total to Date ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining ($)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Used</th>
              </tr>
              {monthsInRange.length > 0 && (
                <tr>
                  <th colSpan="4"></th>
                  {monthsInRange.map(month => (
                    <th key={month.key} className="px-2 py-2 text-center text-xs font-medium text-gray-500">{month.label}</th>
                  ))}
                  <th colSpan="3"></th>
                </tr>
              )}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((item, index) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.area}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.system}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(item.sovBudget)}</td>
                  {monthsInRange.map(month => (
                    <td key={month.key} className="px-2 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                      {formatCurrency(item.monthlySpend[month.label] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">{formatCurrency(item.totalToDate)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                    item.remaining < 0 ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {formatCurrency(item.remaining)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden relative">
                        <div
                          className={`h-full ${getProgressBarColor(item.percentUsed)} transition-all`}
                          style={{ width: `${Math.min(100, Math.max(0, item.percentUsed))}%` }}
                        />
                        {item.percentUsed > 100 && (
                          <div className="absolute inset-0 bg-red-300 opacity-50" style={{ width: '100%' }} />
                        )}
                      </div>
                      <span className={`text-sm font-medium w-12 text-right ${
                        item.percentUsed > 100 ? 'text-red-600' : 
                        item.percentUsed > 75 ? 'text-orange-600' : 
                        'text-gray-700'
                      }`}>
                        {item.percentUsed.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Cost Breakdown Stacked Chart */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Cost Breakdown (Stacked)</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={stackedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name]}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
                <Legend />
                {costCodes.map((code, index) => {
                  const item = reportData.find(r => r.code === code)
                  return (
                    <Bar
                      key={code}
                      dataKey={code}
                      name={`${code} - ${item?.system || ''}`}
                      stackId="a"
                      fill={colors[index % colors.length]}
                    />
                  )
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative vs SOV Budget Chart */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Cumulative vs SOV Budget</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sovBudget" 
                  name="SOV Budget" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  name="Cumulative Cost" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-blue-50 border-blue-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total SOV Budget</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">
                  {formatCurrency(summary.totalSOVBudget || 0)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="card bg-green-50 border-green-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Spent to Date</p>
                <p className="text-2xl font-bold text-green-900 mt-2">
                  {formatCurrency(summary.totalSpentToDate || 0)}
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card bg-orange-50 border-orange-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Remaining Budget</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">
                  {formatCurrency(summary.remainingBudget || 0)}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="card bg-purple-50 border-purple-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Budget Utilization</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">
                  {(summary.budgetUtilization || 0).toFixed(1)}%
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthlyCostReport

