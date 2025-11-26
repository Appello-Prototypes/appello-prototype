import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { productAPI, companyAPI, productTypeAPI } from '../services/api'
import toast from 'react-hot-toast'
import SupplierTooltip from '../components/SupplierTooltip'
import ProductStatusDropdown from '../components/ProductStatusDropdown'

export default function ProductList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [manufacturerFilter, setManufacturerFilter] = useState('all')
  const [distributorFilter, setDistributorFilter] = useState('all')
  const queryClient = useQueryClient()

  const { searchParams } = new URL(window.location.href);
  const productTypeFilter = searchParams.get('productTypeId') || 'all';

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products', supplierFilter, manufacturerFilter, distributorFilter, searchTerm, productTypeFilter],
    queryFn: () => productAPI.getProducts({
      manufacturerId: manufacturerFilter !== 'all' ? manufacturerFilter : undefined,
      distributorId: distributorFilter !== 'all' ? distributorFilter : undefined,
      productTypeId: productTypeFilter !== 'all' ? productTypeFilter : undefined,
      search: searchTerm || undefined
    }).then(res => res.data.data),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-for-filter'],
    queryFn: () => companyAPI.getCompanies({ companyType: 'supplier' }).then(res => res.data.data),
  })

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers-for-filter'],
    queryFn: () => companyAPI.getManufacturers().then(res => res.data.data),
  })

  const { data: distributors } = useQuery({
    queryKey: ['distributors-for-filter'],
    queryFn: () => companyAPI.getDistributors().then(res => res.data.data),
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

  const [updatingStatuses, setUpdatingStatuses] = useState(new Set())

  const updateStatusMutation = useMutation({
    mutationFn: ({ productId, isActive }) => productAPI.updateProduct(productId, { isActive }),
    onSuccess: (_, variables) => {
      toast.success('Status updated successfully')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.productId)
        return next
      })
      queryClient.invalidateQueries(['products'])
    },
    onError: (error, variables) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
      setUpdatingStatuses(prev => {
        const next = new Set(prev)
        next.delete(variables.productId)
        return next
      })
    },
  })

  const handleStatusChange = (productId, isActive) => {
    setUpdatingStatuses(prev => new Set(prev).add(productId))
    updateStatusMutation.mutate({ productId, isActive })
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            value={manufacturerFilter}
            onChange={(e) => setManufacturerFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Manufacturers</option>
            {manufacturers?.map((manufacturer) => (
              <option key={manufacturer._id} value={manufacturer._id}>
                {manufacturer.name}
              </option>
            ))}
          </select>
          <select
            value={distributorFilter}
            onChange={(e) => setDistributorFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Distributors</option>
            {distributors?.map((distributor) => (
              <option key={distributor._id} value={distributor._id}>
                {distributor.name}
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

      {/* Products Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distributor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variants
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suppliers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventory
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    List Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const supplierCount = product.suppliers?.length || 0
                  const variantCount = product.variants?.length || 0
                  const productType = product.productTypeId?.name || '-'
                  const manufacturer = typeof product.manufacturerId === 'object' ? product.manufacturerId?.name : null
                  const distributor = typeof product.distributorId === 'object' ? product.distributorId?.name : null
                  const inventoryEnabled = product.inventoryTracking?.enabled || false
                  const inventoryType = product.inventoryTracking?.type || '-'
                  const listPrice = product.lastPrice || product.suppliers?.[0]?.listPrice || 0
                  const netPrice = product.suppliers?.[0]?.netPrice || listPrice
                  const discountPercent = listPrice > 0 ? ((listPrice - netPrice) / listPrice * 100) : 0
                  
                  return (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          {product.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {product.internalPartNumber || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {productType}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {manufacturer ? (
                          <Link
                            to={`/companies/${typeof product.manufacturerId === 'object' ? product.manufacturerId._id : product.manufacturerId}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {manufacturer}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {distributor ? (
                          <Link
                            to={`/companies/${typeof product.distributorId === 'object' ? product.distributorId._id : product.distributorId}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {distributor}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-700 font-medium">
                          {product.unitOfMeasure || 'EA'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {variantCount > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {variantCount}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {supplierCount > 0 ? (
                          <SupplierTooltip suppliers={product.suppliers}>
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                              {supplierCount}
                            </span>
                          </SupplierTooltip>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inventoryEnabled ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-green-700">Tracked</span>
                            <span className="text-xs text-gray-500 capitalize">{inventoryType}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not Tracked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {listPrice > 0 ? (
                          <div className="text-sm text-gray-900">
                            ${listPrice.toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {netPrice > 0 ? (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-blue-600">
                              ${netPrice.toFixed(2)}
                            </div>
                            {discountPercent > 0 && (
                              <div className="text-xs font-medium text-green-600">
                                {discountPercent.toFixed(0)}% off
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <ProductStatusDropdown
                          value={product.isActive !== false}
                          onChange={(isActive) => handleStatusChange(product._id, isActive)}
                          disabled={updatingStatuses.has(product._id)}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/products/${product._id}`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View
                          </Link>
                          <Link
                            to={`/products/${product._id}/edit`}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product._id, product.name)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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

      {/* Summary */}
      {products && products.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

