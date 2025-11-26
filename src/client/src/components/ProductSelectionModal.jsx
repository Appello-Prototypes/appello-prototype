import React, { useState, useMemo } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, FunnelIcon, Squares2X2Icon, ListBulletIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { productAPI, productTypeAPI } from '../services/api';
import PropertyFilterSidebar from './PropertyFilterSidebar';
import ProductGrid from './ProductGrid';
import SpecificationQuickAdd from './SpecificationQuickAdd';
import toast from 'react-hot-toast';

export default function ProductSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectProduct,
  supplierId,
  jobId,
  productTypeId: initialProductTypeId,
  keepOpen = false
}) {
  const [activeTab, setActiveTab] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [productTypeId, setProductTypeId] = useState(initialProductTypeId || '');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'price-desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const [itemsAdded, setItemsAdded] = useState(0);

  // Fetch product types for filter
  const { data: productTypes } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => productTypeAPI.getProductTypes().then(res => res.data.data)
  });

  // Search products with filters
  // For Material Requests (no supplierId), search all products
  // For Purchase Orders (with supplierId), filter by supplier
  const { data: searchResults, isLoading: isLoadingSearch } = useQuery({
    queryKey: ['product-search-enhanced', searchTerm, supplierId, filters, productTypeId],
    queryFn: () => {
      const params = {};
      if (productTypeId) params.productTypeId = productTypeId;
      if (Object.keys(filters).length > 0) {
        params.filters = JSON.stringify(filters);
      }
      return productAPI.searchProducts(searchTerm || '', supplierId || null, params).then(res => res.data.data);
    },
    enabled: isOpen && activeTab === 'search',
    staleTime: 30000
  });

  // Sort and filter products
  const sortedProducts = useMemo(() => {
    if (!searchResults) return [];
    
    const sorted = [...searchResults].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (a.unitPrice || 0) - (b.unitPrice || 0);
        case 'price-desc':
          return (b.unitPrice || 0) - (a.unitPrice || 0);
        case 'name':
        default:
          const nameA = (a.variantName || a.name || '').toLowerCase();
          const nameB = (b.variantName || b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
      }
    });
    
    return sorted;
  }, [searchResults, sortBy]);

  // Reset items added count when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setItemsAdded(0);
    }
  }, [isOpen]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleSelectProduct = (product) => {
    onSelectProduct(product);
    setItemsAdded(prev => prev + 1);
    toast.success(`Added: ${product.variantName || product.name}`, {
      duration: 2000,
      position: 'bottom-right'
    });
    if (!keepOpen) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Browse Products</h2>
              {keepOpen && itemsAdded > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {itemsAdded} item{itemsAdded !== 1 ? 's' : ''} added
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6 -mb-px">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Search
              </button>
              {jobId && (
                <button
                  onClick={() => setActiveTab('specification')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'specification'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  From Specification
                </button>
              )}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {activeTab === 'search' && (
              <>
                {/* Filter Sidebar - Show when supplier is selected (for POs) or always (for Material Requests) */}
                <PropertyFilterSidebar
                  productTypeId={productTypeId}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  supplierId={supplierId}
                />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Search Bar & Controls */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex gap-4 mb-3">
                      <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search products by name, SKU, or description..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                      <div className="w-48">
                        <select
                          value={productTypeId}
                          onChange={(e) => setProductTypeId(e.target.value)}
                          className="w-full py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">All Product Types</option>
                          {productTypes?.map(pt => (
                            <option key={pt._id} value={pt._id}>{pt.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Enhanced Controls Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Sort Controls */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Sort by:</span>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm py-1 px-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="name">Name (A-Z)</option>
                            <option value="price">Price (Low to High)</option>
                            <option value="price-desc">Price (High to Low)</option>
                          </select>
                        </div>
                        
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 border border-gray-300 rounded-md bg-white">
                          <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                            title="Grid view"
                          >
                            <Squares2X2Icon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                            title="List view"
                          >
                            <ListBulletIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Results Count & Active Filters */}
                      <div className="flex items-center gap-4">
                        {Object.keys(filters).length > 0 && (
                          <div className="flex items-center gap-2">
                            <FunnelIcon className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-600">
                              {Object.keys(filters).filter(k => filters[k]).length} filter{Object.keys(filters).filter(k => filters[k]).length !== 1 ? 's' : ''} active
                            </span>
                            <button
                              type="button"
                              onClick={handleClearFilters}
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Clear all
                            </button>
                          </div>
                        )}
                        {sortedProducts.length > 0 && (
                          <span className="text-sm text-gray-600">
                            {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto">
                    <ProductGrid
                      products={sortedProducts}
                      onSelect={handleSelectProduct}
                      supplierId={supplierId}
                      isLoading={isLoadingSearch}
                      viewMode={viewMode}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'specification' && jobId && (
              <div className="flex-1 overflow-y-auto p-6">
                <SpecificationQuickAdd
                  jobId={jobId}
                  supplierId={supplierId}
                  onSelectProduct={handleSelectProduct}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

