import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { 
  DocumentArrowDownIcon,
  DocumentCheckIcon,
  CalendarIcon,
  ArrowLeftIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const CostToCompleteReport = () => {
  const { jobId } = useParams()
  const [reportData, setReportData] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [forecastPeriod, setForecastPeriod] = useState('')
  const [jobInfo, setJobInfo] = useState(null)
  const [availableMonths, setAvailableMonths] = useState([])
  const [progressReportInfo, setProgressReportInfo] = useState(null)
  const [existingForecast, setExistingForecast] = useState(null)
  const [searchParams] = useSearchParams()
  const forecastId = searchParams.get('forecastId')

  // Calculate available months based on job duration
  const calculateAvailableMonths = (startDate, endDate) => {
    if (!startDate || !endDate) return []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const months = []
    
    const current = new Date(start)
    current.setDate(1) // Start of month
    let monthNumber = 1
    
    while (current <= end && monthNumber <= 12) {
      months.push({
        number: monthNumber,
        label: `Month ${monthNumber}`,
        date: new Date(current)
      })
      current.setMonth(current.getMonth() + 1)
      monthNumber++
    }
    
    return months
  }

  useEffect(() => {
    if (jobId) {
      fetchJobInfo()
    }
  }, [jobId])

  useEffect(() => {
    if (jobId && jobInfo) {
      // Calculate available months from job dates
      const months = calculateAvailableMonths(jobInfo.startDate, jobInfo.endDate)
      setAvailableMonths(months)
      
      // Set default forecast period to first available month if not set
      if (!forecastPeriod && months.length > 0) {
        setForecastPeriod(months[0].label)
      }
    }
  }, [jobId, jobInfo])

  useEffect(() => {
    if (jobId && forecastPeriod) {
      fetchReportData()
    }
  }, [jobId, forecastPeriod])

  useEffect(() => {
    if (forecastId && jobId) {
      fetchExistingForecast()
    }
  }, [forecastId, jobId])

  const fetchExistingForecast = async () => {
    try {
      const response = await api.get(`/api/financial/${jobId}/cost-to-complete/forecast/${forecastId}`)
      const forecast = response.data.data
      setExistingForecast(forecast)
      
      // Load forecast data into the form
      if (forecast.lineItems && forecast.lineItems.length > 0) {
        setReportData(forecast.lineItems)
        setSummary(forecast.summary || {})
        setForecastPeriod(forecast.forecastPeriod)
        setProgressReportInfo({
          reportNumber: forecast.progressReportNumber,
          reportDate: forecast.progressReportDate,
          id: forecast.progressReportId
        })
      }
    } catch (error) {
      console.error('Error fetching existing forecast:', error)
    }
  }

  const fetchJobInfo = async () => {
    try {
      const response = await api.get(`/api/jobs/${jobId}`)
      const job = response.data.data
      setJobInfo(job)
    } catch (error) {
      console.error('Error fetching job info:', error)
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const params = forecastPeriod ? { forecastPeriod } : {}
      const response = await api.get(`/api/financial/${jobId}/cost-to-complete`, { params })
      setReportData(response.data.data.lineItems || [])
      setSummary(response.data.data.summary || {})
      setProgressReportInfo(response.data.data.progressReport || null)
      if (!forecastPeriod && response.data.data.forecastPeriod) {
        setForecastPeriod(response.data.data.forecastPeriod)
      }
      
      // Check if there's an existing forecast for this period (if not editing via forecastId)
      if (!forecastId && forecastPeriod) {
        try {
          const forecastsResponse = await api.get(`/api/financial/${jobId}/cost-to-complete/forecasts`, {
            params: { status: 'all' }
          })
          const existing = forecastsResponse.data.data.find(
            f => f.forecastPeriod === forecastPeriod && f.status !== 'archived'
          )
          if (existing) {
            setExistingForecast(existing)
            // Optionally load the saved forecast data
            if (existing.lineItems && existing.lineItems.length > 0) {
              setReportData(existing.lineItems)
              setSummary(existing.summary || {})
            }
          } else {
            setExistingForecast(null)
          }
        } catch (err) {
          // Ignore errors when checking for existing forecasts
          console.error('Error checking for existing forecast:', err)
        }
      }
    } catch (error) {
      toast.error('Failed to load cost to complete report')
      console.error('Error fetching cost to complete report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '0.00%'
    return `${value.toFixed(2)}%`
  }

  const exportReport = () => {
    const headers = [
      'Job Code',
      'Area',
      'System',
      'Total Cost ($)',
      'Total Value ($)',
      'Cost This Period ($)',
      'Approved CTD (%)',
      '$ Earned (This Period)',
      'Fee ($)',
      'Fee (%)',
      'Forecasted Final Cost ($)',
      'Forecasted Final Value ($)'
    ]
    
    const rows = reportData.map(item => [
      item.jobCode || '',
      item.area || '',
      item.system || '',
      item.totalCost || 0,
      item.totalValue || 0,
      item.costThisPeriod || 0,
      item.approvedCTD || 0,
      item.earnedThisPeriod || 0,
      item.fee || 0,
      item.feePercent || 0,
      item.forecastedFinalCost || 0,
      item.forecastedFinalValue || 0
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cost-to-complete-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Report exported successfully')
  }

  const submitForecast = async (submitStatus = 'draft') => {
    try {
      const payload = {
        forecastPeriod,
        lineItems: reportData,
        summary,
        progressReport: {
          id: progressReportInfo?.id || progressReportInfo?._id,
          reportNumber: progressReportInfo?.reportNumber,
          reportDate: progressReportInfo?.reportDate
        },
        status: existingForecast ? existingForecast.status : submitStatus
      }

      if (existingForecast) {
        // Update existing forecast
        await api.put(`/api/financial/${jobId}/cost-to-complete/forecast/${existingForecast._id}`, payload)
        toast.success('Forecast updated successfully')
      } else {
        // Create new forecast
        await api.post(`/api/financial/${jobId}/cost-to-complete/submit`, payload)
        toast.success(submitStatus === 'submitted' ? 'Forecast submitted successfully' : 'Forecast saved successfully')
      }
      
      // Refresh to show updated status
      fetchReportData()
      if (existingForecast) {
        fetchExistingForecast()
      }
    } catch (error) {
      toast.error('Failed to submit forecast')
      console.error('Error submitting forecast:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentMonth = forecastPeriod || `Month ${summary.currentMonth || 1}`
  const projectName = jobInfo ? `${jobInfo.jobNumber} - ${jobInfo.name}` : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/jobs/${jobId}/cost-to-complete/forecasts`}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Cost to Complete Report
              {existingForecast && (
                <span className="ml-3 text-lg font-normal text-gray-500">
                  (Editing: {existingForecast.forecastPeriod})
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monthly forecast entry and analysis based on approved progress and actual costs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <select
              value={forecastPeriod}
              onChange={(e) => setForecastPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Period</option>
              {availableMonths.map(month => (
                <option key={month.number} value={month.label}>
                  {month.label} ({month.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={exportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export
          </button>
          <Link
            to={`/jobs/${jobId}/cost-to-complete/forecasts`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            View All Forecasts
          </Link>
          <button
            onClick={() => submitForecast('draft')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => submitForecast('submitted')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <DocumentCheckIcon className="h-5 w-5 mr-2" />
            {existingForecast ? 'Update Forecast' : 'Submit Forecast'}
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Project: {projectName} - {currentMonth}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Forecast Period: {currentMonth}</p>
              {progressReportInfo && (
                <p className="text-xs text-gray-500 mt-1">
                  Based on Progress Report: <span className="font-medium">{progressReportInfo.reportNumber}</span> 
                  {' '}({new Date(progressReportInfo.reportDate).toLocaleDateString()}) - 
                  {' '}{progressReportInfo.calculatedPercentCTD?.toFixed(2)}% Complete
                </p>
              )}
            </div>
          </div>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecasted Final Cost ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecasted Final Value ($)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-8 text-center text-sm text-gray-500">
                    No data available for this forecast period
                  </td>
                </tr>
              ) : (
                reportData.map((item, index) => {
                  const feePositive = (item.fee || 0) >= 0
                  const feePercentPositive = (item.feePercent || 0) >= 0
                  
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.forecastedFinalCost)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.forecastedFinalValue)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forecast Summary */}
      {summary && Object.keys(summary).length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Forecast Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Column 1 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Contract (Total Value)</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.contractTotalValue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Margin at Completion (MAC)</p>
                <p className={`text-lg font-bold mt-1 ${
                  (summary.marginAtCompletion || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(summary.marginAtCompletion)} ({formatPercent(summary.marginAtCompletionPercent)})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Period Fee</p>
                <p className={`text-lg font-bold mt-1 ${
                  (summary.periodFee || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(summary.periodFee)} ({formatPercent(summary.periodFeePercent)})
                </p>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Budget (Cost)</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.totalBudget)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Forecast Variance vs Budget</p>
                <p className={`text-lg font-bold mt-1 ${
                  (summary.forecastVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(summary.forecastVariance)} ({formatPercent(summary.forecastVariancePercent)})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">CPI (This Period)</p>
                <p className={`text-lg font-bold mt-1 ${
                  (summary.cpi || 0) >= 1 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.cpi ? summary.cpi.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Forecast Final Value</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.forecastFinalValue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Earned This Period</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.earnedThisPeriod)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Lines Over Budget</p>
                <p className={`text-lg font-bold mt-1 ${
                  (summary.linesOverBudget || 0) > 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {summary.linesOverBudget || 0}
                </p>
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Forecast Final Cost</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.forecastFinalCost)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cost This Period</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.costThisPeriod)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Lines with Negative Fee</p>
                <p className={`text-lg font-bold mt-1 ${
                  (summary.linesWithNegativeFee || 0) > 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {summary.linesWithNegativeFee || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Insights */}
          {summary.insights && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Insights:</span> {summary.insights}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CostToCompleteReport

