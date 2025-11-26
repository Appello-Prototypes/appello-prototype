import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { inventoryAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Add Serialized Units Modal
 * 
 * Allows users to add serialized units to inventory
 * Supports single entry or bulk paste
 */
export default function AddSerializedUnitsModal({ isOpen, onClose, inventory }) {
  const queryClient = useQueryClient()
  const [entryMode, setEntryMode] = useState('single') // 'single' or 'bulk'
  const [serialNumber, setSerialNumber] = useState('')
  const [bulkSerialNumbers, setBulkSerialNumbers] = useState('')
  const [location, setLocation] = useState(inventory?.primaryLocation || '')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const addMutation = useMutation({
    mutationFn: (data) => inventoryAPI.addSerializedUnits(inventory._id, data),
    onSuccess: () => {
      toast.success('Serialized units added successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-product', inventory?.productId?._id])
      queryClient.invalidateQueries(['inventory', inventory?._id])
      onClose()
      // Reset form
      setSerialNumber('')
      setBulkSerialNumbers('')
      setLocation(inventory?.primaryLocation || '')
      setReceivedDate(new Date().toISOString().split('T')[0])
      setNotes('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add serialized units')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    let serialNumbers = []
    
    if (entryMode === 'single') {
      if (!serialNumber.trim()) {
        toast.error('Please enter a serial number')
        return
      }
      serialNumbers = [serialNumber.trim()]
    } else {
      if (!bulkSerialNumbers.trim()) {
        toast.error('Please enter serial numbers')
        return
      }
      // Parse bulk input - split by newlines, commas, or spaces
      serialNumbers = bulkSerialNumbers
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
      
      if (serialNumbers.length === 0) {
        toast.error('No valid serial numbers found')
        return
      }
    }

    // Check for duplicates
    const existingSerials = inventory?.serializedUnits?.map(u => u.serialNumber) || []
    const duplicates = serialNumbers.filter(s => existingSerials.includes(s))
    if (duplicates.length > 0) {
      toast.error(`Duplicate serial numbers found: ${duplicates.join(', ')}`)
      return
    }

    const data = {
      serialNumbers,
      location: location.trim() || undefined,
      receivedDate: receivedDate || undefined
    }

    addMutation.mutate(data)
  }

  if (!isOpen || !inventory) return null

  if (inventory.inventoryType !== 'serialized') {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-xl rounded-lg bg-white">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              This inventory item is not configured for serialized tracking.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <PlusIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Add Serialized Units</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={addMutation.isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {inventory.productId?.name || 'Unknown Product'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Current Units: {inventory.serializedUnits?.length || 0}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entry Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="single"
                  checked={entryMode === 'single'}
                  onChange={(e) => setEntryMode(e.target.value)}
                  className="mr-2"
                  disabled={addMutation.isLoading}
                />
                <span className="text-sm text-gray-700">Single Entry</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="bulk"
                  checked={entryMode === 'bulk'}
                  onChange={(e) => setEntryMode(e.target.value)}
                  className="mr-2"
                  disabled={addMutation.isLoading}
                />
                <span className="text-sm text-gray-700">Bulk Entry</span>
              </label>
            </div>
          </div>

          {/* Serial Number Input */}
          {entryMode === 'single' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g., SN-12345"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={addMutation.isLoading}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Numbers (one per line or comma-separated) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={bulkSerialNumbers}
                onChange={(e) => setBulkSerialNumbers(e.target.value)}
                rows={8}
                placeholder="SN-001&#10;SN-002&#10;SN-003&#10;or&#10;SN-001, SN-002, SN-003"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={addMutation.isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter one serial number per line, or separate with commas
              </p>
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
              placeholder="e.g., Warehouse A"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={addMutation.isLoading}
            />
          </div>

          {/* Received Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received Date
            </label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={addMutation.isLoading}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about these units..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={addMutation.isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={addMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={addMutation.isLoading || (entryMode === 'single' && !serialNumber.trim()) || (entryMode === 'bulk' && !bulkSerialNumbers.trim())}
            >
              {addMutation.isLoading ? 'Adding...' : 'Add Units'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

