import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CubeIcon, BuildingOfficeIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { companyAPI } from '../services/api'

export default function CompanyOverview() {
  const { id } = useParams()

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyAPI.getCompany(id).then(res => res.data.data),
  })

  const { data: products } = useQuery({
    queryKey: ['company-products', id],
    queryFn: () => companyAPI.getCompanyProducts(id).then(res => res.data.data),
    enabled: !!company && company.companyType === 'supplier',
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Company not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {company.companyType === 'supplier' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Products</p>
                <p className="text-2xl font-bold text-gray-900">{products?.length || 0}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                to={`/companies/${id}/products`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all products →
              </Link>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Company Type</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{company.companyType}</p>
            </div>
          </div>
        </div>

        {company.paymentTerms && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                <p className="text-2xl font-bold text-gray-900">{company.paymentTerms}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Products (for suppliers) */}
      {company.companyType === 'supplier' && products && products.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Products</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {products.slice(0, 5).map((product) => (
                <li key={product._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <Link
                      to={`/products/${product._id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {product.name}
                    </Link>
                    {product.supplierPartNumber && (
                      <p className="text-xs text-gray-500 mt-1">
                        Part #: {product.supplierPartNumber}
                      </p>
                    )}
                  </div>
                  {product.lastPrice > 0 && (
                    <div className="text-sm font-medium text-gray-900">
                      ${product.lastPrice.toFixed(2)}/{product.unitOfMeasure}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {products.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  to={`/companies/${id}/products`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all {products.length} products →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

