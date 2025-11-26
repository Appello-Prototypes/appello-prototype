import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { inventoryAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Adjust Inventory Modal
 * 
 * Allows users to adjust inventory quantities (increase or decrease)
 * with reason tracking for audit purposes
 */
export default function AdjustInventoryModal({ isOpen, onClose, inventory }) {
  const queryClient = useQueryClient()
  const [adjustmentType, setAdjustmentType] = useState('increase') // 'increase' or 'decrease'
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const adjustmentReasons = [
    { value: 'cycle_count', label: 'Cycle Count Adjustment' },
    { value: 'damage', label: 'Damage/Loss' },
    { value: 'theft', label: 'Theft' },
    { value: 'expired', label: 'Expired/Spoiled' },
    { value: 'found', label: 'Found/Discovered' },
    { value: 'correction', label: 'Data Correction' },
    { value: 'other', label: 'Other' }
  ]

  const adjustMutation = useMutation({
    mutationFn: (data) => inventoryAPI.addTransaction(inventory._id, data),
    onSuccess: () => {
      toast.success('Inventory adjusted successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-product', inventory?.productId?._id])
      queryClient.invalidateQueries(['inventory', inventory?._id])
      onClose()
      // Reset form
      setAdjustmentType('increase')
      setQuantity('')
      setReason('')
      setNotes('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to adjust inventory')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (!reason) {
      toast.error('Please select a reason for this adjustment')
      return
    }

    // For decrease, make quantity negative
    const adjustmentQuantity = adjustmentType === 'increase' ? qty : -qty

    // Check if decrease would result in negative quantity
    if (adjustmentType === 'decrease' && inventory?.inventoryType === 'bulk') {
      const newQuantity = (inventory.quantityOnHand || 0) + adjustmentQuantity
      if (newQuantity < 0) {
        toast.error(`Adjustment would result in negative quantity. Current: ${inventory.quantityOnHand || 0}`)
        return
      }
    }

    const transactionData = {
      type: 'adjustment',
      quantity: adjustmentQuantity,
      referenceType: 'adjustment',
      notes: notes.trim() || `Adjustment: ${adjustmentReasons.find(r => r.value === reason)?.label || reason}`,
      // Store reason in notes for now (adjustmentReason field would need backend update)
    }

    adjustMutation.mutate(transactionData)
  }

  if (!isOpen || !inventory) return null

  const isBulk = inventory.inventoryType === 'bulk'
  const currentQuantity = isBulk ? inventory.quantityOnHand : inventory.serializedUnits?.length || 0

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <h3 className="text-xl font-semibold text-gray-900">Adjust Inventory</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={adjustMutation.isLoading}
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
            Current {isBulk ? 'Quantity' : 'Units'}: <span className="font-medium">{currentQuantity}</span>
            {isBulk && inventory.productId?.unitOfMeasure && ` ${inventory.productId.unitOfMeasure}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="increase"
                  checked={adjustmentType === 'increase'}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="mr-2"
                  disabled={adjustMutation.isLoading}
                />
                <span className="text-sm text-gray-700">Increase (+)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="decrease"
                  checked={adjustmentType === 'decrease'}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="mr-2"
                  disabled={adjustMutation.isLoading}
                />
                <span className="text-sm text-gray-700">Decrease (-)</span>
              </label>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isBulk ? 'Quantity' : 'Number of Units'} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step={isBulk ? "0.01" : "1"}
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={adjustMutation.isLoading}
            />
            {adjustmentType === 'decrease' && isBulk && (
              <p className="mt-1 text-xs text-gray-500">
                New quantity will be: {currentQuantity - (parseFloat(quantity) || 0)}
                {inventory.productId?.unitOfMeasure && ` ${inventory.productId.unitOfMeasure}`}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={adjustMutation.isLoading}
            >
              <option value="">Select a reason...</option>
              {adjustmentReasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
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
              placeholder="Additional details about this adjustment..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={adjustMutation.isLoading}
            />
          </div>

          {/* Warning for decrease */}
          {adjustmentType === 'decrease' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Warning:</strong> Decreasing inventory will reduce your on-hand quantity. 
                Make sure this adjustment is accurate and properly documented.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={adjustMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${
                adjustmentType === 'increase' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={adjustMutation.isLoading || !quantity || !reason}
            >
              {adjustMutation.isLoading ? 'Adjusting...' : `${adjustmentType === 'increase' ? 'Increase' : 'Decrease'} Inventory`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

