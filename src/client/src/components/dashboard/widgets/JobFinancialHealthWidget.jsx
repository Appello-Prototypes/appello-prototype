import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

export default function JobFinancialHealthWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId

  const { data: job } = useQuery({
    queryKey: ['job', targetJobId],
    queryFn: () => api.get(`/api/jobs/${targetJobId}`).then(res => res.data.data),
    enabled: !!targetJobId,
    staleTime: 60 * 1000,
  })

  const { data: financialMetrics, isLoading } = useQuery({
    queryKey: ['job-financial-health', targetJobId],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const [
          earnedVsBurnedResponse,
          progressReportsResponse,
          sovResponse,
          costToCompleteResponse,
        ] = await Promise.all([
          api.get(`/api/financial/${targetJobId}/earned-vs-burned`).catch(() => ({ data: { totals: {} } })),
          api.get(`/api/financial/${targetJobId}/progress-reports?status=approved`).catch(() => ({ data: { data: [] } })),
          api.get(`/api/jobs/${targetJobId}/sov-components`).catch(() => ({ data: { data: { summary: {} } } })),
          api.get(`/api/financial/${targetJobId}/cost-to-complete`).catch(() => ({ data: { data: {} } })),
        ])

        const evm = earnedVsBurnedResponse.data?.totals || {}
        const progressReports = progressReportsResponse.data?.data || []
        const latestPR = progressReports.length > 0 ? progressReports[0] : null
        const sovSummary = sovResponse.data?.data?.summary || {}
        const costToComplete = costToCompleteResponse.data?.data || {}

        const totalBudget = sovSummary.totalValue || job?.contractValue || 0
        const totalSpent = evm.actualCost || 0
        const earnedValue = evm.earnedValue || 0
        const cpi = evm.cpi || 0
        const spi = evm.spi || 0
        const costVariance = evm.costVariance || 0
        const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
        const remainingBudget = totalBudget - totalSpent
        const marginAtCompletion = costToComplete.summary?.marginAtCompletion || 0
        const progressPercent = latestPR?.summary?.calculatedPercentCTD || job?.overallProgress || 0

        return {
          cpi,
          spi,
          budgetUtilization,
          costVariance,
          remainingBudget,
          marginAtCompletion,
          totalBudget,
          totalSpent,
          earnedValue,
          progressPercent,
        }
      } catch (error) {
        console.error('Error fetching financial metrics:', error)
        return null
      }
    },
    enabled: !!targetJobId,
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

  const getStatus = () => {
    if (!financialMetrics || financialMetrics.cpi === 0) return { 
      label: 'No Data', 
      color: 'gray', 
      icon: XCircleIcon,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-300'
    }
    if (financialMetrics.cpi >= 1.0) return { 
      label: 'On Budget', 
      color: 'green', 
      icon: CheckCircleSolidIcon,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-300'
    }
    if (financialMetrics.cpi >= 0.9) return { 
      label: 'At Risk', 
      color: 'yellow', 
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300'
    }
    return { 
      label: 'Over Budget', 
      color: 'red', 
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-300'
    }
  }

  if (!targetJobId) {
    return (
      <Widget
        id={id}
        type="jobFinancialHealth"
        title="Job Financial Health"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view financial health</div>
      </Widget>
    )
  }

  const status = getStatus()
  const StatusIcon = status.icon

  return (
    <Widget
      id={id}
      type="jobFinancialHealth"
      title={job ? `${job.name} - Financial Health` : 'Job Financial Health'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {financialMetrics ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`${status.bgColor} ${status.borderColor} border-2 rounded-lg p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <StatusIcon className={`h-6 w-6 ${status.textColor} mr-2`} />
                <span className={`font-semibold ${status.textColor}`}>{status.label}</span>
              </div>
              <div className={`text-2xl font-bold ${status.textColor}`}>
                CPI: {financialMetrics.cpi > 0 ? financialMetrics.cpi.toFixed(3) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">SPI</div>
              <div className="text-lg font-bold text-gray-900">
                {financialMetrics.spi > 0 ? financialMetrics.spi.toFixed(3) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Budget Utilization</div>
              <div className={`text-lg font-bold ${
                financialMetrics.budgetUtilization > 100 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {financialMetrics.budgetUtilization.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Cost Variance</div>
              <div className={`text-lg font-bold ${
                financialMetrics.costVariance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(financialMetrics.costVariance)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Remaining Budget</div>
              <div className={`text-lg font-bold ${
                financialMetrics.remainingBudget >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}>
                {formatCurrency(financialMetrics.remainingBudget)}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Budget:</span>
              <span className="font-medium">{formatCurrency(financialMetrics.totalBudget)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Spent:</span>
              <span className="font-medium">{formatCurrency(financialMetrics.totalSpent)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Earned Value:</span>
              <span className="font-medium">{formatCurrency(financialMetrics.earnedValue)}</span>
            </div>
            {financialMetrics.marginAtCompletion !== 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-500">Margin at Completion:</span>
                <span className={`font-bold ${
                  financialMetrics.marginAtCompletion >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {financialMetrics.marginAtCompletion.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {targetJobId && (
            <Link
              to={`/jobs/${targetJobId}`}
              className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
            >
              View Job Details →
            </Link>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No financial data available</div>
      )}
    </Widget>
  )
}

