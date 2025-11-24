/**
 * Utility functions for calculating product pricing
 */

/**
 * Get pricing for a product/variant for a specific supplier
 * @param {Object} product - Product object
 * @param {Object} variant - Variant object (optional)
 * @param {String} supplierId - Supplier ID
 * @returns {Object} Pricing object with listPrice, netPrice, discountPercent
 */
export function getProductPricing(product, variant = null, supplierId = null) {
  console.log('🔧 getProductPricing called:', {
    hasProduct: !!product,
    hasVariant: !!variant,
    supplierId,
    productName: product?.name,
    variantName: variant?.name,
    variantId: variant?._id
  })
  
  if (!product) {
    console.log('⚠️ No product provided')
    return { listPrice: 0, netPrice: 0, discountPercent: 0 }
  }

  // If variant is provided, check variant pricing first (variants have priority)
  if (variant) {
    console.log('💰 Checking variant pricing:', {
      hasSuppliers: !!variant.suppliers,
      supplierCount: variant.suppliers?.length || 0,
      hasPricing: !!variant.pricing,
      variantPricing: variant.pricing
    })
    
    // Check variant supplier-specific pricing first (most specific)
    if (supplierId && variant.suppliers && variant.suppliers.length > 0) {
      const supplierInfo = variant.suppliers.find(s => {
        const sId = s.supplierId?._id || s.supplierId
        if (!sId) return false
        const sIdStr = sId.toString ? sId.toString() : String(sId)
        const supplierIdStr = supplierId.toString ? supplierId.toString() : String(supplierId)
        return sIdStr === supplierIdStr
      })
      
      if (supplierInfo) {
        const listPrice = supplierInfo.listPrice || supplierInfo.lastPrice || 0
        const netPrice = supplierInfo.netPrice || 0
        const discountPercent = supplierInfo.discountPercent || 0
        const result = {
          listPrice,
          netPrice: netPrice || calculateNetPrice(listPrice, discountPercent),
          discountPercent,
          source: 'variant-supplier'
        }
        console.log('✅ Found variant supplier pricing:', result)
        return result
      }
    }
    
    // Use variant-level pricing (no supplier-specific override)
    const listPrice = variant.pricing?.listPrice || variant.pricing?.lastPrice || 0
    const discountPercent = variant.pricing?.discountPercent || 0
    const netPrice = variant.pricing?.netPrice || calculateNetPrice(listPrice, discountPercent)
    const result = { listPrice, netPrice, discountPercent, source: 'variant' }
    console.log('✅ Using variant pricing:', result)
    return result
  }

  // Check product-level supplier pricing
  if (supplierId && product.suppliers && product.suppliers.length > 0) {
    const supplierInfo = product.suppliers.find(s => {
      const sId = s.supplierId?._id || s.supplierId
      return sId && sId.toString() === supplierId.toString()
    })
    if (supplierInfo) {
      const listPrice = supplierInfo.listPrice || supplierInfo.lastPrice || 0
      const netPrice = supplierInfo.netPrice || 0
      const discountPercent = supplierInfo.discountPercent || 0
      return {
        listPrice,
        netPrice: netPrice || calculateNetPrice(listPrice, discountPercent),
        discountPercent
      }
    }
  }

  // Fall back to product lastPrice
  const listPrice = product.lastPrice || 0
  const result = {
    listPrice,
    netPrice: listPrice,
    discountPercent: 0
  }
  
  console.log('💰 Final pricing result:', result)
  return result
}

/**
 * Calculate net price from list price and discount percentage
 */
export function calculateNetPrice(listPrice, discountPercent) {
  if (!listPrice || listPrice <= 0) return 0
  if (!discountPercent || discountPercent <= 0) return listPrice
  return listPrice * (1 - discountPercent / 100)
}

/**
 * Parse inches from various string formats (client-side version)
 * Supports: "2"", "1 1/2"", "1/2"", "1-1/2"", "2.5"", "2"
 */
