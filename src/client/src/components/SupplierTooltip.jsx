import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline'

/**
 * Supplier Tooltip Component
 * 
 * Displays a hover tooltip showing supplier names with quick links
 */
export default function SupplierTooltip({ suppliers, children }) {
  const [isHovered, setIsHovered] = useState(false)

  // Collect all distributors from suppliers array
  const allDistributors = []
  
  // Add distributors from suppliers array
  if (suppliers && Array.isArray(suppliers)) {
    suppliers.forEach(supplier => {
      const distributor = supplier.distributorId;
      if (distributor) {
        const distributorName = typeof distributor === 'object' 
          ? distributor.name 
          : 'Unknown Distributor';
        const distributorIdValue = typeof distributor === 'object' 
          ? distributor._id 
          : distributor;
        if (distributorIdValue && !allDistributors.find(d => d._id === distributorIdValue)) {
          allDistributors.push({
            _id: distributorIdValue,
            name: distributorName,
            supplierPartNumber: supplier.supplierPartNumber,
            listPrice: supplier.listPrice,
            netPrice: supplier.netPrice,
            discountPercent: supplier.discountPercent
          })
        }
      }
    })
  }

  if (allDistributors.length === 0) {
    return children
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {isHovered && (
        <div className="absolute z-50 w-64 p-3 mt-1 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <BuildingStorefrontIcon className="h-4 w-4" />
            Distributors ({allDistributors.length})
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {allDistributors.map((distributor) => (
              <Link
                key={distributor._id}
                to={`/companies/${distributor._id}`}
                className="block px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="font-medium">{distributor.name}</div>
                {distributor.supplierPartNumber && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Part #: {distributor.supplierPartNumber}
                  </div>
                )}
                {(distributor.listPrice || distributor.netPrice) && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {distributor.listPrice && `List: $${distributor.listPrice.toFixed(2)}`}
                    {distributor.netPrice && ` | Net: $${distributor.netPrice.toFixed(2)}`}
                  </div>
                )}
              </Link>
            ))}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200"></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-[-1px] w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
        </div>
      )}
    </div>
  )
}

