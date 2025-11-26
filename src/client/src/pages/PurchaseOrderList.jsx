import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { purchaseOrderAPI } from '../services/api'
import { format } from 'date-fns'
import StatusDropdown from '../components/StatusDropdown'
import toast from 'react-hot-toast'
import { formatCurrency } from '../utils/currency'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  sent: 'bg-blue-100 text-blue-800',
  partially_received: 'bg-purple-100 text-purple-800',
  received: 'bg-indigo-100 text-indigo-800',
  cancelled: 'bg-gray-100 text-gray-800',
  revised: 'bg-orange-100 text-orange-800',
}

export default function PurchaseOrderList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingStatuses, setUpdatingStatuses] = useState(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', statusFilter, searchTerm],
    queryFn: () => purchaseOrderAPI.getPurchaseOrders({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm || undefined
    }).then(res => res.data.data),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ poId, status }) => purchaseOrderAPI.updatePurchaseOrder(poId, { status }),
    onSuccess: (_, variables) => {
      toast.success('Status updated successfully')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.poId)
        return next
      })
      queryClient.invalidateQueries(['purchase-orders'])
    },
    onError: (error, variables) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.poId)
        return next
      })
    },
  })

  const handleStatusChange = (poId, newStatus) => {
    setUpdatingStatuses(prev => new Set(prev).add(poId))
    updateStatusMutation.mutate({ poId, status: newStatus })
  }

  // Calculate received percentage
  const calculateReceivedPercent = (po) => {
    if (!po.lineItems || po.lineItems.length === 0) return 0
    const totalOrdered = po.lineItems.reduce((sum, item) => sum + (item.quantityOrdered || item.quantity || 0), 0)
    const totalReceived = po.lineItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)
    if (totalOrdered === 0) return 0
    return Math.round((totalReceived / totalOrdered) * 100)
  }

  const filteredPOs = data?.filter(po => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (po.poNumber || `PO-${po._id.slice(-6)}`).toLowerCase().includes(search) ||
      po.supplierId?.name?.toLowerCase().includes(search) ||
      po.jobId?.jobNumber?.toLowerCase().includes(search) ||
      po.jobId?.name?.toLowerCase().includes(search)
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
        <p className="text-red-800">Error loading purchase orders: {error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Manage purchase orders and track deliveries</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/purchase-orders/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New PO
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search POs..."
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
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="sent">Sent</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No purchase orders found</p>
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
                to="/purchase-orders/create"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Create your first PO
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved By
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
                {filteredPOs.map((po) => {
                  const receivedPercent = calculateReceivedPercent(po)
                  return (
                    <tr key={po._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap" onClick={() => navigate(`/purchase-orders/${po._id}`)}>
                        <div className="text-sm font-medium text-gray-900 cursor-pointer">
                          {po.poNumber || `PO-${po._id.slice(-6)}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/companies/${po.supplierId?._id || po.supplierId}`)}
                          className="text-sm text-gray-900 hover:text-blue-600"
                        >
                          {po.supplierId?.name || 'N/A'}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/jobs/${po.jobId?._id || po.jobId}`)}
                          className="text-sm text-gray-900 hover:text-blue-600"
                        >
                          {po.jobId?.jobNumber || po.jobId?.name || 'N/A'}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {po.requiredByDate ? format(new Date(po.requiredByDate), 'MM/dd/yyyy') : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                          value={po.status || 'draft'}
                          onChange={(newStatus) => handleStatusChange(po._id, newStatus)}
                          type="po"
                          disabled={updatingStatuses.has(po._id)}
                          className="min-w-[140px]"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {po.lineItems?.length || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(po.total || po.totalAmount || 0)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-[60px]">
                            <div
                              className={`h-2 rounded-full ${
                                receivedPercent === 100 ? 'bg-green-500' :
                                receivedPercent > 0 ? 'bg-blue-500' :
                                'bg-gray-300'
                              }`}
                              style={{ width: `${receivedPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{receivedPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {po.approvedBy?.name || '-'}
                        </div>
                        {po.approvedAt && (
                          <div className="text-xs text-gray-500">
                            {format(new Date(po.approvedAt), 'MM/dd/yyyy')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {po.createdAt ? format(new Date(po.createdAt), 'MM/dd/yyyy') : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Link
                          to={`/purchase-orders/${po._id}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredPOs.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredPOs.length} of {data?.length || 0} purchase order{data?.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

