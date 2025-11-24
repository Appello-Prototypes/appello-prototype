import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { productAPI, companyAPI, productTypeAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function ProductList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const queryClient = useQueryClient()

  const { searchParams } = new URL(window.location.href);
  const productTypeFilter = searchParams.get('productTypeId') || 'all';

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products', supplierFilter, searchTerm, productTypeFilter],
    queryFn: () => productAPI.getProducts({
      supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
      productTypeId: productTypeFilter !== 'all' ? productTypeFilter : undefined,
      search: searchTerm || undefined
    }).then(res => res.data.data),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-for-filter'],
    queryFn: () => companyAPI.getCompanies({ companyType: 'supplier' }).then(res => res.data.data),
  })

  const { data: productTypes } = useQuery({
    queryKey: ['product-types-for-filter'],
    queryFn: () => productTypeAPI.getProductTypes({ isActive: true }).then(res => res.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.updateProduct(id, { isActive: false }),
    onSuccess: () => {
      toast.success('Product deactivated successfully')
      queryClient.invalidateQueries(['products'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate product')
    },
  })

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to deactivate ${name}?`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading products: {error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product catalog</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Link
            to="/product-types"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Squares2X2Icon className="h-5 w-5 mr-2" />
            Product Types
          </Link>
          <Link
            to="/products/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Suppliers</option>
            {suppliers?.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <select
            value={productTypeFilter}
            onChange={(e) => {
              const url = new URL(window.location);
              if (e.target.value === 'all') {
                url.searchParams.delete('productTypeId');
              } else {
                url.searchParams.set('productTypeId', e.target.value);
              }
              window.history.pushState({}, '', url);
              window.location.reload();
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Product Types</option>
            {productTypes?.map((type) => (
              <option key={type._id} value={type._id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        {productTypeFilter !== 'all' && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Filtered by: {productTypes?.find(t => t._id === productTypeFilter)?.name}
            </span>
            <button
              onClick={() => {
                const url = new URL(window.location);
                url.searchParams.delete('productTypeId');
                window.history.pushState({}, '', url);
                window.location.reload();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Products List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {products && products.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {products.map((product) => (
              <li key={product._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                      {!product.isActive && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {product.description && (
                        <p>{product.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-4">
                        {product.internalPartNumber && (
                          <p className="font-medium text-gray-700">
                            Internal Part #: {product.internalPartNumber}
                          </p>
                        )}
                        {product.suppliers && product.suppliers.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">Suppliers:</span>
                            {product.suppliers.map((supplier, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs">
                                {supplier.supplierId?.name || 'Unknown'}
                                {supplier.supplierPartNumber && ` (${supplier.supplierPartNumber})`}
                                {supplier.lastPrice > 0 && ` - $${supplier.lastPrice.toFixed(2)}`}
                              </span>
                            ))}
                          </div>
                        ) : product.supplierId?.name && (
                          <p>Supplier: {product.supplierId.name}</p>
                        )}
                        {product.unitOfMeasure && (
                          <p>Unit: {product.unitOfMeasure}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/products/${product._id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </Link>
                    <Link
                      to={`/products/${product._id}/edit`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(product._id, product.name)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
            <Link
              to="/products/create"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add your first product
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

