import React from 'react'
import DropdownPill from './DropdownPill'

/**
 * Priority Dropdown Component
 * 
 * Wrapper around DropdownPill for priority selection
 */
export default function PriorityDropdown({ value, onChange, disabled = false, className = '' }) {
  const options = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'standard', label: 'Standard' },
    { value: 'low', label: 'Low' },
  ]

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-500',
      standard: 'bg-blue-500',
      low: 'bg-gray-500',
    }
    return colors[priority] || colors.standard
  }

  return (
    <DropdownPill
      value={value || 'standard'}
      onChange={onChange}
      options={options}
      getColor={getPriorityColor}
      disabled={disabled}
      className={className}
      minWidth="100px"
    />
  )
}