function parseInches(value) {
  if (typeof value === 'number') return value
  if (!value) return null
  
  const str = String(value).replace(/"/g, '').trim()
  if (!str || str === '-' || str === '') return null
  
  // Handle mixed numbers with fractions: "1 1/2" or "1-1/2"
  const fractionMatch = str.match(/(\d+)\s*[- ]\s*(\d+)\/(\d+)/)
  if (fractionMatch) {
    const whole = parseFloat(fractionMatch[1])
    const num = parseFloat(fractionMatch[2])
    const den = parseFloat(fractionMatch[3])
    if (den === 0) return null
    return whole + (num / den)
  }
  
  // Handle simple fractions: "1/2"
  const simpleFractionMatch = str.match(/^(\d+)\/(\d+)$/)
  if (simpleFractionMatch) {
    const num = parseFloat(simpleFractionMatch[1])
    const den = parseFloat(simpleFractionMatch[2])
    if (den === 0) return null
    return num / den
  }
  
  // Handle decimal numbers: "2.5"
  const decimalMatch = str.match(/^(\d+\.?\d*)$/)
  if (decimalMatch) {
    const num = parseFloat(decimalMatch[1])
    if (!isNaN(num)) return num
  }
  
  // Handle whole numbers: "2"
  const wholeMatch = str.match(/^(\d+)$/)
  if (wholeMatch) {
    return parseFloat(wholeMatch[1])
  }
  
  return null
}

/**
 * Compare two inch values
 */
function compareInches(a, b, tolerance = 0.01) {
  const aNum = parseInches(a)
  const bNum = parseInches(b)
  if (aNum === null || bNum === null) return false
  return Math.abs(aNum - bNum) < tolerance
}

/**
 * Check if value is within range
 */
function isInRange(value, min, max) {
  const num = parseInches(value)
  if (num === null) return false
  
  if (min !== null && min !== undefined) {
    const minNum = parseInches(min)
    if (minNum === null) return false
    if (num < minNum) return false
  }
  
  if (max !== null && max !== undefined) {
    const maxNum = parseInches(max)
    if (maxNum === null) return false
    if (num > maxNum) return false
  }
  
  return true
}

/**
 * Normalize property key (get canonical key)
 */
function getCanonicalKey(key) {
  const mappings = {
    'pipe_size': 'pipe_diameter',
    'diameter': 'pipe_diameter',
    'pipeSize': 'pipe_diameter',
    'thickness': 'insulation_thickness',
    'insulationThickness': 'insulation_thickness',
    'wallThickness': 'wall_thickness',
    'pipeType': 'pipe_type',
    'type': 'pipe_type'
  }
  
  return mappings[key] || key
}

/**
 * Normalize property value based on key
 */
function normalizePropertyValue(key, value) {
  const inchProperties = [
    'pipe_diameter', 'pipe_size', 'insulation_thickness', 'thickness',
    'wall_thickness', 'width', 'height', 'length', 'dimensions'
  ]
  
  const normalizedKey = getCanonicalKey(key).toLowerCase()
  if (inchProperties.some(prop => normalizedKey.includes(prop) || prop.includes(normalizedKey))) {
    const parsed = parseInches(value)
    return parsed !== null ? parsed : value
  }
  
  return typeof value === 'string' ? value.toLowerCase() : value
}

/**
 * Find matching variant based on properties
 * Enhanced with normalization and range support
 */
export function findMatchingVariant(variants, properties, supplierId = null) {
  if (!variants || !Array.isArray(variants) || variants.length === 0) return null
  if (!properties || Object.keys(properties).length === 0) return null

  // Convert properties to plain object if it's a Map
  const propsObj = properties instanceof Map 
    ? Object.fromEntries(properties) 
    : properties

  return variants.find(variant => {
    if (!variant.isActive) return false

    // Convert variant properties to plain object if needed
    const variantProps = variant.properties instanceof Map
      ? Object.fromEntries(variant.properties)
      : variant.properties || {}

    // Check if all configured properties match variant properties
    return Object.entries(propsObj).every(([key, value]) => {
      // Skip empty values in the configured properties for matching
      if (value === null || value === '' || value === false ||
        (Array.isArray(value) && value.length === 0)) {
        return true
      }

      // Handle range objects: { min: '1"', max: '2"' }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value.min !== undefined || value.max !== undefined) {
          const canonicalKey = getCanonicalKey(key)
          const variantValue = variantProps[canonicalKey] || variantProps[key]
          if (variantValue === undefined || variantValue === null) return false
          return isInRange(variantValue, value.min, value.max)
        }
      }

      const canonicalKey = getCanonicalKey(key)
      const variantValue = variantProps[canonicalKey] || variantProps[key]
      if (variantValue === undefined || variantValue === null) return false

      // Handle array comparisons
      if (Array.isArray(value)) {
        return Array.isArray(variantValue) &&
          value.every(v => variantValue.includes(v))
      }

      // Normalize and compare values
      const normalizedValue = normalizePropertyValue(canonicalKey, value)
      const normalizedVariant = normalizePropertyValue(canonicalKey, variantValue)

      // For numeric values (inches), use numeric comparison
      if (typeof normalizedValue === 'number' && typeof normalizedVariant === 'number') {
        return compareInches(normalizedValue, normalizedVariant)
      }

      // String comparison (case-insensitive)
      return String(normalizedVariant).toLowerCase() === String(normalizedValue).toLowerCase() ||
        variantValue === value
    })
  })
}

