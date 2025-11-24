import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import {
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

export default function PortfolioPerformanceWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { data: jobs } = useQuery({
    queryKey: ['jobs-portfolio'],
    queryFn: () => api.get('/api/jobs').then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const { data: portfolioMetrics, isLoading } = useQuery({
    queryKey: ['portfolio-performance-metrics'],
    queryFn: async () => {
      if (!jobs || jobs.length === 0) return null
      
      const metricsPromises = jobs.map(async (job) => {
        try {
          const [
            earnedVsBurnedResponse,
            progressReportsResponse,
            sovResponse,
          ] = await Promise.all([
            api.get(`/api/financial/${job._id}/earned-vs-burned`).catch(() => ({ data: { totals: {} } })),
            api.get(`/api/financial/${job._id}/progress-reports?status=approved`).catch(() => ({ data: { data: [] } })),
            api.get(`/api/jobs/${job._id}/sov-components`).catch(() => ({ data: { data: { summary: {} } } })),
          ])

          const evm = earnedVsBurnedResponse.data?.totals || {}
          const progressReports = progressReportsResponse.data?.data || []
          const latestPR = progressReports.length > 0 ? progressReports[0] : null
          const sovSummary = sovResponse.data?.data?.summary || {}

          const totalBudget = sovSummary.totalValue || job.contractValue || 0
          const totalSpent = evm.actualCost || 0
          const earnedValue = evm.earnedValue || 0
          const cpi = evm.cpi || 0
          const spi = evm.spi || 0
          const progressPercent = latestPR?.summary?.calculatedPercentCTD || job.overallProgress || 0

          return {
            jobId: job._id,
            jobName: job.name,
            cpi,
            spi,
            totalBudget,
            totalSpent,
            earnedValue,
            progressPercent,
            status: job.status,
          }
        } catch (error) {
          return null
        }
      })

      const results = await Promise.all(metricsPromises)
      const validResults = results.filter(r => r !== null)
      
      if (validResults.length === 0) return null

      const totalContractValue = validResults.reduce((sum, j) => sum + j.totalBudget, 0)
      const totalEarnedValue = validResults.reduce((sum, j) => sum + j.earnedValue, 0)
      const totalActualCost = validResults.reduce((sum, j) => sum + j.totalSpent, 0)
      
      const cpis = validResults.filter(j => j.cpi > 0).map(j => j.cpi)
      const spis = validResults.filter(j => j.spi > 0).map(j => j.spi)
      
      const avgCPI = cpis.length > 0 ? cpis.reduce((sum, cpi) => sum + cpi, 0) / cpis.length : 0
      const avgSPI = spis.length > 0 ? spis.reduce((sum, spi) => sum + spi, 0) / spis.length : 0
      
      const jobsOnBudget = validResults.filter(j => j.cpi >= 1.0).length
      const jobsAtRisk = validResults.filter(j => j.cpi >= 0.9 && j.cpi < 1.0).length
      const jobsOverBudget = validResults.filter(j => j.cpi > 0 && j.cpi < 0.9).length
      
      const portfolioMargin = totalEarnedValue > 0 
        ? ((totalEarnedValue - totalActualCost) / totalEarnedValue) * 100 
        : 0

      return {
        totalJobs: validResults.length,
        totalContractValue,
        totalEarnedValue,
        totalActualCost,
        avgCPI,
        avgSPI,
        portfolioMargin,
        jobsOnBudget,
        jobsAtRisk,
        jobsOverBudget,
        jobsByStatus: {
          notStarted: validResults.filter(j => j.status === 'not_started').length,
          inProgress: validResults.filter(j => j.status === 'in_progress').length,
          completed: validResults.filter(j => j.status === 'completed').length,
          onHold: validResults.filter(j => j.status === 'on_hold').length,
        },
      }
    },
    enabled: !!jobs && jobs.length > 0,
    staleTime: 60 * 1000,
  })

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  const getCPIStatus = (cpi) => {
    if (cpi === 0 || !cpi) return { color: 'gray', label: 'No Data' }
    if (cpi >= 1.0) return { color: 'green', label: 'On Budget' }
    if (cpi >= 0.9) return { color: 'yellow', label: 'At Risk' }
    return { color: 'red', label: 'Over Budget' }
  }

  if (!portfolioMetrics) {
    return (
      <Widget
        id={id}
        type="portfolioPerformance"
        title="Portfolio Performance"
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No portfolio data available</div>
      </Widget>
    )
  }

  const cpiStatus = getCPIStatus(portfolioMetrics.avgCPI)

  return (
    <Widget
      id={id}
      type="portfolioPerformance"
      title="Portfolio Performance Summary"
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Total Contract Value</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(portfolioMetrics.totalContractValue)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Total Earned Value</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(portfolioMetrics.totalEarnedValue)}</div>
          </div>
        </div>

        {/* CPI Status */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Average CPI</div>
          <div className="flex items-center">
            <div className={`text-2xl font-bold ${
              cpiStatus.color === 'green' ? 'text-green-600' :
              cpiStatus.color === 'yellow' ? 'text-yellow-600' :
              cpiStatus.color === 'red' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {portfolioMetrics.avgCPI > 0 ? portfolioMetrics.avgCPI.toFixed(3) : 'N/A'}
            </div>
            <span className={`ml-2 text-sm px-2 py-1 rounded ${
              cpiStatus.color === 'green' ? 'bg-green-100 text-green-700' :
              cpiStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
              cpiStatus.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {cpiStatus.label}
            </span>
          </div>
        </div>

        {/* Job Status Breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
          <div>
            <div className="text-xs text-gray-500">On Budget</div>
            <div className="text-lg font-bold text-green-600">{portfolioMetrics.jobsOnBudget}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">At Risk</div>
            <div className="text-lg font-bold text-yellow-600">{portfolioMetrics.jobsAtRisk}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Over Budget</div>
            <div className="text-lg font-bold text-red-600">{portfolioMetrics.jobsOverBudget}</div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <div className="text-xs text-gray-500">Total Jobs</div>
            <div className="text-lg font-bold text-gray-900">{portfolioMetrics.totalJobs}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Portfolio Margin</div>
            <div className={`text-lg font-bold ${
              portfolioMetrics.portfolioMargin >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {portfolioMetrics.portfolioMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        <Link
          to="/jobs"
          className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
        >
          View All Jobs →
        </Link>
      </div>
    </Widget>
  )
}

