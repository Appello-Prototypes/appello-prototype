import React from 'react'
import DropdownPill from './DropdownPill'

/**
 * Receipt Status Dropdown Component
 * 
 * Wrapper around DropdownPill for PO Receipt status selection
 */
export default function ReceiptStatusDropdown({ value, onChange, disabled = false, className = '' }) {
  const options = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  const getReceiptStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-500',
      submitted: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
    }
    return colors[status] || colors.draft
  }

  return (
    <DropdownPill
      value={value || 'draft'}
      onChange={onChange}
      options={options}
      getColor={getReceiptStatusColor}
      disabled={disabled}
      className={className}
      minWidth="120px"
    />
  )
}

