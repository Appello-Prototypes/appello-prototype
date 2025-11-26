import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExclamationTriangleIcon, CubeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { inventoryAPI } from '../../services/api'

/**
 * Low Stock Dashboard
 * 
 * Displays all inventory items that are below their reorder point
 */
export default function LowStockDashboard({ isOpen, onClose, onSelectProduct }) {
  const [sortBy, setSortBy] = useState('quantity') // 'quantity', 'product', 'location'

  const { data: lowStockData, isLoading } = useQuery({
    queryKey: ['inventory-low-stock', sortBy],
    queryFn: () => inventoryAPI.getAllInventory({ lowStock: 'true' }).then(res => res.data.data || []),
    enabled: isOpen,
    staleTime: 30000
  })

  const sortedData = React.useMemo(() => {
    if (!lowStockData) return []
    
    const sorted = [...lowStockData].sort((a, b) => {
      switch (sortBy) {
        case 'quantity':
          return (a.quantityOnHand || 0) - (b.quantityOnHand || 0)
        case 'product':
          const nameA = (a.productId?.name || '').toLowerCase()
          const nameB = (b.productId?.name || '').toLowerCase()
          return nameA.localeCompare(nameB)
        case 'location':
          const locA = (a.primaryLocation || '').toLowerCase()
          const locB = (b.primaryLocation || '').toLowerCase()
          return locA.localeCompare(locB)
        default:
          return 0
      }
    })
    
    return sorted
  }, [lowStockData, sortBy])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-6xl shadow-xl rounded-lg bg-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <h3 className="text-xl font-semibold text-gray-900">Low Stock Alert</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-900">
                {sortedData.length} item{sortedData.length !== 1 ? 's' : ''} below reorder point
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Review these items and create purchase orders to replenish stock
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="quantity">Quantity</option>
                <option value="product">Product Name</option>
                <option value="location">Location</option>
              </select>
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-500">Loading low stock items...</div>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CubeIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No low stock items found</p>
              <p className="text-xs text-gray-400 mt-1">All inventory levels are above reorder points</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedData.map((item) => {
                const product = item.productId || {}
                const currentQty = item.quantityOnHand || 0
                const reorderPoint = item.reorderPoint || 0
                const reorderQuantity = item.reorderQuantity || 0
                const percentBelow = reorderPoint > 0 ? ((reorderPoint - currentQty) / reorderPoint * 100) : 0
                
                return (
                  <div
                    key={item._id}
                    onClick={() => onSelectProduct && onSelectProduct({
                      ...product,
                      inventoryId: item._id,
                      inventory: item
                    })}
                    className="flex items-center justify-between p-4 bg-white border border-yellow-200 rounded-lg hover:bg-yellow-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {product.name || 'Unknown Product'}
                        </h4>
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                      </div>
                      {product.internalPartNumber && (
                        <p className="text-xs text-gray-500 mb-2">SKU: {product.internalPartNumber}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-gray-600">Current:</span>
                          <span className="font-medium text-red-600 ml-1">
                            {currentQty} {product.unitOfMeasure || ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Reorder Point:</span>
                          <span className="font-medium text-gray-900 ml-1">
                            {reorderPoint} {product.unitOfMeasure || ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Suggested Order:</span>
                          <span className="font-medium text-blue-600 ml-1">
                            {reorderQuantity} {product.unitOfMeasure || ''}
                          </span>
                        </div>
                        {item.primaryLocation && (
                          <div>
                            <span className="text-gray-600">Location:</span>
                            <span className="text-gray-900 ml-1">{item.primaryLocation}</span>
                          </div>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            percentBelow > 50 ? 'bg-red-500' :
                            percentBelow > 25 ? 'bg-yellow-500' :
                            'bg-yellow-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, (currentQty / reorderPoint) * 100))}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-xs text-gray-500 mb-1">Below by</div>
                      <div className="text-lg font-semibold text-red-600">
                        {reorderPoint - currentQty} {product.unitOfMeasure || ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

