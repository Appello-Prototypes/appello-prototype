import React, { useState, useMemo, useEffect } from 'react'
import { CurrencyDollarIcon, CheckCircleIcon, StarIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'

/**
 * Price Comparison View
 * 
 * Displays side-by-side price comparison for products with multiple distributors.
 * Shows total cost calculations, savings opportunities, and preferred distributor premiums.
 * 
 * @param {Array} products - Products to compare (can be single product or multiple)
 * @param {Object} quantities - Map of productId to quantity { [productId]: quantity }
 * @param {Function} onDistributorSelect - Callback when distributor is selected
 * @param {boolean} showPreferredPremium - Show preferred distributor premium analysis
 */
export default function PriceComparisonView({ 
  products = [], 
  quantities = {},
  onDistributorSelect,
  showPreferredPremium = true 
}) {
  const [selectedDistributors, setSelectedDistributors] = useState({})
  const [localQuantities, setLocalQuantities] = useState(quantities)

  // Sync quantities prop changes
  useEffect(() => {
    setLocalQuantities(quantities)
  }, [quantities])

  // Normalize products - handle both single product and array
  const normalizedProducts = useMemo(() => {
    return Array.isArray(products) ? products : [products]
  }, [products])

  // Extract all unique distributors across all products
  const allDistributors = useMemo(() => {
    const distributors = new Map()
    
    normalizedProducts.forEach(product => {
      if (product.suppliers && Array.isArray(product.suppliers)) {
        product.suppliers.forEach(supplier => {
          const distId = supplier.distributorId?._id?.toString() || 
                        supplier.distributorId?.toString() || 
                        supplier.distributorId
          const distName = supplier.distributorId?.name || supplier.distributorId || 'Unknown'
          
          if (distId && !distributors.has(distId)) {
            distributors.set(distId, {
              id: distId,
              name: distName,
              isPreferred: supplier.isPreferred || false
            })
          }
        })
      }
    })
    
    return Array.from(distributors.values())
  }, [normalizedProducts])

  // Calculate pricing for each product-distributor combination
  const pricingData = useMemo(() => {
    return normalizedProducts.map(product => {
      const productId = product.productId || product._id
      const quantity = localQuantities[productId] || 1
      
      const distributorPrices = allDistributors.map(distributor => {
        // Find supplier entry for this distributor
        const supplier = product.suppliers?.find(s => {
          const sDistId = s.distributorId?._id?.toString() || 
                         s.distributorId?.toString() || 
                         s.distributorId
          return sDistId === distributor.id
        })
        
        if (!supplier) {
          return {
            distributorId: distributor.id,
            distributorName: distributor.name,
            available: false,
            listPrice: 0,
            netPrice: 0,
            discountPercent: 0,
            isPreferred: distributor.isPreferred,
            totalCost: 0
          }
        }
        
        const listPrice = supplier.listPrice || supplier.lastPrice || 0
        const netPrice = supplier.netPrice || listPrice || 0
        const discountPercent = supplier.discountPercent || 0
        const totalCost = netPrice * quantity
        
        return {
          distributorId: distributor.id,
          distributorName: distributor.name,
          available: true,
          listPrice,
          netPrice,
          discountPercent,
          isPreferred: supplier.isPreferred || distributor.isPreferred,
          totalCost
        }
      })
      
      // Find best and worst prices
      const availablePrices = distributorPrices.filter(p => p.available && p.netPrice > 0)
      const bestPrice = availablePrices.length > 0 
        ? availablePrices.reduce((min, p) => p.netPrice < min.netPrice ? p : min, availablePrices[0])
        : null
      const worstPrice = availablePrices.length > 0
        ? availablePrices.reduce((max, p) => p.netPrice > max.netPrice ? p : max, availablePrices[0])
        : null
      
      return {
        productId,
        productName: product.variantName || product.name,
        quantity,
        distributorPrices,
        bestPrice,
        worstPrice,
        priceRange: bestPrice && worstPrice ? worstPrice.netPrice - bestPrice.netPrice : 0,
        priceRangePercent: bestPrice && worstPrice && bestPrice.netPrice > 0
          ? ((worstPrice.netPrice - bestPrice.netPrice) / bestPrice.netPrice * 100).toFixed(1)
          : 0
      }
    })
  }, [normalizedProducts, allDistributors, localQuantities])

  // Calculate totals per distributor
  const distributorTotals = useMemo(() => {
    const totals = {}
    
    allDistributors.forEach(dist => {
      totals[dist.id] = {
        distributorId: dist.id,
        distributorName: dist.name,
        isPreferred: dist.isPreferred,
        totalCost: 0,
        itemCount: 0
      }
    })
    
    pricingData.forEach(product => {
      product.distributorPrices.forEach(price => {
        if (price.available) {
          totals[price.distributorId].totalCost += price.totalCost
          totals[price.distributorId].itemCount += 1
        }
      })
    })
    
    return Object.values(totals)
  }, [allDistributors, pricingData])

  // Find best total distributor
  const bestTotalDistributor = useMemo(() => {
    const availableTotals = distributorTotals.filter(t => t.totalCost > 0)
    return availableTotals.length > 0
      ? availableTotals.reduce((min, t) => t.totalCost < min.totalCost ? t : min, availableTotals[0])
      : null
  }, [distributorTotals])

  // Calculate preferred distributor premium
  const preferredPremium = useMemo(() => {
    if (!showPreferredPremium || !bestTotalDistributor) return null
    
    const preferredDistributor = distributorTotals.find(d => d.isPreferred && d.totalCost > 0)
    if (!preferredDistributor || preferredDistributor.distributorId === bestTotalDistributor.distributorId) {
      return null
    }
    
    const premium = preferredDistributor.totalCost - bestTotalDistributor.totalCost
    const premiumPercent = bestTotalDistributor.totalCost > 0
      ? ((premium / bestTotalDistributor.totalCost) * 100).toFixed(1)
      : 0
    
    return {
      preferredDistributor: preferredDistributor.distributorName,
      bestDistributor: bestTotalDistributor.distributorName,
      premium,
      premiumPercent
    }
  }, [distributorTotals, bestTotalDistributor, showPreferredPremium])

  const handleQuantityChange = (productId, quantity) => {
    const newQuantities = { ...localQuantities, [productId]: Math.max(1, parseInt(quantity) || 1) }
    setLocalQuantities(newQuantities)
    // Notify parent if callback provided
    if (onDistributorSelect && typeof onDistributorSelect === 'function') {
      // Could add a separate callback for quantity changes if needed
    }
  }

  const handleDistributorSelect = (productId, distributorId) => {
    const newSelection = { ...selectedDistributors, [productId]: distributorId }
    setSelectedDistributors(newSelection)
    if (onDistributorSelect) {
      onDistributorSelect(productId, distributorId)
    }
  }

  if (normalizedProducts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No products selected for comparison</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Best Price Total */}
        {bestTotalDistributor && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIconSolid className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Best Total Price</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              ${bestTotalDistributor.totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {bestTotalDistributor.distributorName}
            </div>
          </div>
        )}

        {/* Preferred Premium */}
        {preferredPremium && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <StarIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Preferred Premium</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              +${preferredPremium.premium.toFixed(2)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {preferredPremium.premiumPercent}% more than best price
            </div>
          </div>
        )}

        {/* Total Savings Opportunity */}
        {bestTotalDistributor && distributorTotals.length > 1 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowTrendingDownIcon className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Savings Opportunity</span>
            </div>
            {(() => {
              const worstTotal = distributorTotals
                .filter(d => d.totalCost > 0)
                .reduce((max, d) => d.totalCost > max.totalCost ? d : max, distributorTotals[0])
              const savings = worstTotal.totalCost - bestTotalDistributor.totalCost
              return (
                <>
                  <div className="text-2xl font-bold text-orange-700">
                    ${savings.toFixed(2)}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    vs worst option ({worstTotal.distributorName})
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Product
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                {allDistributors.map(distributor => (
                  <th 
                    key={distributor.id}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <span>{distributor.name}</span>
                        {distributor.isPreferred && (
                          <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingData.map((product, idx) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  {/* Product Name - Sticky */}
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                    <div className="text-sm font-medium text-gray-900">
                      {product.productName}
                    </div>
                  </td>
                  
                  {/* Quantity Input */}
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => handleQuantityChange(product.productId, e.target.value)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                    />
                  </td>
                  
                  {/* Distributor Prices */}
                  {product.distributorPrices.map((price, priceIdx) => {
                    const isBest = product.bestPrice && price.distributorId === product.bestPrice.distributorId
                    const isSelected = selectedDistributors[product.productId] === price.distributorId
                    
                    return (
                      <td 
                        key={price.distributorId}
                        className={`px-4 py-3 text-center ${
                          isBest ? 'bg-green-50' : ''
                        }`}
                      >
                        {price.available ? (
                          <div className="space-y-1">
                            {/* Price */}
                            <div className={`text-sm font-semibold ${
                              isBest ? 'text-green-700' : 'text-gray-900'
                            }`}>
                              ${price.netPrice.toFixed(2)}
                            </div>
                            
                            {/* List Price (if different) */}
                            {price.listPrice > price.netPrice && (
                              <div className="text-xs text-gray-400 line-through">
                                ${price.listPrice.toFixed(2)}
                              </div>
                            )}
                            
                            {/* Discount */}
                            {price.discountPercent > 0 && (
                              <div className="text-xs text-green-600 font-medium">
                                {price.discountPercent.toFixed(0)}% off
                              </div>
                            )}
                            
                            {/* Total Cost */}
                            <div className="text-xs font-medium text-gray-600 mt-1 pt-1 border-t border-gray-200">
                              Total: ${price.totalCost.toFixed(2)}
                            </div>
                            
                            {/* Best Price Badge */}
                            {isBest && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                  Best
                                </span>
                              </div>
                            )}
                            
                            {/* Select Button */}
                            <button
                              onClick={() => handleDistributorSelect(product.productId, price.distributorId)}
                              className={`mt-1 w-full px-2 py-1 text-xs rounded transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              
              {/* Totals Row */}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-900">Total:</span>
                </td>
                {distributorTotals.map(total => {
                  const isBest = bestTotalDistributor && total.distributorId === bestTotalDistributor.distributorId
                  return (
                    <td 
                      key={total.distributorId}
                      className={`px-4 py-3 text-center ${
                        isBest ? 'bg-green-100 text-green-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="text-sm font-bold">
                        ${total.totalCost.toFixed(2)}
                      </div>
                      {isBest && (
                        <div className="text-xs text-green-600 mt-1">Best Total</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Range Info */}
      {pricingData.some(p => p.priceRange > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Price Range Analysis</h3>
          <div className="space-y-1 text-xs text-blue-700">
            {pricingData
              .filter(p => p.priceRange > 0)
              .map(product => (
                <div key={product.productId} className="flex justify-between">
                  <span>{product.productName}:</span>
                  <span>
                    Range: ${product.priceRange.toFixed(2)} ({product.priceRangePercent}% difference)
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

