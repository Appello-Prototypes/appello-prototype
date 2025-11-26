import React, { useState } from 'react';
import ProductCard from './ProductCard';
import { CheckCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { getProductPricing } from '../utils/productPricing';
import SupplierTooltip from './SupplierTooltip';
import PriceComparisonBadge from './PriceComparisonBadge';
import ProductStatusDropdown from './ProductStatusDropdown';

function ProductListItem({ product, onSelect, supplierId, onStatusChange, showComparison = false, visibleColumns = {}, isSelected = false, onToggleSelect }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const displayName = product.variantName || product.name;
  const keyProperties = product.variantProperties || product.properties || {};
  const propertyKeys = Object.keys(keyProperties).slice(0, 3);
  
  // Get pricing information - use direct fields if available, otherwise use utility
  const listPrice = product.listPrice || 0;
  const netPrice = product.netPrice || product.unitPrice || 0;
  const discountPercent = product.discountPercent || 0;
  
  // Additional insights
  const supplierCount = product.suppliers?.length || 0;
  const variantCount = product.variants?.length || 0;
  const productType = product.productTypeName || product.productType?.name || '-';
  const unitOfMeasure = product.unitOfMeasure || 'EA';
  const isActive = product.isActive !== false;
  const lastPurchased = product.lastPurchasedDate 
    ? new Date(product.lastPurchasedDate).toLocaleDateString()
    : '-';
  const inventoryEnabled = product.inventoryTracking?.enabled || false;
  const inventoryType = product.inventoryTracking?.type || '-';
  
  // Default visible columns if not provided
  const defaultVisible = {
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
  }
  const cols = { ...defaultVisible, ...visibleColumns };
  
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Price on request';
    return `$${Number(price).toFixed(2)}`;
  };
  
  const handleAdd = (e) => {
    e.stopPropagation();
    setIsAdded(true);
    onSelect({ ...product, quantity });
    // Reset after animation
    setTimeout(() => setIsAdded(false), 2000);
  };
  
  const handleQuantityChange = (e) => {
    e.stopPropagation();
    const value = parseFloat(e.target.value) || 1;
    setQuantity(Math.max(1, value));
  };

  return (
    <tr 
      className={`transition-colors cursor-pointer ${
        isAdded 
          ? 'bg-green-50 hover:bg-green-100' 
          : isSelected
          ? 'bg-blue-50 hover:bg-blue-100'
          : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect(product)}
    >
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect(product, e.target.checked)
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </td>
      )}
      
      {/* Product Name & Properties */}
      <td className="px-3 py-2.5 min-w-[300px]">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-gray-900 leading-tight">
              {displayName}
            </h4>
            {!isActive && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded flex-shrink-0">
                Inactive
              </span>
            )}
          </div>
          
          {/* Key Properties */}
          {propertyKeys.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {propertyKeys.map(key => {
                const value = keyProperties[key];
                if (!value || value === '') return null;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <span key={key} className="text-xs text-gray-600">
                    <span className="font-medium">{label}:</span> {String(value)}
                  </span>
                );
              })}
            </div>
          )}
          
          {/* Manufacturer/Distributor Info - Show all */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {/* Show all manufacturers */}
            {(() => {
              const manufacturers = new Set();
              if (product.suppliers && product.suppliers.length > 0) {
                product.suppliers.forEach(s => {
                  const mfrName = s.manufacturerId?.name || s.manufacturerId;
                  if (mfrName) manufacturers.add(mfrName);
                });
              }
              if (product.manufacturerId?.name) manufacturers.add(product.manufacturerId.name);
              return Array.from(manufacturers);
            })().map((mfrName, idx) => (
              <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                {mfrName}
              </span>
            ))}
            
            {/* Show all distributors */}
            {product.suppliers?.map((supplier, idx) => {
              const distName = supplier.distributorId?.name || supplier.distributorId;
              if (!distName) return null;
              const isPrimary = product.distributorId && 
                (supplier.distributorId?._id?.toString() === product.distributorId.toString() ||
                 supplier.distributorId?.toString() === product.distributorId.toString());
              return (
                <span 
                  key={idx} 
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                    isPrimary 
                      ? 'bg-blue-600 text-white font-medium' 
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {distName}
                  {supplier.isPreferred && <span className="ml-1 text-green-300">★</span>}
                </span>
              );
            })}
            
            {showComparison && supplierCount > 1 && (
              <PriceComparisonBadge product={product} />
            )}
          </div>
          
          {/* Description */}
          {product.description && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
              {product.description}
            </p>
          )}
        </div>
      </td>
      
      {/* SKU */}
      {cols.sku && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="text-sm text-gray-900 font-mono">
            {product.internalPartNumber || product.sku || '-'}
          </div>
        </td>
      )}
      
      {/* Product Type */}
      {cols.type && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="text-sm text-gray-600">
            {productType}
          </div>
        </td>
      )}
      
      {/* Unit of Measure */}
      {cols.unit && (
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
          <div className="text-sm text-gray-700 font-medium">
            {unitOfMeasure}
          </div>
        </td>
      )}
      
      {/* Variants Count */}
      {cols.variants && (
        <td className="px-3 py-2.5 whitespace-nowrap text-center">
          {variantCount > 0 ? (
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {variantCount}
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}
      
      {/* Distributors - Show Names with Pricing */}
      {cols.distributors && (
        <td className="px-3 py-2.5 min-w-[180px]">
          {supplierCount > 0 ? (
            <div className="flex flex-col gap-1.5">
              {product.suppliers?.map((supplier, idx) => {
                const distributorName = supplier.distributorId?.name || supplier.distributorId || 'Unknown';
                const isPrimary = product.distributorId && 
                  (supplier.distributorId?._id?.toString() === product.distributorId.toString() ||
                   supplier.distributorId?.toString() === product.distributorId.toString());
                const supplierNetPrice = supplier.netPrice || supplier.listPrice || supplier.lastPrice || 0;
                const supplierListPrice = supplier.listPrice || supplier.lastPrice || 0;
                const supplierDiscount = supplier.discountPercent || 0;
                
                return (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isPrimary 
                          ? 'bg-blue-600 text-white font-medium' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {distributorName}
                      </span>
                      {supplier.isPreferred && (
                        <span className="text-xs text-green-600" title="Preferred">★</span>
                      )}
                    </div>
                    {supplierNetPrice > 0 && (
                      <div className="text-xs text-gray-600 ml-1">
                        <span className="font-semibold text-blue-600">${supplierNetPrice.toFixed(2)}</span>
                        {supplierListPrice > supplierNetPrice && (
                          <span className="text-gray-400 line-through ml-1">${supplierListPrice.toFixed(2)}</span>
                        )}
                        {supplierDiscount > 0 && (
                          <span className="text-green-600 ml-1">({supplierDiscount.toFixed(0)}% off)</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {showComparison && supplierCount > 1 && (
                <div className="mt-1 pt-1 border-t border-gray-200">
                  <PriceComparisonBadge product={product} />
                </div>
              )}
            </div>
          ) : product.distributorId?.name ? (
            <div className="flex flex-col gap-0.5">
              <div className="text-xs px-1.5 py-0.5 rounded bg-blue-600 text-white font-medium">
                {product.distributorId.name}
              </div>
              {netPrice > 0 && (
                <div className="text-xs text-gray-600 ml-1">
                  <span className="font-semibold text-blue-600">${netPrice.toFixed(2)}</span>
                  {listPrice > netPrice && (
                    <span className="text-gray-400 line-through ml-1">${listPrice.toFixed(2)}</span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-green-600 ml-1">({discountPercent.toFixed(0)}% off)</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}
      
      {/* Manufacturer - Show Names */}
      {cols.manufacturer && (
        <td className="px-3 py-2.5 min-w-[150px]">
          {(() => {
            // Get unique manufacturers from suppliers array
            const manufacturers = new Map();
            if (product.suppliers && product.suppliers.length > 0) {
              product.suppliers.forEach(supplier => {
                const mfrId = supplier.manufacturerId?._id?.toString() || supplier.manufacturerId?.toString();
                const mfrName = supplier.manufacturerId?.name || supplier.manufacturerId || 'Unknown';
                if (mfrId && !manufacturers.has(mfrId)) {
                  manufacturers.set(mfrId, mfrName);
                }
              });
            }
            // Also check primary manufacturerId
            if (product.manufacturerId) {
              const mfrId = product.manufacturerId._id?.toString() || product.manufacturerId.toString();
              const mfrName = product.manufacturerId.name || product.manufacturerId || 'Unknown';
              if (!manufacturers.has(mfrId)) {
                manufacturers.set(mfrId, mfrName);
              }
            }
            
            const manufacturerList = Array.from(manufacturers.values());
            
            if (manufacturerList.length > 0) {
              return (
                <div className="flex flex-col gap-1">
                  {manufacturerList.map((name, idx) => {
                    const isPrimary = product.manufacturerId && 
                      (product.manufacturerId.name === name || 
                       product.manufacturerId._id?.toString() === Array.from(manufacturers.keys())[idx]);
                    return (
                      <span 
                        key={idx} 
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isPrimary 
                            ? 'bg-gray-700 text-white font-medium' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              );
            }
            return <span className="text-sm text-gray-400">-</span>;
          })()}
        </td>
      )}
      
      {/* Inventory Status */}
      {cols.inventory && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          {inventoryEnabled ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-green-700">Tracked</span>
              <span className="text-xs text-gray-500 capitalize">{inventoryType}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Not Tracked</span>
          )}
        </td>
      )}
      
      {/* Last Purchased */}
      {cols.lastPurchased && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="text-sm text-gray-600">
            {lastPurchased}
          </div>
        </td>
      )}
      
      {/* List Price */}
      {cols.listPrice && (
        <td className="px-3 py-2.5 whitespace-nowrap text-right">
          {listPrice > 0 ? (
            <div className="text-sm text-gray-900">
              {formatPrice(listPrice)}
            </div>
          ) : (
            <div className="text-sm text-gray-400">-</div>
          )}
        </td>
      )}
      
      {/* Net Price */}
      {cols.netPrice && (
        <td className="px-3 py-2.5 whitespace-nowrap text-right">
          {netPrice > 0 ? (
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-blue-600">
                {formatPrice(netPrice)}
              </div>
              {discountPercent > 0 && (
                <div className="text-xs font-medium text-green-600">
                  {discountPercent.toFixed(0)}% off
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">-</div>
          )}
        </td>
      )}
      
      {/* Status */}
      {cols.status && (
        <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <ProductStatusDropdown
            value={isActive}
            onChange={(isActive) => {
              if (onStatusChange) {
                onStatusChange(product._id, isActive)
              }
            }}
          />
        </td>
      )}
      
      {/* Actions - Sticky */}
      <td className="px-3 py-2.5 whitespace-nowrap sticky right-0 bg-white">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={handleQuantityChange}
            onClick={(e) => e.stopPropagation()}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap">{unitOfMeasure}</span>
          <button
            type="button"
            onClick={handleAdd}
            className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center ${
              isAdded
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAdded ? (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Added
              </>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ProductGrid({ products, onSelect, supplierId, isLoading, viewMode = 'grid', onStatusChange, showComparison = false, visibleColumns = {}, selectedProducts = [], onToggleProductSelect }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-2">No products found</p>
        <p className="text-sm">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    // Default visible columns if not provided
    const defaultVisible = {
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
    }
    const cols = { ...defaultVisible, ...visibleColumns }
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {onToggleProductSelect && (
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedProducts.length === products.length}
                      onChange={(e) => {
                        products.forEach(product => {
                          const productId = product.productId || product._id
                          onToggleProductSelect(product, e.target.checked)
                        })
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      title="Select all"
                    />
                  </th>
                )}
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                  Product
                </th>
                {cols.sku && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    SKU
                  </th>
                )}
                {cols.type && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Type
                  </th>
                )}
                {cols.unit && (
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Unit
                  </th>
                )}
                {cols.variants && (
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Variants
                  </th>
                )}
                {cols.distributors && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                    Distributors
                  </th>
                )}
                {cols.manufacturer && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                    Manufacturers
                  </th>
                )}
                {cols.inventory && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Inventory
                  </th>
                )}
                {cols.lastPurchased && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Last Purchased
                  </th>
                )}
                {cols.listPrice && (
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    List Price
                  </th>
                )}
                {cols.netPrice && (
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Net Price
                  </th>
                )}
                {cols.status && (
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                )}
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product, index) => {
                const productId = product.productId || product._id
                const isSelected = selectedProducts && selectedProducts.length > 0 
                  ? selectedProducts.some(p => (p.productId || p._id) === productId)
                  : false
                return (
                  <ProductListItem
                    key={product._id || index}
                    product={product}
                    onSelect={onSelect}
                    supplierId={supplierId}
                    onStatusChange={onStatusChange}
                    showComparison={showComparison}
                    visibleColumns={visibleColumns}
                    isSelected={isSelected}
                    onToggleSelect={onToggleProductSelect}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          onSelect={onSelect}
          supplierId={supplierId}
        />
      ))}
    </div>
  );
}

