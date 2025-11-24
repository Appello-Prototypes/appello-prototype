import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import { ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function BudgetUtilizationWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId

  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['budget-utilization', targetJobId],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const [
          sovResponse,
          earnedVsBurnedResponse,
        ] = await Promise.all([
          api.get(`/api/jobs/${targetJobId}/sov-components`).catch(() => ({ data: { data: { summary: {} } } })),
          api.get(`/api/financial/${targetJobId}/earned-vs-burned`).catch(() => ({ data: { totals: {} } })),
        ])

        const sovSummary = sovResponse.data?.data?.summary || {}
        const evm = earnedVsBurnedResponse.data?.totals || {}

        const totalBudget = sovSummary.totalValue || 0
        const totalSpent = evm.actualCost || 0
        const remainingBudget = totalBudget - totalSpent
        const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
        const budgetBurnRate = totalBudget > 0 ? (totalSpent / totalBudget) : 0

        return {
          totalBudget,
          totalSpent,
          remainingBudget,
          budgetUtilization,
          budgetBurnRate,
        }
      } catch (error) {
        console.error('Error fetching budget data:', error)
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
        type="budgetUtilization"
        title="Budget Utilization"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view budget utilization</div>
      </Widget>
    )
  }

  if (!budgetData) {
    return (
      <Widget
        id={id}
        type="budgetUtilization"
        title={job ? `${job.name} - Budget` : 'Budget Utilization'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No budget data available</div>
      </Widget>
    )
  }

  const { totalBudget, totalSpent, remainingBudget, budgetUtilization } = budgetData

  return (
    <Widget
      id={id}
      type="budgetUtilization"
      title={job ? `${job.name} - Budget Utilization` : 'Budget Utilization'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* Utilization Percentage */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Budget Utilization</span>
            <span className={`font-medium ${
              budgetUtilization > 100 ? 'text-red-600' :
              budgetUtilization > 80 ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {budgetUtilization.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                budgetUtilization > 100 ? 'bg-red-500' :
                budgetUtilization > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            />
          </div>
        </div>

        {/* Budget Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Budget:</span>
            <span className="font-medium">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Spent:</span>
            <span className="font-medium text-red-600">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-500 font-medium">Remaining:</span>
            <span className={`font-bold ${
              remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(remainingBudget)}
            </span>
          </div>
        </div>

        {/* Visual Budget Bar */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Budget Breakdown</div>
          <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-red-500"
              style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
              {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
            </div>
          </div>
        </div>

        {targetJobId && (
          <Link
            to={`/jobs/${targetJobId}`}
            className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
          >
            View Budget Details →
          </Link>
        )}
      </div>
    </Widget>
  )
}

