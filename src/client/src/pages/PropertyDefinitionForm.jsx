import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyDefinitionAPI } from '../services/api';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'fraction', label: 'Fraction (e.g., inches)' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'date', label: 'Date' },
  { value: 'enum', label: 'Enum (Dropdown)' }
];

const CATEGORIES = [
  { value: 'dimension', label: 'Dimension' },
  { value: 'material', label: 'Material' },
  { value: 'specification', label: 'Specification' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' }
];

const NORMALIZATION_FUNCTIONS = [
  { value: 'none', label: 'None' },
  { value: 'parseInches', label: 'Parse Inches (1 1/2" → 1.5)' },
  { value: 'parseFraction', label: 'Parse Fraction' },
  { value: 'parseNumber', label: 'Parse Number' },
  { value: 'toLowerCase', label: 'To Lowercase' }
];

export default function PropertyDefinitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    key: '',
    label: '',
    description: '',
    category: 'other',
    dataType: 'text',
    unit: '',
    normalization: {
      function: 'none',
      tolerance: 0.01
    },
    enumOptions: [],
    validation: {
      min: null,
      max: null,
      required: false
    },
    aliases: [],
    standardValues: [],
    display: {
      order: 0,
      group: '',
      placeholder: '',
      helpText: '',
      hidden: false,
      inputType: 'text'
    },
    isActive: true
  });

  const { data: propertyDefinition, isLoading } = useQuery({
    queryKey: ['property-definition', id],
    queryFn: () => propertyDefinitionAPI.getPropertyDefinition(id).then(res => res.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (propertyDefinition) {
      setFormData({
        key: propertyDefinition.key || '',
        label: propertyDefinition.label || '',
        description: propertyDefinition.description || '',
        category: propertyDefinition.category || 'other',
        dataType: propertyDefinition.dataType || 'text',
        unit: propertyDefinition.unit || '',
        normalization: propertyDefinition.normalization || { function: 'none', tolerance: 0.01 },
        enumOptions: propertyDefinition.enumOptions || [],
        validation: propertyDefinition.validation || { min: null, max: null, required: false },
        aliases: propertyDefinition.aliases || [],
        standardValues: propertyDefinition.standardValues || [],
        display: propertyDefinition.display || {
          order: 0,
          group: '',
          placeholder: '',
          helpText: '',
          hidden: false,
          inputType: 'text'
        },
        isActive: propertyDefinition.isActive !== undefined ? propertyDefinition.isActive : true
      });
    }
  }, [propertyDefinition]);

  const mutation = useMutation({
    mutationFn: (data) => {
      return isEdit
        ? propertyDefinitionAPI.updatePropertyDefinition(id, data)
        : propertyDefinitionAPI.createPropertyDefinition(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Property definition updated successfully' : 'Property definition created successfully');
      queryClient.invalidateQueries(['property-definitions']);
      navigate('/property-definitions');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} property definition`);
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('normalization.')) {
      const field = name.replace('normalization.', '');
      setFormData(prev => ({
        ...prev,
        normalization: {
          ...prev.normalization,
          [field]: field === 'tolerance' ? parseFloat(value) || 0.01 : value
        }
      }));
    } else if (name.startsWith('validation.')) {
      const field = name.replace('validation.', '');
      setFormData(prev => ({
        ...prev,
        validation: {
          ...prev.validation,
          [field]: field === 'required' ? checked : (value === '' ? null : (field === 'min' || field === 'max' ? parseFloat(value) : value))
        }
      }));
    } else if (name.startsWith('display.')) {
      const field = name.replace('display.', '');
      setFormData(prev => ({
        ...prev,
        display: {
          ...prev.display,
          [field]: field === 'order' ? parseInt(value) || 0 : (field === 'hidden' ? checked : value)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const addEnumOption = () => {
    setFormData(prev => ({
      ...prev,
      enumOptions: [
        ...prev.enumOptions,
        { value: '', label: '', aliases: [] }
      ]
    }));
  };

  const updateEnumOption = (index, field, value) => {
    setFormData(prev => {
      const newOptions = [...prev.enumOptions];
      if (field === 'aliases') {
        newOptions[index] = {
          ...newOptions[index],
          aliases: value.split(',').map(a => a.trim()).filter(a => a)
        };
      } else {
        newOptions[index] = {
          ...newOptions[index],
          [field]: value
        };
      }
      return { ...prev, enumOptions: newOptions };
    });
  };

  const removeEnumOption = (index) => {
    setFormData(prev => ({
      ...prev,
      enumOptions: prev.enumOptions.filter((_, i) => i !== index)
    }));
  };

  const addAlias = () => {
    const alias = prompt('Enter alias (will be converted to lowercase):');
    if (alias) {
      setFormData(prev => ({
        ...prev,
        aliases: [...prev.aliases, alias.toLowerCase().trim()]
      }));
    }
  };

  const removeAlias = (index) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.filter((_, i) => i !== index)
    }));
  };

  const addStandardValue = () => {
    setFormData(prev => ({
      ...prev,
      standardValues: [
        ...prev.standardValues,
        { displayValue: '', normalizedValue: '', aliases: [] }
      ]
    }));
  };

  const updateStandardValue = (index, field, value) => {
    setFormData(prev => {
      const newValues = [...prev.standardValues];
      if (field === 'aliases') {
        newValues[index] = {
          ...newValues[index],
          aliases: value.split(',').map(a => a.trim()).filter(a => a)
        };
      } else if (field === 'normalizedValue') {
        newValues[index] = {
          ...newValues[index],
          normalizedValue: value === '' ? '' : parseFloat(value) || value
        };
      } else {
        newValues[index] = {
          ...newValues[index],
          [field]: value
        };
      }
      return { ...prev, standardValues: newValues };
    });
  };

  const removeStandardValue = (index) => {
    setFormData(prev => ({
      ...prev,
      standardValues: prev.standardValues.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Property Definition' : 'Create Property Definition'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Define a global property that can be used across product types and specifications
          </p>
        </div>
        <Link
          to="/property-definitions"
          className="btn-secondary"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Property Key *</label>
              <input
                type="text"
                name="key"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                className="form-input"
                placeholder="e.g., pipe_diameter"
                required
                disabled={isEdit}
              />
              <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, and underscores only. Cannot be changed after creation.</p>
            </div>
            <div>
              <label className="form-label">Display Label *</label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Pipe Diameter"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="form-textarea"
                placeholder="Describe what this property represents"
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Data Type *</label>
              <select
                name="dataType"
                value={formData.dataType}
                onChange={handleChange}
                className="form-select"
                required
              >
                {DATA_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Unit</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., inches, feet, pounds"
              />
            </div>
          </div>
        </div>

        {/* Normalization */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Normalization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Normalization Function</label>
              <select
                name="normalization.function"
                value={formData.normalization.function}
                onChange={handleChange}
                className="form-select"
              >
                {NORMALIZATION_FUNCTIONS.map(nf => (
                  <option key={nf.value} value={nf.value}>{nf.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Tolerance</label>
              <input
                type="number"
                name="normalization.tolerance"
                value={formData.normalization.tolerance}
                onChange={handleChange}
                step="0.001"
                min="0"
                className="form-input"
              />
              <p className="mt-1 text-xs text-gray-500">For numeric comparisons (e.g., 0.01 for inches)</p>
            </div>
          </div>
        </div>

        {/* Enum Options */}
        {formData.dataType === 'enum' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enum Options</h3>
            <div className="space-y-4">
              {formData.enumOptions.map((option, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Value *</label>
                      <input
                        type="text"
                        value={option.value}
                        onChange={(e) => updateEnumOption(index, 'value', e.target.value.toLowerCase())}
                        className="form-input"
                        placeholder="e.g., asj"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Label *</label>
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateEnumOption(index, 'label', e.target.value)}
                        className="form-input"
                        placeholder="e.g., ASJ (All Service Jacket)"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeEnumOption(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="form-label">Aliases (comma-separated)</label>
                    <input
                      type="text"
                      value={option.aliases?.join(', ') || ''}
                      onChange={(e) => updateEnumOption(index, 'aliases', e.target.value)}
                      className="form-input"
                      placeholder="e.g., all service jacket, asj jacket"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addEnumOption}
                className="btn-secondary-outline flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Enum Option
              </button>
            </div>
          </div>
        )}

        {/* Validation */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Validation Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Min Value</label>
              <input
                type="number"
                name="validation.min"
                value={formData.validation.min || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="form-label">Max Value</label>
              <input
                type="number"
                name="validation.max"
                value={formData.validation.max || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="validation.required"
                checked={formData.validation.required}
                onChange={handleChange}
                className="form-checkbox"
              />
              <label className="ml-2 text-sm text-gray-700">Required</label>
            </div>
          </div>
        </div>

        {/* Aliases */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Aliases</h3>
          <p className="text-sm text-gray-600 mb-2">
            Other property keys that should map to this canonical key (e.g., pipe_size → pipe_diameter)
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.aliases.map((alias, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              >
                {alias}
                <button
                  type="button"
                  onClick={() => removeAlias(index)}
                  className="ml-2 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={addAlias}
            className="btn-secondary-outline text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1 inline" />
            Add Alias
          </button>
        </div>

        {/* Standard Values (for fractions) */}
        {formData.dataType === 'fraction' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Standard Values</h3>
            <p className="text-sm text-gray-600 mb-4">
              Define common values with normalized representations (e.g., "1 1/2"" → 1.5)
            </p>
            <div className="space-y-4">
              {formData.standardValues.map((sv, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="form-label">Display Value</label>
                      <input
                        type="text"
                        value={sv.displayValue}
                        onChange={(e) => updateStandardValue(index, 'displayValue', e.target.value)}
                        className="form-input"
                        placeholder="e.g., 1 1/2&quot;"
                      />
                    </div>
                    <div>
                      <label className="form-label">Normalized Value</label>
                      <input
                        type="number"
                        value={sv.normalizedValue}
                        onChange={(e) => updateStandardValue(index, 'normalizedValue', e.target.value)}
                        className="form-input"
                        placeholder="e.g., 1.5"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="form-label">Aliases (comma-separated)</label>
                      <input
                        type="text"
                        value={sv.aliases?.join(', ') || ''}
                        onChange={(e) => updateStandardValue(index, 'aliases', e.target.value)}
                        className="form-input"
                        placeholder="e.g., 1-1/2&quot;, 1.5&quot;"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeStandardValue(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addStandardValue}
                className="btn-secondary-outline flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Standard Value
              </button>
            </div>
          </div>
        )}

        {/* Display Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Display Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Display Order</label>
              <input
                type="number"
                name="display.order"
                value={formData.display.order}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Group</label>
              <input
                type="text"
                name="display.group"
                value={formData.display.group}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Dimensions"
              />
            </div>
            <div>
              <label className="form-label">Placeholder</label>
              <input
                type="text"
                name="display.placeholder"
                value={formData.display.placeholder}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Enter pipe diameter"
              />
            </div>
            <div>
              <label className="form-label">Help Text</label>
              <input
                type="text"
                name="display.helpText"
                value={formData.display.helpText}
                onChange={handleChange}
                className="form-input"
                placeholder="Additional help text"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="display.hidden"
                checked={formData.display.hidden}
                onChange={handleChange}
                className="form-checkbox"
              />
              <label className="ml-2 text-sm text-gray-700">Hidden</label>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="form-checkbox"
          />
          <label className="ml-2 text-sm text-gray-700">Active</label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            to="/property-definitions"
            className="btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={mutation.isLoading}
          >
            {mutation.isLoading ? 'Saving...' : isEdit ? 'Update Property Definition' : 'Create Property Definition'}
          </button>
        </div>
      </form>
    </div>
  );
}

