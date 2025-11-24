import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, CubeIcon, EyeIcon } from '@heroicons/react/24/outline'
import { productTypeAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function ProductTypeList() {
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: productTypes, isLoading, error } = useQuery({
    queryKey: ['product-types', searchTerm],
    queryFn: () => productTypeAPI.getProductTypes({
      isActive: true,
      search: searchTerm || undefined
    }).then(res => res.data.data),
  })

  // Fetch product counts for each type
  const productCounts = useQuery({
    queryKey: ['product-type-counts', productTypes?.map(t => t._id).join(',')],
    queryFn: async () => {
      if (!productTypes || productTypes.length === 0) return {};
      const counts = {};
      await Promise.all(
        productTypes.map(async (type) => {
          try {
            const res = await productTypeAPI.getProductsByType(type._id);
            counts[type._id] = res.data?.data?.length || 0;
          } catch (error) {
            console.error(`Error fetching products for type ${type._id}:`, error);
            counts[type._id] = 0;
          }
        })
      );
      return counts;
    },
    enabled: !!productTypes && productTypes.length > 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productTypeAPI.deleteProductType(id),
    onSuccess: () => {
      toast.success('Product type deleted successfully')
      queryClient.invalidateQueries(['product-types'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete product type')
    },
  })

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This will fail if any products are using this type.`)) {
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
        <p className="text-red-800">Error loading product types: {error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Types</h1>
          <p className="mt-1 text-sm text-gray-500">Configure product types with custom properties and variants</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/product-types/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Product Type
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search product types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Product Types List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {productTypes && productTypes.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {productTypes.map((productType) => (
              <li key={productType._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <CubeIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{productType.name}</h3>
                      {productType.variantSettings?.enabled && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Variants Enabled
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {productType.description && (
                        <p className="mb-2">{productType.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                          {productType.properties?.length || 0} Property{productType.properties?.length !== 1 ? 'ies' : 'y'}
                        </span>
                        {productType.variantSettings?.variantProperties?.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                            {productType.variantSettings.variantProperties.length} Variant Key{productType.variantSettings.variantProperties.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {productType.variantSettings?.enabled && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
                            Variants: {productType.variantSettings.variantProperties.join(', ')}
                          </span>
                        )}
                        {productCounts.data && productCounts.data[productType._id] !== undefined && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700">
                            {productCounts.data[productType._id]} Product{productCounts.data[productType._id] !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {productCounts.data && productCounts.data[productType._id] > 0 && (
                      <Link
                        to={`/products?productTypeId=${productType._id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        title="View products using this type"
                      >
                        <EyeIcon className="h-4 w-4 mr-1.5" />
                        View Products
                      </Link>
                    )}
                    <Link
                      to={`/product-types/${productType._id}/edit`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 mr-1.5" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(productType._id, productType.name)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete product type"
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
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-900">No product types found</p>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new product type
            </p>
            <Link
              to="/product-types/create"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add your first product type
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

