import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline'
import { inventoryAPI, jobAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Update Serialized Unit Modal
 * 
 * Allows users to update status, assignment, location, and other properties of serialized units
 */
export default function UpdateSerializedUnitModal({ isOpen, onClose, inventory, serialNumber: initialSerialNumber }) {
  const queryClient = useQueryClient()
  const [serialNumber, setSerialNumber] = useState(initialSerialNumber || '')
  const [status, setStatus] = useState('available')
  const [assignedTo, setAssignedTo] = useState('')
  const [assignedToTask, setAssignedToTask] = useState('')
  const [location, setLocation] = useState('')
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState('')
  const [notes, setNotes] = useState('')

  // Find the unit if serialNumber is provided
  const unit = inventory?.serializedUnits?.find(u => u.serialNumber === initialSerialNumber)

  // Initialize form with unit data if available
  React.useEffect(() => {
    if (unit && isOpen) {
      setSerialNumber(unit.serialNumber)
      setStatus(unit.status || 'available')
      setAssignedTo(unit.assignedTo?._id || unit.assignedTo || '')
      setAssignedToTask(unit.assignedToTask?._id || unit.assignedToTask || '')
      setLocation(unit.location || '')
      setLastMaintenanceDate(unit.lastMaintenanceDate ? new Date(unit.lastMaintenanceDate).toISOString().split('T')[0] : '')
      setNotes(unit.notes || '')
    } else if (isOpen && !initialSerialNumber) {
      // Reset form for new entry
      setSerialNumber('')
      setStatus('available')
      setAssignedTo('')
      setAssignedToTask('')
      setLocation(inventory?.primaryLocation || '')
      setLastMaintenanceDate('')
      setNotes('')
    }
  }, [unit, isOpen, initialSerialNumber, inventory])

  // Fetch jobs for assignment
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getJobs().then(res => res.data.data),
    enabled: isOpen && (status === 'assigned' || status === 'in_use')
  })

  const updateMutation = useMutation({
    mutationFn: (data) => inventoryAPI.updateSerializedUnit(inventory._id, serialNumber, data),
    onSuccess: () => {
      toast.success('Serialized unit updated successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-product', inventory?.productId?._id])
      queryClient.invalidateQueries(['inventory', inventory?._id])
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update serialized unit')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!serialNumber.trim()) {
      toast.error('Serial number is required')
      return
    }

    const data = {
      status,
      assignedTo: assignedTo || null,
      assignedToTask: assignedToTask || null,
      location: location.trim() || null,
      lastMaintenanceDate: lastMaintenanceDate || null,
      notes: notes.trim() || null
    }

    updateMutation.mutate(data)
  }

  if (!isOpen || !inventory) return null

  const statusOptions = [
    { value: 'available', label: 'Available', color: 'green' },
    { value: 'assigned', label: 'Assigned', color: 'yellow' },
    { value: 'in_use', label: 'In Use', color: 'blue' },
    { value: 'maintenance', label: 'Maintenance', color: 'orange' },
    { value: 'retired', label: 'Retired', color: 'gray' }
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <PencilIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              {initialSerialNumber ? 'Update Serialized Unit' : 'Add Serialized Unit'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={updateMutation.isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {inventory.productId?.name || 'Unknown Product'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              required
              disabled={!!initialSerialNumber || updateMutation.isLoading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={updateMutation.isLoading}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To Job (if assigned or in_use) */}
          {(status === 'assigned' || status === 'in_use') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To Job
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={updateMutation.isLoading}
              >
                <option value="">None</option>
                {jobsData?.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobNumber} - {job.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Warehouse A, Jobsite Storage"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={updateMutation.isLoading}
            />
          </div>

          {/* Last Maintenance Date */}
          {status === 'maintenance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Maintenance Date
              </label>
              <input
                type="date"
                value={lastMaintenanceDate}
                onChange={(e) => setLastMaintenanceDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={updateMutation.isLoading}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about this unit..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={updateMutation.isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={updateMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={updateMutation.isLoading || !serialNumber.trim()}
            >
              {updateMutation.isLoading ? 'Updating...' : 'Update Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

