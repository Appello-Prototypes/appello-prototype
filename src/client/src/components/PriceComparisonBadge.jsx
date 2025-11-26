import React from 'react'
import { CurrencyDollarIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

/**
 * Price Comparison Badge
 * Shows price comparison information for products with multiple distributors
 */
export default function PriceComparisonBadge({ product, showDetails = false }) {
  if (!product.suppliers || product.suppliers.length <= 1) {
    return null
  }

  const suppliers = product.suppliers || []
  const prices = suppliers
    .map(s => ({
      distributor: s.distributorId?.name || 'Unknown',
      listPrice: s.listPrice || 0,
      netPrice: s.netPrice || 0,
      discountPercent: s.discountPercent || 0,
      isPreferred: s.isPreferred || false
    }))
    .filter(s => s.netPrice > 0)
    .sort((a, b) => a.netPrice - b.netPrice)

  if (prices.length === 0) return null

  const bestPrice = prices[0]
  const worstPrice = prices[prices.length - 1]
  const priceRange = worstPrice.netPrice - bestPrice.netPrice
  const priceRangePercent = bestPrice.netPrice > 0 
    ? ((priceRange / bestPrice.netPrice) * 100).toFixed(1)
    : 0

  if (showDetails) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-900">Price Comparison</span>
          <span className="text-xs text-blue-700">{prices.length} distributors</span>
        </div>
        <div className="space-y-1">
          {prices.map((price, idx) => (
            <div 
              key={idx}
              className={`flex items-center justify-between text-xs ${
                idx === 0 ? 'font-semibold text-green-700' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{price.distributor}</span>
                {price.isPreferred && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    Preferred
                  </span>
                )}
                {idx === 0 && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                    Best
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={idx === 0 ? 'font-bold' : ''}>
                  ${price.netPrice.toFixed(2)}
                </span>
                {idx > 0 && (
                  <span className="text-red-600">
                    +${(price.netPrice - bestPrice.netPrice).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {priceRange > 0 && (
          <div className="pt-2 border-t border-blue-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Price Range:</span>
              <span className="font-medium text-gray-900">
                ${bestPrice.netPrice.toFixed(2)} - ${worstPrice.netPrice.toFixed(2)}
                {priceRangePercent > 0 && (
                  <span className="ml-1 text-red-600">
                    ({priceRangePercent}% difference)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
      <CurrencyDollarIcon className="h-3.5 w-3.5 text-blue-600" />
      <span className="font-medium text-blue-900">
        {prices.length} prices
      </span>
      {priceRange > 0 && (
        <>
          <span className="text-gray-500">•</span>
          <span className="text-blue-700">
            ${bestPrice.netPrice.toFixed(2)} - ${worstPrice.netPrice.toFixed(2)}
          </span>
          {priceRangePercent > 5 && (
            <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-orange-500" title="Significant price difference" />
          )}
        </>
      )}
    </div>
  )
}

