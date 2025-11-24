import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import { DocumentTextIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function ProgressReportStatusWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['progress-report-status', targetJobId],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const response = await api.get(`/api/financial/${targetJobId}/progress-reports`)
        const reports = response.data.data || []

        const byStatus = {
          draft: reports.filter(r => r.status === 'draft').length,
          submitted: reports.filter(r => r.status === 'submitted').length,
          reviewed: reports.filter(r => r.status === 'reviewed').length,
          approved: reports.filter(r => r.status === 'approved').length,
          invoiced: reports.filter(r => r.status === 'invoiced').length,
        }

        const latestReport = reports.length > 0 
          ? reports.sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate))[0]
          : null

        const approvedReports = reports.filter(r => r.status === 'approved')
        const totalApprovedCTD = approvedReports.reduce((sum, r) => 
          sum + (r.summary?.totalApprovedCTD?.amount || 0), 0
        )

        return {
          totalReports: reports.length,
          byStatus,
          latestReport,
          totalApprovedCTD,
          awaitingApproval: byStatus.submitted + byStatus.reviewed,
        }
      } catch (error) {
        console.error('Error fetching progress report data:', error)
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
        type="progressReportStatus"
        title="Progress Report Status"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view progress reports</div>
      </Widget>
    )
  }

  if (!progressData) {
    return (
      <Widget
        id={id}
        type="progressReportStatus"
        title={job ? `${job.name} - Progress Reports` : 'Progress Report Status'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No progress report data available</div>
      </Widget>
    )
  }

  const { totalReports, byStatus, latestReport, totalApprovedCTD, awaitingApproval } = progressData

  return (
    <Widget
      id={id}
      type="progressReportStatus"
      title={job ? `${job.name} - Progress Reports` : 'Progress Report Status'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* Total Reports */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Total Reports</div>
          <div className="text-2xl font-bold text-gray-900">{totalReports}</div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2">
          {awaitingApproval > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">Awaiting Approval</span>
                </div>
                <span className="text-sm font-bold text-yellow-900">{awaitingApproval}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Draft:</span>
              <span className="font-medium">{byStatus.draft}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted:</span>
              <span className="font-medium">{byStatus.submitted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reviewed:</span>
              <span className="font-medium">{byStatus.reviewed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Approved:</span>
              <span className="font-medium text-green-600">{byStatus.approved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoiced:</span>
              <span className="font-medium text-blue-600">{byStatus.invoiced}</span>
            </div>
          </div>
        </div>

        {/* Latest Report */}
        {latestReport && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Latest Report</div>
            <div className="text-sm font-medium text-gray-900">{latestReport.reportNumber}</div>
            <div className="text-xs text-gray-500">
              {format(new Date(latestReport.reportDate), 'MMM d, yyyy')} • {latestReport.status}
            </div>
          </div>
        )}

        {/* Approved CTD */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Total Approved CTD</div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(totalApprovedCTD)}</div>
        </div>

        {targetJobId && (
          <Link
            to={`/jobs/${targetJobId}`}
            className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
          >
            View All Reports →
          </Link>
        )}
      </div>
    </Widget>
  )
}

