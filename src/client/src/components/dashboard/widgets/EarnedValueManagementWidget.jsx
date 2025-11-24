import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import { CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline'

export default function EarnedValueManagementWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId

  const { data: evmData, isLoading } = useQuery({
    queryKey: ['earned-value-management', targetJobId],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const response = await api.get(`/api/financial/${targetJobId}/earned-vs-burned`)
        return response.data.totals || {}
      } catch (error) {
        console.error('Error fetching EVM data:', error)
        return null
      }
    },
    enabled: !!targetJobId,
    staleTime: 60 * 1000,
  })

  const { data: job } = useQuery({
    queryKey: ['job', targetJobId],
    queryFn: () => api.get(`/api/jobs/${targetJobId}`).then(res => res.data.data),
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

  const formatNumber = (value, decimals = 2) => {
    return (value || 0).toFixed(decimals)
  }

  if (!targetJobId) {
    return (
      <Widget
        id={id}
        type="earnedValueManagement"
        title="Earned Value Management"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view EVM metrics</div>
      </Widget>
    )
  }

  if (!evmData) {
    return (
      <Widget
        id={id}
        type="earnedValueManagement"
        title={job ? `${job.name} - EVM` : 'Earned Value Management'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No EVM data available</div>
      </Widget>
    )
  }

  const {
    budgetAtCompletion = 0,
    earnedValue = 0,
    actualCost = 0,
    costVariance = 0,
    scheduleVariance = 0,
    cpi = 0,
    spi = 0,
    estimateAtCompletion = 0,
    estimateToComplete = 0,
    varianceAtCompletion = 0,
    tcpi = 0,
    overallProgress = 0,
  } = evmData

  return (
    <Widget
      id={id}
      type="earnedValueManagement"
      title={job ? `${job.name} - EVM` : 'Earned Value Management'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Budget at Completion (BAC)</div>
            <div className="text-lg font-bold text-blue-900">{formatCurrency(budgetAtCompletion)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Earned Value (EV)</div>
            <div className="text-lg font-bold text-green-900">{formatCurrency(earnedValue)}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Actual Cost (AC)</div>
            <div className="text-lg font-bold text-red-900">{formatCurrency(actualCost)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Estimate at Completion (EAC)</div>
            <div className="text-lg font-bold text-purple-900">{formatCurrency(estimateAtCompletion)}</div>
          </div>
        </div>

        {/* Performance Indices */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Performance Indices</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">CPI</div>
              <div className={`text-xl font-bold ${
                cpi >= 1.0 ? 'text-green-600' : cpi >= 0.9 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {formatNumber(cpi, 3)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">SPI</div>
              <div className={`text-xl font-bold ${
                spi >= 1.0 ? 'text-green-600' : spi >= 0.9 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {formatNumber(spi, 3)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">TCPI</div>
              <div className="text-xl font-bold text-gray-900">{formatNumber(tcpi, 3)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Progress</div>
              <div className="text-xl font-bold text-gray-900">{formatNumber(overallProgress, 1)}%</div>
            </div>
          </div>
        </div>

        {/* Variances */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Variances</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cost Variance (CV):</span>
              <span className={`font-medium ${
                costVariance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(costVariance)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Schedule Variance (SV):</span>
              <span className={`font-medium ${
                scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(scheduleVariance)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Variance at Completion (VAC):</span>
              <span className={`font-medium ${
                varianceAtCompletion >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(varianceAtCompletion)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimate to Complete (ETC):</span>
              <span className="font-medium text-gray-900">{formatCurrency(estimateToComplete)}</span>
            </div>
          </div>
        </div>

        {targetJobId && (
          <Link
            to={`/jobs/${targetJobId}`}
            className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
          >
            View Detailed Reports →
          </Link>
        )}
      </div>
    </Widget>
  )
}

