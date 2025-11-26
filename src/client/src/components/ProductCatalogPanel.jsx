import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  XMarkIcon, 
  MagnifyingGlassIcon, 
  PlusIcon,
  ShoppingCartIcon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArchiveBoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productAPI, productTypeAPI, companyAPI } from '../services/api'
import PropertyFilterSidebar from './PropertyFilterSidebar'
import ProductGrid from './ProductGrid'
import PriceComparisonView from './PriceComparisonView'
import toast from 'react-hot-toast'

/**
 * Product Catalog Panel
 * 
 * A slide-up panel that provides centralized access to the product database.
 * Features:
 * - Browse and search products
 * - Track inventory (bulk and serialized items)
 * - Quick actions: Start PO, Start Material Request
 * - Filter by product type and properties
 * - Grid and list views
 */
export default function ProductCatalogPanel({ isOpen, onClose }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({})
  const [productTypeId, setProductTypeId] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [distributorId, setDistributorId] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [viewMode, setViewMode] = useState('list') // Default to table/list view
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [updatingStatuses, setUpdatingStatuses] = useState(new Set())
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [productQuantities, setProductQuantities] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [visibleColumns, setVisibleColumns] = useState({
    sku: true,
    type: true,
    unit: true,
    variants: true,
    distributors: true,
    manufacturer: true,
    inventory: false,
    lastPurchased: false,
    listPrice: true,
    netPrice: true,
    status: true
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ productId, isActive }) => productAPI.updateProduct(productId, { isActive }),
    onSuccess: (_, variables) => {
      toast.success('Status updated successfully')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.productId)
        return next
      })
      queryClient.invalidateQueries(['products'])
    },
    onError: (error, variables) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.productId)
        return next
      })
    },
  })

  const handleStatusChange = (productId, isActive) => {
    setUpdatingStatuses(prev => new Set(prev).add(productId))
    updateStatusMutation.mutate({ productId, isActive })
  }

  // Fetch product types for filter
  const { data: productTypes } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => productTypeAPI.getProductTypes().then(res => res.data.data),
    enabled: isOpen
  })

  // Fetch manufacturers for filter
  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers-for-catalog'],
    queryFn: () => companyAPI.getManufacturers().then(res => res.data.data),
    enabled: isOpen
  })

  // Fetch distributors for filter
  const { data: distributors } = useQuery({
    queryKey: ['distributors-for-catalog'],
    queryFn: () => companyAPI.getDistributors().then(res => res.data.data),
    enabled: isOpen
  })

  // Search products
  const { data: searchResults, isLoading: isLoadingSearch } = useQuery({
    queryKey: ['product-catalog-search', searchTerm, filters, productTypeId, manufacturerId, distributorId],
    queryFn: () => {
      const params = {}
      if (productTypeId) params.productTypeId = productTypeId
      if (manufacturerId) params.manufacturerId = manufacturerId
      if (distributorId) params.distributorId = distributorId
      if (Object.keys(filters).length > 0) {
        params.filters = JSON.stringify(filters)
      }
      return productAPI.searchProducts(searchTerm || '', null, params).then(res => res.data.data)
    },
    enabled: isOpen,
    staleTime: 30000
  })

  // Sort products
  const sortedProducts = useMemo(() => {
    if (!searchResults) return []
    
    const sorted = [...searchResults].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (a.unitPrice || 0) - (b.unitPrice || 0)
        case 'price-desc':
          return (b.unitPrice || 0) - (a.unitPrice || 0)
        case 'name':
        default:
          const nameA = (a.variantName || a.name || '').toLowerCase()
          const nameB = (b.variantName || b.name || '').toLowerCase()
          return nameA.localeCompare(nameB)
      }
    })
    
    return sorted
  }, [searchResults, sortBy])

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
  }

  const handleQuantityUpdate = (productId, quantity) => {
    setProductQuantities(prev => ({ ...prev, [productId]: quantity }))
  }

  const handleStartPO = (product = null) => {
    onClose()
    navigate('/purchase-orders/create', {
      state: product ? { preselectedProduct: product } : {}
    })
  }

  const handleStartMaterialRequest = (product = null) => {
    onClose()
    navigate('/material-requests/create', {
      state: product ? { preselectedProduct: product } : {}
    })
  }

  const handleViewInventory = (product) => {
    onClose()
    if (product && product.productId) {
      navigate(`/inventory?productId=${product.productId}`)
    } else {
      navigate('/inventory')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-up panel - extends almost to top with minimal margin */}
      <div className="fixed inset-x-0 top-1 bottom-0 bg-white rounded-t-lg shadow-2xl flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-gray-900">Product Catalog</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Compact Quick Actions */}
            <button
              onClick={() => {
                onClose()
                navigate('/inventory')
              }}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
              title="View Inventory"
            >
              <ArchiveBoxIcon className="h-3.5 w-3.5 mr-1" />
              Inventory
            </button>
            <button
              onClick={() => handleStartPO()}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              title="Start Purchase Order"
            >
              <ShoppingCartIcon className="h-3.5 w-3.5 mr-1" />
              New PO
            </button>
            <button
              onClick={() => handleStartMaterialRequest()}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
              title="Start Material Request"
            >
              <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 mr-1" />
              Material Request
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex relative">
          {/* Filter Sidebar - Collapsible */}
          <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 flex-shrink-0 overflow-hidden border-r border-gray-200 bg-white`}>
            {sidebarOpen && (
              <div className="h-full overflow-y-auto">
                <PropertyFilterSidebar
                  productTypeId={productTypeId}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  supplierId={null}
                  manufacturerId={manufacturerId}
                  distributorId={distributorId}
                />
              </div>
            )}
          </div>
          
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`absolute top-2 ${sidebarOpen ? 'left-[320px]' : 'left-0'} z-20 p-1.5 bg-white border border-gray-300 rounded-r-md shadow-sm hover:bg-gray-50 transition-all duration-300`}
            title={sidebarOpen ? 'Hide Filters' : 'Show Filters'}
          >
            {sidebarOpen ? (
              <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-600" />
            )}
          </button>
          
          {/* Comparison Mode View - Show product list WITH comparison view */}
          {comparisonMode ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Comparison View - Show when products are selected */}
              {selectedProducts.length > 0 && (
                <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 p-4 max-h-[50%] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Price Comparison ({selectedProducts.length} {selectedProducts.length === 1 ? 'product' : 'products'})
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedProducts([])
                        setProductQuantities({})
                      }}
                      className="text-xs text-red-600 hover:text-red-700 underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <PriceComparisonView
                    products={selectedProducts}
                    quantities={productQuantities}
                    showPreferredPremium={true}
                    onDistributorSelect={(productId, distributorId) => {
                      // Could be used to auto-select distributor when adding to PO
                      console.log('Selected distributor:', productId, distributorId)
                    }}
                  />
                </div>
              )}
              
              {/* Search Bar & Controls - Show in comparison mode too */}
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <select
                    value={productTypeId}
                    onChange={(e) => setProductTypeId(e.target.value)}
                    className="w-40 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">All Types</option>
                    {productTypes?.map(pt => (
                      <option key={pt._id} value={pt._id}>{pt.name}</option>
                    ))}
                  </select>
                  <select
                    value={manufacturerId}
                    onChange={(e) => setManufacturerId(e.target.value)}
                    className="w-40 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    title="Filter by Manufacturer"
                  >
                    <option value="">All Manufacturers</option>
                    {manufacturers?.map(m => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    value={distributorId}
                    onChange={(e) => setDistributorId(e.target.value)}
                    className="w-40 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    title="Filter by Distributor"
                  >
                    <option value="">All Distributors</option>
                    {distributors?.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Results Count */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">
                      {sortedProducts.length} found
                    </span>
                    {selectedProducts.length > 0 && (
                      <span className="text-xs text-blue-600 font-medium">
                        • {selectedProducts.length} selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Product List - Always visible in comparison mode, with checkboxes */}
              <div className="flex-1 overflow-y-auto">
                {selectedProducts.length === 0 && (
                  <div className="text-center py-6 px-4 bg-blue-50 border-b border-blue-200">
                    <CurrencyDollarIcon className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900 mb-1">Price Comparison Mode</p>
                    <p className="text-xs text-blue-700">
                      Select products using the checkboxes below to compare prices across distributors
                    </p>
                  </div>
                )}
                <ProductGrid
                  products={sortedProducts}
                  onSelect={(product) => {
                    setSelectedProduct(product)
                  }}
                  supplierId={null}
                  isLoading={isLoadingSearch}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  showComparison={showComparison}
                  visibleColumns={visibleColumns}
                  selectedProducts={selectedProducts}
                  onToggleProductSelect={(product, isSelected) => {
                    const productId = product.productId || product._id
                    if (isSelected) {
                      setSelectedProducts(prev => [...prev, product])
                      setProductQuantities(prev => ({ ...prev, [productId]: 1 }))
                    } else {
                      setSelectedProducts(prev => prev.filter(p => (p.productId || p._id) !== productId))
                      setProductQuantities(prev => {
                        const next = { ...prev }
                        delete next[productId]
                        return next
                      })
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Browse Products View */}

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
                {/* Compact Search Bar & Controls */}
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 relative">
                      <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                    <select
                      value={productTypeId}
                      onChange={(e) => setProductTypeId(e.target.value)}
                      className="w-40 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">All Types</option>
                      {productTypes?.map(pt => (
                        <option key={pt._id} value={pt._id}>{pt.name}</option>
                      ))}
                    </select>
                    <select
                      value={manufacturerId}
                      onChange={(e) => setManufacturerId(e.target.value)}
                      className="w-40 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      title="Filter by Manufacturer"
                    >
                      <option value="">All Manufacturers</option>
                      {manufacturers?.map(m => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                    <select
                      value={distributorId}
                      onChange={(e) => setDistributorId(e.target.value)}
                      className="w-40 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      title="Filter by Distributor"
                    >
                      <option value="">All Distributors</option>
                      {distributors?.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Compact Controls Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Sort Controls */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-600">Sort:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="text-xs py-1 px-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="name">Name</option>
                          <option value="price">Price ↑</option>
                          <option value="price-desc">Price ↓</option>
                        </select>
                      </div>
                      
                      {/* View Mode Toggle */}
                      <div className="flex items-center border border-gray-300 rounded bg-white">
                        <button
                          type="button"
                          onClick={() => setViewMode('grid')}
                          className={`p-1 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                          title="Grid view"
                        >
                          <Squares2X2Icon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('list')}
                          className={`p-1 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                          title="List view"
                        >
                          <ListBulletIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      {/* Column Visibility Toggle */}
                      {viewMode === 'list' && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              const dialog = document.getElementById('column-visibility-dialog')
                              if (dialog) dialog.classList.toggle('hidden')
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                            title="Customize columns"
                          >
                            <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                            Columns
                          </button>
                          <div id="column-visibility-dialog" className="hidden absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-30 p-2 min-w-[200px]">
                            <div className="text-xs font-medium text-gray-700 mb-2">Show Columns:</div>
                            <div className="space-y-1">
                              {Object.entries(visibleColumns).map(([key, visible]) => (
                                <label key={key} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={visible}
                                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Comparison Mode Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setComparisonMode(!comparisonMode)
                          if (comparisonMode) {
                            setSelectedProducts([])
                            setProductQuantities({})
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          comparisonMode
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Compare prices across distributors"
                      >
                        <CurrencyDollarIcon className="h-3.5 w-3.5 inline mr-1" />
                        {comparisonMode ? 'Exit Comparison' : 'Compare Prices'}
                      </button>
                      {comparisonMode && selectedProducts.length > 0 && (
                        <span className="text-xs text-blue-600 font-medium">
                          {selectedProducts.length} selected
                        </span>
                      )}
                    </div>
                    
                    {/* Results Count & Active Filters */}
                    <div className="flex items-center gap-3">
                      {(Object.keys(filters).length > 0 || manufacturerId || distributorId) && (
                        <div className="flex items-center gap-1.5">
                          <FunnelIcon className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs text-gray-600">
                            {Object.keys(filters).filter(k => filters[k]).length + (manufacturerId ? 1 : 0) + (distributorId ? 1 : 0)} active
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleClearFilters()
                              setManufacturerId('')
                              setDistributorId('')
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 underline"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                      {sortedProducts.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 font-medium">
                            {sortedProducts.length} found
                          </span>
                          {sortedProducts.some(p => p.suppliers?.length > 1) && (
                            <button
                              type="button"
                              onClick={() => setShowComparison(!showComparison)}
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              {showComparison ? 'Hide' : 'Show'} Price Comparison
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                  <ProductGrid
                    products={sortedProducts}
                    onSelect={(product) => {
                      // Show product actions - allow quick actions or view inventory
                      setSelectedProduct(product)
                      // Don't show toast, let user choose action
                    }}
                    supplierId={null}
                    isLoading={isLoadingSearch}
                    viewMode={viewMode}
                    onStatusChange={handleStatusChange}
                    showComparison={showComparison}
                    visibleColumns={visibleColumns}
                    selectedProducts={comparisonMode ? selectedProducts : []}
                    onToggleProductSelect={comparisonMode ? ((product, isSelected) => {
                      const productId = product.productId || product._id
                      if (isSelected) {
                        setSelectedProducts(prev => [...prev, product])
                        setProductQuantities(prev => ({ ...prev, [productId]: 1 }))
                      } else {
                        setSelectedProducts(prev => prev.filter(p => (p.productId || p._id) !== productId))
                        setProductQuantities(prev => {
                          const next = { ...prev }
                          delete next[productId]
                          return next
                        })
                      }
                    }) : undefined}
                  />
                </div>
                
                {/* Product Actions Panel (when product selected) */}
                {selectedProduct && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {selectedProduct.variantName || selectedProduct.name}
                        </h4>
                        {selectedProduct.sku && (
                          <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewInventory(selectedProduct)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                          <CubeIcon className="h-4 w-4 mr-1.5" />
                          View Inventory
                        </button>
                        <button
                          onClick={() => {
                            handleStartPO(selectedProduct)
                            setSelectedProduct(null)
                          }}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                        >
                          <ShoppingCartIcon className="h-4 w-4 mr-1.5" />
                          Start PO
                        </button>
                        <button
                          onClick={() => {
                            handleStartMaterialRequest(selectedProduct)
                            setSelectedProduct(null)
                          }}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                        >
                          <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1.5" />
                          Material Request
                        </button>
                        <button
                          onClick={() => setSelectedProduct(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

