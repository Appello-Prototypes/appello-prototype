import React, { useState } from 'react';
import { CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { getProductPricing } from '../utils/productPricing';

export default function ProductCard({ product, onSelect, supplierId }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const displayName = product.variantName || product.name;
  const keyProperties = product.variantProperties || {};
  
  // Get top 3-4 key properties to display
  const propertyKeys = Object.keys(keyProperties).slice(0, 4);
  
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
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
        isAdded 
          ? 'border-green-500 shadow-lg ring-2 ring-green-200' 
          : 'border-gray-200'
      }`}
      onClick={() => onSelect(product)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm leading-tight">
          {displayName}
        </h4>
        {product.sku && (
          <span className="text-xs text-gray-500 ml-2">SKU: {product.sku}</span>
        )}
      </div>

      {/* Key Properties */}
      {propertyKeys.length > 0 && (
        <div className="mb-3 space-y-1">
          {propertyKeys.map(key => {
            const value = keyProperties[key];
            if (!value || value === '') return null;
            
            // Format property key (replace underscores, capitalize)
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <div key={key} className="text-xs text-gray-600">
                <span className="font-medium">{label}:</span> {String(value)}
              </div>
            );
          })}
        </div>
      )}

      {/* Pricing Information */}
      <div className="pt-2 border-t border-gray-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex flex-col">
            {listPrice > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">List:</span>
                  <span className="font-medium text-gray-700">{formatPrice(listPrice)}</span>
                  {product.unitOfMeasure && (
                    <span className="text-gray-400">/{product.unitOfMeasure}</span>
                  )}
                </div>
                {discountPercent > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Discount:</span>
                    <span className="font-medium text-green-600">{discountPercent.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Net:</span>
                  <span className="font-semibold text-blue-600">{formatPrice(netPrice || listPrice)}</span>
                  {product.unitOfMeasure && (
                    <span className="text-gray-400">/{product.unitOfMeasure}</span>
                  )}
                </div>
              </>
            )}
            {listPrice === 0 && (
              <div className="text-gray-500 text-xs">Price on request</div>
            )}
          </div>
        </div>
        
        {/* Quantity Input & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-0.5">Qty</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={handleQuantityChange}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
              {product.unitOfMeasure && (
                <span className="text-xs text-gray-500 whitespace-nowrap">{product.unitOfMeasure}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAdd}
              className={`px-3 py-2 text-xs font-medium rounded transition-all flex items-center ${
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
      </div>

      {/* Description */}
      {product.description && (
        <div className="mt-2 text-xs text-gray-500 line-clamp-2">
          {product.description}
        </div>
      )}
    </div>
  );
}

