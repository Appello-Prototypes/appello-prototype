import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { productAPI } from '../services/api'

export default function ProductSearch({ 
  supplierId, 
  value, 
  onChange, 
  placeholder = 'Search for a product...',
  disabled = false 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const wrapperRef = useRef(null)

  // Search products - show all when focused, filter as user types
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['product-search', searchTerm || '', supplierId],
    queryFn: () => productAPI.searchProducts(searchTerm || '', supplierId).then(res => res.data.data),
    enabled: isOpen && !!supplierId, // Enable when dropdown is open and supplier is selected
    staleTime: 30000
  })

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update selected product when value prop changes
  useEffect(() => {
    if (value && typeof value === 'object') {
      setSelectedProduct(value)
      setSearchTerm(value.variantName || value.name || '')
    } else if (value === null || value === '') {
      setSelectedProduct(null)
      setSearchTerm('')
    }
  }, [value])

  // Reset selection when supplier changes
  useEffect(() => {
    if (selectedProduct) {
      setSelectedProduct(null)
      setSearchTerm('')
      setIsOpen(false)
      onChange(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const handleInputChange = (e) => {
    const term = e.target.value
    setSearchTerm(term)
    // Keep dropdown open if supplier is selected (will filter results)
    if (supplierId) {
      setIsOpen(true)
    }
    // Clear selection if search term is cleared
    if (term.length === 0 && selectedProduct) {
      setSelectedProduct(null)
      onChange(null)
    }
  }

  const handleInputFocus = () => {
    if (supplierId) {
      setIsOpen(true)
    }
  }

  const handleSelectProduct = (product) => {
    setSelectedProduct(product)
    setSearchTerm(product.variantName || product.name)
    setIsOpen(false)
    onChange(product)
  }

  const handleClear = () => {
    setSelectedProduct(null)
    setSearchTerm('')
    setIsOpen(false)
    onChange(null)
  }

  const displayName = (product) => {
    if (product.variantName) {
      return `${product.name} - ${product.variantName}`
    }
    return product.name
  }

  const displayDetails = (product) => {
    const parts = []
    if (product.sku) parts.push(`SKU: ${product.sku}`)
    if (product.supplierPartNumber) parts.push(`Part: ${product.supplierPartNumber}`)
    if (product.unitPrice) parts.push(`$${product.unitPrice.toFixed(2)}`)
    return parts.join(' • ')
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`pl-10 pr-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
        {selectedProduct && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && supplierId && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading products...</div>
          ) : searchResults && searchResults.length > 0 ? (
            <>
              {!searchTerm && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-medium">
                  {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} available
                </div>
              )}
              <ul className="py-1">
                {searchResults.map((product) => (
                  <li
                    key={product._id}
                    onClick={() => handleSelectProduct(product)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{displayName(product)}</div>
                    {displayDetails(product) && (
                      <div className="text-sm text-gray-500 mt-1">{displayDetails(product)}</div>
                    )}
                    {product.description && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">{product.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {searchTerm 
                ? `No products found matching "${searchTerm}"` 
                : 'No products found for this supplier'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

