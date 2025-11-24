import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Base Widget Component
 * All dashboard widgets extend this component
 */
export default function Widget({ 
  id, 
  type, 
  title, 
  config = {}, 
  data = {}, 
  isLoading = false,
  onEdit,
  onRemove,
  isEditing = false,
  children 
}) {
  return (
    <div className={`card h-full flex flex-col ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Widget Header - Draggable Handle */}
      <div className={`px-4 py-3 border-b border-gray-200 flex items-center justify-between ${isEditing ? 'cursor-move' : ''}`}>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {isEditing && (
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(id)}
                className="text-gray-400 hover:text-gray-600"
                title="Edit widget"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onRemove && (
              <button
                onClick={() => onRemove(id)}
                className="text-gray-400 hover:text-red-600"
                title="Remove widget"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : (
          children || <div className="text-sm text-gray-500">No data available</div>
        )}
      </div>
    </div>
  )
}

