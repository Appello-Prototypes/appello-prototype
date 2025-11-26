import React, { useState, useMemo } from 'react'
import { XMarkIcon, CheckIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { companyAPI, jobAPI } from '../services/api'
import { formatCurrency } from '../utils/currency'

/**
 * Enhanced Convert to PO Modal
 * 
 * Allows converting a material request to one or multiple POs (one per supplier)
 * Groups line items by supplier and allows selecting which suppliers to create POs for
 */
export default function ConvertToPOMultiModal({ isOpen, onClose, onConvert, materialRequest, isLoading }) {
  const [selectedSuppliers, setSelectedSuppliers] = useState(new Set())
  const [defaultCostCode, setDefaultCostCode] = useState('')

  // Fetch job details to get cost codes
  const jobId = materialRequest?.jobId?._id || materialRequest?.jobId
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await jobAPI.getJob(jobId)
      return response.data.data
    },
    enabled: isOpen && !!jobId,
    staleTime: 5 * 60 * 1000,
  })

  const costCodes = job?.costCodes || []

  // Group line items by supplier
  const supplierGroups = useMemo(() => {
    if (!materialRequest?.lineItems) return []

    const groups = new Map()

    materialRequest.lineItems.forEach((item, index) => {
      // Get suppliers from product
      const product = item.productId
      const variant = product?.variants?.find(v => 
        v._id?.toString() === item.variantId?.toString()
      )
      
      // Use variant suppliers if available, otherwise product suppliers
      const suppliers = variant?.suppliers || product?.suppliers || []
      
      if (suppliers.length === 0) {
        // Item has no suppliers - add to "No Supplier" group
        const noSupplierKey = '__no_supplier__'
        if (!groups.has(noSupplierKey)) {
          groups.set(noSupplierKey, {
            supplierId: null,
            supplier: null,
            items: [],
            totalQuantity: 0,
            estimatedValue: 0
          })
        }
        const group = groups.get(noSupplierKey)
        group.items.push({ ...item, index })
        group.totalQuantity += parseFloat(item.quantity || 0)
        return
      }

      // Group by each supplier
      suppliers.forEach((supplierInfo) => {
        const supplier = supplierInfo.supplierId || supplierInfo.supplier
        const supplierId = supplier?._id || supplier
        const supplierKey = supplierId?.toString() || '__no_supplier__'
        
        if (!groups.has(supplierKey)) {
          groups.set(supplierKey, {
            supplierId: supplierId,
            supplier: supplier,
            supplierPartNumber: supplierInfo.supplierPartNumber,
            listPrice: supplierInfo.listPrice,
            netPrice: supplierInfo.netPrice,
            lastPrice: supplierInfo.lastPrice,
            isPreferred: supplierInfo.isPreferred,
            items: [],
            totalQuantity: 0,
            estimatedValue: 0
          })
        }
        
        const group = groups.get(supplierKey)
        const price = supplierInfo.netPrice || supplierInfo.listPrice || supplierInfo.lastPrice || 0
        const quantity = parseFloat(item.quantity || 0)
        
        group.items.push({ ...item, index, supplierInfo })
        group.totalQuantity += quantity
        group.estimatedValue += quantity * price
      })
    })

    return Array.from(groups.values())
  }, [materialRequest])

  // Auto-select all suppliers when modal opens
  React.useEffect(() => {
    if (isOpen && supplierGroups.length > 0) {
      const allSupplierIds = supplierGroups
        .filter(g => g.supplierId)
        .map(g => g.supplierId.toString())
      setSelectedSuppliers(new Set(allSupplierIds))
    }
  }, [isOpen, supplierGroups])

  const handleToggleSupplier = (supplierId) => {
    const newSet = new Set(selectedSuppliers)
    if (newSet.has(supplierId)) {
      newSet.delete(supplierId)
    } else {
      newSet.add(supplierId)
    }
    setSelectedSuppliers(newSet)
  }

  const handleSelectAll = () => {
    const allSupplierIds = supplierGroups
      .filter(g => g.supplierId)
      .map(g => g.supplierId.toString())
    setSelectedSuppliers(new Set(allSupplierIds))
  }

  const handleDeselectAll = () => {
    setSelectedSuppliers(new Set())
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (selectedSuppliers.size === 0) {
      return
    }

    // Create conversion data for each selected supplier
    const conversions = supplierGroups
      .filter(group => group.supplierId && selectedSuppliers.has(group.supplierId.toString()))
      .map(group => ({
        supplierId: group.supplierId.toString(), // Ensure it's a string for the API
        lineItemIndices: group.items.map(item => item.index),
        defaultCostCode: defaultCostCode || undefined
      }))

    onConvert({ conversions })
  }

  if (!isOpen) return null

  const hasNoSupplierItems = supplierGroups.some(g => !g.supplierId)
  const selectedCount = selectedSuppliers.size

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-lg bg-white my-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Convert to Purchase Order(s)</h3>
            <p className="text-sm text-gray-500 mt-1">
              Create one PO per supplier. Select which suppliers to create POs for.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
                disabled={isLoading}
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
                disabled={isLoading}
              >
                Deselect All
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {selectedCount} supplier{selectedCount !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Supplier Groups */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {supplierGroups.map((group, groupIndex) => {
              if (!group.supplierId) {
                // No supplier group
                return (
                  <div key="__no_supplier__" className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <BuildingStorefrontIcon className="h-5 w-5 text-yellow-600" />
                          <span className="font-medium text-yellow-900">No Supplier Available</span>
                        </div>
                        <p className="text-sm text-yellow-800 mb-2">
                          {group.items.length} item{group.items.length !== 1 ? 's' : ''} have no supplier assigned.
                          You'll need to manually assign suppliers when creating the PO.
                        </p>
                        <div className="text-xs text-yellow-700">
                          <div>Total Quantity: {group.totalQuantity}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              const supplierIdStr = group.supplierId.toString()
              const isSelected = selectedSuppliers.has(supplierIdStr)
              const supplierName = group.supplier?.name || 'Unknown Supplier'

              return (
                <div
                  key={supplierIdStr}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggleSupplier(supplierIdStr)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <BuildingStorefrontIcon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{supplierName}</span>
                        {group.isPreferred && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Preferred
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">Items:</span> {group.items.length}
                        </div>
                        <div>
                          <span className="font-medium">Total Qty:</span> {group.totalQuantity}
                        </div>
                        <div>
                          <span className="font-medium">Est. Value:</span>{' '}
                          {formatCurrency(group.estimatedValue)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {group.items.map((item, idx) => (
                          <div key={idx} className="truncate">
                            {item.productName || item.description} - Qty: {item.quantity} {item.unit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Default Cost Code */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Cost Code (applied to all POs)
            </label>
            {costCodes.length > 0 ? (
              <select
                value={defaultCostCode}
                onChange={(e) => setDefaultCostCode(e.target.value)}
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a cost code (optional)</option>
                {costCodes.map((code) => (
                  <option key={code.code} value={code.code}>
                    {code.code} - {code.description || code.name || 'No description'}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={defaultCostCode}
                onChange={(e) => setDefaultCostCode(e.target.value)}
                placeholder="Enter cost code (optional)"
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            )}
            <p className="mt-1 text-xs text-gray-500">
              {costCodes.length > 0 
                ? 'Select a cost code from the job, or leave blank'
                : 'Enter a cost code if needed'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || selectedCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading 
                ? 'Creating...' 
                : `Create ${selectedCount} Purchase Order${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

