import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { materialRequestAPI } from '../services/api'
import { format } from 'date-fns'
import StatusDropdown from '../components/StatusDropdown'
import PriorityDropdown from '../components/PriorityDropdown'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  po_issued: 'bg-blue-100 text-blue-800',
  delivered: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-800',
  standard: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
}

export default function MaterialRequestList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [updatingStatuses, setUpdatingStatuses] = useState(new Set())
  const [updatingPriorities, setUpdatingPriorities] = useState(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['material-requests', statusFilter, priorityFilter, searchTerm],
    queryFn: () => materialRequestAPI.getMaterialRequests({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      search: searchTerm || undefined
    }).then(res => res.data.data),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ requestId, status }) => materialRequestAPI.updateMaterialRequest(requestId, { status }),
    onSuccess: (_, variables) => {
      toast.success('Status updated successfully')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.requestId)
        return next
      })
      queryClient.invalidateQueries(['material-requests'])
    },
    onError: (error, variables) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.requestId)
        return next
      })
    },
  })

  const updatePriorityMutation = useMutation({
    mutationFn: ({ requestId, priority }) => materialRequestAPI.updateMaterialRequest(requestId, { priority }),
    onSuccess: (_, variables) => {
      toast.success('Priority updated successfully')
      setUpdatingPriorities(prev => {
        const next = new Set(prev)
        next.delete(variables.requestId)
        return next
      })
      queryClient.invalidateQueries(['material-requests'])
    },
    onError: (error, variables) => {
      toast.error(error.response?.data?.message || 'Failed to update priority')
      setUpdatingPriorities(prev => {
        const next = new Set(prev)
        next.delete(variables.requestId)
        return next
      })
    },
  })

  const handleStatusChange = (requestId, newStatus) => {
    setUpdatingStatuses(prev => new Set(prev).add(requestId))
    updateStatusMutation.mutate({ requestId, status: newStatus })
  }

  const handlePriorityChange = (requestId, newPriority) => {
    setUpdatingPriorities(prev => new Set(prev).add(requestId))
    updatePriorityMutation.mutate({ requestId, priority: newPriority })
  }

  // Calculate total value for each request
  const calculateTotal = (request) => {
    if (!request.lineItems || request.lineItems.length === 0) return 0
    return request.lineItems.reduce((sum, item) => {
      // Try to get estimated cost from line item or use default
      const unitPrice = item.estimatedUnitPrice || item.unitPrice || 0
      return sum + (item.quantity * unitPrice)
    }, 0)
  }

  const filteredRequests = data?.filter(request => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (request.requestNumber || `MR-${request._id.slice(-6)}`).toLowerCase().includes(search) ||
      request.jobId?.jobNumber?.toLowerCase().includes(search) ||
      request.jobId?.name?.toLowerCase().includes(search) ||
      request.requestedBy?.name?.toLowerCase().includes(search)
    )
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading material requests: {error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Requests</h1>
          <p className="mt-1 text-sm text-gray-500">Field material requests awaiting office approval</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/material-requests/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Request
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="po_issued">PO Issued</option>
            <option value="delivered">Delivered</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="standard">Standard</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No material requests found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Clear search
              </button>
            )}
            {!searchTerm && (
              <Link
                to="/material-requests/create"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Create your first request
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap" onClick={() => navigate(`/material-requests/${request._id}`)}>
                      <div className="text-sm font-medium text-gray-900 cursor-pointer">
                        {request.requestNumber || `MR-${request._id.slice(-6)}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/jobs/${request.jobId?._id || request.jobId}`)}
                        className="text-sm text-gray-900 hover:text-blue-600"
                      >
                        {request.jobId?.jobNumber || request.jobId?.name || 'N/A'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.requestedBy?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.requiredByDate ? format(new Date(request.requiredByDate), 'MM/dd/yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <PriorityDropdown
                        value={request.priority || 'standard'}
                        onChange={(newPriority) => handlePriorityChange(request._id, newPriority)}
                        disabled={updatingPriorities.has(request._id)}
                        className="min-w-[120px]"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown
                        value={request.status || 'submitted'}
                        onChange={(newStatus) => handleStatusChange(request._id, newStatus)}
                        type="mr"
                        disabled={updatingStatuses.has(request._id)}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.lineItems?.length || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${calculateTotal(request).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {request.purchaseOrderId ? (
                        <button
                          onClick={() => navigate(`/purchase-orders/${request.purchaseOrderId._id || request.purchaseOrderId}`)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {request.purchaseOrderId.poNumber || 'View PO'}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {request.createdAt ? format(new Date(request.createdAt), 'MM/dd/yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Link
                        to={`/material-requests/${request._id}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredRequests.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredRequests.length} of {data?.length || 0} request{data?.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

