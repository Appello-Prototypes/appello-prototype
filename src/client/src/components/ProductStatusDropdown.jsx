import React from 'react'
import DropdownPill from './DropdownPill'

/**
 * Product Status Dropdown Component
 * 
 * Wrapper around DropdownPill for product active/inactive status selection
 */
export default function ProductStatusDropdown({ value, onChange, disabled = false, className = '' }) {
  const options = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]

  const getProductStatusColor = (status) => {
    const colors = {
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
    }
    return colors[status] || colors.active
  }

  // Convert boolean to string and vice versa
  const handleChange = (newValue) => {
    if (onChange) {
      onChange(newValue === 'active')
    }
  }

  const currentValue = value === true || value === 'active' ? 'active' : 'inactive'

  return (
    <DropdownPill
      value={currentValue}
      onChange={handleChange}
      options={options}
      getColor={getProductStatusColor}
      disabled={disabled}
      className={className}
      minWidth="100px"
    />
  )
}

