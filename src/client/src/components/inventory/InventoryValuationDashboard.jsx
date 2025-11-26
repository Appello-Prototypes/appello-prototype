import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { XMarkIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { inventoryAPI } from '../../services/api'

/**
 * Inventory Valuation Dashboard
 * 
 * Displays inventory value, cost analysis, and valuation reports
 */
export default function InventoryValuationDashboard({ isOpen, onClose }) {
  const [groupBy, setGroupBy] = useState('product') // 'product', 'location', 'type'

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory-valuation', groupBy],
    queryFn: async () => {
      const res = await inventoryAPI.getAllInventory({})
      const items = res.data.data || []
      
      // Calculate valuations
      let totalValue = 0
      let totalCost = 0
      let itemCount = 0
      const byLocation = {}
      const byType = {}
      const byProduct = {}

      items.forEach(item => {
        const product = item.productId || {}
        const isBulk = item.inventoryType === 'bulk'
        const quantity = isBulk ? (item.quantityOnHand || 0) : (item.serializedUnits?.length || 0)
        const avgCost = item.averageCost || 0
        const value = quantity * avgCost

        totalValue += value
        totalCost += avgCost
        itemCount++

        // Group by location
        const location = item.primaryLocation || 'Unspecified'
        if (!byLocation[location]) {
          byLocation[location] = { value: 0, items: 0, quantity: 0 }
        }
        byLocation[location].value += value
        byLocation[location].items += 1
        byLocation[location].quantity += quantity

        // Group by type
        const type = isBulk ? 'Bulk' : 'Serialized'
        if (!byType[type]) {
          byType[type] = { value: 0, items: 0, quantity: 0 }
        }
        byType[type].value += value
        byType[type].items += 1
        byType[type].quantity += quantity

        // Group by product
        const productName = product.name || 'Unknown'
        if (!byProduct[productName]) {
          byProduct[productName] = { value: 0, items: 0, quantity: 0, avgCost: 0 }
        }
        byProduct[productName].value += value
        byProduct[productName].items += 1
        byProduct[productName].quantity += quantity
        byProduct[productName].avgCost = avgCost
      })

      return {
        totalValue,
        totalCost: totalCost / itemCount || 0,
        itemCount,
        byLocation,
        byType,
        byProduct
      }
    },
    enabled: isOpen
  })

  if (!isOpen) return null

  const valuationData = inventoryData || {
    totalValue: 0,
    totalCost: 0,
    itemCount: 0,
    byLocation: {},
    byType: {},
    byProduct: {}
  }

  const groupedData = groupBy === 'location' ? valuationData.byLocation :
                     groupBy === 'type' ? valuationData.byType :
                     valuationData.byProduct

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-6xl shadow-xl rounded-lg bg-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Inventory Valuation</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Total Inventory Value</div>
            <div className="text-2xl font-semibold text-gray-900">
              ${valuationData.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Total Items</div>
            <div className="text-2xl font-semibold text-gray-900">
              {valuationData.itemCount}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Average Cost per Item</div>
            <div className="text-2xl font-semibold text-gray-900">
              ${valuationData.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Group By Selector */}
        <div className="mb-4 flex items-center gap-3 flex-shrink-0">
          <ChartBarIcon className="h-5 w-5 text-gray-400" />
          <label className="text-sm text-gray-600">Group by:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="product">Product</option>
            <option value="location">Location</option>
            <option value="type">Type</option>
          </select>
        </div>

        {/* Valuation Breakdown */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-500">Loading valuation data...</div>
            </div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-500">No inventory data available</div>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedData)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([key, data]) => (
                  <div key={key} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{key}</h4>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>{data.items} item{data.items !== 1 ? 's' : ''}</span>
                          <span>Qty: {data.quantity.toLocaleString()}</span>
                          {groupBy === 'product' && (
                            <span>Avg Cost: ${data.avgCost.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {((data.value / valuationData.totalValue) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(data.value / valuationData.totalValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

