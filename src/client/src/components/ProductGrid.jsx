import React, { useState } from 'react';
import ProductCard from './ProductCard';
import { CheckCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { getProductPricing } from '../utils/productPricing';

function ProductListItem({ product, onSelect, supplierId }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const displayName = product.variantName || product.name;
  const keyProperties = product.variantProperties || {};
  const propertyKeys = Object.keys(keyProperties).slice(0, 3);
  
  // Get pricing information - use direct fields if available, otherwise use utility
  const listPrice = product.listPrice || 0;
  const netPrice = product.netPrice || product.unitPrice || 0;
  const discountPercent = product.discountPercent || 0;
  
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
    <div 
      className={`flex items-center gap-4 p-4 border-b transition-all cursor-pointer ${
        isAdded 
          ? 'bg-green-50 border-green-300' 
          : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={() => onSelect(product)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-medium text-gray-900 text-sm">
            {displayName}
          </h4>
          {product.sku && (
            <span className="text-xs text-gray-500 ml-2">SKU: {product.sku}</span>
          )}
        </div>
        
        {/* Key Properties */}
        {propertyKeys.length > 0 && (
          <div className="flex items-center gap-4 mt-1">
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
        
        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {product.description}
          </p>
        )}
      </div>
      
      {/* Pricing, Quantity & Add Button */}
      <div className="flex items-center gap-4">
        {/* Pricing Information */}
        <div className="text-right min-w-[140px]">
          {listPrice > 0 ? (
            <div className="space-y-0.5">
              <div className="flex items-center justify-end text-xs">
                <span className="text-gray-500 mr-1">List:</span>
                <span className="font-medium text-gray-700">{formatPrice(listPrice)}</span>
                {product.unitOfMeasure && (
                  <span className="text-gray-400 ml-1">/{product.unitOfMeasure}</span>
                )}
              </div>
              {discountPercent > 0 && (
                <div className="flex items-center justify-end text-xs">
                  <span className="text-gray-500 mr-1">Discount:</span>
                  <span className="font-medium text-green-600">{discountPercent.toFixed(1)}%</span>
                </div>
              )}
              <div className="flex items-center justify-end text-sm">
                <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                <span className="font-semibold text-blue-600">{formatPrice(netPrice || listPrice)}</span>
                {product.unitOfMeasure && (
                  <span className="text-gray-500 ml-1 text-xs">/{product.unitOfMeasure}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Price on request</div>
          )}
        </div>
        
        {/* Quantity Input */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-0.5">Qty</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={handleQuantityChange}
                onClick={(e) => e.stopPropagation()}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
              {product.unitOfMeasure && (
                <span className="text-xs text-gray-500 whitespace-nowrap">{product.unitOfMeasure}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Add Button */}
        <button
          type="button"
          onClick={handleAdd}
          className={`px-4 py-2 text-sm font-medium rounded transition-all flex items-center whitespace-nowrap ${
            isAdded
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAdded ? (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Added!
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ProductGrid({ products, onSelect, supplierId, isLoading, viewMode = 'grid' }) {
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
    return (
      <div className="divide-y divide-gray-200">
        {products.map((product) => (
          <ProductListItem
            key={product._id}
            product={product}
            onSelect={onSelect}
            supplierId={supplierId}
          />
        ))}
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

