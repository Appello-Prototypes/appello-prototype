import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { specificationAPI, jobAPI, productTypeAPI, companyAPI, propertyDefinitionAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function SpecificationForm() {
  const { jobId, id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemId: '',
    systemName: '',
    areaId: '',
    areaName: '',
    conditions: {
      pipeTypes: [],
      minDiameter: '',
      maxDiameter: '',
      temperatureRange: {
        min: '',
        max: ''
      }
    },
    productTypeId: '',
    requiredProperties: {},
    propertyMatchingRules: [],
    preferredSupplierId: '',
    allowOtherSuppliers: false,
    priority: 0,
    isActive: true
  })

  const [pipeTypeInput, setPipeTypeInput] = useState('')

  // Property matching rules handlers
  const addPropertyMatchingRule = () => {
    setFormData(prev => ({
      ...prev,
      propertyMatchingRules: [
        ...prev.propertyMatchingRules,
        { propertyKey: '', matchType: 'exact', value: '', normalize: true }
      ]
    }))
  }

  const updatePropertyMatchingRule = (index, field, value) => {
    setFormData(prev => {
      const newRules = [...prev.propertyMatchingRules]
      newRules[index] = { ...newRules[index], [field]: value }
      // Reset value if matchType changes to range
      if (field === 'matchType' && value === 'range') {
        newRules[index].value = { min: '', max: '' }
      } else if (field === 'matchType' && value !== 'range' && typeof newRules[index].value === 'object') {
        newRules[index].value = ''
      }
      return { ...prev, propertyMatchingRules: newRules }
    })
  }

  const removePropertyMatchingRule = (index) => {
    setFormData(prev => ({
      ...prev,
      propertyMatchingRules: prev.propertyMatchingRules.filter((_, i) => i !== index)
    }))
  }

  // Fetch job data for systems/areas
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobAPI.getJob(jobId).then(res => res.data.data),
    enabled: !!jobId
  })

  // Fetch product types
  const { data: productTypes } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => productTypeAPI.getProductTypes().then(res => res.data.data)
  })

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => companyAPI.getCompanies({ companyType: 'supplier' }).then(res => res.data.data)
  })

  // Fetch property definitions (for dropdowns)
  const { data: propertyDefinitions } = useQuery({
    queryKey: ['property-definitions'],
    queryFn: () => propertyDefinitionAPI.getPropertyDefinitions({ isActive: true }).then(res => res.data.data)
  })

  // Fetch existing specification if editing
  const { data: specification, isLoading } = useQuery({
    queryKey: ['specification', id],
    queryFn: () => specificationAPI.getSpecification(id).then(res => res.data.data),
    enabled: isEdit
  })

  useEffect(() => {
    if (specification) {
      const requiredProps = specification.requiredProperties instanceof Map
        ? Object.fromEntries(specification.requiredProperties)
        : specification.requiredProperties || {}

      setFormData({
        name: specification.name || '',
        description: specification.description || '',
        systemId: specification.systemId?._id || specification.systemId || '',
        systemName: specification.systemName || '',
        areaId: specification.areaId?._id || specification.areaId || '',
        areaName: specification.areaName || '',
        conditions: {
          pipeTypes: specification.conditions?.pipeTypes || [],
          minDiameter: specification.conditions?.minDiameter || '',
          maxDiameter: specification.conditions?.maxDiameter || '',
          temperatureRange: {
            min: specification.conditions?.temperatureRange?.min || '',
            max: specification.conditions?.temperatureRange?.max || ''
          }
        },
        productTypeId: specification.productTypeId?._id || specification.productTypeId || '',
        requiredProperties: requiredProps,
        propertyMatchingRules: specification.propertyMatchingRules || [],
        preferredSupplierId: specification.preferredSupplierId?._id || specification.preferredSupplierId || '',
        allowOtherSuppliers: specification.allowOtherSuppliers || false,
        priority: specification.priority || 0,
        isActive: specification.isActive !== undefined ? specification.isActive : true
      })
    }
  }, [specification])

  const mutation = useMutation({
    mutationFn: (data) => {
      return isEdit
        ? specificationAPI.updateSpecification(id, data)
        : specificationAPI.createSpecification(jobId, data)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Specification updated successfully' : 'Specification created successfully')
      queryClient.invalidateQueries(['specifications', jobId])
      navigate(`/jobs/${jobId}/specifications`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} specification`)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Convert empty strings to null for optional fields
    const submitData = {
      ...formData,
      systemId: formData.systemId || null,
      areaId: formData.areaId || null,
      productTypeId: formData.productTypeId || null,
      preferredSupplierId: formData.preferredSupplierId || null,
      conditions: {
        ...formData.conditions,
        minDiameter: formData.conditions.minDiameter || null,
        maxDiameter: formData.conditions.maxDiameter || null,
        temperatureRange: {
          min: formData.conditions.temperatureRange.min || null,
          max: formData.conditions.temperatureRange.max || null
        }
      }
    }

    mutation.mutate(submitData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.startsWith('conditions.')) {
      const field = name.replace('conditions.', '')
      if (field.startsWith('temperatureRange.')) {
        const tempField = field.replace('temperatureRange.', '')
        setFormData(prev => ({
          ...prev,
          conditions: {
            ...prev.conditions,
            temperatureRange: {
              ...prev.conditions.temperatureRange,
              [tempField]: value ? parseFloat(value) : ''
            }
          }
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          conditions: {
            ...prev.conditions,
            [field]: value
          }
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const handleAddPipeType = () => {
    if (pipeTypeInput.trim() && !formData.conditions.pipeTypes.includes(pipeTypeInput.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          pipeTypes: [...prev.conditions.pipeTypes, pipeTypeInput.trim().toLowerCase()]
        }
      }))
      setPipeTypeInput('')
    }
  }

  const handleRemovePipeType = (pipeType) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        pipeTypes: prev.conditions.pipeTypes.filter(pt => pt !== pipeType)
      }
    }))
  }

  const systems = job?.systems || []
  const areas = job?.areas || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Specification' : 'Create Specification'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Define product selection rules for systems and areas
            </p>
          </div>
          <Link
            to={`/jobs/${jobId}/specifications`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </Link>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g., Chilled Water - Iron Pipe Insulation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="form-textarea"
                placeholder="Optional description of this specification"
              />
            </div>
          </div>
        </div>

        {/* System & Area */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">System & Area</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System
              </label>
              <select
                name="systemId"
                value={formData.systemId}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Any System</option>
                {systems.map((system) => (
                  <option key={system._id || system.id} value={system._id || system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <select
                name="areaId"
                value={formData.areaId}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Any Area</option>
                {areas.map((area) => (
                  <option key={area._id || area.id} value={area._id || area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Matching Conditions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Matching Conditions</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipe Types
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={pipeTypeInput}
                  onChange={(e) => setPipeTypeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddPipeType()
                    }
                  }}
                  className="form-input flex-1"
                  placeholder="e.g., iron, copper, steel"
                />
                <button
                  type="button"
                  onClick={handleAddPipeType}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Add
                </button>
              </div>
              {formData.conditions.pipeTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.conditions.pipeTypes.map((pt) => (
                    <span
                      key={pt}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {pt}
                      <button
                        type="button"
                        onClick={() => handleRemovePipeType(pt)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to match any pipe type
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Diameter
                </label>
                <input
                  type="text"
                  name="conditions.minDiameter"
                  value={formData.conditions.minDiameter}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 1/2&quot;"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Diameter
                </label>
                <input
                  type="text"
                  name="conditions.maxDiameter"
                  value={formData.conditions.maxDiameter}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 2&quot;"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Product Selection</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Type
              </label>
              <select
                name="productTypeId"
                value={formData.productTypeId}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Any Product Type</option>
                {productTypes?.map((pt) => (
                  <option key={pt._id} value={pt._id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Supplier
              </label>
              <select
                name="preferredSupplierId"
                value={formData.preferredSupplierId}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">No Preference</option>
                {suppliers?.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="allowOtherSuppliers"
                checked={formData.allowOtherSuppliers}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Allow other suppliers if preferred supplier doesn't have matching products
              </label>
            </div>
          </div>
        </div>

        {/* Property Matching Rules */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Matching Rules</h3>
          <p className="text-sm text-gray-600 mb-4">
            Define rules for matching product properties. Properties are selected from the global property definitions to ensure consistency.
          </p>
          
          <div className="space-y-4">
            {formData.propertyMatchingRules.map((rule, index) => {
              const propertyDef = propertyDefinitions?.find(pd => pd.key === rule.propertyKey)
              const matchTypes = [
                { value: 'exact', label: 'Exact Match' },
                { value: 'min', label: 'Minimum Value' },
                { value: 'max', label: 'Maximum Value' },
                { value: 'range', label: 'Range (Min-Max)' },
                { value: 'enum', label: 'One of (Enum)' },
                { value: 'contains', label: 'Contains Text' }
              ]

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Property Selection (Dropdown) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property *
                      </label>
                      <select
                        value={rule.propertyKey}
                        onChange={(e) => updatePropertyMatchingRule(index, 'propertyKey', e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Select Property...</option>
                        {propertyDefinitions?.map((pd) => (
                          <option key={pd._id} value={pd.key}>
                            {pd.label} ({pd.category})
                          </option>
                        ))}
                      </select>
                      {propertyDef && (
                        <p className="mt-1 text-xs text-gray-500">{propertyDef.description}</p>
                      )}
                    </div>

                    {/* Match Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Match Type
                      </label>
                      <select
                        value={rule.matchType}
                        onChange={(e) => updatePropertyMatchingRule(index, 'matchType', e.target.value)}
                        className="form-select"
                      >
                        {matchTypes.map((mt) => (
                          <option key={mt.value} value={mt.value}>
                            {mt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Value Input (varies by match type and property type) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value *
                      </label>
                      {rule.matchType === 'range' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={rule.value?.min || ''}
                            onChange={(e) => updatePropertyMatchingRule(index, 'value', { ...rule.value, min: e.target.value })}
                            className="form-input"
                            placeholder="Min"
                          />
                          <input
                            type="text"
                            value={rule.value?.max || ''}
                            onChange={(e) => updatePropertyMatchingRule(index, 'value', { ...rule.value, max: e.target.value })}
                            className="form-input"
                            placeholder="Max"
                          />
                        </div>
                      ) : propertyDef?.dataType === 'enum' && propertyDef?.enumOptions ? (
                        <select
                          value={rule.value}
                          onChange={(e) => updatePropertyMatchingRule(index, 'value', e.target.value)}
                          className="form-select"
                        >
                          <option value="">Select Value...</option>
                          {propertyDef.enumOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : propertyDef?.standardValues && propertyDef.standardValues.length > 0 ? (
                        <select
                          value={rule.value}
                          onChange={(e) => updatePropertyMatchingRule(index, 'value', e.target.value)}
                          className="form-select"
                        >
                          <option value="">Select Value...</option>
                          {propertyDef.standardValues.map((sv, svIndex) => (
                            <option key={svIndex} value={sv.displayValue}>
                              {sv.displayValue}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={propertyDef?.dataType === 'number' ? 'number' : 'text'}
                          value={rule.value}
                          onChange={(e) => updatePropertyMatchingRule(index, 'value', e.target.value)}
                          className="form-input"
                          placeholder={propertyDef?.display?.placeholder || 'Enter value'}
                        />
                      )}
                    </div>

                    {/* Normalize & Remove */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={rule.normalize}
                            onChange={(e) => updatePropertyMatchingRule(index, 'normalize', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Normalize</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Use normalization for comparison</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePropertyMatchingRule(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                        title="Remove rule"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={addPropertyMatchingRule}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            >
              + Add Property Matching Rule
            </button>
          </div>
        </div>

        {/* Priority & Status */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Priority & Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="form-input"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Higher numbers = higher priority (checked first)
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Active
              </label>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            to={`/jobs/${jobId}/specifications`}
            className="btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={mutation.isLoading}
          >
            {mutation.isLoading ? 'Saving...' : isEdit ? 'Update Specification' : 'Create Specification'}
          </button>
        </div>
      </form>
    </div>
  )
}

