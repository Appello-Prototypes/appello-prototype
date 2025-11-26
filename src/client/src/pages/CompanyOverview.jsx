import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CubeIcon, BuildingOfficeIcon, CurrencyDollarIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { companyAPI, productAPI } from '../services/api'

export default function CompanyOverview() {
  const { id } = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [manufacturerFilter, setManufacturerFilter] = useState('all')

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyAPI.getCompany(id).then(res => res.data.data),
  })

  // Get products for distributor
  const { data: distributorProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['distributor-products', id, manufacturerFilter],
    queryFn: () => productAPI.getProducts({
      distributorId: id,
      manufacturerId: manufacturerFilter !== 'all' ? manufacturerFilter : undefined,
      search: searchTerm || undefined
    }).then(res => res.data.data),
    enabled: !!company && company.companyType === 'distributor',
  })

  // Get products for supplier (manufacturer)
  const { data: supplierProducts } = useQuery({
    queryKey: ['supplier-products', id],
    queryFn: () => productAPI.getProducts({
      manufacturerId: id
    }).then(res => res.data.data),
    enabled: !!company && company.companyType === 'supplier',
  })

  // Use appropriate products list based on company type
  const products = company?.companyType === 'distributor' ? distributorProducts : supplierProducts

  const { data: distributorSuppliers } = useQuery({
    queryKey: ['distributor-suppliers', id],
    queryFn: () => companyAPI.getDistributorSuppliers(id).then(res => res.data.data),
    enabled: !!company && company.companyType === 'distributor',
  })

  const { data: supplierDistributors } = useQuery({
    queryKey: ['supplier-distributors', id],
    queryFn: () => companyAPI.getSupplierDistributors(id).then(res => res.data.data),
    enabled: !!company && company.companyType === 'supplier',
  })

  // Get manufacturers for filter dropdown
  const { data: manufacturers } = useQuery({
    queryKey: ['distributor-manufacturers-for-filter', id],
    queryFn: () => companyAPI.getDistributorManufacturers(id).then(res => res.data.data),
    enabled: !!company && company.companyType === 'distributor',
  })

  // Filter products by search term
  const filteredProducts = products?.filter(product => 
    !searchTerm || 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

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
        {(company.companyType === 'supplier' || company.companyType === 'distributor') && (
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

        {/* Distributor-Supplier Relationships */}
        {company.companyType === 'distributor' && distributorSuppliers && distributorSuppliers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Manufacturers</p>
                <p className="text-2xl font-bold text-gray-900">{distributorSuppliers.length}</p>
                <Link
                  to={`/companies/${id}/manufacturers`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1 inline-block"
                >
                  View all manufacturers →
                </Link>
              </div>
            </div>
          </div>
        )}

        {company.companyType === 'supplier' && supplierDistributors && supplierDistributors.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Distributors</p>
                <p className="text-2xl font-bold text-gray-900">{supplierDistributors.length}</p>
                <Link
                  to={`/companies/${id}/distributors`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1 inline-block"
                >
                  View all distributors →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Section for Distributors */}
      {company.companyType === 'distributor' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Products</h2>
              <Link
                to={`/companies/${id}/products`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          
          {/* Search and Filter */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {manufacturers && manufacturers.length > 0 && (
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
          <div className="p-6">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <ul className="space-y-3">
                {filteredProducts.slice(0, 10).map((product) => {
                  // Get pricing from suppliers array for this distributor
                  const supplierEntry = product.suppliers?.find(s => {
                    const distId = typeof s.distributorId === 'object' ? s.distributorId._id?.toString() : s.distributorId?.toString();
                    return distId === id;
                  });
                  
                  const listPrice = supplierEntry?.listPrice || product.lastPrice || null;
                  const netPrice = supplierEntry?.netPrice || null;
                  const discountPercent = supplierEntry?.discountPercent || null;
                  
                  return (
                    <li key={product._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <CubeIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <Link
                            to={`/products/${product._id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {product.name}
                          </Link>
                          {product.manufacturerId && (
                            <span className="ml-3 text-xs text-gray-500">
                              by {typeof product.manufacturerId === 'object' ? product.manufacturerId.name : 'Unknown'}
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-1 ml-7">{product.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {netPrice ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              ${netPrice.toFixed(2)}
                            </div>
                            {listPrice && listPrice !== netPrice && (
                              <div className="text-xs text-gray-500 line-through">
                                ${listPrice.toFixed(2)}
                              </div>
                            )}
                            {discountPercent && (
                              <div className="text-xs text-green-600">
                                {discountPercent}% off
                              </div>
                            )}
                          </div>
                        ) : listPrice ? (
                          <div className="text-sm font-medium text-gray-900">
                            ${listPrice.toFixed(2)}/{product.unitOfMeasure || 'EA'}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">No pricing</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-12">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || manufacturerFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : `No products are currently associated with ${company.name}.`}
                </p>
              </div>
            )}
            {filteredProducts.length > 10 && (
              <div className="mt-4 text-center">
                <Link
                  to={`/companies/${id}/products`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all {filteredProducts.length} products →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manufacturers List for Distributors */}
      {company.companyType === 'distributor' && distributorSuppliers && distributorSuppliers.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Manufacturers</h2>
              <Link
                to={`/companies/${id}/manufacturers`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          <div className="p-6">
            <ul className="space-y-2">
              {distributorSuppliers.slice(0, 5).map((supplier) => {
                const supplierId = supplier.supplierId?._id || supplier.supplierId;
                const supplierName = supplier.supplierId?.name || 'Unknown';
                return (
                  <li key={supplierId} className="flex items-center justify-between py-2">
                    <Link
                      to={`/companies/${supplierId}`}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {supplierName}
                    </Link>
                    <Link
                      to={`/companies/${id}/products?manufacturerId=${supplierId}`}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      View products →
                    </Link>
                  </li>
                );
              })}
            </ul>
            {distributorSuppliers.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  to={`/companies/${id}/manufacturers`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all {distributorSuppliers.length} manufacturers →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distributors List for Suppliers */}
      {company.companyType === 'supplier' && supplierDistributors && supplierDistributors.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Distributors</h2>
              <Link
                to={`/companies/${id}/distributors`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {supplierDistributors.slice(0, 5).map((distributor) => {
                const distributorId = distributor._id || distributor.id;
                return (
                  <li key={distributorId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <Link
                      to={`/companies/${distributorId}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {distributor.name}
                    </Link>
                    <Link
                      to={`/companies/${distributorId}/products?manufacturerId=${id}`}
                      className="text-xs text-gray-500 hover:text-blue-600"
                    >
                      Compare prices →
                    </Link>
                  </li>
                );
              })}
            </ul>
            {supplierDistributors.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  to={`/companies/${id}/distributors`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all {supplierDistributors.length} distributors →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products List for Suppliers */}
      {company.companyType === 'supplier' && products && products.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Products</h2>
              <Link
                to={`/companies/${id}/products`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {products.slice(0, 10).map((product) => (
                <li key={product._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded">
                  <div className="flex-1">
                    <Link
                      to={`/products/${product._id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <CubeIcon className="h-5 w-5 text-gray-400 mr-2" />
                      {product.name}
                    </Link>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-1 ml-7">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {product.suppliers && product.suppliers.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {product.suppliers.length} distributor{product.suppliers.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {products.length > 10 && (
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

