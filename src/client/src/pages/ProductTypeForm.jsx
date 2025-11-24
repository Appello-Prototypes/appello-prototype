import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { productTypeAPI, propertyDefinitionAPI } from '../services/api'
import toast from 'react-hot-toast'

const PROPERTY_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'enum', label: 'Single Select' },
  { value: 'multiselect', label: 'Multiple Select' }
]

export default function ProductTypeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    properties: [],
    variantSettings: {
      enabled: false,
      variantProperties: [],
      namingTemplate: '{name} - {variant}'
    },
    isActive: true
  })

  // Track which properties are using custom keys (not from global definitions)
  const [customPropertyKeys, setCustomPropertyKeys] = useState(new Set())

  const { data: productType, isLoading } = useQuery({
    queryKey: ['product-type', id],
    queryFn: () => productTypeAPI.getProductType(id).then(res => res.data.data),
    enabled: isEdit,
  })

  // Fetch property definitions for dropdown
  const { data: propertyDefinitions } = useQuery({
    queryKey: ['property-definitions'],
    queryFn: () => propertyDefinitionAPI.getPropertyDefinitions({ isActive: true }).then(res => res.data.data)
  })

  useEffect(() => {
    if (productType) {
      setFormData({
        name: productType.name || '',
        description: productType.description || '',
        properties: productType.properties || [],
        variantSettings: productType.variantSettings || {
          enabled: false,
          variantProperties: [],
          namingTemplate: '{name} - {variant}'
        },
        isActive: productType.isActive !== undefined ? productType.isActive : true
      })
    }
  }, [productType])

  const mutation = useMutation({
    mutationFn: (data) => {
      return isEdit
        ? productTypeAPI.updateProductType(id, data)
        : productTypeAPI.createProductType(data)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product type updated successfully' : 'Product type created successfully')
      queryClient.invalidateQueries(['product-types'])
      navigate('/product-types')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} product type`)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.startsWith('variantSettings.')) {
      const field = name.replace('variantSettings.', '')
      setFormData(prev => ({
        ...prev,
        variantSettings: {
          ...prev.variantSettings,
          [field]: type === 'checkbox' ? checked : value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const addProperty = (propertyDefinitionId = null) => {
    if (propertyDefinitionId) {
      // Add property from existing Property Definition
      const propDef = propertyDefinitions?.find(pd => pd._id === propertyDefinitionId)
      if (propDef) {
        setFormData(prev => ({
          ...prev,
          properties: [
            ...prev.properties,
            {
              propertyDefinitionId: propDef._id,
              key: propDef.key,
              label: propDef.label,
              type: propDef.dataType === 'fraction' ? 'string' : propDef.dataType === 'enum' ? 'enum' : propDef.dataType,
              required: propDef.validation?.required || false,
              defaultValue: propDef.defaultValue || '',
              options: propDef.enumOptions?.map(opt => ({ value: opt.value, label: opt.label })) || [],
              unit: propDef.unit || '',
              unitOfMeasureId: propDef.unitOfMeasureId || null,
              unitSystem: propDef.unitSystem || 'imperial',
              variantKey: false,
              display: {
                order: prev.properties.length,
                group: propDef.display?.group || '',
                placeholder: propDef.display?.placeholder || '',
                helpText: propDef.description || propDef.display?.helpText || '',
                hidden: propDef.display?.hidden || false
              }
            }
          ]
        }))
        return
      }
    }
    
    // Add empty property (for custom properties not in Property Definitions)
    setFormData(prev => ({
      ...prev,
      properties: [
        ...prev.properties,
        {
          key: '',
          label: '',
          type: 'string',
          required: false,
          defaultValue: '',
          options: [],
          variantKey: false,
          display: {
            order: prev.properties.length,
            group: '',
            placeholder: '',
            helpText: '',
            hidden: false
          }
        }
      ]
    }))
  }

  const removeProperty = (index) => {
    setCustomPropertyKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Shift indices for properties after this one
      const shifted = new Set();
      newSet.forEach(i => {
        if (i < index) shifted.add(i);
        else if (i > index) shifted.add(i - 1);
      });
      return shifted;
    });
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.filter((_, i) => i !== index),
      variantSettings: {
        ...prev.variantSettings,
        variantProperties: prev.variantSettings.variantProperties.filter(
          key => prev.properties[index]?.key !== key
        )
      }
    }))
  }

  const updateProperty = (index, field, value) => {
    setFormData(prev => {
      const newProperties = [...prev.properties]
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        newProperties[index] = {
          ...newProperties[index],
          [parent]: {
            ...newProperties[index][parent],
            [child]: value
          }
        }
      } else {
        newProperties[index] = {
          ...newProperties[index],
          [field]: value
        }
      }
      return {
        ...prev,
        properties: newProperties
      }
    })
  }

  const addPropertyOption = (propertyIndex) => {
    setFormData(prev => {
      const newProperties = [...prev.properties]
      newProperties[propertyIndex] = {
        ...newProperties[propertyIndex],
        options: [
          ...(newProperties[propertyIndex].options || []),
          { value: '', label: '' }
        ]
      }
      return {
        ...prev,
        properties: newProperties
      }
    })
  }

  const updatePropertyOption = (propertyIndex, optionIndex, field, value) => {
    setFormData(prev => {
      const newProperties = [...prev.properties]
      const newOptions = [...newProperties[propertyIndex].options]
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        [field]: value
      }
      newProperties[propertyIndex] = {
        ...newProperties[propertyIndex],
        options: newOptions
      }
      return {
        ...prev,
        properties: newProperties
      }
    })
  }

  const removePropertyOption = (propertyIndex, optionIndex) => {
    setFormData(prev => {
      const newProperties = [...prev.properties]
      newProperties[propertyIndex] = {
        ...newProperties[propertyIndex],
        options: newProperties[propertyIndex].options.filter((_, i) => i !== optionIndex)
      }
      return {
        ...prev,
        properties: newProperties
      }
    })
  }

  const toggleVariantProperty = (propertyKey) => {
    setFormData(prev => {
      const variantProperties = [...prev.variantSettings.variantProperties]
      const index = variantProperties.indexOf(propertyKey)
      if (index > -1) {
        variantProperties.splice(index, 1)
      } else {
        variantProperties.push(propertyKey)
      }
      return {
        ...prev,
        variantSettings: {
          ...prev.variantSettings,
          variantProperties
        }
      }
    })
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
          to="/product-types"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Product Types
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Product Type' : 'Create Product Type'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Name *
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
            </div>
          </div>

          {/* Properties */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Properties</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select properties from global definitions or create custom properties
                </p>
              </div>
              <div className="flex gap-2">
                {/* Dropdown to select from Property Definitions */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addProperty(e.target.value)
                      e.target.value = '' // Reset dropdown
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  defaultValue=""
                >
                  <option value="" disabled>Add from Global Properties...</option>
                  {propertyDefinitions?.map((pd) => {
                    // Check if already added
                    const alreadyAdded = formData.properties.some(p => p.key === pd.key)
                    const unitDisplay = pd.unit ? ` - ${pd.unit}` : ''
                    return (
                      <option key={pd._id} value={pd._id} disabled={alreadyAdded}>
                        {pd.label}{unitDisplay} ({pd.category}) {alreadyAdded && '✓'}
                      </option>
                    )
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => addProperty()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Custom Property
                </button>
              </div>
            </div>

            {formData.properties.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-sm text-gray-500">No properties defined</p>
                <button
                  type="button"
                  onClick={addProperty}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add First Property
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.properties.map((property, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Property Key *
                        </label>
                        {property.key && propertyDefinitions?.find(pd => pd.key === property.key) ? (
                          // Using global property - show as locked dropdown
                          <div>
                            <select
                              value={property.key}
                              disabled
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 text-gray-700"
                            >
                              <option value={property.key}>
                                {propertyDefinitions.find(pd => pd.key === property.key)?.label} 
                                {propertyDefinitions.find(pd => pd.key === property.key)?.unit ? ` (${propertyDefinitions.find(pd => pd.key === property.key)?.unit})` : ''} 
                                ({property.key})
                              </option>
                            </select>
                            <p className="mt-1 text-xs text-green-600">
                              ✓ Using global property definition (key locked)
                            </p>
                          </div>
                        ) : (
                          // Show dropdown to select from Property Definitions or custom
                          <div>
                            <select
                              value={property.key && propertyDefinitions?.find(pd => pd.key === property.key) ? property.key : (property.key ? '__custom__' : '')}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                if (selectedValue === '__custom__') {
                                  // User selected "Custom" - mark as custom and show input
                                  setCustomPropertyKeys(prev => new Set([...prev, index]));
                                  // Keep existing key if it exists, otherwise leave empty for user to type
                                } else if (selectedValue && selectedValue !== '') {
                                  // Selected from global properties
                                  setCustomPropertyKeys(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(index);
                                    return newSet;
                                  });
                                  const propDef = propertyDefinitions?.find(pd => pd.key === selectedValue);
                                  if (propDef) {
                                    updateProperty(index, 'propertyDefinitionId', propDef._id);
                                    updateProperty(index, 'key', propDef.key);
                                    updateProperty(index, 'label', propDef.label);
                                    updateProperty(index, 'type', propDef.dataType === 'fraction' ? 'string' : propDef.dataType === 'enum' ? 'enum' : propDef.dataType);
                                    updateProperty(index, 'unit', propDef.unit || '');
                                    updateProperty(index, 'unitOfMeasureId', propDef.unitOfMeasureId || null);
                                    updateProperty(index, 'unitSystem', propDef.unitSystem || 'imperial');
                                    if (propDef.enumOptions && propDef.enumOptions.length > 0) {
                                      updateProperty(index, 'options', propDef.enumOptions.map(opt => ({ value: opt.value, label: opt.label })));
                                    }
                                    if (propDef.display?.placeholder) {
                                      updateProperty(index, 'display.placeholder', propDef.display.placeholder);
                                    }
                                    if (propDef.description) {
                                      updateProperty(index, 'display.helpText', propDef.description);
                                    }
                                  }
                                } else {
                                  // Cleared selection
                                  setCustomPropertyKeys(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(index);
                                    return newSet;
                                  });
                                  updateProperty(index, 'key', '');
                                }
                              }}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="">-- Select Property --</option>
                              {propertyDefinitions?.map((pd) => {
                                const alreadyUsed = formData.properties.some((p, i) => i !== index && p.key === pd.key);
                                return (
                                  <option key={pd._id} value={pd.key} disabled={alreadyUsed}>
                                    {pd.label}{pd.unit ? ` (${pd.unit})` : ''} ({pd.category}) {alreadyUsed && '✓ Used'}
                                  </option>
                                );
                              })}
                              <option value="__custom__">-- Custom Property (Type Key) --</option>
                            </select>
                            {/* Show custom input if custom is selected or if key doesn't match any global property */}
                            {(customPropertyKeys.has(index) || (property.key && !propertyDefinitions?.find(pd => pd.key === property.key))) && (
                              <input
                                type="text"
                                value={property.key || ''}
                                onChange={(e) => updateProperty(index, 'key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                placeholder="e.g., custom_property_key"
                                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              {property.key && !propertyDefinitions?.find(pd => pd.key === property.key)
                                ? '⚠️ Custom property key (not in global definitions)'
                                : 'Select from global properties for consistency'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Label *
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={property.label}
                            onChange={(e) => updateProperty(index, 'label', e.target.value)}
                            placeholder="e.g., Size, Color, Material"
                            required
                            className="mt-1 block flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          {property.unit && (
                            <span className="mt-1 text-sm text-gray-500 whitespace-nowrap">
                              Unit: {property.unit}
                            </span>
                          )}
                        </div>
                        {property.unitSystem && property.unitSystem !== 'both' && (
                          <p className="mt-1 text-xs text-gray-500">
                            System: {property.unitSystem === 'imperial' ? 'Imperial (US)' : 'Metric'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Type *
                        </label>
                        <select
                          value={property.type}
                          onChange={(e) => updateProperty(index, 'type', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {PROPERTY_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={property.required || false}
                            onChange={(e) => updateProperty(index, 'required', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Required</span>
                        </label>
                        {formData.variantSettings.enabled && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.variantSettings.variantProperties.includes(property.key)}
                              onChange={() => toggleVariantProperty(property.key)}
                              disabled={!property.key}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Variant Key</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Options for enum/multiselect */}
                    {(property.type === 'enum' || property.type === 'multiselect') && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Options</label>
                          <button
                            type="button"
                            onClick={() => addPropertyOption(index)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            <PlusIcon className="h-4 w-4 inline mr-1" />
                            Add Option
                          </button>
                        </div>
                        {property.options && property.options.length > 0 ? (
                          <div className="space-y-2">
                            {property.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={option.value}
                                  onChange={(e) => updatePropertyOption(index, optIndex, 'value', e.target.value)}
                                  placeholder="Value"
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                                <input
                                  type="text"
                                  value={option.label}
                                  onChange={(e) => updatePropertyOption(index, optIndex, 'label', e.target.value)}
                                  placeholder="Label"
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePropertyOption(index, optIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No options defined</p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeProperty(index)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-5 w-5 inline mr-1" />
                        Remove Property
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variant Settings */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Variant Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="variantSettings.enabled"
                  checked={formData.variantSettings.enabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Enable variants for this product type</span>
              </label>

              {formData.variantSettings.enabled && (
                <div className="ml-6 space-y-4 border-l-2 border-blue-200 pl-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variant Properties
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Select which properties define variants (e.g., Size, Color)
                    </p>
                    {formData.properties.filter(p => p.key).length === 0 ? (
                      <p className="text-sm text-gray-500">Add properties first to enable variants</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.properties.filter(p => p.key).map((property) => (
                          <label key={property.key} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.variantSettings.variantProperties.includes(property.key)}
                              onChange={() => toggleVariantProperty(property.key)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{property.label} ({property.key})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Variant Naming Template
                    </label>
                    <input
                      type="text"
                      name="variantSettings.namingTemplate"
                      value={formData.variantSettings.namingTemplate}
                      onChange={handleChange}
                      placeholder="{name} - {variant}"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Use {'{name}'} for product name, {'{variant}'} for variant properties
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              to="/product-types"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isLoading ? 'Saving...' : isEdit ? 'Update Product Type' : 'Create Product Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

