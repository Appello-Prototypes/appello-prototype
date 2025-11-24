import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline'
import { materialRequestAPI } from '../services/api'
import { format } from 'date-fns'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['material-requests', statusFilter, priorityFilter, searchTerm],
    queryFn: () => materialRequestAPI.getMaterialRequests({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
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

      {/* Requests List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {data && data.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {data.map((request) => (
              <li key={request._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.requestNumber || `MR-${request._id.slice(-6)}`}
                      </h3>
                      <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[request.status] || STATUS_COLORS.submitted}`}>
                        {request.status}
                      </span>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[request.priority] || PRIORITY_COLORS.standard}`}>
                        {request.priority}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Job: {request.jobId?.jobNumber || request.jobId?.name || 'N/A'}</p>
                      <p>Requested By: {request.requestedBy?.name || 'Unknown'}</p>
                      <p>Required By: {request.requiredByDate ? format(new Date(request.requiredByDate), 'MMM dd, yyyy') : 'N/A'}</p>
                      <p>Line Items: {request.lineItems?.length || 0}</p>
                      {request.purchaseOrderId && (
                        <p className="text-blue-600">PO: {request.purchaseOrderId.poNumber || request.purchaseOrderId}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/material-requests/${request._id}`}
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
            <p className="text-gray-500">No material requests found</p>
            <Link
              to="/material-requests/create"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Create your first request
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

