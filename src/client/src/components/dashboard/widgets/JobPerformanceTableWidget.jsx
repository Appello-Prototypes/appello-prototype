import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

export default function JobPerformanceTableWidget({ id, config, isEditing, onEdit, onRemove }) {
  const [sortField, setSortField] = useState('jobName')
  const [sortDirection, setSortDirection] = useState('asc')
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'on_budget', 'at_risk', 'over_budget'

  const { data: jobs } = useQuery({
    queryKey: ['jobs-table'],
    queryFn: () => api.get('/api/jobs').then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const { data: jobMetrics, isLoading } = useQuery({
    queryKey: ['job-performance-table-metrics'],
    queryFn: async () => {
      if (!jobs || jobs.length === 0) return []
      
      const metricsPromises = jobs.map(async (job) => {
        try {
          const [
            earnedVsBurnedResponse,
            progressReportsResponse,
            sovResponse,
            apResponse,
            timelogResponse,
          ] = await Promise.all([
            api.get(`/api/financial/${job._id}/earned-vs-burned`).catch(() => ({ data: { totals: {} } })),
            api.get(`/api/financial/${job._id}/progress-reports?status=approved`).catch(() => ({ data: { data: [] } })),
            api.get(`/api/jobs/${job._id}/sov-components`).catch(() => ({ data: { data: { summary: {} } } })),
            api.get(`/api/financial/${job._id}/ap-register`).catch(() => ({ data: { data: [], meta: {} } })),
            api.get(`/api/financial/${job._id}/timelog-register`).catch(() => ({ data: { data: [], meta: {} } })),
          ])

          const evm = earnedVsBurnedResponse.data?.totals || {}
          const progressReports = progressReportsResponse.data?.data || []
          const latestPR = progressReports.length > 0 ? progressReports[0] : null
          const sovSummary = sovResponse.data?.data?.summary || {}
          const apData = apResponse.data?.data || []
          const apMeta = apResponse.data?.meta || {}
          const timelogData = timelogResponse.data?.data || []
          const timelogMeta = timelogResponse.data?.meta || {}

          const totalBudget = sovSummary.totalValue || job.contractValue || 0
          const totalSpent = evm.actualCost || 0
          const earnedValue = evm.earnedValue || 0
          const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
          const cpi = evm.cpi || 0
          const spi = evm.spi || 0
          const costVariance = evm.costVariance || 0
          const scheduleVariance = evm.scheduleVariance || 0
          const progressPercent = latestPR?.summary?.calculatedPercentCTD || job.overallProgress || 0
          
          // Calculate labor vs material costs
          const laborCost = timelogMeta.totalCost || timelogData.reduce((sum, entry) => 
            sum + (entry.totalCostWithBurden || entry.totalCost || 0), 0
          )
          const materialCost = apMeta.totalAmount || apData.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
          
          // AP outstanding
          const apOutstanding = apMeta.outstandingAmount || apData
            .filter(inv => inv.paymentStatus !== 'paid')
            .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
          
          // Revenue recognition
          const recognizedRevenue = progressReports.reduce((sum, pr) => 
            sum + (pr.summary?.totalApprovedCTD?.amount || 0), 0
          )

          return {
            jobId: job._id,
            jobName: job.name,
            jobNumber: job.jobNumber,
            client: job.client?.name || (typeof job.client === 'string' ? job.client : 'N/A'),
            status: job.status,
            cpi,
            spi,
            budgetUtilization,
            progressPercent,
            totalBudget,
            totalSpent,
            earnedValue,
            costVariance,
            scheduleVariance,
            laborCost,
            materialCost,
            apOutstanding,
            recognizedRevenue,
            remainingBudget: totalBudget - totalSpent,
            margin: earnedValue > 0 ? ((earnedValue - totalSpent) / earnedValue) * 100 : 0,
          }
        } catch (error) {
          console.error(`Error fetching metrics for job ${job._id}:`, error)
          return null
        }
      })

      const results = await Promise.all(metricsPromises)
      return results.filter(r => r !== null)
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
    if (cpi === 0 || !cpi) return { color: 'gray', label: 'No Data', bgColor: 'bg-gray-100', textColor: 'text-gray-600' }
    if (cpi >= 1.0) return { color: 'green', label: 'On Budget', bgColor: 'bg-green-100', textColor: 'text-green-700' }
    if (cpi >= 0.9) return { color: 'yellow', label: 'At Risk', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' }
    return { color: 'red', label: 'Over Budget', bgColor: 'bg-red-100', textColor: 'text-red-700' }
  }

  const getSPIStatus = (spi) => {
    if (spi === 0 || !spi) return { color: 'gray', label: 'No Data' }
    if (spi >= 1.0) return { color: 'green', label: 'On Schedule' }
    if (spi >= 0.9) return { color: 'yellow', label: 'At Risk' }
    return { color: 'red', label: 'Behind' }
  }

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!jobMetrics) return []

    let filtered = jobMetrics

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => {
        const cpiStatus = getCPIStatus(job.cpi)
        if (filterStatus === 'on_budget') return cpiStatus.color === 'green'
        if (filterStatus === 'at_risk') return cpiStatus.color === 'yellow'
        if (filterStatus === 'over_budget') return cpiStatus.color === 'red'
        return true
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      // Handle null/undefined values
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''

      if (sortField === 'jobName' || sortField === 'jobNumber' || sortField === 'client') {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [jobMetrics, sortField, sortDirection, filterStatus])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 inline ml-1" />
    )
  }

  return (
    <Widget
      id={id}
      type="jobPerformanceTable"
      title="Job Performance Overview"
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Jobs</option>
              <option value="on_budget">On Budget</option>
              <option value="at_risk">At Risk</option>
              <option value="over_budget">Over Budget</option>
            </select>
          </div>
          <div className="text-xs text-gray-500">
            {filteredAndSortedData.length} job{filteredAndSortedData.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('jobName')}
                >
                  Job <SortIcon field="jobName" />
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('client')}
                >
                  Client <SortIcon field="client" />
                </th>
                <th
                  className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('progressPercent')}
                >
                  % Complete <SortIcon field="progressPercent" />
                </th>
                <th
                  className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cpi')}
                >
                  CPI <SortIcon field="cpi" />
                </th>
                <th
                  className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('spi')}
                >
                  SPI <SortIcon field="spi" />
                </th>
                <th
                  className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('budgetUtilization')}
                >
                  Budget <SortIcon field="budgetUtilization" />
                </th>
                <th
                  className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('costVariance')}
                >
                  Cost Var <SortIcon field="costVariance" />
                </th>
                <th
                  className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalBudget')}
                >
                  Contract Value <SortIcon field="totalBudget" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((job) => {
                const cpiStatus = getCPIStatus(job.cpi)
                const spiStatus = getSPIStatus(job.spi)
                
                return (
                  <tr key={job.jobId} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Link
                        to={`/jobs/${job.jobId}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {job.jobName}
                      </Link>
                      <div className="text-xs text-gray-500">{job.jobNumber}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {job.client}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              job.progressPercent >= 100 ? 'bg-green-500' :
                              job.progressPercent >= 75 ? 'bg-blue-500' :
                              job.progressPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(job.progressPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {job.progressPercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cpiStatus.bgColor} ${cpiStatus.textColor}`}>
                        {job.cpi > 0 ? job.cpi.toFixed(2) : 'N/A'}
                        {job.cpi > 0 && (
                          <span className="ml-1">
                            {cpiStatus.color === 'green' && <CheckCircleSolidIcon className="h-3 w-3" />}
                            {cpiStatus.color === 'yellow' && <ExclamationTriangleIcon className="h-3 w-3" />}
                            {cpiStatus.color === 'red' && <XCircleIcon className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        spiStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                        spiStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        spiStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {job.spi > 0 ? job.spi.toFixed(2) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              job.budgetUtilization > 100 ? 'bg-red-500' :
                              job.budgetUtilization > 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(job.budgetUtilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-12 text-right">
                          {job.budgetUtilization.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatCurrency(job.totalSpent)} / {formatCurrency(job.totalBudget)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <div className={`text-sm font-medium ${
                        job.costVariance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {job.costVariance >= 0 ? '+' : ''}{formatCurrency(job.costVariance)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {job.margin.toFixed(1)}% margin
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(job.totalBudget)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No jobs found matching the selected filter.
          </div>
        )}
      </div>
    </Widget>
  )
}

