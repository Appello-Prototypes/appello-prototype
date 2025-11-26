import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { materialRequestAPI, jobAPI, productAPI } from '../services/api'
import ProductSelectionModal from '../components/ProductSelectionModal'
import toast from 'react-hot-toast'

const UNITS = ['EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ_FT', 'GAL', 'LB', 'KG', 'OTHER']
const PRIORITIES = ['urgent', 'standard', 'low']
const DELIVERY_LOCATIONS = ['jobsite', 'warehouse', 'pick_up']

export default function MaterialRequestForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    jobId: '',
    requiredByDate: '',
    priority: 'standard',
    deliveryLocation: 'jobsite',
    deliveryAddress: '',
    deliveryNotes: '',
    lineItems: [],
  })

  // Modal state for enhanced product selection
  const [productSelectionModal, setProductSelectionModal] = useState({
    isOpen: false,
    lineItemIndex: null
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getJobs().then(res => res.data.data),
  })

  const selectedJob = useMemo(() => {
    return jobs?.find(j => j._id === formData.jobId)
  }, [jobs, formData.jobId])

  // Fetch approved products for selected job
  const { data: approvedProducts } = useQuery({
    queryKey: ['job-approved-products', formData.jobId],
    queryFn: () => {
      if (!formData.jobId || !selectedJob?.approvedProducts) return []
      return Promise.all(
        selectedJob.approvedProducts.map(productId => 
          productAPI.getProduct(productId).then(res => res.data.data).catch(() => null)
        )
      ).then(products => products.filter(Boolean))
    },
    enabled: !!formData.jobId && !!selectedJob?.approvedProducts?.length
  })

  const mutation = useMutation({
    mutationFn: (data) => materialRequestAPI.createMaterialRequest(data),
    onSuccess: () => {
      toast.success('Material request created successfully')
      queryClient.invalidateQueries(['material-requests'])
      navigate('/material-requests')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create material request')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.lineItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }

    // Validate spec enforcement if enabled
    if (selectedJob?.specEnforcementEnabled && approvedProducts) {
      const approvedProductIds = approvedProducts.map(p => p._id.toString())
      const invalidItems = formData.lineItems.filter(item => {
        if (!item.productId) return false // Allow free text items
        return !approvedProductIds.includes(item.productId.toString())
      })

      if (invalidItems.length > 0) {
        // Check if user has override permission
        const userRole = 'user' // TODO: Get from auth context
        const canOverride = 
          selectedJob.specOverridePermission === 'all' ||
          (selectedJob.specOverridePermission === 'manager' && userRole === 'manager') ||
          (selectedJob.specOverridePermission === 'estimator' && userRole === 'estimator')

        if (!canOverride) {
          toast.error(`Some products are not approved for this job. Please select approved products only.`)
          return
        } else {
          // Warn but allow
          toast('⚠️ Some products are not in the approved list, but override is allowed', { icon: '⚠️' })
        }
      }
    }

    mutation.mutate(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, {
        productId: null,
        variantId: null,
        productName: '',
        variantName: '',
        description: '',
        quantity: '',
        unit: 'EA',
        notes: '',
        productDetails: null, // Full product object
      }]
    }))
  }

  const updateLineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleProductSelect = async (index, product) => {
    if (!product) {
      // Clear product selection
      updateLineItem(index, 'productId', null)
      updateLineItem(index, 'variantId', null)
      updateLineItem(index, 'productName', '')
      updateLineItem(index, 'variantName', '')
      updateLineItem(index, 'description', '')
      updateLineItem(index, 'productDetails', null)
      return
    }

    try {
      // Fetch full product details
      // Use productId from search results (same as PurchaseOrderForm)
      const productId = product.productId || product._id
      if (!productId) {
        toast.error('Invalid product data')
        return
      }
      
      const fullProduct = await productAPI.getProduct(productId).then(res => res.data.data)
      
      const variant = product.variantId ? fullProduct.variants?.find(v => {
        if (!v._id) return false
        const vId = v._id.toString ? v._id.toString() : String(v._id)
        const searchVariantId = product.variantId.toString ? product.variantId.toString() : String(product.variantId)
        return vId === searchVariantId
      }) : null
      const productName = variant 
        ? `${fullProduct.name} - ${variant.name || 'Variant'}`
        : fullProduct.name
      const description = variant?.properties 
        ? Object.entries(variant.properties).map(([k, v]) => `${k}: ${v}`).join(', ')
        : fullProduct.description || ''
      
      // Set unit from product's unitOfMeasure if available
      const unit = fullProduct.unitOfMeasure || 'EA'
      
      updateLineItem(index, 'productId', fullProduct._id)
      updateLineItem(index, 'variantId', variant?._id || null)
      updateLineItem(index, 'productName', productName)
      updateLineItem(index, 'variantName', variant?.name || '')
      updateLineItem(index, 'description', description)
      updateLineItem(index, 'unit', unit)
      updateLineItem(index, 'productDetails', fullProduct)
    } catch (error) {
      console.error('Error fetching product details:', error)
      toast.error('Failed to load product details')
    }
  }

  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }))
  }

  // Auto-populate delivery address when job is selected
  React.useEffect(() => {
    if (formData.jobId && jobs) {
      const selectedJob = jobs.find(j => j._id === formData.jobId)
      if (selectedJob && selectedJob.address) {
        const address = selectedJob.address
        const addressStr = [
          address.street,
          address.city,
          address.province,
          address.postalCode
        ].filter(Boolean).join(', ')
        if (addressStr) {
          setFormData(prev => ({ ...prev, deliveryAddress: addressStr }))
        }
      }
    }
  }, [formData.jobId, jobs])

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/material-requests"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Material Requests
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">New Material Request</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Request Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job *
              </label>
              <select
                name="jobId"
                value={formData.jobId}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a job</option>
                {jobs?.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobNumber || job.name} - {job.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Required By Date *
              </label>
              <input
                type="date"
                name="requiredByDate"
                value={formData.requiredByDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Priority *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Location *
              </label>
              <select
                name="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {DELIVERY_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location.charAt(0).toUpperCase() + location.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Address
              </label>
              <input
                type="text"
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Notes
              </label>
              <textarea
                name="deliveryNotes"
                value={formData.deliveryNotes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Line Items */}
            <div className="md:col-span-2 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
                <div className="flex items-center gap-2">
                  {formData.jobId && (
                    <button
                      type="button"
                      onClick={() => setProductSelectionModal({ isOpen: true, lineItemIndex: null, keepOpen: true })}
                      className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <MagnifyingGlassIcon className="h-5 w-5 mr-1.5" />
                      Browse Products
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PlusIcon className="h-5 w-5 mr-1" />
                    Add Item
                  </button>
                </div>
              </div>

              {formData.lineItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No line items added yet</p>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="mt-2 text-blue-600 hover:text-blue-700"
                  >
                    Add your first item
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.lineItems.map((item, index) => {
                    const suppliers = item.productDetails?.suppliers || []
                    const variantSuppliers = item.productDetails?.variants?.find(v => 
                      v._id?.toString() === item.variantId?.toString()
                    )?.suppliers || []
                    const displaySuppliers = variantSuppliers.length > 0 ? variantSuppliers : suppliers
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="space-y-4">
                          {/* Product Row */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product *
                              </label>
                              {item.productName ? (
                                <div className="mt-1">
                                  <div className="flex items-center justify-between bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {item.productName}
                                      </div>
                                      {item.variantName && (
                                        <div className="text-xs text-gray-500 truncate">
                                          Variant: {item.variantName}
                                        </div>
                                      )}
                                      {item.description && (
                                        <div className="text-xs text-gray-500 truncate mt-0.5">
                                          {item.description}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleProductSelect(index, null)}
                                      className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                                      title="Clear product"
                                    >
                                      <span className="text-lg leading-none">×</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1">
                                  {formData.jobId ? (
                                    <button
                                      type="button"
                                      onClick={() => setProductSelectionModal({ isOpen: true, lineItemIndex: index, keepOpen: true })}
                                      className="inline-flex items-center px-3 py-2 w-full text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                      <MagnifyingGlassIcon className="h-4 w-4 mr-1.5" />
                                      Select Product
                                    </button>
                                  ) : (
                                    <span className="text-sm text-gray-400">Select job first</span>
                                  )}
                                </div>
                              )}
                              {selectedJob?.specEnforcementEnabled && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Only approved products for this job are shown
                                </p>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                required
                                min="0"
                                step="0.01"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit *
                              </label>
                              {item.productDetails?.unitOfMeasure ? (
                                <div className="mt-1 text-sm text-gray-600 font-medium bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                                  {item.productDetails.unitOfMeasure}
                                </div>
                              ) : (
                                <select
                                  value={item.unit}
                                  onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                                  required
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                  {UNITS.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                                placeholder="Additional notes"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                className="w-full px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                                title="Remove item"
                              >
                                <TrashIcon className="h-5 w-5 mx-auto" />
                              </button>
                            </div>
                          </div>

                          {/* Suppliers Section */}
                          {item.productDetails && displaySuppliers.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Available Suppliers
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {displaySuppliers.map((supplierInfo, supplierIndex) => {
                                  const supplier = supplierInfo.supplierId || supplierInfo.supplier
                                  const supplierName = supplier?.name || 'Unknown Supplier'
                                  const partNumber = supplierInfo.supplierPartNumber || '-'
                                  const price = supplierInfo.netPrice || supplierInfo.listPrice || supplierInfo.lastPrice || 0
                                  const isPreferred = supplierInfo.isPreferred || false
                                  
                                  return (
                                    <div
                                      key={supplierIndex}
                                      className={`p-2 rounded-md border ${
                                        isPreferred
                                          ? 'bg-blue-50 border-blue-200'
                                          : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                              {supplierName}
                                            </span>
                                            {isPreferred && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                Preferred
                                              </span>
                                            )}
                                          </div>
                                          {partNumber !== '-' && (
                                            <div className="text-xs text-gray-600 mt-0.5">
                                              Part #: {partNumber}
                                            </div>
                                          )}
                                          {price > 0 && (
                                            <div className="text-xs text-gray-700 mt-0.5 font-medium">
                                              ${price.toFixed(2)} / {item.productDetails?.unitOfMeasure || item.unit}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Link
              to="/material-requests"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={mutation.isLoading || formData.lineItems.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        {/* Enhanced Product Selection Modal */}
        <ProductSelectionModal
          isOpen={productSelectionModal.isOpen}
          onClose={() => setProductSelectionModal({ isOpen: false, lineItemIndex: null })}
          onSelectProduct={(product) => {
            if (productSelectionModal.lineItemIndex !== null) {
              // Update existing line item
              handleProductSelect(productSelectionModal.lineItemIndex, product);
            } else {
              // Add new line item with selected product
              const newIndex = formData.lineItems.length;
              addLineItem();
              // Use setTimeout to ensure the new line item is added before selecting product
              setTimeout(() => {
                handleProductSelect(newIndex, product);
              }, 0);
            }
          }}
          supplierId={null} // Material requests don't have suppliers
          jobId={formData.jobId}
          keepOpen={true}
        />
      </div>
    </div>
  )
}

