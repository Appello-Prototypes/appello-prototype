import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import { ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function CostBreakdownWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId
  const breakdownType = config.breakdownType || 'category' // 'category', 'costCode', 'system'

  const { data: costData, isLoading } = useQuery({
    queryKey: ['cost-breakdown', targetJobId, breakdownType],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const [
          earnedVsBurnedResponse,
          timelogResponse,
          apResponse,
        ] = await Promise.all([
          api.get(`/api/financial/${targetJobId}/earned-vs-burned`).catch(() => ({ data: { totals: {} } })),
          api.get(`/api/financial/${targetJobId}/timelog-register`).catch(() => ({ data: { data: [], meta: {} } })),
          api.get(`/api/financial/${targetJobId}/ap-register`).catch(() => ({ data: { data: [] } })),
        ])

        const evm = earnedVsBurnedResponse.data?.totals || {}
        const timelogData = timelogResponse.data?.data || []
        const timelogMeta = timelogResponse.data?.meta || {}
        const apData = apResponse.data?.data || []

        // Calculate labor cost
        const laborCost = timelogMeta.totalCost || timelogData.reduce((sum, entry) => 
          sum + (entry.totalCostWithBurden || entry.totalCost || 0), 0
        )

        // Calculate material/AP cost
        const materialCost = apData.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

        // Total actual cost
        const totalCost = evm.actualCost || (laborCost + materialCost)

        return {
          laborCost,
          materialCost,
          totalCost,
          laborPercent: totalCost > 0 ? (laborCost / totalCost) * 100 : 0,
          materialPercent: totalCost > 0 ? (materialCost / totalCost) * 100 : 0,
        }
      } catch (error) {
        console.error('Error fetching cost breakdown:', error)
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

  if (!targetJobId) {
    return (
      <Widget
        id={id}
        type="costBreakdown"
        title="Cost Breakdown"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view cost breakdown</div>
      </Widget>
    )
  }

  if (!costData) {
    return (
      <Widget
        id={id}
        type="costBreakdown"
        title={job ? `${job.name} - Cost Breakdown` : 'Cost Breakdown'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No cost data available</div>
      </Widget>
    )
  }

  const { laborCost, materialCost, totalCost, laborPercent, materialPercent } = costData

  return (
    <Widget
      id={id}
      type="costBreakdown"
      title={job ? `${job.name} - Cost Breakdown` : 'Cost Breakdown'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* Total Cost */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Total Cost</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          {/* Labor Cost */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Labor Cost</span>
              <span className="font-medium">{laborPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-blue-500"
                style={{ width: `${laborPercent}%` }}
              />
            </div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {formatCurrency(laborCost)}
            </div>
          </div>

          {/* Material Cost */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Material Cost</span>
              <span className="font-medium">{materialPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-500"
                style={{ width: `${materialPercent}%` }}
              />
            </div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {formatCurrency(materialCost)}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xs text-gray-500">Labor</div>
            <div className="text-lg font-bold text-blue-600">{formatCurrency(laborCost)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Materials</div>
            <div className="text-lg font-bold text-green-600">{formatCurrency(materialCost)}</div>
          </div>
        </div>

        {targetJobId && (
          <Link
            to={`/jobs/${targetJobId}`}
            className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
          >
            View Detailed Costs →
          </Link>
        )}
      </div>
    </Widget>
  )
}

