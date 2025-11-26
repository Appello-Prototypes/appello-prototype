import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import InventoryManagement from '../components/InventoryManagement'

/**
 * Inventory Page
 * 
 * Standalone page for inventory management
 * Uses the InventoryManagement component in full-page mode
 * Supports productId query parameter to pre-select a product
 */
export default function Inventory() {
  const [searchParams] = useSearchParams()
  const [selectedProduct, setSelectedProduct] = useState(null)
  const productIdFromUrl = searchParams.get('productId')

  useEffect(() => {
    // If productId is in URL, we'll let InventoryManagement handle loading it
    if (productIdFromUrl) {
      // The InventoryManagement component will handle loading the product
      // We just need to pass the productId somehow, but since it uses onSelectProduct
      // we'll let the component handle it internally via the search/filter
    }
  }, [productIdFromUrl])

  const handleBack = () => {
    setSelectedProduct(null)
    // Clear URL param when going back
    if (productIdFromUrl) {
      window.history.replaceState({}, '', '/inventory')
    }
  }

  const handleSelectProduct = (product) => {
    setSelectedProduct(product)
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and manage inventory across all locations
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: 'calc(100vh - 12rem)' }}>
        <InventoryManagement 
          selectedProduct={selectedProduct || (productIdFromUrl ? { productId: productIdFromUrl } : null)}
          onBack={handleBack}
          onSelectProduct={handleSelectProduct}
        />
      </div>
    </div>
  )
}

