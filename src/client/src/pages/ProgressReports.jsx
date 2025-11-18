import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  PlusIcon,
  LockClosedIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import ProgressReportDetail from '../components/ProgressReportDetail'

export default function ProgressReports() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('active') // 'all', 'active', 'archived'
  const [selectedReport, setSelectedReport] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['progress-reports', jobId, statusFilter],
    queryFn: () => api.get(`/api/financial/${jobId}/progress-reports?status=${statusFilter}`).then(res => res.data.data)
  })

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/api/jobs/${jobId}`).then(res => res.data.data),
    enabled: !!jobId
  })

  const deleteMutation = useMutation({
    mutationFn: (reportId) => api.delete(`/api/financial/${jobId}/progress-report/${reportId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['progress-reports', jobId])
    }
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return ''
    return format(new Date(date), 'EEE MMM d, yyyy')
  }

  const handleViewDetails = (report) => {
    setSelectedReport(report)
  }

  const handleCreateNew = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setSelectedReport(null)
    setIsCreateModalOpen(false)
    queryClient.invalidateQueries(['progress-reports', jobId])
  }

  // Pagination
  const totalPages = reports ? Math.ceil(reports.length / itemsPerPage) : 1
  const paginatedReports = reports 
    ? reports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : []

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="card p-6">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Progress Reports</h1>
        <button
          onClick={handleCreateNew}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Progress Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setStatusFilter('archived')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'archived'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Complete
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Associated Invoices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <p className="text-gray-500">No progress reports found</p>
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => {
                  const isLocked = report.status === 'invoiced' || report.invoiceId
                  const percentComplete = report.summary?.calculatedPercentCTD || 0

                  return (
                    <tr key={report._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isLocked ? (
                            <LockClosedIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {report.reportNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(report.reportDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {percentComplete.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.invoiceId ? (
                          <div>
                            <div className="text-gray-900">{report.invoiceId}</div>
                            <div className="text-xs">{formatDate(report.reportDate)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(report)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reports && reports.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {currentPage} of {totalPages} pages ({reports.length} items)
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="text-sm border-gray-300 rounded-md"
              >
                <option value={10}>10 Items Per Page</option>
                <option value={25}>25 Items Per Page</option>
                <option value={50}>50 Items Per Page</option>
                <option value={100}>100 Items Per Page</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;&lt;
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              <span className="px-3 py-1 text-sm">{currentPage}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;&gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {(selectedReport || isCreateModalOpen) && (
        <ProgressReportDetail
          report={selectedReport}
          jobId={jobId}
          job={job}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

