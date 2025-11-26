import React from 'react'
import DropdownPill from './DropdownPill'

/**
 * Status Dropdown Component
 * 
 * Wrapper around DropdownPill for status selection
 */
export default function StatusDropdown({ value, onChange, type = 'po', disabled = false, className = '' }) {
  const getStatusOptions = () => {
    if (type === 'po') {
      return [
        { value: 'draft', label: 'Draft' },
        { value: 'pending_approval', label: 'Pending Approval' },
        { value: 'approved', label: 'Approved' },
        { value: 'sent', label: 'Sent' },
        { value: 'partially_received', label: 'Partially Received' },
        { value: 'fully_received', label: 'Fully Received' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'closed', label: 'Closed' },
      ]
    } else {
      return [
        { value: 'submitted', label: 'Submitted' },
        { value: 'approved', label: 'Approved' },
        { value: 'po_issued', label: 'PO Issued' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'closed', label: 'Closed' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'clarification_requested', label: 'Clarification Requested' },
      ]
    }
  }

  const getStatusColor = (status) => {
    if (type === 'po') {
      const colors = {
        draft: 'bg-gray-500',
        pending_approval: 'bg-yellow-500',
        approved: 'bg-green-500',
        sent: 'bg-blue-500',
        partially_received: 'bg-purple-500',
        fully_received: 'bg-indigo-500',
        cancelled: 'bg-red-500',
        closed: 'bg-gray-500',
      }
      return colors[status] || colors.draft
    } else {
      const colors = {
        submitted: 'bg-blue-500',
        approved: 'bg-green-500',
        po_issued: 'bg-purple-500',
        delivered: 'bg-indigo-500',
        closed: 'bg-gray-500',
        rejected: 'bg-red-500',
        clarification_requested: 'bg-yellow-500',
      }
      return colors[status] || colors.submitted
    }
  }

  const options = getStatusOptions()

  return (
    <DropdownPill
      value={value}
      onChange={onChange}
      options={options}
      getColor={getStatusColor}
      disabled={disabled}
      className={className}
      minWidth="120px"
    />
  )
}

