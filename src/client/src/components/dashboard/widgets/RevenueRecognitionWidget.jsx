import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import { CurrencyDollarIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default function RevenueRecognitionWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-recognition', targetJobId],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const progressReportsResponse = await api.get(`/api/financial/${targetJobId}/progress-reports?status=approved`)
          .catch(() => ({ data: { data: [] } }))

        const progressReports = progressReportsResponse.data?.data || []
        
        // Calculate totals
        const totalRecognizedRevenue = progressReports.reduce((sum, pr) => 
          sum + (pr.summary?.totalApprovedCTD?.amount || 0), 0
        )
        
        const totalInvoiced = progressReports.reduce((sum, pr) => 
          sum + (pr.summary?.totalDueThisPeriod || 0), 0
        )
        
        const totalHoldback = progressReports.reduce((sum, pr) => 
          sum + (pr.summary?.totalHoldbackThisPeriod || 0), 0
        )
        
        const overUnderBilling = totalInvoiced - totalRecognizedRevenue
        
        const latestPR = progressReports.length > 0 ? progressReports[0] : null

        return {
          totalRecognizedRevenue,
          totalInvoiced,
          totalHoldback,
          overUnderBilling,
          progressReportCount: progressReports.length,
          latestPR,
        }
      } catch (error) {
        console.error('Error fetching revenue data:', error)
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
        type="revenueRecognition"
        title="Revenue Recognition"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view revenue recognition</div>
      </Widget>
    )
  }

  if (!revenueData) {
    return (
      <Widget
        id={id}
        type="revenueRecognition"
        title={job ? `${job.name} - Revenue` : 'Revenue Recognition'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No revenue data available</div>
      </Widget>
    )
  }

  const { totalRecognizedRevenue, totalInvoiced, totalHoldback, overUnderBilling, progressReportCount } = revenueData

  return (
    <Widget
      id={id}
      type="revenueRecognition"
      title={job ? `${job.name} - Revenue Recognition` : 'Revenue Recognition'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Recognized Revenue</div>
            <div className="text-lg font-bold text-green-600">{formatCurrency(totalRecognizedRevenue)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Total Invoiced</div>
            <div className="text-lg font-bold text-blue-600">{formatCurrency(totalInvoiced)}</div>
          </div>
        </div>

        {/* Over/Under Billing */}
        <div className={`p-3 rounded-lg ${
          overUnderBilling >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="text-xs text-gray-600 mb-1">Over/Under Billing</div>
          <div className={`text-xl font-bold ${
            overUnderBilling >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {overUnderBilling >= 0 ? '+' : ''}{formatCurrency(overUnderBilling)}
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-3 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Holdback:</span>
            <span className="font-medium">{formatCurrency(totalHoldback)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Progress Reports:</span>
            <span className="font-medium">{progressReportCount}</span>
          </div>
        </div>

        {targetJobId && (
          <Link
            to={`/jobs/${targetJobId}`}
            className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
          >
            View Progress Reports →
          </Link>
        )}
      </div>
    </Widget>
  )
}

