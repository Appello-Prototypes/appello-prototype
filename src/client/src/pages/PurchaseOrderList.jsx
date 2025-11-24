import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline'
import { purchaseOrderAPI } from '../services/api'
import { format } from 'date-fns'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', statusFilter, searchTerm],
    queryFn: () => purchaseOrderAPI.getPurchaseOrders({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm || undefined
    }).then(res => res.data.data),
  })

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

      {/* PO List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {data && data.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {data.map((po) => (
              <li key={po._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {po.poNumber || `PO-${po._id.slice(-6)}`}
                      </h3>
                      <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] || STATUS_COLORS.draft}`}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Supplier: {po.supplierId?.name || 'N/A'}</p>
                      <p>Job: {po.jobId?.jobNumber || po.jobId?.name || 'N/A'}</p>
                      <p>Required By: {po.requiredByDate ? format(new Date(po.requiredByDate), 'MMM dd, yyyy') : 'N/A'}</p>
                      <p>Line Items: {po.lineItems?.length || 0}</p>
                      <p className="font-medium text-gray-900 mt-1">
                        Total: ${po.totalAmount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/purchase-orders/${po._id}`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No purchase orders found</p>
            <Link
              to="/purchase-orders/create"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Create your first PO
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

