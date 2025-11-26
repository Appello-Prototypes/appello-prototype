import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, CubeIcon } from '@heroicons/react/24/outline'
import { inventoryAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Create Inventory Record Modal
 * 
 * Allows users to create a new inventory record for a product
 */
export default function CreateInventoryModal({ isOpen, onClose, product }) {
  const queryClient = useQueryClient()
  const [inventoryType, setInventoryType] = useState('bulk')
  const [quantityOnHand, setQuantityOnHand] = useState('')
  const [primaryLocation, setPrimaryLocation] = useState('')
  const [reorderPoint, setReorderPoint] = useState('')
  const [reorderQuantity, setReorderQuantity] = useState('')
  const [costMethod, setCostMethod] = useState('fifo')
  const [averageCost, setAverageCost] = useState('')
  const [notes, setNotes] = useState('')

  const createMutation = useMutation({
    mutationFn: (data) => inventoryAPI.createOrUpdateInventory(data),
    onSuccess: () => {
      toast.success('Inventory record created successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-product', product?._id || product?.productId?._id])
      onClose()
      // Reset form
      setInventoryType('bulk')
      setQuantityOnHand('')
      setPrimaryLocation('')
      setReorderPoint('')
      setReorderQuantity('')
      setCostMethod('fifo')
      setAverageCost('')
      setNotes('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create inventory record')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const productId = product?._id || product?.productId?._id
    if (!productId) {
      toast.error('Product ID is required')
      return
    }

    const data = {
      productId,
      variantId: product?.variantId?._id || product?.variantId || null,
      inventoryType,
      quantityOnHand: inventoryType === 'bulk' ? parseFloat(quantityOnHand) || 0 : 0,
      primaryLocation: primaryLocation.trim() || undefined,
      reorderPoint: reorderPoint ? parseFloat(reorderPoint) : undefined,
      reorderQuantity: reorderQuantity ? parseFloat(reorderQuantity) : undefined,
      costMethod,
      averageCost: averageCost ? parseFloat(averageCost) : undefined,
      notes: notes.trim() || undefined
    }

    createMutation.mutate(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CubeIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Create Inventory Record</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={createMutation.isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {product && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{product.name || product.variantName}</p>
            {product.internalPartNumber && (
              <p className="text-xs text-gray-500">SKU: {product.internalPartNumber}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inventory Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inventory Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="bulk"
                  checked={inventoryType === 'bulk'}
                  onChange={(e) => setInventoryType(e.target.value)}
                  className="mr-2"
                  disabled={createMutation.isLoading}
                />
                <span className="text-sm text-gray-700">Bulk (Quantity-based)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="serialized"
                  checked={inventoryType === 'serialized'}
                  onChange={(e) => setInventoryType(e.target.value)}
                  className="mr-2"
                  disabled={createMutation.isLoading}
                />
                <span className="text-sm text-gray-700">Serialized (Individual units)</span>
              </label>
            </div>
          </div>

          {/* Quantity on Hand (Bulk only) */}
          {inventoryType === 'bulk' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Quantity on Hand
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={createMutation.isLoading}
              />
            </div>
          )}

          {/* Primary Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Location
            </label>
            <input
              type="text"
              value={primaryLocation}
              onChange={(e) => setPrimaryLocation(e.target.value)}
              placeholder="e.g., Warehouse A, Jobsite Storage"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createMutation.isLoading}
            />
          </div>

          {/* Reorder Settings (Bulk only) */}
          {inventoryType === 'bulk' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Point
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={createMutation.isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">Alert when quantity falls below this</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={reorderQuantity}
                  onChange={(e) => setReorderQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={createMutation.isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">Suggested order quantity</p>
              </div>
            </div>
          )}

          {/* Cost Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Method
            </label>
            <select
              value={costMethod}
              onChange={(e) => setCostMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createMutation.isLoading}
            >
              <option value="fifo">FIFO (First In, First Out)</option>
              <option value="lifo">LIFO (Last In, First Out)</option>
              <option value="average">Average Cost</option>
            </select>
          </div>

          {/* Average Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Average Cost (optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={averageCost}
              onChange={(e) => setAverageCost(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createMutation.isLoading}
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
              placeholder="Additional notes about this inventory..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createMutation.isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={createMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? 'Creating...' : 'Create Inventory Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

