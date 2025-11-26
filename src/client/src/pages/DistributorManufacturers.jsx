import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BuildingOfficeIcon, CubeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { companyAPI, productAPI } from '../services/api'

export default function DistributorManufacturers() {
  const { id } = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedManufacturers, setExpandedManufacturers] = useState(new Set())

  const { data: distributor, isLoading: distributorLoading } = useQuery({
    queryKey: ['distributor', id],
    queryFn: () => companyAPI.getCompany(id).then(res => res.data.data),
  })

  const { data: manufacturers, isLoading: manufacturersLoading } = useQuery({
    queryKey: ['distributor-manufacturers', id],
    queryFn: () => companyAPI.getDistributorManufacturers(id).then(res => res.data.data),
    enabled: !!id,
  })

  const { data: allProducts } = useQuery({
    queryKey: ['distributor-products', id],
    queryFn: () => productAPI.getProductsByDistributor(id).then(res => res.data.data),
    enabled: !!id,
  })

  const toggleManufacturer = (manufacturerId) => {
    setExpandedManufacturers(prev => {
      const next = new Set(prev)
      if (next.has(manufacturerId)) {
        next.delete(manufacturerId)
      } else {
        next.add(manufacturerId)
      }
      return next
    })
  }

  const filteredManufacturers = manufacturers?.filter(mfr => 
    !searchTerm || 
    mfr.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getManufacturerProducts = (manufacturerId) => {
    return allProducts?.filter(p => 
      p.manufacturerId && 
      (typeof p.manufacturerId === 'object' ? p.manufacturerId._id : p.manufacturerId) === manufacturerId
    ) || []
  }

  if (distributorLoading || manufacturersLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Manufacturers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manufacturers carried by {distributor?.name}
          </p>
        </div>
      </div>

      {/* Stats */}
      {manufacturers && manufacturers.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Manufacturers</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{manufacturers.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Products</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{allProducts?.length || 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Average Products/Manufacturer</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {manufacturers.length > 0 ? Math.round((allProducts?.length || 0) / manufacturers.length) : 0}
              </dd>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search manufacturers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Manufacturers List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredManufacturers.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredManufacturers.map((manufacturer) => {
              const manufacturerId = manufacturer._id || manufacturer.id
              const isExpanded = expandedManufacturers.has(manufacturerId)
              const products = getManufacturerProducts(manufacturerId)

              return (
                <li key={manufacturerId} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <Link
                          to={`/companies/${manufacturerId}`}
                          className="text-lg font-medium text-blue-600 hover:text-blue-800"
                        >
                          {manufacturer.name}
                        </Link>
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {manufacturer.productCount || products.length} {manufacturer.productCount === 1 ? 'product' : 'products'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleManufacturer(manufacturerId)}
                      className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? 'Hide Products' : 'Show Products'}
                    </button>
                  </div>

                  {/* Expanded Products List */}
                  {isExpanded && products.length > 0 && (
                    <div className="mt-4 ml-7 border-l-2 border-gray-200 pl-4">
                      <ul className="space-y-2">
                        {products.map((product) => (
                          <li key={product._id} className="flex items-center">
                            <CubeIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <Link
                              to={`/products/${product._id}`}
                              className="text-sm text-gray-700 hover:text-blue-600"
                            >
                              {product.name}
                            </Link>
                            {product.variants && product.variants.length > 0 && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({product.variants.length} {product.variants.length === 1 ? 'variant' : 'variants'})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No manufacturers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : `No manufacturers have been added for ${distributor?.name} yet.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

