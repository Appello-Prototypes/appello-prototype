import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DocumentTextIcon, InformationCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { propertyDefinitionAPI } from '../services/api'

export default function ProductConfiguration({ 
  product, 
  productType, 
  properties = {}, 
  onPropertyChange,
  onPricingUpdate,
  supplierId,
  showPricebookLink = true,
  specification = null // Optional specification object
}) {
  if (!product && !productType) return null

  // Fetch PropertyDefinitions to get unit info and standardValues
  const { data: propertyDefinitions } = useQuery({
    queryKey: ['property-definitions'],
    queryFn: () => propertyDefinitionAPI.getPropertyDefinitions().then(res => res.data.data),
  })

  // Create lookup map for PropertyDefinitions
  const propDefMap = useMemo(() => {
    if (!propertyDefinitions) return new Map()
    const map = new Map()
    propertyDefinitions.forEach(pd => {
      map.set(pd.key, pd)
    })
    return map
  }, [propertyDefinitions])

  // Convert Map to object if needed
  const propertiesObj = properties instanceof Map 
    ? Object.fromEntries(properties) 
    : properties || {}

  // Extract variants and convert properties from Map if needed
  const variants = useMemo(() => {
    if (!product?.variants) return []
    return product.variants.map(variant => ({
      ...variant,
      properties: variant.properties instanceof Map 
        ? Object.fromEntries(variant.properties) 
        : variant.properties || {}
    }))
  }, [product?.variants])

  // Find matching variant based on configured properties
  const matchingVariant = useMemo(() => {
    if (!variants.length || !Object.keys(propertiesObj).length) return null
    
    // Find variant where all configured properties match
    return variants.find(variant => {
      if (!variant.isActive) return false
      
      // Check if all configured properties match variant properties
      return Object.entries(propertiesObj).every(([key, value]) => {
        if (value === null || value === '' || value === false || (Array.isArray(value) && value.length === 0)) {
          return true // Empty values don't need to match
        }
        const variantValue = variant.properties[key]
        if (Array.isArray(value)) {
          return Array.isArray(variantValue) && value.every(v => variantValue.includes(v))
        }
        return variantValue === value || String(variantValue) === String(value)
      })
    })
  }, [variants, propertiesObj])

  // Calculate net price from list price and discount
  const calculateNetPrice = (listPrice, discountPercent) => {
    if (!listPrice || listPrice <= 0) return 0
    if (!discountPercent || discountPercent <= 0) return listPrice
    return listPrice * (1 - discountPercent / 100)
  }

  // Get pricing from matching variant or product
  const pricing = useMemo(() => {
    let listPrice = 0
    let netPrice = 0
    let discountPercent = 0
    
    if (matchingVariant) {
      // Get supplier-specific pricing if supplierId is provided
      if (supplierId && matchingVariant.suppliers && matchingVariant.suppliers.length > 0) {
        const supplierInfo = matchingVariant.suppliers.find(s => {
          const sId = s.supplierId?._id || s.supplierId
          const supplierIdStr = typeof supplierId === 'string' ? supplierId : supplierId.toString()
          return sId && (sId.toString() === supplierIdStr)
        })
        if (supplierInfo) {
          listPrice = supplierInfo.listPrice || supplierInfo.lastPrice || 0
          discountPercent = supplierInfo.discountPercent || 0
          netPrice = supplierInfo.netPrice || calculateNetPrice(listPrice, discountPercent)
          return { listPrice, netPrice, discountPercent, source: 'variant-supplier' }
        }
      }
      // Use variant pricing
      listPrice = matchingVariant.pricing?.listPrice || matchingVariant.pricing?.lastPrice || 0
      discountPercent = matchingVariant.pricing?.discountPercent || 0
      netPrice = matchingVariant.pricing?.netPrice || calculateNetPrice(listPrice, discountPercent)
      return { listPrice, netPrice, discountPercent, source: 'variant' }
    }
    
    // Fall back to product-level pricing
    if (supplierId && product?.suppliers && product.suppliers.length > 0) {
      const supplierInfo = product.suppliers.find(s => {
        const sId = s.supplierId?._id || s.supplierId
        const supplierIdStr = typeof supplierId === 'string' ? supplierId : supplierId.toString()
        return sId && (sId.toString() === supplierIdStr)
      })
      if (supplierInfo) {
        listPrice = supplierInfo.listPrice || supplierInfo.lastPrice || 0
        discountPercent = supplierInfo.discountPercent || 0
        netPrice = supplierInfo.netPrice || calculateNetPrice(listPrice, discountPercent)
        return { listPrice, netPrice, discountPercent, source: 'product-supplier' }
      }
    }
    
    // Final fallback to product lastPrice
    listPrice = product?.lastPrice || 0
    netPrice = listPrice
    discountPercent = 0
    return { listPrice, netPrice, discountPercent, source: 'product' }
  }, [matchingVariant, product, supplierId])

  // Update pricing when it changes - trigger on initial load and when pricing changes
  React.useEffect(() => {
    console.log('💰 ProductConfiguration Pricing Update:', {
      pricing,
      matchingVariant: matchingVariant ? { id: matchingVariant._id, name: matchingVariant.name } : null,
      hasOnPricingUpdate: !!onPricingUpdate
    })
    
    if (onPricingUpdate) {
      // Call update whenever pricing changes (including initial load)
      // Only update if we have a valid price to avoid overwriting with 0
      if (pricing.netPrice > 0 || pricing.listPrice > 0) {
        console.log('✅ Calling onPricingUpdate with:', pricing)
        onPricingUpdate(pricing)
      } else {
        console.log('⚠️ Skipping onPricingUpdate - no valid price')
      }
    }
  }, [pricing.netPrice, pricing.listPrice, pricing.discountPercent, matchingVariant?._id, onPricingUpdate])

  // Get available options for enum properties from variants
  const getPropertyOptions = (property) => {
    if (property.type !== 'enum' && property.type !== 'multiselect') {
      return property.options || []
    }
    
    // Extract unique values from variants
    const variantValues = new Set()
    variants.forEach(variant => {
      const value = variant.properties[property.key]
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => variantValues.add(String(v)))
        } else {
          variantValues.add(String(value))
        }
      }
    })
    
    // Combine with defined options, prioritizing defined options
    const definedOptions = property.options || []
    const variantOptions = Array.from(variantValues).map(value => ({
      value,
      label: value
    }))
    
    // Merge: use defined options first, then add variant values not in defined options
    const optionMap = new Map()
    definedOptions.forEach(opt => optionMap.set(opt.value, opt))
    variantOptions.forEach(opt => {
      if (!optionMap.has(opt.value)) {
        optionMap.set(opt.value, opt)
      }
    })
    
    return Array.from(optionMap.values())
  }

  const renderPropertyField = (property) => {
    const value = propertiesObj[property.key] ?? property.defaultValue ?? ''
    
    // Get PropertyDefinition for this property (if linked)
    const propDef = property.propertyDefinitionId 
      ? propertyDefinitions?.find(pd => pd._id === property.propertyDefinitionId)
      : propDefMap.get(property.key)
    
    // Check if we should use dropdown (has standardValues)
    const hasStandardValues = propDef?.standardValues && propDef.standardValues.length > 0
    const shouldUseDropdown = hasStandardValues && (propDef?.useStandardValuesAsDropdown || propDef?.dataType === 'fraction' || propDef?.dataType === 'number')
    
    // Get unit for display
    const unit = property.unit || propDef?.unit || ''
    const unitDisplay = unit ? ` (${unit})` : ''
    
    switch (property.type) {
      case 'string':
        // Use dropdown if standardValues exist
        if (shouldUseDropdown) {
          return (
            <select
              value={value}
              onChange={(e) => onPropertyChange(property.key, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select {property.label.toLowerCase()}...</option>
              {propDef.standardValues.map(sv => (
                <option key={sv.displayValue} value={sv.displayValue}>
                  {sv.displayValue}{unitDisplay}
                </option>
              ))}
            </select>
          )
        }
        return (
          <div className="flex items-center">
            <input
              type="text"
              value={value}
              onChange={(e) => onPropertyChange(property.key, e.target.value)}
              placeholder={property.display?.placeholder || `Enter ${property.label.toLowerCase()}${unitDisplay}`}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {unit && <span className="ml-2 text-sm text-gray-500">{unit}</span>}
          </div>
        )
      
      case 'number':
        // Use dropdown if standardValues exist
        if (shouldUseDropdown) {
          return (
            <select
              value={value}
              onChange={(e) => onPropertyChange(property.key, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select {property.label.toLowerCase()}...</option>
              {propDef.standardValues.map(sv => (
                <option key={sv.displayValue} value={sv.displayValue}>
                  {sv.displayValue}{unitDisplay}
                </option>
              ))}
            </select>
          )
        }
        return (
          <div className="flex items-center">
            <input
              type="number"
              value={value}
              onChange={(e) => onPropertyChange(property.key, parseFloat(e.target.value) || '')}
              min={property.validation?.min}
              max={property.validation?.max}
              step="any"
              placeholder={property.display?.placeholder || `Enter ${property.label.toLowerCase()}${unitDisplay}`}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {unit && <span className="ml-2 text-sm text-gray-500">{unit}</span>}
          </div>
        )
      
      case 'boolean':
        return (
          <div className="mt-1 flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onPropertyChange(property.key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              {value === true || value === 'true' ? 'Yes' : 'No'}
            </label>
          </div>
        )
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onPropertyChange(property.key, e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )
      
      case 'enum':
        const enumOptions = getPropertyOptions(property)
        const hasVariantOptions = variants.length > 0 && enumOptions.some(opt => 
          variants.some(v => {
            const vValue = v.properties[property.key]
            return vValue !== undefined && (String(vValue) === opt.value || vValue === opt.value)
          })
        )
        return (
          <div>
            <select
              value={value}
              onChange={(e) => onPropertyChange(property.key, e.target.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                value && matchingVariant ? 'border-green-300 bg-green-50' : ''
              }`}
            >
              <option value="">Select {property.label.toLowerCase()}...</option>
              {enumOptions.map((opt) => {
                // Check if this option has variants available
                const hasVariants = variants.some(v => {
                  const vValue = v.properties[property.key]
                  return vValue !== undefined && (String(vValue) === opt.value || vValue === opt.value)
                })
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label || opt.value} {hasVariants && '✓'}
                  </option>
                )
              })}
            </select>
            {hasVariantOptions && (
              <p className="mt-1 text-xs text-gray-500">
                Options with ✓ have variants available
              </p>
            )}
          </div>
        )
      
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : (value ? [value] : [])
        const multiselectOptions = getPropertyOptions(property)
        return (
          <div className="mt-1 space-y-2">
            {multiselectOptions.map((opt) => (
              <label key={opt.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, opt.value]
                      : selectedValues.filter(v => v !== opt.value)
                    onPropertyChange(property.key, newValues)
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{opt.label || opt.value}</span>
              </label>
            ))}
          </div>
        )
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onPropertyChange(property.key, e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )
    }
  }

  // Group properties by display.group if available
  const groupedProperties = {}
  const ungroupedProperties = []
  
  if (productType?.properties) {
    productType.properties
      .filter(prop => !prop.display?.hidden)
      .sort((a, b) => (a.display?.order || 0) - (b.display?.order || 0))
      .forEach(property => {
        if (property.display?.group) {
          if (!groupedProperties[property.display.group]) {
            groupedProperties[property.display.group] = []
          }
          groupedProperties[property.display.group].push(property)
        } else {
          ungroupedProperties.push(property)
        }
      })
  }

  const hasProperties = Object.keys(groupedProperties).length > 0 || ungroupedProperties.length > 0
  const hasPricebookInfo = product?.pricebookSection || product?.pricebookPageNumber

  return (
    <div className="mt-4 space-y-4">
      {/* Product Info Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            {product?.name || 'Product Configuration'}
          </h4>
          {product?.description && (
            <p className="text-xs text-gray-500 mt-1">{product.description}</p>
          )}
          {product?.internalPartNumber && (
            <p className="text-xs text-gray-400 mt-1">Part #: {product.internalPartNumber}</p>
          )}
        </div>
        
        {/* Pricebook Link */}
        {showPricebookLink && hasPricebookInfo && (
          <Link
            to={`/pricebook${product?.pricebookSection ? `?section=${encodeURIComponent(product.pricebookSection)}` : ''}${product?.pricebookPageNumber ? `&page=${encodeURIComponent(product.pricebookPageNumber)}` : ''}`}
            target="_blank"
            className="ml-4 inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
            title={`View in Pricebook${product?.pricebookPageName ? ` - ${product.pricebookPageName}` : ''}`}
          >
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            Pricebook
          </Link>
        )}
      </div>

      {/* Specification Requirements */}
      {specification && specification.requiredProperties && (
        <div className="border-t border-gray-200 pt-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center">
              <span className="mr-2">✓</span>
              Specification Requirements
            </h4>
            <div className="space-y-1 text-sm">
              {(() => {
                const requiredProps = specification.requiredProperties instanceof Map
                  ? Object.fromEntries(specification.requiredProperties)
                  : specification.requiredProperties || {}
                
                return Object.entries(requiredProps).map(([key, value]) => {
                  const propDef = productType?.properties?.find(p => p.key === key)
                  const label = propDef?.label || key
                  const currentValue = propertiesObj[key]
                  const matches = currentValue === value || 
                    String(currentValue).toLowerCase() === String(value).toLowerCase()
                  
                  return (
                    <div key={key} className={`flex justify-between ${matches ? 'text-green-700' : 'text-amber-700'}`}>
                      <span>{label}:</span>
                      <span className="font-medium">
                        {matches ? '✓ ' : '⚠ '}
                        {String(value)}
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
            {specification.name && (
              <div className="mt-2 pt-2 border-t border-green-300 text-xs text-green-700">
                Spec: {specification.name}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Information - Always show if product exists */}
      {product && (
        <div className="border-t border-gray-200 pt-4">
          <div className={`rounded-lg p-4 border-2 ${
            matchingVariant 
              ? 'bg-green-50 border-green-300' 
              : (pricing.netPrice > 0 || pricing.listPrice > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200')
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className={`h-5 w-5 ${
                  matchingVariant ? 'text-green-600' : (pricing.netPrice > 0 ? 'text-blue-600' : 'text-gray-400')
                }`} />
                <span className="text-sm font-semibold text-gray-900">Pricing Information</span>
                {matchingVariant && (
                  <span className="text-xs px-2 py-1 bg-green-200 text-green-900 rounded font-medium">
                    ✓ Variant Matched
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded p-2 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">List Price</div>
                <div className="text-lg font-bold text-gray-900">
                  {pricing.listPrice > 0 ? `$${pricing.listPrice.toFixed(2)}` : <span className="text-gray-400">Not Set</span>}
                </div>
              </div>
              {pricing.discountPercent > 0 ? (
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discount</div>
                  <div className="text-lg font-bold text-green-600">{pricing.discountPercent.toFixed(1)}%</div>
                  {pricing.listPrice > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Save ${(pricing.listPrice - pricing.netPrice).toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discount</div>
                  <div className="text-lg font-bold text-gray-400">0%</div>
                </div>
              )}
              <div className={`rounded p-2 border-2 ${
                matchingVariant 
                  ? 'bg-green-100 border-green-400' 
                  : (pricing.netPrice > 0 ? 'bg-blue-100 border-blue-400' : 'bg-gray-100 border-gray-300')
              }`}>
                <div className="text-xs text-gray-700 uppercase tracking-wide mb-1 font-medium">Net Price</div>
                <div className={`text-2xl font-bold ${
                  matchingVariant ? 'text-green-700' : (pricing.netPrice > 0 ? 'text-blue-700' : 'text-gray-500')
                }`}>
                  {pricing.netPrice > 0 ? `$${pricing.netPrice.toFixed(2)}` : <span className="text-sm">Not Set</span>}
                </div>
              </div>
            </div>
            {matchingVariant && (
              <div className="mt-3 pt-3 border-t border-green-300">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-600">
                    {matchingVariant.name && (
                      <span className="font-medium">Variant: {matchingVariant.name}</span>
                    )}
                    {matchingVariant.sku && (
                      <span className="ml-2">SKU: <span className="font-mono">{matchingVariant.sku}</span></span>
                    )}
                  </div>
                  <span className="text-green-700 font-medium">✓ Price updated automatically</span>
                </div>
              </div>
            )}
            {!matchingVariant && Object.keys(propertiesObj).length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-300">
                <div className="text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">
                  <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                  No matching variant found. Using base product pricing.
                </div>
              </div>
            )}
            {pricing.netPrice === 0 && pricing.listPrice === 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                  <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                  No pricing information available. Configure properties to match a variant with pricing, or enter price manually.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Properties Configuration */}
      {hasProperties ? (
        <div className="border-t border-gray-200 pt-4 space-y-6">
          {/* Grouped Properties */}
          {Object.entries(groupedProperties).map(([groupName, props]) => (
            <div key={groupName}>
              <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                {groupName}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {props.map((property) => {
                  const propDef = property.propertyDefinitionId 
                    ? propertyDefinitions?.find(pd => pd._id === property.propertyDefinitionId)
                    : propDefMap.get(property.key)
                  const unit = property.unit || propDef?.unit || ''
                  const unitDisplay = unit ? ` (${unit})` : ''
                  
                  return (
                    <div key={property.key}>
                      <label className="block text-xs font-medium text-gray-700">
                        {property.label}{unitDisplay}
                        {property.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    {property.display?.helpText && (
                      <p className="text-xs text-gray-500 mt-0.5 mb-1">{property.display.helpText}</p>
                    )}
                      {renderPropertyField(property)}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Ungrouped Properties */}
          {ungroupedProperties.length > 0 && (
            <div>
              {Object.keys(groupedProperties).length > 0 && (
                <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Other Properties
                </h5>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ungroupedProperties.map((property) => {
                  const propDef = property.propertyDefinitionId 
                    ? propertyDefinitions?.find(pd => pd._id === property.propertyDefinitionId)
                    : propDefMap.get(property.key)
                  const unit = property.unit || propDef?.unit || ''
                  const unitDisplay = unit ? ` (${unit})` : ''
                  
                  return (
                    <div key={property.key}>
                      <label className="block text-xs font-medium text-gray-700">
                        {property.label}{unitDisplay}
                        {property.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    {property.display?.helpText && (
                      <p className="text-xs text-gray-500 mt-0.5 mb-1">{property.display.helpText}</p>
                    )}
                      {renderPropertyField(property)}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center text-xs text-gray-500">
            <InformationCircleIcon className="h-4 w-4 mr-1" />
            <span>No configurable properties available for this product</span>
          </div>
        </div>
      )}
    </div>
  )
}

