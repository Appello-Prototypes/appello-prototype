import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BuildingOfficeIcon, CubeIcon, MagnifyingGlassIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { companyAPI, productAPI } from '../services/api'

/**
 * Price Comparison View for Suppliers
 * Shows all distributors that carry this supplier's products and allows price comparison
 */
export default function SupplierPriceComparison() {
  const { id } = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(null)

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => companyAPI.getCompany(id).then(res => res.data.data),
  })

  const { data: distributors } = useQuery({
    queryKey: ['supplier-distributors', id],
    queryFn: () => companyAPI.getSupplierDistributors(id).then(res => res.data.data),
    enabled: !!id,
  })

  const { data: products } = useQuery({
    queryKey: ['supplier-products', id],
    queryFn: () => productAPI.getProducts({
      manufacturerId: id
    }).then(res => res.data.data),
    enabled: !!id,
  })

  const filteredProducts = products?.filter(product => 
    !searchTerm || 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const selectedProduct = products?.find(p => p._id === selectedProductId)

  if (supplierLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Comparison</h1>
          <p className="mt-1 text-sm text-gray-500">
            Compare prices across distributors for {supplier?.name} products
          </p>
        </div>
      </div>

      {/* Product Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select Product</h2>
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            <ul className="space-y-2">
              {filteredProducts.map((product) => (
                <li
                  key={product._id}
                  onClick={() => setSelectedProductId(product._id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProductId === product._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <CubeIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No products found</p>
          )}
        </div>
      </div>

      {/* Price Comparison Table */}
      {selectedProduct && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              Price Comparison: {selectedProduct.name}
            </h2>
            <Link
              to={`/products/${selectedProduct._id}`}
              className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
            >
              View product details →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distributor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    List Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedProduct.suppliers && selectedProduct.suppliers.length > 0 ? (
                  selectedProduct.suppliers
                    .filter(supplier => {
                      // Only show suppliers where manufacturerId matches
                      const manId = typeof supplier.manufacturerId === 'object' 
                        ? supplier.manufacturerId._id?.toString() 
                        : supplier.manufacturerId?.toString();
                      return manId === id;
                    })
                    .map((supplier, idx) => {
                      const distributor = supplier.distributorId;
                      const distributorId = typeof distributor === 'object' 
                        ? distributor._id?.toString() 
                        : distributor?.toString();
                      const distributorName = typeof distributor === 'object' 
                        ? distributor.name 
                        : 'Unknown';
                      
                      const listPrice = supplier.listPrice || null;
                      const netPrice = supplier.netPrice || null;
                      const discountPercent = supplier.discountPercent || null;
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              to={`/companies/${distributorId}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                              {distributorName}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {listPrice ? `$${listPrice.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {netPrice ? `$${netPrice.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {discountPercent ? `${discountPercent}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {selectedProduct.unitOfMeasure || 'EA'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link
                              to={`/companies/${distributorId}/products?manufacturerId=${id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View all →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No pricing information available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Distributors Summary */}
      {distributors && distributors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Distributors</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {distributors.map((distributor) => {
              const distributorId = distributor._id || distributor.id;
              return (
                <li key={distributorId} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300">
                  <Link
                    to={`/companies/${distributorId}`}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="font-medium">{distributor.name}</span>
                  </Link>
                  {distributor.productCount > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {distributor.productCount} {distributor.productCount === 1 ? 'product' : 'products'}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

