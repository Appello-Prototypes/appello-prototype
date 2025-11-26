import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, CubeIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { companyAPI, productAPI } from '../services/api'

export default function CompanyProducts() {
  const { id } = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [manufacturerFilter, setManufacturerFilter] = useState('all')

  // Get manufacturer filter from URL params
  const { searchParams } = new URL(window.location.href);
  const urlManufacturerId = searchParams.get('manufacturerId');
  if (urlManufacturerId && manufacturerFilter === 'all') {
    setManufacturerFilter(urlManufacturerId);
  }

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyAPI.getCompany(id).then(res => res.data.data),
  })

  // For distributors, use productAPI with filters
  // For suppliers, use companyAPI.getCompanyProducts
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['company-products', id, searchTerm, manufacturerFilter, company?.companyType],
    queryFn: () => {
      if (company?.companyType === 'distributor') {
        return productAPI.getProducts({
          distributorId: id,
          manufacturerId: manufacturerFilter !== 'all' ? manufacturerFilter : undefined,
          search: searchTerm || undefined
        }).then(res => res.data.data);
      } else {
        return companyAPI.getCompanyProducts(id).then(res => res.data.data);
      }
    },
    enabled: !!id && !!company,
  })

  // Get manufacturers for filter dropdown (distributors only)
  const { data: manufacturers } = useQuery({
    queryKey: ['distributor-manufacturers-for-filter', id],
    queryFn: () => companyAPI.getDistributorManufacturers(id).then(res => res.data.data),
    enabled: !!company && company.companyType === 'distributor',
  })

  const filteredProducts = products?.filter(product => 
    !searchTerm || 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.supplierPartNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.internalPartNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (companyLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Products from {company?.name}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/products/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className={`grid gap-4 ${company?.companyType === 'distributor' && manufacturers && manufacturers.length > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          {company?.companyType === 'distributor' && manufacturers && manufacturers.length > 0 && (
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Manufacturers</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer._id || manufacturer.id} value={manufacturer._id || manufacturer.id}>
                    {manufacturer.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredProducts.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <li key={product._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <CubeIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <Link
                        to={`/products/${product._id}`}
                        className="text-lg font-medium text-blue-600 hover:text-blue-800"
                      >
                        {product.name}
                      </Link>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {product.description && (
                        <p>{product.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-4">
                        {product.manufacturerId && (
                          <span className="text-xs text-gray-600">
                            Manufacturer: {typeof product.manufacturerId === 'object' ? product.manufacturerId.name : 'Unknown'}
                          </span>
                        )}
                        {product.internalPartNumber && (
                          <p className="font-medium text-gray-700">
                            Internal Part #: {product.internalPartNumber}
                          </p>
                        )}
                        {product.supplierPartNumber && (
                          <p>
                            Supplier Part #: {product.supplierPartNumber}
                          </p>
                        )}
                        {product.unitOfMeasure && (
                          <p>Unit: {product.unitOfMeasure}</p>
                        )}
                        {(() => {
                          // Get pricing from suppliers array for this distributor
                          if (company?.companyType === 'distributor' && product.suppliers) {
                            const supplierEntry = product.suppliers.find(s => {
                              const distId = typeof s.distributorId === 'object' ? s.distributorId._id?.toString() : s.distributorId?.toString();
                              return distId === id;
                            });
                            const listPrice = supplierEntry?.listPrice || product.lastPrice || null;
                            const netPrice = supplierEntry?.netPrice || null;
                            const discountPercent = supplierEntry?.discountPercent || null;
                            
                            if (netPrice) {
                              return (
                                <div>
                                  <p className="font-medium text-gray-900">
                                    ${netPrice.toFixed(2)}/{product.unitOfMeasure || 'EA'}
                                  </p>
                                  {listPrice && listPrice !== netPrice && (
                                    <p className="text-xs text-gray-500 line-through">
                                      ${listPrice.toFixed(2)}
                                    </p>
                                  )}
                                  {discountPercent && (
                                    <p className="text-xs text-green-600">
                                      {discountPercent}% off
                                    </p>
                                  )}
                                </div>
                              );
                            } else if (listPrice) {
                              return (
                                <p className="font-medium text-gray-900">
                                  ${listPrice.toFixed(2)}/{product.unitOfMeasure || 'EA'}
                                </p>
                              );
                            }
                          }
                          // Fallback to lastPrice
                          if (product.lastPrice > 0) {
                            return (
                              <p className="font-medium text-gray-900">
                                ${product.lastPrice.toFixed(2)}/{product.unitOfMeasure || 'EA'}
                              </p>
                            );
                          }
                          return null;
                        })()}
                        {product.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {product.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/products/${product._id}/edit`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : `No products have been added for ${company?.name} yet.`}
            </p>
            <div className="mt-6">
              <Link
                to="/products/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Product
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

