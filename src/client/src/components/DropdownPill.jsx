import React from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

/**
 * DropdownPill Component
 * 
 * Unified pill-style dropdown component for status, priority, and other selectable values
 * - Colored pill with white text
 * - Chevron arrow integrated inside pill (right side)
 * - Entire pill is clickable
 */
export default function DropdownPill({ 
  value, 
  onChange, 
  options = [],
  getColor = (val) => 'bg-gray-500',
  disabled = false, 
  className = '',
  minWidth = '100px'
}) {
  const pillColor = getColor(value || (options[0]?.value))

  return (
    <div className={`relative inline-block ${className}`} style={{ minWidth }}>
      {/* Colored Pill with White Text and Integrated Chevron */}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`appearance-none ${pillColor} text-white rounded-md px-3 py-1.5 pr-8 text-xs font-medium cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-0 w-full`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          WebkitAppearance: 'none', 
          MozAppearance: 'none',
          backgroundImage: 'none',
          paddingRight: '2rem'
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ backgroundColor: 'white', color: '#111827' }}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Chevron Icon Inside Pill - Always visible, positioned above select */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <ChevronDownIcon className="h-3.5 w-3.5 text-white drop-shadow-sm" />
      </div>
    </div>
  )
}

