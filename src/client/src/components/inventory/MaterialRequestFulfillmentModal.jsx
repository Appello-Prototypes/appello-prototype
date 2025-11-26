import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, CheckCircleIcon, CubeIcon } from '@heroicons/react/24/outline'
import { materialRequestAPI, inventoryAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Material Request Fulfillment Modal
 * 
 * Allows users to fulfill material requests from inventory or mark for supplier ordering
 */
export default function MaterialRequestFulfillmentModal({ isOpen, onClose, materialRequest }) {
  const queryClient = useQueryClient()
  const [fulfillments, setFulfillments] = useState({}) // { lineItemIndex: { source, inventoryId?, quantity?, location?, costCode } }

  // Fetch inventory availability for products in the MR
  const productIds = materialRequest?.lineItems
    ?.filter(item => item.productId)
    ?.map(item => item.productId) || []

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-for-mr', productIds],
    queryFn: async () => {
      const results = {}
      for (const productId of productIds) {
        try {
          const res = await inventoryAPI.getInventoryByProduct(productId)
          results[productId] = res.data.data
        } catch (error) {
          results[productId] = null
        }
      }
      return results
    },
    enabled: isOpen && productIds.length > 0
  })

  const fulfillMutation = useMutation({
    mutationFn: (data) => materialRequestAPI.fulfillRequest(materialRequest._id, data),
    onSuccess: () => {
      toast.success('Material request fulfilled successfully')
      queryClient.invalidateQueries(['material-requests'])
      queryClient.invalidateQueries(['material-requests', materialRequest._id])
      queryClient.invalidateQueries(['inventory'])
      onClose()
      setFulfillments({})
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to fulfill material request')
    }
  })

  const handleLineItemChange = (lineItemIndex, field, value) => {
    setFulfillments(prev => ({
      ...prev,
      [lineItemIndex]: {
        ...prev[lineItemIndex],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const lineItemFulfillments = materialRequest.lineItems.map((item, index) => {
      const fulfillment = fulfillments[index] || {}
      return {
        lineItemIndex: index,
        fulfillmentSource: fulfillment.source || 'supplier',
        supplierId: fulfillment.supplierId || null,
        inventoryId: fulfillment.inventoryId || null,
        quantity: fulfillment.quantity || item.quantity,
        inventoryLocation: fulfillment.location || null,
        costCode: fulfillment.costCode || null
      }
    })

    fulfillMutation.mutate({ lineItemFulfillments })
  }

  if (!isOpen || !materialRequest) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-lg bg-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Fulfill Material Request</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={fulfillMutation.isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* MR Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex-shrink-0">
          <p className="text-sm font-medium text-gray-900">
            {materialRequest.requestNumber || 'Material Request'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Job: {materialRequest.jobId?.jobNumber || materialRequest.jobId?.name || 'N/A'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          {materialRequest.lineItems?.map((item, index) => {
            const fulfillment = fulfillments[index] || {}
            const inventory = item.productId ? inventoryData?.[item.productId] : null
            const inventoryRecord = inventory?.inventory || inventory
            const hasInventory = inventoryRecord && !inventoryRecord.isNew && inventoryRecord.quantityAvailable > 0
            const source = fulfillment.source || (hasInventory ? 'inventory' : 'supplier')

            return (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{item.productName}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Quantity: {item.quantity} {item.unit}
                    </p>
                    {hasInventory && (
                      <p className="text-xs text-blue-600 mt-1">
                        Available: {inventoryRecord.quantityAvailable} {inventoryRecord.productId?.unitOfMeasure || item.unit}
                      </p>
                    )}
                  </div>
                  {hasInventory && (
                    <CubeIcon className="h-5 w-5 text-green-500" title="Available in inventory" />
                  )}
                </div>

                {/* Fulfillment Source */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fulfillment Source <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="inventory"
                        checked={source === 'inventory'}
                        onChange={(e) => handleLineItemChange(index, 'source', e.target.value)}
                        disabled={!hasInventory || fulfillMutation.isLoading}
                        className="mr-2"
                      />
                      <span className="text-xs text-gray-700">
                        From Inventory {!hasInventory && '(Not Available)'}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="supplier"
                        checked={source === 'supplier'}
                        onChange={(e) => handleLineItemChange(index, 'source', e.target.value)}
                        disabled={fulfillMutation.isLoading}
                        className="mr-2"
                      />
                      <span className="text-xs text-gray-700">Order from Supplier</span>
                    </label>
                  </div>
                </div>

                {/* Inventory-specific fields */}
                {source === 'inventory' && hasInventory && (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity to Issue
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={Math.min(item.quantity, inventoryRecord.quantityAvailable)}
                        value={fulfillment.quantity || item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={fulfillMutation.isLoading}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max: {inventoryRecord.quantityAvailable} {inventoryRecord.productId?.unitOfMeasure || item.unit}
                      </p>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={fulfillment.location || inventoryRecord.primaryLocation || ''}
                        onChange={(e) => handleLineItemChange(index, 'location', e.target.value)}
                        placeholder="e.g., Warehouse A"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={fulfillMutation.isLoading}
                      />
                    </div>
                    <input
                      type="hidden"
                      value={inventoryRecord._id}
                      onChange={(e) => handleLineItemChange(index, 'inventoryId', inventoryRecord._id)}
                    />
                  </>
                )}

                {/* Cost Code (for both sources) */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cost Code (optional)
                  </label>
                  <input
                    type="text"
                    value={fulfillment.costCode || ''}
                    onChange={(e) => handleLineItemChange(index, 'costCode', e.target.value.toUpperCase())}
                    placeholder="e.g., 01-100"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={fulfillMutation.isLoading}
                  />
                </div>
              </div>
            )
          })}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={fulfillMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={fulfillMutation.isLoading}
            >
              {fulfillMutation.isLoading ? 'Fulfilling...' : 'Fulfill Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

