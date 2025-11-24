import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { productAPI, companyAPI, productTypeAPI } from '../services/api'
import toast from 'react-hot-toast'

const UNITS = ['EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ FT', 'GAL', 'LB', 'HR']

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    internalPartNumber: '',
    productTypeId: '',
    properties: {},
    suppliers: [],
    supplierId: '',
    supplierCatalogNumber: '',
    lastPrice: '',
    unitOfMeasure: 'EA',
    category: '',
    standardCost: '',
    notes: '',
    variants: [],
    isActive: true,
  })

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getProduct(id).then(res => res.data.data),
    enabled: isEdit,
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => companyAPI.getCompanies({ companyType: 'supplier' }).then(res => res.data.data),
  })

  const { data: productTypes } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => productTypeAPI.getProductTypes({ isActive: true }).then(res => res.data.data),
  })

  const { data: selectedProductType } = useQuery({
    queryKey: ['product-type', formData.productTypeId],
    queryFn: () => {
      // Ensure we're passing a string ID, not an object
      const typeId = typeof formData.productTypeId === 'object' 
        ? formData.productTypeId._id || formData.productTypeId.id || formData.productTypeId
        : formData.productTypeId;
      if (!typeId || typeof typeId !== 'string') {
        throw new Error('Invalid product type ID');
      }
      return productTypeAPI.getProductType(typeId).then(res => res.data.data);
    },
    enabled: !!formData.productTypeId && typeof formData.productTypeId === 'string',
  })

  useEffect(() => {
    if (product) {
      // Convert properties Map to object if needed
      const properties = product.properties instanceof Map 
        ? Object.fromEntries(product.properties) 
        : product.properties || {}
      
      // Extract productTypeId - handle both populated object and string ID
      const productTypeId = product.productTypeId 
        ? (typeof product.productTypeId === 'object' 
            ? product.productTypeId._id || product.productTypeId.id 
            : product.productTypeId)
        : '';

      setFormData({
        name: product.name || '',
        description: product.description || '',
        internalPartNumber: product.internalPartNumber || '',
        productTypeId: productTypeId,
        properties: properties,
        suppliers: product.suppliers || [],
        supplierId: product.supplierId?._id || product.supplierId || '',
        supplierCatalogNumber: product.supplierCatalogNumber || '',
        lastPrice: product.lastPrice || '',
        unitOfMeasure: product.unitOfMeasure || 'EA',
        category: product.category || '',
        standardCost: product.standardCost || '',
        notes: product.notes || '',
        variants: product.variants || [],
        isActive: product.isActive !== undefined ? product.isActive : true,
      })
    }
  }, [product])

  const mutation = useMutation({
    mutationFn: (data) => {
      const submitData = {
        ...data,
        lastPrice: data.lastPrice ? parseFloat(data.lastPrice) : 0,
        standardCost: data.standardCost ? parseFloat(data.standardCost) : undefined,
        // Convert properties object to Map format for MongoDB
        properties: data.properties && Object.keys(data.properties).length > 0 
          ? new Map(Object.entries(data.properties))
          : undefined,
      }
      return isEdit
        ? productAPI.updateProduct(id, submitData)
        : productAPI.createProduct(submitData)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
      queryClient.invalidateQueries(['products'])
      navigate('/products')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} product`)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePropertyChange = (propertyKey, value) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [propertyKey]: value
      }
    }))
  }

  const handleAddVariant = () => {
    if (!selectedProductType?.variantSettings?.enabled) {
      toast.error('This product type does not support variants')
      return
    }

    const variantProperties = {}
    selectedProductType.variantSettings.variantProperties.forEach(key => {
      variantProperties[key] = ''
    })

    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          name: '',
          sku: '',
          properties: variantProperties,
          pricing: {
            standardCost: '',
            lastPrice: ''
          },
          suppliers: [],
          isActive: true
        }
      ]
    }))
  }

  const handleUpdateVariant = (variantIndex, field, value) => {
    setFormData(prev => {
      const newVariants = [...prev.variants]
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        newVariants[variantIndex] = {
          ...newVariants[variantIndex],
          [parent]: {
            ...newVariants[variantIndex][parent],
            [child]: value
          }
        }
      } else {
        newVariants[variantIndex] = {
          ...newVariants[variantIndex],
          [field]: value
        }
      }
      return {
        ...prev,
        variants: newVariants
      }
    })
  }

  const handleVariantPropertyChange = (variantIndex, propertyKey, value) => {
    setFormData(prev => {
      const newVariants = [...prev.variants]
      newVariants[variantIndex] = {
        ...newVariants[variantIndex],
        properties: {
          ...newVariants[variantIndex].properties,
          [propertyKey]: value
        }
      }
      return {
        ...prev,
        variants: newVariants
      }
    })
  }

  const handleRemoveVariant = (variantIndex) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== variantIndex)
    }))
  }

  const renderPropertyField = (property) => {
    const value = formData.properties[property.key] || property.defaultValue || ''

    switch (property.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
            placeholder={property.display?.placeholder}
            required={property.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handlePropertyChange(property.key, parseFloat(e.target.value) || 0)}
            min={property.validation?.min}
            max={property.validation?.max}
            required={property.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handlePropertyChange(property.key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">{property.label}</span>
          </label>
        )
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
            required={property.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )
      case 'enum':
        return (
          <select
            value={value}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
            required={property.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select {property.label}</option>
            {property.options?.map((option, idx) => (
              <option key={idx} value={option.value}>{option.label}</option>
            ))}
          </select>
        )
      case 'multiselect':
        return (
          <div className="mt-1 space-y-2">
            {property.options?.map((option, idx) => (
              <label key={idx} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : []
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value)
                    handlePropertyChange(property.key, newValues)
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Product Information</h2>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Product Type
                </label>
                <Link
                  to="/product-types/create"
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={(e) => {
                    e.preventDefault();
                    const newWindow = window.open('/product-types/create', '_blank');
                    if (newWindow) newWindow.focus();
                  }}
                >
                  Create New Type
                </Link>
              </div>
              <select
                name="productTypeId"
                value={formData.productTypeId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">None (Simple Product)</option>
                {productTypes?.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name}
                    {type.variantSettings?.enabled && ' (Variants)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select a product type to enable custom properties and variants. 
                <Link to="/product-types" className="ml-1 text-blue-600 hover:text-blue-800">
                  Manage types
                </Link>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Internal Part Number
              </label>
              <input
                type="text"
                name="internalPartNumber"
                value={formData.internalPartNumber}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
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
                Supplier Catalog Number (SKU)
              </label>
              <input
                type="text"
                name="supplierCatalogNumber"
                value={formData.supplierCatalogNumber}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unit of Measure *
              </label>
              <select
                name="unitOfMeasure"
                value={formData.unitOfMeasure}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                List Price (Legacy - use variant pricing instead)
              </label>
              <input
                type="number"
                name="lastPrice"
                value={formData.lastPrice}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Use variant pricing for list/net prices"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Standard Cost (Budget)
              </label>
              <input
                type="number"
                name="standardCost"
                value={formData.standardCost}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
            </div>
          </div>

          {/* Dynamic Properties Section */}
          {selectedProductType && selectedProductType.properties && selectedProductType.properties.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Custom Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedProductType.properties
                  .filter(prop => !prop.display?.hidden)
                  .sort((a, b) => (a.display?.order || 0) - (b.display?.order || 0))
                  .map((property) => (
                    <div key={property.key} className={property.display?.group ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700">
                        {property.label}
                        {property.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {property.display?.helpText && (
                        <p className="text-xs text-gray-500 mt-1">{property.display.helpText}</p>
                      )}
                      {renderPropertyField(property)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Variants Section */}
          {selectedProductType?.variantSettings?.enabled && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Variants</h2>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Variant
                </button>
              </div>

              {formData.variants.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500">No variants defined</p>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add First Variant
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.variants.map((variant, variantIndex) => (
                    <div key={variantIndex} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Variant Name
                          </label>
                          <input
                            type="text"
                            value={variant.name || ''}
                            onChange={(e) => handleUpdateVariant(variantIndex, 'name', e.target.value)}
                            placeholder="Auto-generated if empty"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            SKU
                          </label>
                          <input
                            type="text"
                            value={variant.sku || ''}
                            onChange={(e) => handleUpdateVariant(variantIndex, 'sku', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Variant Properties */}
                      {selectedProductType.variantSettings.variantProperties.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Variant Properties
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedProductType.variantSettings.variantProperties.map((propKey) => {
                              const property = selectedProductType.properties.find(p => p.key === propKey)
                              if (!property) return null

                              const value = variant.properties?.[propKey] || ''

                              return (
                                <div key={propKey}>
                                  <label className="block text-sm font-medium text-gray-700">
                                    {property.label}
                                    {property.required && <span className="text-red-500 ml-1">*</span>}
                                  </label>
                                  {property.type === 'enum' ? (
                                    <select
                                      value={value}
                                      onChange={(e) => handleVariantPropertyChange(variantIndex, propKey, e.target.value)}
                                      required={property.required}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                      <option value="">Select {property.label}</option>
                                      {property.options?.map((option, idx) => (
                                        <option key={idx} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={property.type === 'number' ? 'number' : 'text'}
                                      value={value}
                                      onChange={(e) => handleVariantPropertyChange(
                                        variantIndex,
                                        propKey,
                                        property.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                      )}
                                      required={property.required}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Variant Pricing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Standard Cost
                          </label>
                          <input
                            type="number"
                            value={variant.pricing?.standardCost || ''}
                            onChange={(e) => handleUpdateVariant(variantIndex, 'pricing.standardCost', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            List Price
                          </label>
                          <input
                            type="number"
                            value={variant.pricing?.listPrice || variant.pricing?.lastPrice || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              handleUpdateVariant(variantIndex, 'pricing.listPrice', value);
                              // Also update lastPrice for backward compatibility
                              handleUpdateVariant(variantIndex, 'pricing.lastPrice', value);
                            }}
                            step="0.01"
                            min="0"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Net Price
                          </label>
                          <input
                            type="number"
                            value={variant.pricing?.netPrice || ''}
                            onChange={(e) => handleUpdateVariant(variantIndex, 'pricing.netPrice', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Discount %
                          </label>
                          <input
                            type="number"
                            value={variant.pricing?.discountPercent || ''}
                            onChange={(e) => {
                              const discountPercent = parseFloat(e.target.value) || 0;
                              handleUpdateVariant(variantIndex, 'pricing.discountPercent', discountPercent);
                              // Auto-calculate net price if list price exists
                              if (variant.pricing?.listPrice && discountPercent > 0) {
                                const netPrice = variant.pricing.listPrice * (1 - discountPercent / 100);
                                handleUpdateVariant(variantIndex, 'pricing.netPrice', netPrice);
                              }
                            }}
                            step="0.01"
                            min="0"
                            max="100"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(variantIndex)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-5 w-5 inline mr-1" />
                          Remove Variant
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <Link
              to="/products"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isLoading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

