import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  MagnifyingGlassIcon,
  CubeIcon,
  MapPinIcon,
  ClockIcon,
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { inventoryAPI, productAPI } from '../services/api'
import toast from 'react-hot-toast'
import CreateInventoryModal from './inventory/CreateInventoryModal'
import IssueInventoryModal from './inventory/IssueInventoryModal'
import ReturnInventoryModal from './inventory/ReturnInventoryModal'
import AdjustInventoryModal from './inventory/AdjustInventoryModal'
import TransferInventoryModal from './inventory/TransferInventoryModal'
import AddSerializedUnitsModal from './inventory/AddSerializedUnitsModal'
import UpdateSerializedUnitModal from './inventory/UpdateSerializedUnitModal'
import TransactionHistoryView from './inventory/TransactionHistoryView'
import LowStockDashboard from './inventory/LowStockDashboard'

/**
 * Inventory Management Component
 * 
 * Displays inventory list and detail views for products
 * Supports both bulk and serialized inventory tracking
 */
export default function InventoryManagement({ 
  selectedProduct, 
  onBack,
  onSelectProduct 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'bulk', 'serialized'
  const [filterLocation, setFilterLocation] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showAddSerializedModal, setShowAddSerializedModal] = useState(false)
  const [showUpdateSerializedModal, setShowUpdateSerializedModal] = useState(false)
  const [showTransactionHistory, setShowTransactionHistory] = useState(false)
  const [showLowStockDashboard, setShowLowStockDashboard] = useState(false)
  const [selectedSerialNumber, setSelectedSerialNumber] = useState(null)
  const [selectedInventory, setSelectedInventory] = useState(null)
  const queryClient = useQueryClient()

  // Fetch all inventory
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', searchTerm, filterType, filterLocation, lowStockOnly],
    queryFn: () => {
      const params = {}
      if (searchTerm) params.search = searchTerm
      if (filterType !== 'all') params.inventoryType = filterType
      if (filterLocation) params.location = filterLocation
      if (lowStockOnly) params.lowStock = 'true'
      return inventoryAPI.getAllInventory(params).then(res => res.data.data)
    },
    staleTime: 30000
  })

  // If user searches and no inventory found, allow searching products to create inventory
  const { data: productSearchResults } = useQuery({
    queryKey: ['product-search-inventory', searchTerm],
    queryFn: () => {
      if (!searchTerm || searchTerm.length < 2) return Promise.resolve([])
      return productAPI.searchProducts(searchTerm, null, {}).then(res => res.data.data || [])
    },
    enabled: !!searchTerm && searchTerm.length >= 2 && (!inventoryData || inventoryData.length === 0),
    staleTime: 30000
  })

  // If a product is selected, show detail view
  if (selectedProduct) {
    return (
      <>
        <InventoryDetailView 
          product={selectedProduct}
          onBack={() => {
            if (onBack) onBack()
            setSelectedProduct(null)
          }}
          onIssue={() => {
            // Fetch full inventory data
            const productId = selectedProduct._id || selectedProduct.productId?._id
            const variantId = selectedProduct.variantId?._id || selectedProduct.variantId || null
            inventoryAPI.getInventoryByProduct(productId, variantId)
              .then(res => {
                setSelectedInventory(res.data.data)
                setShowIssueModal(true)
              })
              .catch(() => toast.error('Failed to load inventory data'))
          }}
          onReturn={() => {
            const productId = selectedProduct._id || selectedProduct.productId?._id
            const variantId = selectedProduct.variantId?._id || selectedProduct.variantId || null
            inventoryAPI.getInventoryByProduct(productId, variantId)
              .then(res => {
                setSelectedInventory(res.data.data)
                setShowReturnModal(true)
              })
              .catch(() => toast.error('Failed to load inventory data'))
          }}
          onAdjust={() => {
            const productId = selectedProduct._id || selectedProduct.productId?._id
            const variantId = selectedProduct.variantId?._id || selectedProduct.variantId || null
            inventoryAPI.getInventoryByProduct(productId, variantId)
              .then(res => {
                setSelectedInventory(res.data.data)
                setShowAdjustModal(true)
              })
              .catch(() => toast.error('Failed to load inventory data'))
          }}
          onTransfer={() => {
            const productId = selectedProduct._id || selectedProduct.productId?._id
            const variantId = selectedProduct.variantId?._id || selectedProduct.variantId || null
            inventoryAPI.getInventoryByProduct(productId, variantId)
              .then(res => {
                setSelectedInventory(res.data.data)
                setShowTransferModal(true)
              })
              .catch(() => toast.error('Failed to load inventory data'))
          }}
          onAddSerialized={() => {
            const productId = selectedProduct._id || selectedProduct.productId?._id
            const variantId = selectedProduct.variantId?._id || selectedProduct.variantId || null
            inventoryAPI.getInventoryByProduct(productId, variantId)
              .then(res => {
                setSelectedInventory(res.data.data)
                setShowAddSerializedModal(true)
              })
              .catch(() => toast.error('Failed to load inventory data'))
          }}
          onUpdateSerialized={(serialNumber) => {
            const productId = selectedProduct._id || selectedProduct.productId?._id
            const variantId = selectedProduct.variantId?._id || selectedProduct.variantId || null
            inventoryAPI.getInventoryByProduct(productId, variantId)
              .then(res => {
                setSelectedInventory(res.data.data)
                setSelectedSerialNumber(serialNumber)
                setShowUpdateSerializedModal(true)
              })
              .catch(() => toast.error('Failed to load inventory data'))
          }}
          onCreateRecord={() => setShowCreateModal(true)}
          onViewTransactionHistory={() => {
            const productId = selectedProduct._id || selectedProduct.productId?._id
            const variantId = selectedProduct.variantId?._id || selectedProduct.variantId || null
            inventoryAPI.getInventoryByProduct(productId, variantId)
              .then(res => {
                const inv = res.data.data?.inventory || res.data.data
                if (inv?._id) {
                  setSelectedInventory(inv)
                  setShowTransactionHistory(true)
                } else {
                  toast.error('Inventory record not found')
                }
              })
              .catch(() => toast.error('Failed to load inventory data'))
          }}
        />
        
        {/* Modals */}
        {showCreateModal && (
          <CreateInventoryModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            product={selectedProduct}
          />
        )}
        {showIssueModal && selectedInventory && (
          <IssueInventoryModal
            isOpen={showIssueModal}
            onClose={() => {
              setShowIssueModal(false)
              setSelectedInventory(null)
            }}
            inventory={selectedInventory}
          />
        )}
        {showReturnModal && selectedInventory && (
          <ReturnInventoryModal
            isOpen={showReturnModal}
            onClose={() => {
              setShowReturnModal(false)
              setSelectedInventory(null)
            }}
            inventory={selectedInventory}
          />
        )}
        {showAdjustModal && selectedInventory && (
          <AdjustInventoryModal
            isOpen={showAdjustModal}
            onClose={() => {
              setShowAdjustModal(false)
              setSelectedInventory(null)
            }}
            inventory={selectedInventory}
          />
        )}
        {showTransferModal && selectedInventory && (
          <TransferInventoryModal
            isOpen={showTransferModal}
            onClose={() => {
              setShowTransferModal(false)
              setSelectedInventory(null)
            }}
            inventory={selectedInventory}
          />
        )}
        {showAddSerializedModal && selectedInventory && (
          <AddSerializedUnitsModal
            isOpen={showAddSerializedModal}
            onClose={() => {
              setShowAddSerializedModal(false)
              setSelectedInventory(null)
            }}
            inventory={selectedInventory}
          />
        )}
        {showUpdateSerializedModal && selectedInventory && (
          <UpdateSerializedUnitModal
            isOpen={showUpdateSerializedModal}
            onClose={() => {
              setShowUpdateSerializedModal(false)
              setSelectedInventory(null)
              setSelectedSerialNumber(null)
            }}
            inventory={selectedInventory}
            serialNumber={selectedSerialNumber}
          />
        )}
        {showTransactionHistory && selectedInventory && (
          <TransactionHistoryView
            isOpen={showTransactionHistory}
            onClose={() => {
              setShowTransactionHistory(false)
              setSelectedInventory(null)
            }}
            inventoryId={selectedInventory._id}
          />
        )}
        {showLowStockDashboard && (
          <LowStockDashboard
            isOpen={showLowStockDashboard}
            onClose={() => setShowLowStockDashboard(false)}
            onSelectProduct={(product) => {
              setShowLowStockDashboard(false)
              if (onSelectProduct) {
                onSelectProduct(product)
              }
            }}
          />
        )}
      </>
    )
  }

  // List view
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Inventory Management</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Track bulk items (quantity-based) and serialized items (unique units with serial numbers)
              </p>
            </div>
            <button
              onClick={() => setShowLowStockDashboard(true)}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100"
            >
              <ExclamationTriangleIcon className="h-4 w-4 mr-1.5" />
              Low Stock
            </button>
          </div>

        {/* Search and Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Types</option>
            <option value="bulk">Bulk Items</option>
            <option value="serialized">Serialized Items</option>
          </select>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">All Locations</option>
            {/* TODO: Populate from inventory locations */}
          </select>
          <label className="flex items-center px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="mr-1.5"
            />
            Low Stock Only
          </label>
        </div>
      </div>

      {/* Inventory List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500">Loading inventory...</div>
          </div>
        ) : !inventoryData || inventoryData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <CubeIcon className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 text-center mb-2">
              {searchTerm || filterType !== 'all' || filterLocation || lowStockOnly
                ? 'No inventory items match your filters'
                : 'No inventory items found'}
            </p>
            {searchTerm && productSearchResults && productSearchResults.length > 0 && (
              <div className="mt-4 w-full max-w-2xl">
                <p className="text-xs text-gray-500 text-center mb-3">
                  Found {productSearchResults.length} product{productSearchResults.length !== 1 ? 's' : ''} without inventory records:
                </p>
                <div className="space-y-2">
                  {productSearchResults.slice(0, 5).map((product) => (
                    <div
                      key={product._id || product.productId}
                      onClick={() => {
                        if (onSelectProduct) {
                          onSelectProduct(product)
                        }
                      }}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="text-sm font-medium text-gray-900">{product.name || product.variantName}</div>
                      {product.internalPartNumber && (
                        <div className="text-xs text-gray-500 mt-0.5">SKU: {product.internalPartNumber}</div>
                      )}
                      <div className="text-xs text-blue-600 mt-1">Click to create inventory record</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!searchTerm && filterType === 'all' && !filterLocation && !lowStockOnly && (
              <p className="text-xs text-gray-400 text-center">
                Select a product from Browse Products to view its inventory details, or search for products above
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      On Hand
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reserved
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reorder Point
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryData.map((item) => (
                    <InventoryTableRow
                      key={item._id}
                      item={item}
                      onClick={() => {
                        if (onSelectProduct && item.productId) {
                          onSelectProduct({
                            ...item.productId,
                            inventoryId: item._id,
                            inventory: item
                          })
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Inventory Table Row Component
 */
function InventoryTableRow({ item, onClick }) {
  const product = item.productId || {}
  const isBulk = item.inventoryType === 'bulk'
  const isLowStock = isBulk && item.reorderPoint && item.quantityOnHand < item.reorderPoint
  const totalValue = (item.quantityOnHand || 0) * (item.averageCost || 0)
  const unit = product.unitOfMeasure || 'EA'

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-900">
            {product.name || 'Unknown Product'}
          </div>
          {isLowStock && (
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-sm text-gray-600 font-mono">
          {product.internalPartNumber || '-'}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
          isBulk 
            ? 'bg-blue-100 text-blue-700'
            : 'bg-purple-100 text-purple-700'
        }`}>
          {isBulk ? 'Bulk' : 'Serialized'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {isBulk ? (
          <div className="text-sm text-gray-900">
            {item.quantityOnHand || 0} <span className="text-xs text-gray-500">{unit}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-900">
            {item.serializedUnits?.length || 0} <span className="text-xs text-gray-500">units</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {isBulk ? (
          <div className="text-sm font-medium text-blue-600">
            {item.quantityAvailable || 0} <span className="text-xs text-gray-500">{unit}</span>
          </div>
        ) : (
          <div className="text-sm font-medium text-blue-600">
            {item.serializedUnits?.filter(u => u.status === 'available').length || 0} <span className="text-xs text-gray-500">available</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {isBulk ? (
          <div className="text-sm text-gray-600">
            {item.quantityReserved || 0} <span className="text-xs text-gray-500">{unit}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-400">-</div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {isBulk && item.reorderPoint !== undefined ? (
          <div className="text-sm text-gray-900">
            {item.reorderPoint} <span className="text-xs text-gray-500">{unit}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-400">-</div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPinIcon className="h-4 w-4 text-gray-400" />
          {item.primaryLocation || '-'}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="text-sm text-gray-900">
          ${(item.averageCost || 0).toFixed(2)}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="text-sm font-medium text-gray-900">
          ${totalValue.toFixed(2)}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {isLowStock ? (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-700">
            Low Stock
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
            In Stock
          </span>
        )}
      </td>
    </tr>
  )
}

/**
 * Inventory Detail View Component
 */
function InventoryDetailView({ 
  product, 
  onBack,
  onIssue,
  onReturn,
  onAdjust,
  onTransfer,
  onAddSerialized,
  onUpdateSerialized,
  onCreateRecord,
  onViewTransactionHistory
}) {
  const productId = product._id || product.productId?._id
  const variantId = product.variantId?._id || product.variantId || null
  
  // If inventory is already passed with the product (from list click), use it
  const preloadedInventory = product.inventory
  
  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['inventory-product', productId, variantId],
    queryFn: () => inventoryAPI.getInventoryByProduct(productId, variantId).then(res => res.data.data),
    enabled: !!productId && !preloadedInventory, // Skip fetch if we already have inventory
    initialData: preloadedInventory ? { inventory: preloadedInventory } : undefined
  })

  // Use preloaded inventory if available, otherwise use fetched data
  // API returns { success: true, data: { inventory: {...} } } or { success: true, data: { isNew: true } }
  let inventory = null
  if (preloadedInventory) {
    inventory = preloadedInventory
  } else if (inventoryData) {
    inventory = inventoryData.inventory || inventoryData
  }
  
  const isBulk = inventory?.inventoryType === 'bulk' || inventory?.inventoryType === undefined
  const isNew = inventoryData?.isNew || !inventory

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading inventory details...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to inventory list
        </button>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {product.name || product.variantName || 'Product Inventory'}
          </h3>
          {product.internalPartNumber && (
            <p className="text-xs text-gray-500 mt-0.5">SKU: {product.internalPartNumber}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isNew ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-center">
              <CubeIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-medium text-gray-900 mb-2">No Inventory Record</h4>
              <p className="text-xs text-gray-500 mb-4">
                This product doesn't have an inventory record yet. Create one to start tracking.
              </p>
              <button 
                onClick={onCreateRecord}
                className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Create Inventory Record
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {isBulk ? (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Quantity on Hand</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {inventory.quantityOnHand || 0}
                      {product.unitOfMeasure && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          {product.unitOfMeasure}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Available</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {inventory.quantityAvailable || 0}
                      {product.unitOfMeasure && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          {product.unitOfMeasure}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Reserved</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {inventory.quantityReserved || 0}
                      {product.unitOfMeasure && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          {product.unitOfMeasure}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Total Serialized Units</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {inventory.serializedUnits?.length || 0}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Actions</h4>
              <div className="flex flex-wrap gap-2">
                {onIssue && (
                  <button
                    onClick={onIssue}
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    <ArrowRightIcon className="h-4 w-4 mr-1.5" />
                    Issue to Job
                  </button>
                )}
                {onReturn && (
                  <button
                    onClick={onReturn}
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
                    Return from Job
                  </button>
                )}
                {onAdjust && (
                  <button
                    onClick={onAdjust}
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-yellow-600 rounded hover:bg-yellow-700"
                  >
                    <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5" />
                    Adjust
                  </button>
                )}
                {onTransfer && (
                  <button
                    onClick={onTransfer}
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700"
                  >
                    <ArrowsRightLeftIcon className="h-4 w-4 mr-1.5" />
                    Transfer
                  </button>
                )}
                {!isBulk && onAddSerialized && (
                  <button
                    onClick={onAddSerialized}
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1.5" />
                    Add Units
                  </button>
                )}
              </div>
            </div>

            {/* Reorder Information (Bulk) */}
            {isBulk && (inventory.reorderPoint !== undefined || inventory.reorderQuantity !== undefined) && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Reorder Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  {inventory.reorderPoint !== undefined && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Reorder Point</div>
                      <div className="text-sm font-medium text-gray-900">
                        {inventory.reorderPoint} {product.unitOfMeasure || ''}
                      </div>
                    </div>
                  )}
                  {inventory.reorderQuantity !== undefined && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Reorder Quantity</div>
                      <div className="text-sm font-medium text-gray-900">
                        {inventory.reorderQuantity} {product.unitOfMeasure || ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Locations */}
            {inventory.primaryLocation && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4" />
                  Locations
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">{inventory.primaryLocation}</span>
                    <span className="text-xs text-gray-500">Primary</span>
                  </div>
                  {inventory.locations && inventory.locations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      {inventory.locations.map((loc, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <span className="text-sm text-gray-700">{loc.location}</span>
                          {isBulk && (
                            <span className="text-xs text-gray-500">
                              {loc.quantity} {product.unitOfMeasure || ''}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Serialized Units */}
            {!isBulk && inventory.serializedUnits && inventory.serializedUnits.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Serialized Units</h4>
                  {onAddSerialized && (
                    <button
                      onClick={onAddSerialized}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add Units
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {inventory.serializedUnits.map((unit, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => onUpdateSerialized && onUpdateSerialized(unit.serialNumber)}
                      className={`flex items-center justify-between py-2 px-3 bg-gray-50 rounded ${
                        onUpdateSerialized ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{unit.serialNumber}</div>
                        {unit.location && (
                          <div className="text-xs text-gray-500 mt-0.5">{unit.location}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                          unit.status === 'available' ? 'bg-green-100 text-green-700' :
                          unit.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                          unit.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                          unit.status === 'maintenance' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {unit.status}
                        </span>
                        {onUpdateSerialized && (
                          <PencilIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  Transaction History
                </h4>
                {onViewTransactionHistory && inventory.transactions && inventory.transactions.length > 0 && (
                  <button
                    onClick={onViewTransactionHistory}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    View All ({inventory.transactions.length})
                  </button>
                )}
              </div>
              {inventory.transactions && inventory.transactions.length > 0 ? (
                <div className="space-y-2">
                  {inventory.transactions.slice(0, 10).map((txn, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-xs">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 capitalize">{txn.type}</div>
                        <div className="text-gray-500 mt-0.5">
                          {new Date(txn.performedAt).toLocaleDateString()} {new Date(txn.performedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          txn.type === 'receipt' || txn.type === 'return' ? 'text-green-600' :
                          txn.type === 'issue' || txn.type === 'write_off' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {txn.type === 'receipt' || txn.type === 'return' ? '+' : '-'}
                          {Math.abs(txn.quantity)}
                        </div>
                        {txn.notes && (
                          <div className="text-gray-500 text-xs mt-0.5">{txn.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {inventory.transactions.length > 10 && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      Showing 10 of {inventory.transactions.length} transactions
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">
                  No transactions yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

