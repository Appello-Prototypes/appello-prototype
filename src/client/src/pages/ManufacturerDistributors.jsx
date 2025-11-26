import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BuildingOfficeIcon, CubeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { companyAPI, productAPI } from '../services/api'

export default function ManufacturerDistributors() {
  const { id } = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDistributors, setExpandedDistributors] = useState(new Set())

  const { data: manufacturer, isLoading: manufacturerLoading } = useQuery({
    queryKey: ['manufacturer', id],
    queryFn: () => companyAPI.getCompany(id).then(res => res.data.data),
  })

  const { data: distributors, isLoading: distributorsLoading } = useQuery({
    queryKey: ['manufacturer-distributors', id],
    queryFn: () => companyAPI.getManufacturerDistributors(id).then(res => res.data.data),
    enabled: !!id,
  })

  const toggleDistributor = (distributorId) => {
    setExpandedDistributors(prev => {
      const next = new Set(prev)
      if (next.has(distributorId)) {
        next.delete(distributorId)
      } else {
        next.add(distributorId)
      }
      return next
    })
  }

  const filteredDistributors = distributors?.filter(dist => 
    !searchTerm || 
    dist.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getDistributorProducts = async (distributorId) => {
    // This would need to be called per distributor, but for now we'll show counts
    return []
  }

  if (manufacturerLoading || distributorsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Distributors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Distributors who carry {manufacturer?.name}
          </p>
        </div>
      </div>

      {/* Stats */}
      {distributors && distributors.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Distributors</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{distributors.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Products</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {distributors.reduce((sum, dist) => sum + (dist.productCount || 0), 0)}
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
            placeholder="Search distributors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Distributors List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredDistributors.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredDistributors.map((distributor) => {
              const distributorId = distributor._id || distributor.id
              const isExpanded = expandedDistributors.has(distributorId)

              return (
                <li key={distributorId} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <Link
                          to={`/companies/${distributorId}`}
                          className="text-lg font-medium text-blue-600 hover:text-blue-800"
                        >
                          {distributor.name}
                        </Link>
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {distributor.productCount || 0} {distributor.productCount === 1 ? 'product' : 'products'}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/companies/${distributorId}/products?manufacturerId=${id}`}
                      className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Products →
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No distributors found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : `No distributors carry products from ${manufacturer?.name} yet.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

