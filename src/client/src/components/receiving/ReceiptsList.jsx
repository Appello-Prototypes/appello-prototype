import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { poReceiptAPI } from '../../services/api'
import { format } from 'date-fns'
import ReceiptStatusDropdown from '../ReceiptStatusDropdown'
import toast from 'react-hot-toast'

/**
 * Receipts List Component
 * 
 * Displays all PO receipts in a table with filtering and search
 */
export default function ReceiptsList({ onSelectReceipt, onCreateNew }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterJobId, setFilterJobId] = useState('')
  const [updatingStatuses, setUpdatingStatuses] = useState(new Set())
  
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['po-receipts', filterStatus, filterJobId],
    queryFn: () => poReceiptAPI.getReceipts({ 
      status: filterStatus !== 'all' ? filterStatus : undefined,
      jobId: filterJobId || undefined
    }).then(res => res.data.data || []),
    staleTime: 30000
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ receiptId, status }) => poReceiptAPI.updateReceipt(receiptId, { status }),
    onSuccess: (_, variables) => {
      toast.success('Status updated successfully')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.receiptId)
        return next
      })
      queryClient.invalidateQueries(['po-receipts'])
    },
    onError: (error, variables) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.receiptId)
        return next
      })
    },
  })

  const handleStatusChange = (receiptId, newStatus) => {
    setUpdatingStatuses(prev => new Set(prev).add(receiptId))
    updateStatusMutation.mutate({ receiptId, status: newStatus })
  }

  const filteredReceipts = receipts?.filter(receipt => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      receipt.receiptNumber?.toLowerCase().includes(search) ||
      receipt.purchaseOrderId?.poNumber?.toLowerCase().includes(search) ||
      receipt.jobId?.name?.toLowerCase().includes(search) ||
      receipt.jobId?.jobNumber?.toLowerCase().includes(search)
    )
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading receipts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Receipts</h2>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all material receipts
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Create Receipt
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by receipt #, PO #, or job..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Receipts Table */}
      {filteredReceipts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No receipts found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {receipt.receiptNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/purchase-orders/${receipt.purchaseOrderId?._id || receipt.purchaseOrderId}`)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {receipt.purchaseOrderId?.poNumber || 'N/A'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/jobs/${receipt.jobId?._id || receipt.jobId}`)}
                        className="text-sm text-gray-900 hover:text-blue-600"
                      >
                        {receipt.jobId?.jobNumber || receipt.jobId?.name || 'N/A'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {receipt.receivedAt ? format(new Date(receipt.receivedAt), 'MM/dd/yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {receipt.receivedBy?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${(receipt.totalReceived || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <ReceiptStatusDropdown
                        value={receipt.status || 'draft'}
                        onChange={(newStatus) => handleStatusChange(receipt._id, newStatus)}
                        disabled={updatingStatuses.has(receipt._id)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          if (onSelectReceipt) {
                            onSelectReceipt(receipt)
                          } else {
                            navigate(`/receiving?receiptId=${receipt._id}`)
                          }
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {filteredReceipts.length > 0 && (
        <div className="text-sm text-gray-500">
          Showing {filteredReceipts.length} of {receipts?.length || 0} receipt{receipts?.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

