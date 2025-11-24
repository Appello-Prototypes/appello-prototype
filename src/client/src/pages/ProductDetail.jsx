import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PencilIcon, BuildingOfficeIcon, CubeIcon, CurrencyDollarIcon, Squares2X2Icon, TableCellsIcon, WrenchScrewdriverIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { productAPI, productTypeAPI, api } from '../services/api'
import toast from 'react-hot-toast'

const VIEWS = {
  CARD: 'card',
  TABLE: 'table'
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [variantView, setVariantView] = useState(VIEWS.TABLE)
  const [showPriceHistory, setShowPriceHistory] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null)

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getProduct(id).then(res => res.data.data),
  })


  const { data: suppliers } = useQuery({
    queryKey: ['product-suppliers', id],
    queryFn: () => productAPI.getProductSuppliers(id).then(res => res.data.data),
    enabled: !!product,
  })

  const { data: productType } = useQuery({
    queryKey: ['product-type', product?.productTypeId],
    queryFn: () => {
      // Handle both populated object and ID string
      const typeId = typeof product.productTypeId === 'object' 
        ? product.productTypeId._id || product.productTypeId.id
        : product.productTypeId;
      return productTypeAPI.getProductType(typeId).then(res => res.data.data);
    },
    enabled: !!product?.productTypeId,
  })

  // Convert properties Map to object for display
  const productProperties = product?.properties instanceof Map
    ? Object.fromEntries(product.properties)
    : product?.properties || {}

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
        <p className="text-red-800">Error loading product: {error.message}</p>
        <Link to="/products" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          Back to Products
        </Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
        <Link to="/products" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          Back to Products
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/products"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Products
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {product.internalPartNumber && (
                <p className="mt-1 text-sm text-gray-500">
                  Internal Part #: {product.internalPartNumber}
                </p>
              )}
            </div>
            <Link
              to={`/products/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit
            </Link>
          </div>

          {/* Product-Level Discount */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Product Discount</h3>
                  <p className="text-xs text-gray-600">Applies to all variants by default</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  {product?.productDiscount?.discountPercent !== undefined ? (
                    <>
                      <div className="text-2xl font-bold text-blue-600">
                        {product.productDiscount.discountPercent.toFixed(2)}%
                      </div>
                      {product.variants?.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {product.variants.filter(v => 
                            v.pricing?.discountPercent === product.productDiscount.discountPercent
                          ).length} / {product.variants.length} variants match
                        </div>
                      )}
                    </>
                  ) : product?.variants?.[0]?.pricing?.discountPercent !== undefined ? (
                    <>
                      <div className="text-2xl font-bold text-blue-600">
                        {product.variants[0].pricing.discountPercent.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">From variants</div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">No discount set</div>
                  )}
                </div>
                {product?.variants && product.variants.length > 0 && (
                  <button
                    onClick={() => navigate(`/products/${id}/discount-wizard`)}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
                    Update Discounts
                  </button>
                )}
                {product?.discountHistory && product.discountHistory.length > 0 && (
                  <button
                    onClick={() => setShowPriceHistory(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ClockIcon className="h-4 w-4 mr-1" />
                    View Price History ({product.discountHistory.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Product Information</h2>
              <dl className="space-y-3">
                {product.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.description}</dd>
                  </div>
                )}
                {productType && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Product Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">{productType.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Unit of Measure</dt>
                  <dd className="mt-1 text-sm text-gray-900">{product.unitOfMeasure}</dd>
                </div>
                {product.category && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.category}</dd>
                  </div>
                )}
                {product.standardCost && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Standard Cost</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      ${product.standardCost.toFixed(2)}/{product.unitOfMeasure}
                    </dd>
                  </div>
                )}
                {product.notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.notes}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
              </dl>

              {/* Custom Properties */}
              {productType && Object.keys(productProperties).length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Properties</h3>
                  <dl className="space-y-2">
                    {productType.properties
                      .filter(prop => productProperties[prop.key] !== undefined && productProperties[prop.key] !== null && productProperties[prop.key] !== '')
                      .map((property) => {
                        const value = productProperties[property.key]
                        let displayValue = value

                        if (property.type === 'boolean') {
                          displayValue = value ? 'Yes' : 'No'
                        } else if (property.type === 'enum' && property.options) {
                          const option = property.options.find(opt => opt.value === value)
                          displayValue = option ? option.label : value
                        } else if (property.type === 'multiselect' && Array.isArray(value)) {
                          displayValue = value.map(v => {
                            const option = property.options?.find(opt => opt.value === v)
                            return option ? option.label : v
                          }).join(', ')
                        }

                        return (
                          <div key={property.key}>
                            <dt className="text-xs font-medium text-gray-500">{property.label}</dt>
                            <dd className="mt-1 text-sm text-gray-900">{String(displayValue)}</dd>
                          </div>
                        )
                      })}
                  </dl>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                Suppliers ({suppliers?.length || 0})
              </h2>
              {suppliers && suppliers.length > 0 ? (
                <div className="space-y-4">
                  {suppliers.map((supplierInfo, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link
                            to={`/companies/${supplierInfo.supplier._id}`}
                            className="text-lg font-medium text-blue-600 hover:text-blue-800"
                          >
                            {supplierInfo.supplier.name}
                          </Link>
                          {supplierInfo.supplierPartNumber && supplierInfo.supplierPartNumber !== '0' && supplierInfo.supplierPartNumber.trim() !== '' && (
                            <p className="mt-1 text-sm text-gray-600">
                              Part #: {supplierInfo.supplierPartNumber}
                            </p>
                          )}
                          {((supplierInfo.listPrice && supplierInfo.listPrice > 0) || 
                            (supplierInfo.netPrice && supplierInfo.netPrice > 0) || 
                            (supplierInfo.lastPrice && supplierInfo.lastPrice > 0)) && (
                            <div className="mt-1 text-sm">
                              {supplierInfo.listPrice > 0 && (
                                <p className="text-gray-600">
                                  List Price: ${supplierInfo.listPrice.toFixed(2)}/{product.unitOfMeasure}
                                </p>
                              )}
                              {supplierInfo.netPrice > 0 && (
                                <p className="font-medium text-gray-900">
                                  Net Price: ${supplierInfo.netPrice.toFixed(2)}/{product.unitOfMeasure}
                                </p>
                              )}
                              {supplierInfo.discountPercent > 0 && (
                                <p className="text-xs text-gray-500">
                                  Discount: {supplierInfo.discountPercent.toFixed(2)}%
                                </p>
                              )}
                              {/* Legacy: Show lastPrice only if listPrice/netPrice not available */}
                              {!supplierInfo.listPrice && !supplierInfo.netPrice && supplierInfo.lastPrice > 0 && (
                                <p className="font-medium text-gray-900">
                                  Last Price: ${supplierInfo.lastPrice.toFixed(2)}/{product.unitOfMeasure}
                                </p>
                              )}
                            </div>
                          )}
                          {supplierInfo.lastPurchasedDate && (
                            <p className="mt-1 text-xs text-gray-500">
                              Last Purchased: {new Date(supplierInfo.lastPurchasedDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {supplierInfo.isPreferred && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Preferred
                          </span>
                        )}
                      </div>
                      {supplierInfo.supplier.contact?.email && (
                        <p className="mt-2 text-xs text-gray-500">
                          Contact: {supplierInfo.supplier.contact.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No suppliers found for this product</p>
                </div>
              )}
            </div>
          </div>

          {/* Variants Section */}
          {product?.variants && product.variants.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <CubeIcon className="h-5 w-5 mr-2" />
                  Variants ({product.variants.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVariantView(VIEWS.CARD)}
                    className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium ${
                      variantView === VIEWS.CARD
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4 mr-1" />
                    Card
                  </button>
                  <button
                    onClick={() => setVariantView(VIEWS.TABLE)}
                    className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium ${
                      variantView === VIEWS.TABLE
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <TableCellsIcon className="h-4 w-4 mr-1" />
                    Table
                  </button>
                </div>
              </div>

              {variantView === VIEWS.CARD ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.variants.map((variant, idx) => {
                    const variantProps = variant.properties instanceof Map
                      ? Object.fromEntries(variant.properties)
                      : variant.properties || {}

                    return (
                      <div key={variant._id || idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {variant.name || `Variant ${idx + 1}`}
                            </h3>
                            {variant.sku && (
                              <p className="text-xs text-gray-500 mt-1">SKU: {variant.sku}</p>
                            )}
                          </div>
                          {!variant.isActive && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </div>

                        {/* Variant Properties */}
                        {productType && Object.keys(variantProps).length > 0 && (
                          <div className="mt-3 space-y-1">
                            {productType.variantSettings?.variantProperties?.map((propKey) => {
                              const property = productType.properties.find(p => p.key === propKey)
                              if (!property || !variantProps[propKey]) return null

                              let displayValue = variantProps[propKey]
                              if (property.type === 'enum' && property.options) {
                                const option = property.options.find(opt => opt.value === displayValue)
                                displayValue = option ? option.label : displayValue
                              }

                              return (
                                <div key={propKey} className="text-xs">
                                  <span className="text-gray-500">{property.label}:</span>{' '}
                                  <span className="text-gray-900 font-medium">{String(displayValue)}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Variant Pricing */}
                        {(variant.pricing?.standardCost || variant.pricing?.listPrice || variant.pricing?.netPrice || variant.pricing?.lastPrice) && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {variant.pricing.standardCost && (
                              <p className="text-xs text-gray-600">
                                Standard Cost: ${variant.pricing.standardCost.toFixed(2)}
                              </p>
                            )}
                            {variant.pricing.listPrice && (
                              <p className="text-xs text-gray-600">
                                List Price: ${variant.pricing.listPrice.toFixed(2)}
                              </p>
                            )}
                            {variant.pricing.netPrice && (
                              <p className="text-xs font-medium text-blue-600">
                                Net Price: ${variant.pricing.netPrice.toFixed(2)}
                              </p>
                            )}
                            {variant.pricing.discountPercent && (
                              <p className="text-xs text-gray-500">
                                Discount: {variant.pricing.discountPercent.toFixed(2)}%
                              </p>
                            )}
                            {/* Legacy: Show lastPrice only if listPrice/netPrice not available */}
                            {!variant.pricing.listPrice && !variant.pricing.netPrice && variant.pricing.lastPrice && (
                              <p className="text-xs text-gray-600">
                                Last Price: ${variant.pricing.lastPrice.toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variant Name</th>
                          {productType?.variantSettings?.variantProperties?.map((propKey) => {
                            const property = productType.properties.find(p => p.key === propKey)
                            if (!property) return null
                            return (
                              <th key={propKey} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {property.label}
                              </th>
                            )
                          })}
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">List Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {product.variants.map((variant, idx) => {
                          const variantProps = variant.properties instanceof Map
                            ? Object.fromEntries(variant.properties)
                            : variant.properties || {}

                          return (
                            <tr key={variant._id || idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-mono">
                                  {variant.sku || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {variant.name || `Variant ${idx + 1}`}
                                </div>
                              </td>
                              {productType?.variantSettings?.variantProperties?.map((propKey) => {
                                const property = productType.properties.find(p => p.key === propKey)
                                if (!property) return null
                                
                                let displayValue = variantProps[propKey] || '-'
                                if (property.type === 'enum' && property.options && variantProps[propKey]) {
                                  const option = property.options.find(opt => opt.value === variantProps[propKey])
                                  displayValue = option ? option.label : variantProps[propKey]
                                }

                                return (
                                  <td key={propKey} className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                      {String(displayValue)}
                                    </div>
                                  </td>
                                )
                              })}
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-900">
                                  {variant.pricing?.listPrice 
                                    ? `$${variant.pricing.listPrice.toFixed(2)}`
                                    : variant.pricing?.lastPrice
                                    ? `$${variant.pricing.lastPrice.toFixed(2)}`
                                    : '-'
                                  }
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="text-sm font-medium text-blue-600">
                                  {variant.pricing?.netPrice 
                                    ? `$${variant.pricing.netPrice.toFixed(2)}`
                                    : '-'
                                  }
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-900">
                                  {variant.pricing?.discountPercent !== undefined
                                    ? `${variant.pricing.discountPercent.toFixed(2)}%`
                                    : '-'
                                  }
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                {variant.isActive !== false ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Inactive
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price History Modal */}
      {showPriceHistory && product?.discountHistory && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClockIcon className="h-6 w-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Price History</h2>
                <span className="text-sm text-gray-500">({product.discountHistory.length} entries)</span>
              </div>
              <button
                onClick={() => {
                  setShowPriceHistory(false)
                  setSelectedHistoryEntry(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedHistoryEntry === null ? (
                // History List View
                <div className="space-y-4">
                  {product.discountHistory
                    .slice()
                    .reverse()
                    .map((history, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedHistoryEntry(history)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="text-lg font-semibold text-gray-900">
                                {history.discountPercent.toFixed(2)}% Discount
                              </div>
                              {history.expiresDate && (
                                <span className="text-xs text-gray-500">
                                  (Replaced on {new Date(history.expiresDate).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="font-medium">Effective:</span>{' '}
                                {new Date(history.effectiveDate).toLocaleDateString()}
                              </p>
                              <p>
                                <span className="font-medium">Applied:</span>{' '}
                                {new Date(history.appliedDate).toLocaleDateString()}
                              </p>
                              {history.notes && (
                                <p className="mt-2 text-gray-700">{history.notes}</p>
                              )}
                            </div>
                            {history.variantSnapshots && history.variantSnapshots.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                {history.variantSnapshots.length} variant snapshot{history.variantSnapshots.length !== 1 ? 's' : ''} available
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-blue-600 font-medium">
                            Click to view →
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                // Selected History Entry Detail View
                <div>
                  <button
                    onClick={() => setSelectedHistoryEntry(null)}
                    className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    Back to History
                  </button>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {selectedHistoryEntry.discountPercent.toFixed(2)}% Discount
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Effective Date:</span>{' '}
                        <span className="text-gray-900">{new Date(selectedHistoryEntry.effectiveDate).toLocaleDateString()}</span>
                      </div>
                      {selectedHistoryEntry.expiresDate && (
                        <div>
                          <span className="font-medium text-gray-600">Expired:</span>{' '}
                          <span className="text-gray-900">{new Date(selectedHistoryEntry.expiresDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-600">Applied:</span>{' '}
                        <span className="text-gray-900">{new Date(selectedHistoryEntry.appliedDate).toLocaleDateString()}</span>
                      </div>
                      {selectedHistoryEntry.notes && (
                        <div className="col-span-2">
                          <span className="font-medium text-gray-600">Notes:</span>{' '}
                          <span className="text-gray-900">{selectedHistoryEntry.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variant Pricing Snapshot */}
                  {selectedHistoryEntry.variantSnapshots && selectedHistoryEntry.variantSnapshots.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Variant Pricing at This Time ({selectedHistoryEntry.variantSnapshots.length} variants)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variant</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                              {productType?.variantSettings?.variantProperties?.map((propKey) => {
                                const property = productType.properties.find(p => p.key === propKey)
                                if (!property) return null
                                return (
                                  <th key={propKey} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {property.label}
                                  </th>
                                )
                              })}
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">List Price</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Price</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedHistoryEntry.variantSnapshots.map((snapshot, sIdx) => {
                              const variantProps = snapshot.properties || {}
                              return (
                                <tr key={sIdx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {snapshot.variantName || snapshot.sku || `Variant ${sIdx + 1}`}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 font-mono">
                                      {snapshot.sku || '-'}
                                    </div>
                                  </td>
                                  {productType?.variantSettings?.variantProperties?.map((propKey) => {
                                    const property = productType.properties.find(p => p.key === propKey)
                                    if (!property) return null
                                    
                                    let displayValue = variantProps[propKey] || '-'
                                    if (property.type === 'enum' && property.options && variantProps[propKey]) {
                                      const option = property.options.find(opt => opt.value === variantProps[propKey])
                                      displayValue = option ? option.label : variantProps[propKey]
                                    }

                                    return (
                                      <td key={propKey} className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                          {String(displayValue)}
                                        </div>
                                      </td>
                                    )
                                  })}
                                  <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <div className="text-sm text-gray-900">
                                      {snapshot.listPrice ? `$${snapshot.listPrice.toFixed(2)}` : '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                      {snapshot.netPrice ? `$${snapshot.netPrice.toFixed(2)}` : '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <div className="text-sm text-gray-900">
                                      {snapshot.discountPercent !== undefined ? `${snapshot.discountPercent.toFixed(2)}%` : '-'}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

