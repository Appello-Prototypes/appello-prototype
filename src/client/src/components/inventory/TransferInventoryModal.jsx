import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { inventoryAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Transfer Inventory Modal
 * 
 * Allows users to transfer inventory between locations
 */
export default function TransferInventoryModal({ isOpen, onClose, inventory }) {
  const queryClient = useQueryClient()
  const [fromLocation, setFromLocation] = useState(inventory?.primaryLocation || '')
  const [toLocation, setToLocation] = useState('')
  const [quantity, setQuantity] = useState('')
  const [selectedSerialNumbers, setSelectedSerialNumbers] = useState([])
  const [notes, setNotes] = useState('')

  const isBulk = inventory?.inventoryType === 'bulk'
  
  // Get available quantity at source location
  const getAvailableAtLocation = () => {
    if (isBulk) {
      const location = inventory?.locations?.find(l => l.location === fromLocation)
      return location?.quantity || inventory?.quantityOnHand || 0
    } else {
      return inventory?.serializedUnits?.filter(u => 
        u.location === fromLocation && u.status === 'available'
      ).length || 0
    }
  }

  const availableAtLocation = getAvailableAtLocation()
  const availableSerialized = inventory?.serializedUnits?.filter(u => 
    u.location === fromLocation && u.status === 'available'
  ) || []

  const transferMutation = useMutation({
    mutationFn: (data) => inventoryAPI.addTransaction(inventory._id, data),
    onSuccess: () => {
      toast.success('Inventory transferred successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-product', inventory?.productId?._id])
      queryClient.invalidateQueries(['inventory', inventory?._id])
      onClose()
      // Reset form
      setToLocation('')
      setQuantity('')
      setSelectedSerialNumbers([])
      setNotes('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to transfer inventory')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!fromLocation.trim()) {
      toast.error('Please enter source location')
      return
    }

    if (!toLocation.trim()) {
      toast.error('Please enter destination location')
      return
    }

    if (fromLocation.trim() === toLocation.trim()) {
      toast.error('Source and destination locations must be different')
      return
    }

    if (isBulk) {
      const qty = parseFloat(quantity)
      if (!qty || qty <= 0) {
        toast.error('Please enter a valid quantity')
        return
      }
      if (qty > availableAtLocation) {
        toast.error(`Insufficient quantity at source location. Available: ${availableAtLocation}`)
        return
      }
    } else {
      if (selectedSerialNumbers.length === 0) {
        toast.error('Please select at least one serialized unit')
        return
      }
    }

    const transactionData = {
      type: 'transfer',
      quantity: isBulk ? parseFloat(quantity) : selectedSerialNumbers.length,
      serialNumbers: isBulk ? [] : selectedSerialNumbers,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      notes: notes.trim() || undefined
    }

    transferMutation.mutate(transactionData)
  }

  const toggleSerialNumber = (serialNumber) => {
    setSelectedSerialNumbers(prev => 
      prev.includes(serialNumber)
        ? prev.filter(s => s !== serialNumber)
        : [...prev, serialNumber]
    )
  }

  if (!isOpen || !inventory) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Transfer Inventory</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={transferMutation.isLoading}
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
          {/* From Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              placeholder="e.g., Warehouse A"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={transferMutation.isLoading}
            />
            {fromLocation && (
              <p className="mt-1 text-xs text-gray-500">
                Available: {availableAtLocation} {isBulk ? inventory.productId?.unitOfMeasure || '' : 'units'}
              </p>
            )}
          </div>

          {/* To Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              placeholder="e.g., Warehouse B, Jobsite Storage"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={transferMutation.isLoading}
            />
          </div>

          {/* Quantity (Bulk) or Serial Numbers (Serialized) */}
          {isBulk ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Transfer <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={availableAtLocation}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={transferMutation.isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum: {availableAtLocation} {inventory.productId?.unitOfMeasure || ''}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Units to Transfer <span className="text-red-500">*</span>
              </label>
              {availableSerialized.length === 0 ? (
                <div className="border border-gray-300 rounded-md p-4 text-center">
                  <p className="text-sm text-gray-500">No available units at source location</p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {availableSerialized.map((unit) => (
                      <label
                        key={unit.serialNumber}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSerialNumbers.includes(unit.serialNumber)}
                          onChange={() => toggleSerialNumber(unit.serialNumber)}
                          className="mr-3"
                          disabled={transferMutation.isLoading}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{unit.serialNumber}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {selectedSerialNumbers.length > 0 && (
                <p className="mt-2 text-xs text-blue-600">
                  {selectedSerialNumbers.length} unit{selectedSerialNumbers.length !== 1 ? 's' : ''} selected
                </p>
              )}
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
              placeholder="Additional notes about this transfer..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={transferMutation.isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={transferMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={transferMutation.isLoading || !fromLocation.trim() || !toLocation.trim() || (isBulk && !quantity) || (!isBulk && selectedSerialNumbers.length === 0)}
            >
              {transferMutation.isLoading ? 'Transferring...' : 'Transfer Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

