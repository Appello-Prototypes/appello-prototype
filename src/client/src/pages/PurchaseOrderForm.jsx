import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PlusIcon, TrashIcon, CurrencyDollarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { purchaseOrderAPI, companyAPI, jobAPI, productAPI, productTypeAPI, userAPI } from '../services/api'
import ProductSearch from '../components/ProductSearch'
import ProductSelectionModal from '../components/ProductSelectionModal'
import { getProductPricing } from '../utils/productPricing'
import toast from 'react-hot-toast'

// Units are now derived from product.unitOfMeasure and not user-selectable

export default function PurchaseOrderForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    supplierId: '',
    jobId: '',
    costCode: '',
    requiredByDate: '',
    shipToAddress: '',
    deliveryInstructions: '',
    internalNotes: '',
    supplierNotes: '',
    lineItems: [],
    taxAmount: 0,
    freightAmount: 0,
  })

  // Modal state for enhanced product selection
  const [productSelectionModal, setProductSelectionModal] = useState({
    isOpen: false,
    lineItemIndex: null
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => companyAPI.getCompanies({ companyType: 'supplier' }).then(res => res.data.data),
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getJobs().then(res => res.data.data),
  })

  // Get current user for buyerId
  const { data: currentUser, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const res = await userAPI.getCurrentUser()
        // API returns { success: true, user: {...} }
        return res.data?.user || res.data?.data || res.data
      } catch (error) {
        console.warn('Could not fetch current user:', error)
        // Return null instead of throwing - we'll handle it in validation
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })


  const mutation = useMutation({
    mutationFn: (data) => purchaseOrderAPI.createPurchaseOrder(data),
    onSuccess: () => {
      toast.success('Purchase order created successfully')
      queryClient.invalidateQueries(['purchase-orders'])
      navigate('/purchase-orders')
    },
    onError: (error) => {
      console.error('PO Creation Error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create purchase order'
      const validationErrors = error.response?.data?.validationErrors
      
      if (validationErrors) {
        const errorDetails = Object.entries(validationErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ')
        toast.error(`${errorMessage}: ${errorDetails}`, { duration: 5000 })
      } else {
        toast.error(errorMessage)
      }
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.lineItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }
    
    // Validate all line items have products
    const invalidItems = formData.lineItems.filter(item => !item.productId || !item.productName)
    if (invalidItems.length > 0) {
      toast.error('Please select a product for all line items')
      return
    }
    
    // Ensure productName is set for all items (fallback to description if needed)
    // Include configured properties in description or as separate field
    const validatedLineItems = formData.lineItems.map(item => {
      // Build description with configured properties if available
      let description = item.description || item.productName || 'Unknown Product'
      
      if (item.configuredProperties && Object.keys(item.configuredProperties).length > 0) {
        const propertyStrings = Object.entries(item.configuredProperties)
          .filter(([key, value]) => value !== null && value !== '' && value !== false)
          .map(([key, value]) => {
            const propDef = item.productType?.properties?.find(p => p.key === key)
            const label = propDef?.label || key
            const displayValue = Array.isArray(value) ? value.join(', ') : value
            return `${label}: ${displayValue}`
          })
        
        if (propertyStrings.length > 0) {
          description = `${description} (${propertyStrings.join('; ')})`
        }
      }
      
      // Map unit to valid enum value
      // Valid enum values: 'EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ_FT', 'GAL', 'LB', 'KG', 'OTHER'
      let unit = item.unit || item.productDetails?.unitOfMeasure || 'EA'
      // Normalize common unit values to enum
      const unitMap = {
        'IN': 'FT', // Inches -> Feet (closest match)
        'INCH': 'FT',
        'INCHES': 'FT',
        'LF': 'FT', // Lineal Feet -> Feet
        'LINEAL_FT': 'FT',
        'SQFT': 'SQ_FT',
        'SQ_FT': 'SQ_FT',
        'SQFT': 'SQ_FT',
        'SQM': 'SQ_FT', // Square meters -> Square feet (closest match)
        'MM': 'M', // Millimeters -> Meters
        'CM': 'M', // Centimeters -> Meters
        'LBS': 'LB',
        'POUNDS': 'LB',
        'KGS': 'KG',
        'KILOGRAMS': 'KG',
        'GALS': 'GAL',
        'GALLONS': 'GAL',
      }
      // Convert to uppercase and check map
      const normalizedUnit = (unit || '').toString().toUpperCase().trim()
      unit = normalizedUnit && unitMap[normalizedUnit] 
        ? unitMap[normalizedUnit] 
        : (normalizedUnit && ['EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ_FT', 'GAL', 'LB', 'KG', 'OTHER'].includes(normalizedUnit) 
          ? normalizedUnit 
          : 'EA') // Default to 'EA' if unit is invalid or missing
      
      // Ensure numeric values are properly rounded
      const quantity = Math.max(0, parseFloat(item.quantity) || 0)
      const unitPrice = Math.max(0, Math.round((parseFloat(item.unitPrice) || 0) * 100) / 100) // Round to 2 decimals
      const extendedCost = Math.max(0, Math.round((parseFloat(item.extendedCost) || (quantity * unitPrice)) * 100) / 100)
      
      return {
        ...item,
        productName: item.productName || description,
        description: description,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        extendedCost: extendedCost,
        // Remove internal fields that shouldn't be sent to API
        productDetails: undefined,
        productType: undefined,
        configuredProperties: undefined,
      }
    })
    
    // Prepare final data for submission
    const submitData = {
      ...formData,
      lineItems: validatedLineItems,
      taxAmount: parseFloat(formData.taxAmount) || 0,
      freightAmount: parseFloat(formData.freightAmount) || 0,
      buyerId: currentUser?._id || currentUser?.id, // Add buyerId from current user
    }
    
    // Validate buyerId is present
    if (!submitData.buyerId) {
      // Try to get user ID from various possible locations
      const userId = currentUser?._id || currentUser?.id || currentUser?.userId
      
      if (!userId) {
        // Check if user query is still loading
        if (currentUser === undefined) {
          toast.error('Loading user information... Please wait and try again.', { duration: 3000 })
          return
        }
        
        // User query completed but no user found
        toast.error('Unable to determine current user. Please ensure you are logged in and try again.', { duration: 5000 })
        console.error('Current user data:', currentUser)
        console.error('User fetch error:', userError)
        console.error('Auth token in localStorage:', localStorage.getItem('authToken') ? 'Present' : 'Missing')
        return
      }
      
      submitData.buyerId = userId
    }
    
    console.log('✅ Buyer ID:', submitData.buyerId)
    
    console.log('📤 Submitting PO:', {
      supplierId: submitData.supplierId,
      jobId: submitData.jobId,
      lineItemsCount: submitData.lineItems.length,
      lineItems: submitData.lineItems.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        extendedCost: item.extendedCost
      }))
    })
    
    mutation.mutate(submitData)
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
        sku: '',
        description: '',
        quantity: '',
        unit: '', // Will be set from product.unitOfMeasure
        unitPrice: '',
        costCode: prev.costCode || '',
        extendedCost: 0,
        productDetails: null, // Full product object
        productType: null, // ProductType object
        configuredProperties: {}, // Product properties (for reference only)
      }]
    }))
  }

  const handleProductSelect = async (index, product) => {
    if (!product) {
      // Clear product selection
      updateLineItem(index, 'productId', null)
      updateLineItem(index, 'variantId', null)
      updateLineItem(index, 'productName', '')
      updateLineItem(index, 'variantName', '')
      updateLineItem(index, 'sku', '')
      updateLineItem(index, 'description', '')
      updateLineItem(index, 'unitPrice', '')
      updateLineItem(index, 'productDetails', null)
      updateLineItem(index, 'productType', null)
      updateLineItem(index, 'configuredProperties', {})
      return
    }

    try {
      // Fetch full product details including productType
      const productResponse = await productAPI.getProduct(product.productId)
      const fullProduct = productResponse.data.data
      
      // Fetch productType if available
      // Handle both populated object and ID string
      let productType = null
      if (fullProduct.productTypeId) {
        // If productTypeId is already populated (object), use it directly
        if (typeof fullProduct.productTypeId === 'object' && fullProduct.productTypeId._id) {
          productType = fullProduct.productTypeId
        } else {
          // Otherwise, fetch it using the ID
          let productTypeId = null
          if (typeof fullProduct.productTypeId === 'string') {
            productTypeId = fullProduct.productTypeId
          } else if (fullProduct.productTypeId?._id) {
            productTypeId = fullProduct.productTypeId._id.toString()
          } else if (fullProduct.productTypeId?.toString) {
            productTypeId = fullProduct.productTypeId.toString()
          }
          
          if (productTypeId) {
            try {
              const typeResponse = await productTypeAPI.getProductType(productTypeId)
              productType = typeResponse.data.data
            } catch (error) {
              console.warn('Could not fetch product type:', error)
            }
          }
        }
      }

      // When a variant is selected from search, prioritize the search result price
      // The search API already calculated the correct variant pricing for the supplier
      let initialPrice = product.unitPrice || 0
      let selectedVariant = null
      
      // If variant was selected, find it in the full product to get complete variant data
      if (product.variantId && fullProduct?.variants) {
        // Try multiple ways to match variant ID (handles both string and ObjectId)
        selectedVariant = fullProduct.variants.find(v => {
          if (!v._id) return false
          const vId = v._id.toString ? v._id.toString() : String(v._id)
          const searchVariantId = product.variantId.toString ? product.variantId.toString() : String(product.variantId)
          return vId === searchVariantId
        })
        
        // If search result has a price, use it (it's already calculated correctly)
        // Only recalculate if search price is 0 or missing
        if (initialPrice === 0 && selectedVariant) {
          const variantPricing = getProductPricing(fullProduct, selectedVariant, formData.supplierId)
          initialPrice = variantPricing.netPrice > 0 ? variantPricing.netPrice : (variantPricing.listPrice > 0 ? variantPricing.listPrice : 0)
        }
      }
      
      // If still no price and no variant, try product-level pricing
      if (initialPrice === 0 && !selectedVariant && fullProduct) {
        const productPricing = getProductPricing(fullProduct, null, formData.supplierId)
        initialPrice = productPricing.netPrice > 0 ? productPricing.netPrice : (productPricing.listPrice > 0 ? productPricing.listPrice : 0)
      }
      
      // Final fallback: use search result price even if 0 (user can enter manually)
      if (initialPrice === 0) {
        initialPrice = product.unitPrice || 0
      }
      
      // Debug logging
      console.log('🔍 Product Selection Debug:', {
        productId: product.productId,
        variantId: product.variantId,
        searchResultPrice: product.unitPrice,
        selectedVariant: selectedVariant ? { id: selectedVariant._id, name: selectedVariant.name, pricing: selectedVariant.pricing } : null,
        initialPrice,
        hasFullProduct: !!fullProduct,
        hasVariants: fullProduct?.variants?.length > 0,
        supplierId: formData.supplierId
      })

      // Auto-populate fields from selected product/variant
      // If variant was selected, use variant properties as initial configured properties
      let initialProperties = {}
      if (selectedVariant && selectedVariant.properties) {
        // Use variant properties as the starting point for configuration
        initialProperties = selectedVariant.properties instanceof Map
          ? Object.fromEntries(selectedVariant.properties)
          : selectedVariant.properties
      } else if (fullProduct?.properties) {
        // Fall back to product properties
        initialProperties = fullProduct.properties instanceof Map
          ? Object.fromEntries(fullProduct.properties)
          : fullProduct.properties
      }
      
      const updates = {
        productId: product.productId,
        variantId: product.variantId || null,
        productName: product.name,
        variantName: product.variantName || selectedVariant?.name || '',
        sku: product.sku || selectedVariant?.sku || '',
        description: product.description || product.name,
        unit: product.unitOfMeasure || 'EA',
        unitPrice: initialPrice ? Number(initialPrice).toFixed(2) : '',
        quantity: product.quantity || item.quantity || '', // Use quantity from product if provided
        productDetails: fullProduct,
        productType: productType,
        configuredProperties: initialProperties,
      }
      
      // Calculate extended cost if quantity is provided
      if (updates.quantity && initialPrice) {
        const price = parseFloat(initialPrice) || 0
        const qty = parseFloat(updates.quantity) || 0
        updates.extendedCost = Math.round((qty * price) * 100) / 100
      }

      // Update all fields at once
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.map((item, i) => {
          if (i === index) {
            const updated = { ...item, ...updates }
            // Ensure unitPrice is properly formatted to 2 decimals
            if (updated.unitPrice) {
              const price = parseFloat(updated.unitPrice) || 0
              updated.unitPrice = price.toFixed(2)
            }
            // Recalculate extended cost
            const qty = parseFloat(updated.quantity || item.quantity) || 0
            const price = parseFloat(updated.unitPrice) || 0
            updated.extendedCost = Math.round((qty * price) * 100) / 100
            return updated
          }
          return item
        })
      }))
    } catch (error) {
      console.error('Error fetching product details:', error)
      toast.error('Failed to load product details')
      // Still update basic fields even if full details fail
      const updates = {
        productId: product.productId,
        variantId: product.variantId || null,
        productName: product.name,
        variantName: product.variantName || '',
        sku: product.sku || '',
        description: product.description || product.name,
        unit: product.unitOfMeasure || 'EA',
        unitPrice: product.unitPrice ? Number(product.unitPrice).toFixed(2) : '',
      }
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.map((item, i) => {
          if (i === index) {
            const updated = { ...item, ...updates }
            // Ensure unitPrice is properly formatted to 2 decimals
            if (updated.unitPrice) {
              const price = parseFloat(updated.unitPrice) || 0
              updated.unitPrice = price.toFixed(2)
            }
            const qty = parseFloat(updated.quantity || item.quantity) || 0
            const price = parseFloat(updated.unitPrice) || 0
            updated.extendedCost = Math.round((qty * price) * 100) / 100
            return updated
          }
          return item
        })
      }))
    }
  }


  const updateLineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value }
          // Auto-calculate extended cost
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(item.quantity) || 0
            let price = field === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(item.unitPrice) || 0
            // Round unitPrice to 2 decimal places
            if (field === 'unitPrice') {
              price = Math.round(price * 100) / 100
              updated.unitPrice = price.toFixed(2)
            }
            updated.extendedCost = Math.round((qty * price) * 100) / 100
          }
          return updated
        }
        return item
      })
    }))
  }

  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }))
  }

  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.extendedCost) || 0)
    }, 0)
    const tax = parseFloat(formData.taxAmount) || 0
    const freight = parseFloat(formData.freightAmount) || 0
    return {
      subtotal,
      tax,
      freight,
      total: subtotal + tax + freight
    }
  }

  const totals = calculateTotals()

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/purchase-orders"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Purchase Orders
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">PO Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Supplier *
              </label>
              <select
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a supplier</option>
                {suppliers?.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
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
                Default Cost Code
              </label>
              <input
                type="text"
                name="costCode"
                value={formData.costCode}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Ship To Address
              </label>
              <input
                type="text"
                name="shipToAddress"
                value={formData.shipToAddress}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Instructions
              </label>
              <textarea
                name="deliveryInstructions"
                value={formData.deliveryInstructions}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Internal Notes
              </label>
              <textarea
                name="internalNotes"
                value={formData.internalNotes}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Supplier Notes (printed on PO)
              </label>
              <textarea
                name="supplierNotes"
                value={formData.supplierNotes}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Line Items */}
            <div className="md:col-span-2 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
                <div className="flex items-center gap-2">
                  {formData.supplierId && (
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
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-gray-500 mb-2">No line items added yet</p>
                  {formData.supplierId ? (
                    <button
                      type="button"
                      onClick={() => setProductSelectionModal({ isOpen: true, lineItemIndex: null, keepOpen: true })}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                      Browse Products
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">Select a supplier to add products</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Product / Description
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                          Qty
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                          Extended
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                          Cost Code
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                          
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.lineItems.map((item, index) => {
                        const variant = item.variantId && item.productDetails?.variants?.find(v => v._id?.toString() === item.variantId?.toString())
                        const pricing = item.productDetails ? getProductPricing(item.productDetails, variant, formData.supplierId) : { listPrice: 0, netPrice: 0, discountPercent: 0 }
                        const listPrice = pricing.listPrice || 0
                        const netPrice = pricing.netPrice || parseFloat(item.unitPrice) || 0
                        const discountPercent = pricing.discountPercent || 0
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="space-y-1.5 min-w-[300px]">
                                {item.productName ? (
                                  <>
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900">
                                          {item.variantName ? `${item.productName} - ${item.variantName}` : item.productName}
                                        </div>
                                        {item.sku && (
                                          <div className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</div>
                                        )}
                                        {item.productDetails && listPrice > 0 && (
                                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-gray-400 line-through">
                                              ${Number(listPrice).toFixed(2)}
                                            </span>
                                            {discountPercent > 0 && (
                                              <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                                {discountPercent.toFixed(0)}% off
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFormData(prev => ({
                                            ...prev,
                                            lineItems: prev.lineItems.map((it, i) => 
                                              i === index ? { ...it, productId: null, productName: '', variantId: null, variantName: '', sku: '', description: '', unitPrice: '', unit: '', productDetails: null, productType: null, configuredProperties: {} } : it
                                            )
                                          }))
                                        }}
                                        className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
                                        title="Clear product"
                                      >
                                        <span className="text-lg leading-none">×</span>
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.description || ''}
                                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                      placeholder="Add description..."
                                      className="block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                  </>
                                ) : (
                                  <div className="flex gap-2">
                                    {formData.supplierId ? (
                                      <button
                                        type="button"
                                        onClick={() => setProductSelectionModal({ isOpen: true, lineItemIndex: index, keepOpen: true })}
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                      >
                                        <MagnifyingGlassIcon className="h-4 w-4 mr-1.5" />
                                        Select Product
                                      </button>
                                    ) : (
                                      <span className="text-sm text-gray-400">Select supplier first</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={item.quantity || ''}
                                onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                required
                                min="0"
                                step="0.01"
                                className="block w-full text-right text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block">
                                {item.unit || item.productDetails?.unitOfMeasure || 'EA'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-right">
                                {item.productDetails ? (
                                  <div className="space-y-0.5">
                                    <input
                                      type="number"
                                      value={item.unitPrice || ''}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                                          updateLineItem(index, 'unitPrice', value)
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const value = e.target.value
                                        if (value && !isNaN(value)) {
                                          const formatted = Number(value).toFixed(2)
                                          updateLineItem(index, 'unitPrice', formatted)
                                        }
                                      }}
                                      required
                                      min="0"
                                      step="0.01"
                                      max="999999999.99"
                                      className="block w-full text-right text-sm font-semibold text-blue-600 rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    {listPrice > 0 && discountPercent > 0 && (
                                      <div className="text-xs text-gray-400">
                                        List: ${Number(listPrice).toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    value={item.unitPrice || ''}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                                        updateLineItem(index, 'unitPrice', value)
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value
                                      if (value && !isNaN(value)) {
                                        const formatted = Number(value).toFixed(2)
                                        updateLineItem(index, 'unitPrice', formatted)
                                      }
                                    }}
                                    required
                                    min="0"
                                    step="0.01"
                                    max="999999999.99"
                                    placeholder="0.00"
                                    className="block w-full text-right text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-right text-sm font-semibold text-gray-900">
                                ${(Number(item.extendedCost) || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={item.costCode || ''}
                                onChange={(e) => updateLineItem(index, 'costCode', e.target.value.toUpperCase())}
                                placeholder="Code"
                                className="block w-full text-center text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 uppercase"
                              />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Remove line item"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="md:col-span-2 mt-6">
              <div className="flex justify-end">
                <div className="w-80 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                      <span className="text-sm font-semibold text-gray-900">${Number(totals.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Tax:</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">$</span>
                        <input
                          type="number"
                          name="taxAmount"
                          value={formData.taxAmount || ''}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          className="w-28 text-right text-sm rounded-md border-gray-300 shadow-sm bg-white focus:border-blue-500 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Freight:</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">$</span>
                        <input
                          type="number"
                          name="freightAmount"
                          value={formData.freightAmount || ''}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          className="w-28 text-right text-sm rounded-md border-gray-300 shadow-sm bg-white focus:border-blue-500 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="border-t border-gray-300 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-gray-900">${Number(totals.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Link
              to="/purchase-orders"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={mutation.isLoading || formData.lineItems.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isLoading ? 'Creating...' : 'Create PO'}
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
          supplierId={formData.supplierId}
          jobId={formData.jobId}
          keepOpen={true}
        />
      </div>
    </div>
  )
}

