import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  EyeIcon,
  PlusIcon
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
  ResponsiveContainer
} from 'recharts'

const CostToCompleteForecasts = () => {
  const { jobId } = useParams()
  const [forecasts, setForecasts] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedForecast, setSelectedForecast] = useState(null)
  const [showChartView, setShowChartView] = useState(true)

  useEffect(() => {
    fetchForecasts()
    fetchAnalytics()
  }, [jobId, statusFilter])

  const fetchForecasts = async () => {
    try {
      setLoading(true)
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const response = await api.get(`/api/financial/${jobId}/cost-to-complete/forecasts`, { params })
      setForecasts(response.data.data || [])
    } catch (error) {
      toast.error('Failed to load forecasts')
      console.error('Error fetching forecasts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/api/financial/${jobId}/cost-to-complete/forecasts/analytics`)
      setAnalytics(response.data.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const deleteForecast = async (forecastId) => {
    if (!window.confirm('Are you sure you want to delete this forecast?')) {
      return
    }

    try {
      await api.delete(`/api/financial/${jobId}/cost-to-complete/forecast/${forecastId}`)
      toast.success('Forecast deleted successfully')
      fetchForecasts()
      fetchAnalytics()
    } catch (error) {
      toast.error('Failed to delete forecast')
      console.error('Error deleting forecast:', error)
    }
  }

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '0.00%'
    return `${value.toFixed(2)}%`
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      archived: 'bg-gray-200 text-gray-600'
    }
    return badges[status] || badges.draft
  }

  // Prepare chart data
  const chartData = analytics?.trends?.months.map((month, index) => ({
    month,
    forecastFinalCost: analytics.trends.forecastFinalCost[index] || 0,
    forecastFinalValue: analytics.trends.forecastFinalValue[index] || 0,
    marginAtCompletion: analytics.trends.marginAtCompletion[index] || 0,
    cpi: analytics.trends.cpi[index] || 0,
    costToDate: analytics.trends.costToDate[index] || 0,
    earnedToDate: analytics.trends.earnedToDate[index] || 0
  })) || []

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
          <h1 className="text-3xl font-bold text-gray-900">Cost to Complete Forecasts</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all cost-to-complete forecasts for this job
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/jobs/${jobId}/cost-to-complete`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Forecast
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
          <button
            onClick={() => setShowChartView(!showChartView)}
            className="ml-auto inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            {showChartView ? 'Hide Charts' : 'Show Charts'}
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && analytics.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Total Forecasts</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{analytics.summary.totalForecasts}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Average CPI</p>
            <p className={`text-2xl font-bold mt-2 ${
              analytics.summary.averageCPI >= 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analytics.summary.averageCPI.toFixed(3)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Average Margin</p>
            <p className={`text-2xl font-bold mt-2 ${
              analytics.summary.averageMargin >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(analytics.summary.averageMargin)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500">Latest Forecast</p>
            <p className="text-sm text-gray-900 mt-2">{analytics.summary.latestForecast?.period || 'N/A'}</p>
            <p className="text-xs text-gray-500 mt-1">
              CPI: {analytics.summary.latestForecast?.cpi?.toFixed(3) || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      {showChartView && analytics && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forecast Cost vs Value Trend */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Cost vs Value Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="forecastFinalCost" stroke="#ef4444" name="Forecast Cost" />
                <Line type="monotone" dataKey="forecastFinalValue" stroke="#10b981" name="Forecast Value" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Margin at Completion Trend */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Margin at Completion Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="marginAtCompletion" fill="#3b82f6" name="Margin at Completion" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* CPI Trend */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Performance Index (CPI) Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 2]} />
                <Tooltip formatter={(value) => value.toFixed(3)} />
                <Legend />
                <Line type="monotone" dataKey="cpi" stroke="#8b5cf6" name="CPI" />
                <Line type="monotone" dataKey={1} stroke="#94a3b8" strokeDasharray="5 5" name="Target (1.0)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cost vs Earned Trend */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost vs Earned Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="costToDate" stroke="#f59e0b" name="Cost to Date" />
                <Line type="monotone" dataKey="earnedToDate" stroke="#10b981" name="Earned to Date" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Forecasts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Forecasts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress Report</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forecasts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-500">
                    No forecasts found. <Link to={`/jobs/${jobId}/cost-to-complete`} className="text-blue-600 hover:text-blue-800">Create one</Link>
                  </td>
                </tr>
              ) : (
                forecasts.map((forecast) => {
                  const summary = forecast.summary || {}
                  return (
                    <tr key={forecast._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {forecast.forecastPeriod}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {forecast.progressReportNumber || '-'}
                        {forecast.progressReportDate && (
                          <div className="text-xs text-gray-500">
                            {new Date(forecast.progressReportDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(summary.forecastFinalCost)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(summary.forecastFinalValue)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        (summary.marginAtCompletion || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(summary.marginAtCompletion)} ({formatPercent(summary.marginAtCompletionPercent)})
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        (summary.cpi || 0) >= 1 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {summary.cpi ? summary.cpi.toFixed(3) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(forecast.status)}`}>
                          {forecast.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(forecast.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/jobs/${jobId}/cost-to-complete?forecastId=${forecast._id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="View/Edit"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => deleteForecast(forecast._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CostToCompleteForecasts

