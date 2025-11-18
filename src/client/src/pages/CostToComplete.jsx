import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { 
  ArrowLeftIcon,
  PencilIcon,
  ChartBarIcon,
  EyeIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon
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

const CostToComplete = () => {
  const { jobId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = searchParams.get('view') || 'table' // 'table' or 'detail'
  const selectedPeriod = searchParams.get('period') // e.g., 'Month 1'
  
  const [forecasts, setForecasts] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [jobInfo, setJobInfo] = useState(null)
  const [showCharts, setShowCharts] = useState(true)
  
  // Create forecast modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [availableProgressReports, setAvailableProgressReports] = useState([])
  const [selectedProgressReportId, setSelectedProgressReportId] = useState('')
  
  // Detail view state
  const [detailData, setDetailData] = useState([])
  const [detailSummary, setDetailSummary] = useState({})
  const [progressReportInfo, setProgressReportInfo] = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { rowIndex, field }

  useEffect(() => {
    fetchJobInfo()
    if (viewMode === 'table') {
      fetchForecasts()
      fetchAnalytics()
      fetchAvailableProgressReports()
    } else if (viewMode === 'detail' && selectedPeriod) {
      fetchDetailData()
    }
  }, [jobId, viewMode, selectedPeriod])

  const fetchAvailableProgressReports = async () => {
    try {
      // Fetch all approved progress reports
      const reportsResponse = await api.get(`/api/financial/${jobId}/progress-reports?status=approved`)
      const allReports = reportsResponse.data.data || []
      
      // Get progress report IDs that are already used in forecasts
      const usedReportIds = new Set()
      forecasts.forEach(f => {
        if (f.progressReportId) {
          usedReportIds.add(f.progressReportId.toString())
        }
      })
      
      // Filter out used reports
      const available = allReports.filter(report => {
        const reportId = report._id?.toString() || report.id?.toString()
        return !usedReportIds.has(reportId)
      })
      
      setAvailableProgressReports(available)
    } catch (error) {
      console.error('Error fetching progress reports:', error)
      setAvailableProgressReports([])
    }
  }

  const fetchJobInfo = async () => {
    try {
      const response = await api.get(`/api/jobs/${jobId}`)
      setJobInfo(response.data.data)
    } catch (error) {
      console.error('Error fetching job info:', error)
    }
  }

  const fetchForecasts = async () => {
    try {
      setLoading(true)
      // Fetch all forecasts (excluding archived)
      const response = await api.get(`/api/financial/${jobId}/cost-to-complete/forecasts`, {
        params: { status: 'all' }
      })
      console.log('Fetched forecasts response:', response.data)
      const fetchedForecasts = response.data.data || []
      setForecasts(fetchedForecasts)
      
      // Update available progress reports after fetching forecasts
      // This ensures we filter out used reports
      const reportsResponse = await api.get(`/api/financial/${jobId}/progress-reports?status=approved`)
      const allReports = reportsResponse.data.data || []
      
      const usedReportIds = new Set()
      fetchedForecasts.forEach(f => {
        if (f.progressReportId) {
          usedReportIds.add(f.progressReportId.toString())
        }
      })
      
      const available = allReports.filter(report => {
        const reportId = report._id?.toString() || report.id?.toString()
        return !usedReportIds.has(reportId)
      })
      
      setAvailableProgressReports(available)
    } catch (error) {
      toast.error('Failed to load forecasts')
      console.error('Error fetching forecasts:', error)
      console.error('Error details:', error.response?.data)
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

  const fetchDetailData = async () => {
    try {
      setLoading(true)
      const params = selectedPeriod ? { forecastPeriod: selectedPeriod } : {}
      const response = await api.get(`/api/financial/${jobId}/cost-to-complete`, { params })
      const lineItems = response.data.data.lineItems || []
      setDetailSummary(response.data.data.summary || {})
      setProgressReportInfo(response.data.data.progressReport || null)
      
      // Check if there's a saved forecast for this period and load its values
      try {
        const forecastsResponse = await api.get(`/api/financial/${jobId}/cost-to-complete/forecasts`)
        const existing = forecastsResponse.data.data.find(
          f => f.forecastPeriod === selectedPeriod && f.status !== 'archived'
        )
        if (existing && existing.lineItems && existing.lineItems.length > 0) {
          // Merge saved forecast values with current data
          const mergedData = lineItems.map(item => {
            const saved = existing.lineItems.find(
              li => li.area === item.area && li.system === item.system
            )
            return saved ? {
              ...item,
              forecastedFinalCost: saved.forecastedFinalCost || item.totalCost,
              forecastedFinalValue: saved.forecastedFinalValue || item.totalValue
            } : {
              ...item,
              forecastedFinalCost: item.forecastedFinalCost || item.totalCost,
              forecastedFinalValue: item.forecastedFinalValue || item.totalValue
            }
          })
          setDetailData(mergedData)
        } else {
          // Initialize with default values (SOV values)
          const initializedData = lineItems.map(item => ({
            ...item,
            forecastedFinalCost: item.forecastedFinalCost || item.totalCost,
            forecastedFinalValue: item.forecastedFinalValue || item.totalValue
          }))
          setDetailData(initializedData)
        }
      } catch (err) {
        // If no saved forecast, initialize with SOV values
        const initializedData = lineItems.map(item => ({
          ...item,
          forecastedFinalCost: item.forecastedFinalCost || item.totalCost,
          forecastedFinalValue: item.forecastedFinalValue || item.totalValue
        }))
        setDetailData(initializedData)
      }
    } catch (error) {
      toast.error('Failed to load cost to complete data')
      console.error('Error fetching detail data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveForecast = async () => {
    try {
      // Calculate updated summary
      const updatedSummary = {
        ...detailSummary,
        forecastFinalCost: detailData.reduce((sum, item) => sum + (item.forecastedFinalCost || 0), 0),
        forecastFinalValue: detailData.reduce((sum, item) => sum + (item.forecastedFinalValue || 0), 0)
      }
      updatedSummary.forecastVariance = updatedSummary.forecastFinalCost - updatedSummary.totalBudget
      updatedSummary.forecastVariancePercent = updatedSummary.totalBudget > 0 
        ? (updatedSummary.forecastVariance / updatedSummary.totalBudget) * 100 
        : 0
      updatedSummary.marginAtCompletion = updatedSummary.forecastFinalValue - updatedSummary.forecastFinalCost
      updatedSummary.marginAtCompletionPercent = updatedSummary.forecastFinalValue > 0
        ? (updatedSummary.marginAtCompletion / updatedSummary.forecastFinalValue) * 100
        : 0

      const payload = {
        forecastPeriod: selectedPeriod,
        lineItems: detailData,
        summary: updatedSummary,
        progressReport: {
          id: progressReportInfo?.id || progressReportInfo?._id,
          reportNumber: progressReportInfo?.reportNumber,
          reportDate: progressReportInfo?.reportDate
        },
        status: 'submitted' // Always submitted, no draft
      }

      await api.post(`/api/financial/${jobId}/cost-to-complete/submit`, payload)
      toast.success('Forecast saved successfully')
      
      // Refresh forecasts list and available progress reports
      await fetchForecasts()
      await fetchAnalytics()
      // Return to table view
      setSearchParams({ view: 'table' })
    } catch (error) {
      toast.error('Failed to save forecast')
      console.error('Error saving forecast:', error)
    }
  }

  const handleCreateForecast = async () => {
    if (!selectedProgressReportId) {
      toast.error('Please select a progress report')
      return
    }

    try {
      // Find the selected progress report
      const selectedReport = availableProgressReports.find(r => 
        (r._id?.toString() || r.id?.toString()) === selectedProgressReportId
      )

      if (!selectedReport) {
        toast.error('Selected progress report not found')
        return
      }

      // Determine the forecast period based on the progress report date
      if (!jobInfo) {
        toast.error('Job information not loaded')
        return
      }

      const reportDate = new Date(selectedReport.reportDate)
      const jobStart = new Date(jobInfo.startDate)
      const monthDiff = (reportDate.getFullYear() - jobStart.getFullYear()) * 12 + 
                        (reportDate.getMonth() - jobStart.getMonth()) + 1
      const forecastPeriod = `Month ${monthDiff}`

      // Navigate to detail view with this period
      // The detail view will automatically load the data for this progress report
      setSearchParams({ view: 'detail', period: forecastPeriod })
      setIsCreateModalOpen(false)
      setSelectedProgressReportId('')
      
      toast.success('Forecast created. Please review and save.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create forecast')
      console.error('Error creating forecast:', error)
    }
  }

  const handleDeleteForecast = async (forecastId, forecastPeriod) => {
    if (!forecastId) {
      toast.error('Cannot delete: Forecast not saved yet')
      return
    }

    if (!window.confirm(`Are you sure you want to delete the forecast for ${forecastPeriod}? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/api/financial/${jobId}/cost-to-complete/forecast/${forecastId}`)
      toast.success('Forecast deleted successfully')
      // Refresh forecasts list and available progress reports
      await fetchForecasts()
      await fetchAnalytics()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete forecast')
      console.error('Error deleting forecast:', error)
    }
  }

  const handleCellEdit = (rowIndex, field, value) => {
    const updated = [...detailData]
    updated[rowIndex] = {
      ...updated[rowIndex],
      [field]: parseFloat(value) || 0
    }
    setDetailData(updated)
    setEditingCell(null)
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

  // TABLE VIEW - List of all forecasts
  if (viewMode === 'table') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cost to Complete</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monthly forecasts based on approved progress reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Forecast
            </button>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
        </div>

        {/* Forecasts Table - MOVED TO TOP */}
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
                {(() => {
                  // Use periods from forecasts array (backend only returns periods with progress reports)
                  // Filter to only show periods that have actual data
                  const validForecasts = forecasts.filter(f => {
                    // Exclude archived
                    if (f.status === 'archived') return false;
                    // Exclude periods without progress reports (empty summaries)
                    if (f.status === 'not_created' && (!f.summary || Object.keys(f.summary).length === 0)) return false;
                    // Only include if summary has actual data
                    return f.summary && Object.keys(f.summary).length > 0 && f.summary.forecastFinalCost !== undefined;
                  })
                  
                  return validForecasts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-500">
                        No periods with progress reports available for this job
                      </td>
                    </tr>
                  ) : (
                    validForecasts.map((forecast) => {
                      const summary = forecast.summary || {}
                      // hasForecast = has actual data (saved forecast OR generated with summary data)
                      const hasData = summary && Object.keys(summary).length > 0 && summary.forecastFinalCost !== undefined
                      const isSaved = forecast.status !== 'not_created' && forecast._id
                      
                      // Extract period info from forecast
                      const period = {
                        label: forecast.forecastPeriod,
                        number: forecast.monthNumber,
                        date: forecast.progressReportDate ? new Date(forecast.progressReportDate) : null
                      }
                      
                      return (
                        <tr key={forecast._id || period.label} className={`hover:bg-gray-50 ${!hasData ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {period.label}
                            {period.date && (
                              <div className="text-xs text-gray-500">
                                {period.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </div>
                            )}
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
                            {hasData ? formatCurrency(summary.forecastFinalCost || 0) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                            {hasData ? formatCurrency(summary.forecastFinalValue || 0) : '-'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                            hasData ? ((summary.marginAtCompletion || 0) >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'
                          }`}>
                            {hasData ? `${formatCurrency(summary.marginAtCompletion || 0)} (${formatPercent(summary.marginAtCompletionPercent || 0)})` : '-'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                            hasData ? ((summary.cpi || 0) >= 1 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'
                          }`}>
                            {hasData && summary.cpi ? summary.cpi.toFixed(3) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isSaved ? (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(forecast.status)}`}>
                                {forecast.status}
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">
                                {hasData ? 'Generated' : 'Not Created'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {isSaved && forecast.createdAt ? new Date(forecast.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSearchParams({ view: 'detail', period: period.label })
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title={hasData ? "Edit" : "Create"}
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              {isSaved && (
                                <button
                                  onClick={() => handleDeleteForecast(forecast._id, period.label)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Forecast"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics Summary - Calculate from forecasts */}
        {(() => {
          // Only include forecasts with actual data (not empty summaries)
          const savedForecasts = forecasts.filter(f => {
            if (f.status === 'archived') return false;
            // Exclude periods without progress reports (empty summaries)
            if (f.status === 'not_created' && (!f.summary || Object.keys(f.summary).length === 0)) return false;
            // Only include if summary has actual data
            return f.summary && Object.keys(f.summary).length > 0 && f.summary.forecastFinalCost !== undefined;
          })
          const totalForecasts = savedForecasts.length
          
          let totalCPI = 0
          let totalMargin = 0
          let validForecasts = 0
          let latestForecast = null
          
          savedForecasts.forEach(forecast => {
            const summary = forecast.summary || {}
            if (summary.cpi) {
              totalCPI += summary.cpi
              validForecasts++
            }
            if (summary.marginAtCompletion) {
              totalMargin += summary.marginAtCompletion
            }
          })
          
          if (savedForecasts.length > 0) {
            latestForecast = savedForecasts[savedForecasts.length - 1]
          }
          
          const averageCPI = validForecasts > 0 ? totalCPI / validForecasts : 0
          const averageMargin = savedForecasts.length > 0 ? totalMargin / savedForecasts.length : 0
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white shadow rounded-lg p-6">
                <p className="text-sm font-medium text-gray-500">Total Forecasts</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{totalForecasts}</p>
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <p className="text-sm font-medium text-gray-500">Average CPI</p>
                <p className={`text-2xl font-bold mt-2 ${
                  averageCPI >= 1 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {averageCPI.toFixed(3)}
                </p>
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <p className="text-sm font-medium text-gray-500">Average Margin</p>
                <p className={`text-2xl font-bold mt-2 ${
                  averageMargin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(averageMargin)}
                </p>
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <p className="text-sm font-medium text-gray-500">Latest Forecast</p>
                <p className="text-sm text-gray-900 mt-2">{latestForecast?.forecastPeriod || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  CPI: {latestForecast?.summary?.cpi?.toFixed(3) || 'N/A'}
                </p>
              </div>
            </div>
          )
        })()}

        {/* Charts - Build from forecasts data */}
        {showCharts && forecasts.length > 0 && (() => {
          // Build chart data from saved forecasts
          // Only include forecasts that have actual data (not empty summaries)
          const chartDataFromForecasts = forecasts
            .filter(f => {
              // Exclude archived and periods without progress reports (empty summaries)
              if (f.status === 'archived') return false;
              if (f.status === 'not_created' && (!f.summary || Object.keys(f.summary).length === 0)) return false;
              // Only include if summary has actual data
              return f.summary && Object.keys(f.summary).length > 0 && f.summary.forecastFinalCost !== undefined;
            })
            .sort((a, b) => a.monthNumber - b.monthNumber)
            .map(forecast => {
              const summary = forecast.summary || {}
              return {
                month: forecast.forecastPeriod,
                forecastFinalCost: summary.forecastFinalCost || 0,
                forecastFinalValue: summary.forecastFinalValue || 0,
                marginAtCompletion: summary.marginAtCompletion || 0,
                cpi: summary.cpi || 0,
                costToDate: summary.costToDate || 0,
                earnedToDate: summary.earnedToDate || 0,
                forecastVariance: summary.forecastVariance || 0
              }
            })
          
          if (chartDataFromForecasts.length === 0) return null
          
          return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forecast Cost vs Value Trend */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Cost vs Value Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartDataFromForecasts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="forecastFinalCost" stroke="#ef4444" name="Forecast Cost" strokeWidth={2} />
                  <Line type="monotone" dataKey="forecastFinalValue" stroke="#10b981" name="Forecast Value" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Margin at Completion Trend */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Margin at Completion Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataFromForecasts}>
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
                <LineChart data={chartDataFromForecasts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 2]} />
                  <Tooltip formatter={(value) => value.toFixed(3)} />
                  <Legend />
                  <Line type="monotone" dataKey="cpi" stroke="#8b5cf6" name="CPI" strokeWidth={2} />
                  <Line type="monotone" dataKey={1} stroke="#94a3b8" strokeDasharray="5 5" name="Target (1.0)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cost vs Earned Trend */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost vs Earned Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartDataFromForecasts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="costToDate" stroke="#f59e0b" name="Cost to Date" strokeWidth={2} />
                  <Line type="monotone" dataKey="earnedToDate" stroke="#10b981" name="Earned to Date" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast Variance Trend */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Variance vs Budget</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataFromForecasts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="forecastVariance" fill="#ef4444" name="Variance vs Budget" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )
        })()}

        {/* Create Forecast Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setIsCreateModalOpen(false)}>
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Forecast</h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setSelectedProgressReportId('')
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Progress Report
                </label>
                <select
                  value={selectedProgressReportId}
                  onChange={(e) => setSelectedProgressReportId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select a progress report --</option>
                  {availableProgressReports.map((report) => (
                    <option key={report._id || report.id} value={report._id || report.id}>
                      {report.reportNumber} - {new Date(report.reportDate).toLocaleDateString()} 
                      {' '}({report.summary?.calculatedPercentCTD?.toFixed(2) || 0}% Complete)
                    </option>
                  ))}
                </select>
                {availableProgressReports.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    No available progress reports. All approved reports have been used.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setSelectedProgressReportId('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateForecast}
                  disabled={!selectedProgressReportId || availableProgressReports.length === 0}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create Forecast
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // DETAIL VIEW - Line items for selected period
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchParams({ view: 'table' })}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Cost to Complete - {selectedPeriod}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {progressReportInfo && (
                <>Based on Progress Report {progressReportInfo.reportNumber} ({new Date(progressReportInfo.reportDate).toLocaleDateString()}) - {progressReportInfo.calculatedPercentCTD?.toFixed(2)}% Complete</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={saveForecast}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Save Forecast
        </button>
      </div>

      {/* Main Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            {jobInfo ? `${jobInfo.jobNumber} - ${jobInfo.name}` : ''} - {selectedPeriod}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost This Period ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Approved CTD (%)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">$ Earned (This Period)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fee ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fee (%)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Forecasted Final Cost ($) *</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Forecasted Final Value ($) *</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailData.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-8 text-center text-sm text-gray-500">
                    No data available for this forecast period
                  </td>
                </tr>
              ) : (
                detailData.map((item, index) => {
                  const feePositive = (item.fee || 0) >= 0
                  const feePercentPositive = (item.feePercent || 0) >= 0
                  const isEditingCost = editingCell?.rowIndex === index && editingCell?.field === 'forecastedFinalCost'
                  const isEditingValue = editingCell?.rowIndex === index && editingCell?.field === 'forecastedFinalValue'
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.jobCode || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {item.area || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {item.system || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.totalValue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {formatCurrency(item.costThisPeriod)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {formatPercent(item.approvedCTD)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                        {formatCurrency(item.earnedThisPeriod)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        feePositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(item.fee)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        feePercentPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercent(item.feePercent)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 bg-blue-50">
                        {isEditingCost ? (
                          <input
                            type="number"
                            defaultValue={item.forecastedFinalCost || item.totalCost}
                            onBlur={(e) => handleCellEdit(index, 'forecastedFinalCost', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(index, 'forecastedFinalCost', e.target.value)
                              }
                            }}
                            className="w-full text-right border border-blue-300 rounded px-2 py-1"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ rowIndex: index, field: 'forecastedFinalCost' })}
                            className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded flex items-center justify-end gap-1"
                          >
                            {formatCurrency(item.forecastedFinalCost || item.totalCost)}
                            <PencilIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 bg-blue-50">
                        {isEditingValue ? (
                          <input
                            type="number"
                            defaultValue={item.forecastedFinalValue || item.totalValue}
                            onBlur={(e) => handleCellEdit(index, 'forecastedFinalValue', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(index, 'forecastedFinalValue', e.target.value)
                              }
                            }}
                            className="w-full text-right border border-blue-300 rounded px-2 py-1"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ rowIndex: index, field: 'forecastedFinalValue' })}
                            className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded flex items-center justify-end gap-1"
                          >
                            {formatCurrency(item.forecastedFinalValue || item.totalValue)}
                            <PencilIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">* Click to edit forecasted values</p>
        </div>
      </div>

      {/* Forecast Summary */}
      {detailSummary && Object.keys(detailSummary).length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Forecast Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Column 1 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Contract (Total Value)</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(detailSummary.contractTotalValue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Margin at Completion (MAC)</p>
                <p className={`text-lg font-bold mt-1 ${
                  (detailSummary.marginAtCompletion || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(detailSummary.marginAtCompletion)} ({formatPercent(detailSummary.marginAtCompletionPercent)})
                </p>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Budget (Cost)</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(detailSummary.totalBudget)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Forecast Variance vs Budget</p>
                <p className={`text-lg font-bold mt-1 ${
                  (detailSummary.forecastVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(detailSummary.forecastVariance)} ({formatPercent(detailSummary.forecastVariancePercent)})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">CPI (This Period)</p>
                <p className={`text-lg font-bold mt-1 ${
                  (detailSummary.cpi || 0) >= 1 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {detailSummary.cpi ? detailSummary.cpi.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Forecast Final Value</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(detailSummary.forecastFinalValue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Earned This Period</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(detailSummary.earnedThisPeriod)}
                </p>
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Forecast Final Cost</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(detailSummary.forecastFinalCost)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cost This Period</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(detailSummary.costThisPeriod)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CostToComplete

