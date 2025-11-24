import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

export default function JobPerformanceWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { data: jobs } = useQuery({
    queryKey: ['jobs-dashboard'],
    queryFn: () => api.get('/api/jobs').then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const { data: jobMetrics, isLoading } = useQuery({
    queryKey: ['job-performance-metrics'],
    queryFn: async () => {
      if (!jobs || jobs.length === 0) return []
      
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

          const totalBudget = sovSummary.totalValue || 0
          const totalSpent = evm.actualCost || 0
          const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
          const cpi = evm.cpi || 0
          const progressPercent = latestPR?.summary?.calculatedPercentCTD || job.overallProgress || 0

          return {
            jobId: job._id,
            jobName: job.name,
            jobNumber: job.jobNumber,
            cpi,
            progressPercent,
            budgetUtilization,
            totalBudget: totalBudget > 0 ? totalBudget : (job.contractValue || 0),
            totalSpent,
          }
        } catch (error) {
          return null
        }
      })

      const results = await Promise.all(metricsPromises)
      return results.filter(r => r !== null)
    },
    enabled: !!jobs && jobs.length > 0,
    staleTime: 60 * 1000,
  })

  const displayType = config.displayType || 'summary' // 'summary' or 'table'
  const maxItems = config.maxItems || 5

  const getCPIStatus = (cpi) => {
    if (cpi === 0 || !cpi) return { color: 'gray', label: 'No Data', icon: XCircleIcon }
    if (cpi >= 1.0) return { color: 'green', label: 'On Budget', icon: CheckCircleSolidIcon }
    if (cpi >= 0.9) return { color: 'yellow', label: 'At Risk', icon: ExclamationTriangleIcon }
    return { color: 'red', label: 'Over Budget', icon: XCircleIcon }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  if (displayType === 'summary' && jobMetrics) {
    const summaryMetrics = {
      totalJobs: jobMetrics.length,
      averageCPI: jobMetrics.reduce((sum, j) => sum + (j.cpi || 0), 0) / jobMetrics.filter(j => j.cpi > 0).length || 0,
      jobsOnBudget: jobMetrics.filter(j => j.cpi >= 1.0).length,
      jobsAtRisk: jobMetrics.filter(j => j.cpi >= 0.9 && j.cpi < 1.0).length,
      jobsOverBudget: jobMetrics.filter(j => j.cpi > 0 && j.cpi < 0.9).length,
    }

    const cpiStatus = getCPIStatus(summaryMetrics.averageCPI)

    return (
      <Widget
        id={id}
        type="jobPerformance"
        title="Job Performance Summary"
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Average CPI</div>
            <div className="flex items-center">
              <div className={`text-2xl font-bold ${
                cpiStatus.color === 'green' ? 'text-green-600' :
                cpiStatus.color === 'yellow' ? 'text-yellow-600' :
                cpiStatus.color === 'red' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {summaryMetrics.averageCPI > 0 ? summaryMetrics.averageCPI.toFixed(3) : 'N/A'}
              </div>
              <cpiStatus.icon className={`h-5 w-5 ml-2 ${
                cpiStatus.color === 'green' ? 'text-green-500' :
                cpiStatus.color === 'yellow' ? 'text-yellow-500' :
                cpiStatus.color === 'red' ? 'text-red-500' : 'text-gray-400'
              }`} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-500">On Budget</div>
              <div className="text-lg font-bold text-green-600">{summaryMetrics.jobsOnBudget}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">At Risk</div>
              <div className="text-lg font-bold text-yellow-600">{summaryMetrics.jobsAtRisk}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Over Budget</div>
              <div className="text-lg font-bold text-red-600">{summaryMetrics.jobsOverBudget}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Total Jobs</div>
            <div className="text-lg font-bold text-gray-900">{summaryMetrics.totalJobs}</div>
          </div>
        </div>
      </Widget>
    )
  }

  return (
    <Widget
      id={id}
      type="jobPerformance"
      title="Job Performance"
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {jobMetrics && jobMetrics.length > 0 ? (
        <div className="space-y-2">
          {jobMetrics.slice(0, maxItems).map((job) => {
            const cpiStatus = getCPIStatus(job.cpi)
            const CPIStatusIcon = cpiStatus.icon
            
            return (
              <Link
                key={job.jobId}
                to={`/jobs/${job.jobId}`}
                className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{job.jobName}</div>
                    <div className="text-xs text-gray-500">{job.jobNumber}</div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        cpiStatus.color === 'green' ? 'text-green-600' :
                        cpiStatus.color === 'yellow' ? 'text-yellow-600' :
                        cpiStatus.color === 'red' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        CPI: {job.cpi > 0 ? job.cpi.toFixed(2) : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">{job.progressPercent.toFixed(0)}%</div>
                    </div>
                    <CPIStatusIcon className={`h-5 w-5 ${
                      cpiStatus.color === 'green' ? 'text-green-500' :
                      cpiStatus.color === 'yellow' ? 'text-yellow-500' :
                      cpiStatus.color === 'red' ? 'text-red-500' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              </Link>
            )
          })}
          {jobMetrics.length > maxItems && (
            <Link
              to="/jobs"
              className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2"
            >
              View all {jobMetrics.length} jobs →
            </Link>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No job data available</div>
      )}
    </Widget>
  )
}

