import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeftIcon, 
  XCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'
import { productAPI, api } from '../services/api'
import toast from 'react-hot-toast'

export default function DiscountWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [newDiscountPercent, setNewDiscountPercent] = useState('')
  const [newEffectiveDate, setNewEffectiveDate] = useState('')
  const [selectedVariants, setSelectedVariants] = useState(new Set())
  const [notes, setNotes] = useState('')

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getProduct(id).then(res => res.data.data),
  })

  const { data: productType } = useQuery({
    queryKey: ['productType', product?.productTypeId],
    queryFn: () => {
      if (!product?.productTypeId) return null
      // Handle both populated object and ID string
      const typeId = typeof product.productTypeId === 'object' 
        ? product.productTypeId._id || product.productTypeId.id
        : product.productTypeId;
      return api.get(`/api/product-types/${typeId}`).then(res => res.data.data)
    },
    enabled: !!product?.productTypeId
  })

  // Initialize selected variants - all selected by default
  useEffect(() => {
    if (product?.variants && product.variants.length > 0 && selectedVariants.size === 0) {
      const allVariantIds = product.variants.map(v => v._id.toString())
      setSelectedVariants(new Set(allVariantIds))
    }
  }, [product?.variants])

  // Initialize effective date to today
  useEffect(() => {
    if (!newEffectiveDate) {
      const today = new Date().toISOString().split('T')[0]
      setNewEffectiveDate(today)
    }
  }, [])

  const toggleVariant = (variantId) => {
    const newSelected = new Set(selectedVariants)
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId)
    } else {
      newSelected.add(variantId)
    }
    setSelectedVariants(newSelected)
  }

  const toggleAllVariants = () => {
    if (selectedVariants.size === product?.variants?.length) {
      setSelectedVariants(new Set())
    } else {
      const allVariantIds = product.variants.map(v => v._id.toString())
      setSelectedVariants(new Set(allVariantIds))
    }
  }

  const updateDiscountMutation = useMutation({
    mutationFn: async ({ discountPercent, effectiveDate, selectedVariantIds, notes }) => {
      const response = await api.patch(`/api/products/${id}/discount/selective`, {
        discountPercent: parseFloat(discountPercent),
        effectiveDate,
        selectedVariantIds: Array.from(selectedVariantIds),
        notes
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['product', id])
      const variantsUpdated = data?.data?.variantsUpdated || 0
      toast.success(`Discount applied successfully to ${variantsUpdated} variant${variantsUpdated !== 1 ? 's' : ''}`)
      navigate(`/products/${id}`)
    },
    onError: (error) => {
      toast.error('Failed to apply discount')
      console.error('Error applying discount:', error)
    }
  })

  const handleApplyDiscount = () => {
    if (!newDiscountPercent || parseFloat(newDiscountPercent) < 0 || parseFloat(newDiscountPercent) > 100) {
      toast.error('Please enter a valid discount percentage (0-100)')
      return
    }

    if (selectedVariants.size === 0) {
      toast.error('Please select at least one variant')
      return
    }

    if (!newEffectiveDate) {
      toast.error('Please select an effective date')
      return
    }

    updateDiscountMutation.mutate({
      discountPercent: newDiscountPercent,
      effectiveDate: newEffectiveDate,
      selectedVariantIds: Array.from(selectedVariants),
      notes
    })
  }

  const calculateNetPrice = (listPrice, discountPercent) => {
    if (!listPrice || !discountPercent) return null
    return listPrice * (1 - parseFloat(discountPercent) / 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Product not found</p>
          <Link to="/products" className="mt-4 text-blue-600 hover:text-blue-800">
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const currentDiscount = product.productDiscount
  const allSelected = selectedVariants.size === product.variants?.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/products/${id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Product
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Discount Management Wizard</h1>
          <p className="mt-2 text-gray-600">{product.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Discount & New Discount Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current Discount */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                Current Discount
              </h2>
              {currentDiscount?.discountPercent !== undefined && currentDiscount?.discountPercent !== null ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Discount Percentage</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {currentDiscount.discountPercent.toFixed(2)}%
                    </p>
                  </div>
                  {currentDiscount.effectiveDate && (
                    <div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Effective Date
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(currentDiscount.effectiveDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {currentDiscount.notes && (
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-sm text-gray-900">{currentDiscount.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No discount currently set</p>
              )}
            </div>

            {/* New Discount Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Set New Discount</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="discountPercent" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    id="discountPercent"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newDiscountPercent}
                    onChange={(e) => setNewDiscountPercent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    id="effectiveDate"
                    value={newEffectiveDate}
                    onChange={(e) => setNewEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add notes about this discount change..."
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleApplyDiscount}
                    disabled={updateDiscountMutation.isLoading || selectedVariants.size === 0}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {updateDiscountMutation.isLoading ? 'Applying...' : `Apply to ${selectedVariants.size} Selected Variant${selectedVariants.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Variant Selection Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <TableCellsIcon className="h-5 w-5 mr-2" />
                  Select Variants ({selectedVariants.size} of {product.variants?.length || 0})
                </h2>
                <button
                  onClick={toggleAllVariants}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAllVariants}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
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
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Discount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">New Discount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Net Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">New Net Price</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {product.variants?.map((variant, idx) => {
                      const variantProps = variant.properties instanceof Map
                        ? Object.fromEntries(variant.properties)
                        : variant.properties || {}
                      const variantId = variant._id.toString()
                      const isSelected = selectedVariants.has(variantId)
                      const listPrice = variant.pricing?.listPrice || variant.pricing?.lastPrice
                      const currentDiscount = variant.pricing?.discountPercent || product.productDiscount?.discountPercent || 0
                      const currentNetPrice = variant.pricing?.netPrice
                      // New discount only applies to selected variants
                      const newDiscount = isSelected && newDiscountPercent ? parseFloat(newDiscountPercent) : null
                      // New net price: if selected, calculate with new discount; if deselected, keep current net price
                      const newNetPrice = isSelected && newDiscountPercent && listPrice
                        ? calculateNetPrice(listPrice, newDiscountPercent)
                        : currentNetPrice

                      return (
                        <tr 
                          key={variant._id || idx} 
                          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleVariant(variantId)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
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
                              {listPrice ? `$${listPrice.toFixed(2)}` : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-900">
                              {currentDiscount ? `${currentDiscount.toFixed(2)}%` : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className={`text-sm font-medium ${newDiscount !== null ? 'text-blue-600' : 'text-gray-400'}`}>
                              {newDiscount !== null ? `${newDiscount.toFixed(2)}%` : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-900">
                              {currentNetPrice ? `$${currentNetPrice.toFixed(2)}` : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className={`text-sm font-medium ${
                              newNetPrice && currentNetPrice && newNetPrice !== currentNetPrice 
                                ? 'text-green-600' 
                                : 'text-gray-900'
                            }`}>
                              {newNetPrice ? `$${newNetPrice.toFixed(2)}` : '-'}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

