import React from 'react'

/**
 * Status Badge Component
 * 
 * Displays a color-coded status badge for Purchase Orders and Material Requests
 */
export default function StatusBadge({ status, type = 'po' }) {
  const getStatusConfig = () => {
    if (type === 'po') {
      const poStatuses = {
        draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
        pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
        approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
        sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
        partially_received: { label: 'Partially Received', color: 'bg-orange-100 text-orange-700' },
        fully_received: { label: 'Fully Received', color: 'bg-green-100 text-green-700' },
        cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
        closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700' },
      }
      return poStatuses[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
    } else {
      const mrStatuses = {
        submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
        approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
        po_issued: { label: 'PO Issued', color: 'bg-purple-100 text-purple-700' },
        delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
        closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700' },
        rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
        clarification_requested: { label: 'Clarification Requested', color: 'bg-yellow-100 text-yellow-700' },
      }
      return mrStatuses[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
    }
  }

  const config = getStatusConfig()

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

