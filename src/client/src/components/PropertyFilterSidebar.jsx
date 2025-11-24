import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { XMarkIcon, FunnelIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { propertyDefinitionAPI, productTypeAPI, productAPI } from '../services/api';

export default function PropertyFilterSidebar({ 
  productTypeId, 
  filters, 
  onFiltersChange,
  onClearFilters,
  supplierId // Add supplierId to fetch products for value extraction
}) {
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [expandedCategories, setExpandedCategories] = useState(new Set(['dimension', 'material', 'specification']));

  // Fetch ALL property definitions (not just those used by product type)
  const { data: propertyDefinitions } = useQuery({
    queryKey: ['property-definitions'],
    queryFn: () => propertyDefinitionAPI.getPropertyDefinitions().then(res => res.data.data),
  });

  // Fetch product type to get which properties are used (for reference, but we'll show all)
  const { data: productType } = useQuery({
    queryKey: ['product-type', productTypeId],
    queryFn: () => productTypeAPI.getProductType(productTypeId).then(res => res.data.data),
    enabled: !!productTypeId
  });

  // Fetch products to extract unique property values
  const { data: productsForValues } = useQuery({
    queryKey: ['products-for-property-values', supplierId, productTypeId],
    queryFn: () => {
      const params = { limit: 500 }; // Get more products to extract values
      if (productTypeId) params.productTypeId = productTypeId;
      return productAPI.searchProducts('', supplierId, params).then(res => res.data.data);
    },
    enabled: !!supplierId, // Only fetch when supplier is selected
    staleTime: 60000 // Cache for 1 minute
  });

  // Extract unique values for each property from actual products
  const propertyValuesMap = useMemo(() => {
    if (!productsForValues || !propertyDefinitions) return {};
    
    const valuesMap = {};
    
    propertyDefinitions.forEach(propDef => {
      const values = new Set();
      
      productsForValues.forEach(product => {
        // Check product properties
        if (product.properties && product.properties[propDef.key]) {
          const value = product.properties[propDef.key];
          if (value !== null && value !== undefined && value !== '') {
            values.add(String(value));
          }
        }
        
        // Check variant properties
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach(variant => {
            if (variant.properties && variant.properties[propDef.key]) {
              const value = variant.properties[propDef.key];
              if (value !== null && value !== undefined && value !== '') {
                values.add(String(value));
              }
            }
          });
        }
      });
      
      if (values.size > 0) {
        valuesMap[propDef.key] = Array.from(values).sort();
      }
    });
    
    return valuesMap;
  }, [productsForValues, propertyDefinitions]);

  // Show ALL property definitions, but prioritize those used by product type
  const relevantProperties = useMemo(() => {
    if (!propertyDefinitions) return [];
    
    const usedPropertyKeys = productType?.properties?.map(p => p.key) || [];
    
    // Sort: used properties first, then others
    return [...propertyDefinitions].sort((a, b) => {
      const aUsed = usedPropertyKeys.includes(a.key) || usedPropertyKeys.some(key => a.aliases?.includes(key));
      const bUsed = usedPropertyKeys.includes(b.key) || usedPropertyKeys.some(key => b.aliases?.includes(key));
      
      if (aUsed && !bUsed) return -1;
      if (!aUsed && bUsed) return 1;
      
      // Then sort by category and label
      if (a.category !== b.category) {
        return (a.category || 'other').localeCompare(b.category || 'other');
      }
      return a.label.localeCompare(b.label);
    });
  }, [propertyDefinitions, productType]);

  // Group properties by category
  const propertiesByCategory = useMemo(() => {
    return relevantProperties.reduce((acc, prop) => {
      const category = prop.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(prop);
      return acc;
    }, {});
  }, [relevantProperties]);

  // Update local filters when prop changes
  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  const handleFilterChange = (propertyKey, value) => {
    const newFilters = { ...localFilters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[propertyKey];
    } else {
      newFilters[propertyKey] = value;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilter = (propertyKey) => {
    handleFilterChange(propertyKey, '');
  };

  const handleClearAll = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getPropertyValueOptions = (propertyDef) => {
    const options = [];
    
    // 1. For enum types, use enum options first
    if (propertyDef.dataType === 'enum' && propertyDef.enumOptions) {
      propertyDef.enumOptions.forEach(opt => {
        options.push({
          value: opt.value,
          label: opt.label,
          source: 'enum'
        });
      });
    }
    
    // 2. For properties with standardValues, add them
    if (propertyDef.standardValues && propertyDef.standardValues.length > 0) {
      propertyDef.standardValues.forEach(sv => {
        const label = `${sv.displayValue}${propertyDef.unit ? ` ${propertyDef.unit}` : ''}`;
        // Avoid duplicates
        if (!options.find(opt => opt.value === sv.displayValue)) {
          options.push({
            value: sv.displayValue,
            label: label,
            source: 'standard'
          });
        }
      });
    }
    
    // 3. For fraction/number types with useStandardValuesAsDropdown flag
    if ((propertyDef.dataType === 'fraction' || propertyDef.dataType === 'number') && 
        propertyDef.useStandardValuesAsDropdown && 
        propertyDef.standardValues && 
        propertyDef.standardValues.length > 0) {
      propertyDef.standardValues.forEach(sv => {
        const label = `${sv.displayValue}${propertyDef.unit ? ` ${propertyDef.unit}` : ''}`;
        if (!options.find(opt => opt.value === sv.displayValue)) {
          options.push({
            value: sv.displayValue,
            label: label,
            source: 'standard'
          });
        }
      });
    }
    
    // 4. Add actual product values (if available and not too many)
    const productValues = propertyValuesMap[propertyDef.key] || [];
    if (productValues.length > 0 && productValues.length <= 100) { // Limit to 100 values
      productValues.forEach(value => {
        // Avoid duplicates
        if (!options.find(opt => opt.value === value)) {
          options.push({
            value: value,
            label: `${value}${propertyDef.unit ? ` ${propertyDef.unit}` : ''}`,
            source: 'product'
          });
        }
      });
    }
    
    // Sort options: standard/enum first, then product values
    return options.sort((a, b) => {
      if (a.source === 'standard' || a.source === 'enum') {
        if (b.source === 'product') return -1;
      }
      if (a.source === 'product') {
        if (b.source === 'standard' || b.source === 'enum') return 1;
      }
      return a.label.localeCompare(b.label);
    });
  };

  const renderPropertyFilter = (propertyDef) => {
    const currentValue = localFilters[propertyDef.key] || '';
    const options = getPropertyValueOptions(propertyDef);
    const hasProductValues = (propertyValuesMap[propertyDef.key] || []).length > 0;
    const isUsedByProductType = productType?.properties?.some(p => p.key === propertyDef.key) || false;

    return (
      <div key={propertyDef.key} className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            {propertyDef.label}
            {isUsedByProductType && (
              <span className="ml-1 text-xs text-blue-600" title="Used by selected product type">●</span>
            )}
            {propertyDef.unit && (
              <span className="ml-1 text-xs text-gray-500">({propertyDef.unit})</span>
            )}
          </label>
          {currentValue && (
            <button
              onClick={() => handleClearFilter(propertyDef.key)}
              className="text-gray-400 hover:text-gray-600"
              title="Clear filter"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {options.length > 0 ? (
          <select
            value={currentValue}
            onChange={(e) => handleFilterChange(propertyDef.key, e.target.value)}
            className="w-full text-sm py-1.5 px-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
          >
            <option value="">All {propertyDef.label}</option>
            {options.map((opt, idx) => {
              // Add separator between standard/enum and product values
              const showSeparator = idx > 0 && 
                                   options[idx - 1].source !== 'product' && 
                                   opt.source === 'product';
              
              return (
                <React.Fragment key={opt.value}>
                  {showSeparator && (
                    <option disabled>──────────</option>
                  )}
                  <option value={opt.value}>{opt.label}</option>
                </React.Fragment>
              );
            })}
          </select>
        ) : (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleFilterChange(propertyDef.key, e.target.value)}
            placeholder={propertyDef.display?.placeholder || `Filter by ${propertyDef.label.toLowerCase()}`}
            className="w-full text-sm py-1.5 px-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
          />
        )}
        {hasProductValues && options.length === 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {propertyValuesMap[propertyDef.key].length} value{propertyValuesMap[propertyDef.key].length !== 1 ? 's' : ''} available (use text filter)
          </p>
        )}
      </div>
    );
  };

  const activeFilterCount = Object.keys(localFilters).filter(key => localFilters[key]).length;

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <FunnelIcon className="h-4 w-4 mr-2" />
          Filter Products
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Clear All
          </button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="mb-4 p-2 bg-blue-50 rounded text-xs text-blue-800">
          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
        </div>
      )}

      {relevantProperties.length === 0 ? (
        <div className="text-sm text-gray-500">
          {!supplierId 
            ? 'Select a supplier to enable property filters'
            : 'No property definitions available'}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(propertiesByCategory)
            .sort(([catA], [catB]) => {
              // Sort categories: dimension, material, specification, performance, other
              const order = ['dimension', 'material', 'specification', 'performance', 'other'];
              const indexA = order.indexOf(catA) !== -1 ? order.indexOf(catA) : 999;
              const indexB = order.indexOf(catB) !== -1 ? order.indexOf(catB) : 999;
              return indexA - indexB;
            })
            .map(([category, properties]) => {
              const categoryPropertyCount = properties.length;
              const activeInCategory = properties.filter(p => localFilters[p.key]).length;
              
              return (
                <div key={category} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-800 mb-2 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCategories.has(category) ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="capitalize">{category}</span>
                      <span className="text-xs font-normal text-gray-500">
                        ({categoryPropertyCount})
                      </span>
                      {activeInCategory > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {activeInCategory}
                        </span>
                      )}
                    </div>
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="ml-6 space-y-2">
                      {properties
                        .sort((a, b) => {
                          // Sort: used properties first, then by label
                          const aUsed = productType?.properties?.some(p => p.key === a.key);
                          const bUsed = productType?.properties?.some(p => p.key === b.key);
                          if (aUsed && !bUsed) return -1;
                          if (!aUsed && bUsed) return 1;
                          return a.label.localeCompare(b.label);
                        })
                        .map(prop => renderPropertyFilter(prop))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

