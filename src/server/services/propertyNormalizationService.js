/**
 * Property Normalization Service
 * 
 * Handles normalization of product properties for cross-unit search/filtering.
 * Integrates with PropertyDefinition and UnitOfMeasure models.
 */

const PropertyDefinition = require('../models/PropertyDefinition');
const UnitOfMeasure = require('../models/UnitOfMeasure');
const { normalizeToBase } = require('./unitConversionService');
const { parseInches } = require('../utils/propertyNormalization');

// Cache for PropertyDefinitions (to avoid repeated DB queries)
let propertyDefinitionCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get PropertyDefinition by key (with caching)
 */
async function getPropertyDefinition(key) {
  // Refresh cache if expired
  if (!propertyDefinitionCache || !cacheTimestamp || Date.now() - cacheTimestamp > CACHE_TTL) {
    propertyDefinitionCache = await PropertyDefinition.find({ isActive: true }).lean();
    cacheTimestamp = Date.now();
  }
  
  return propertyDefinitionCache.find(pd => pd.key === key || (pd.aliases || []).includes(key));
}

/**
 * Get measurement type (category) for a property key
 */
async function getMeasurementType(key) {
  const propDef = await getPropertyDefinition(key);
  if (!propDef) {
    // Default based on key patterns
    if (key.includes('temperature') || key.includes('temp')) return 'temperature';
    if (key.includes('weight') || key.includes('mass')) return 'weight';
    if (key.includes('area') || key.includes('sq_')) return 'area';
    if (key.includes('volume') || key.includes('gal') || key.includes('l')) return 'volume';
    if (key.includes('dimension') || key.includes('width') || key.includes('height') || 
        key.includes('length') || key.includes('thickness') || key.includes('diameter') ||
        key.includes('gauge') || key.includes('size')) return 'length';
    return 'other';
  }
  
  // Get category from PropertyDefinition
  if (propDef.category === 'dimension') return 'length';
  if (propDef.category === 'performance') {
    // Check if it's temperature
    if (key.includes('temperature') || key.includes('temp')) return 'temperature';
  }
  
  // Map PropertyDefinition category to measurement type
  const categoryMap = {
    'dimension': 'length',
    'performance': 'other', // Will be refined by key inspection above
    'material': 'other',
    'specification': 'other',
    'other': 'other'
  };
  
  return categoryMap[propDef.category] || 'other';
}

/**
 * Get unit for a property key
 */
async function getPropertyUnit(key) {
  const propDef = await getPropertyDefinition(key);
  if (!propDef) return null;
  
  // Try unitOfMeasureId first
  if (propDef.unitOfMeasureId) {
    const uom = await UnitOfMeasure.findById(propDef.unitOfMeasureId).lean();
    if (uom) {
      return uom.abbreviation || uom.code.toLowerCase();
    }
  }
  
  // Fall back to unit field
  if (propDef.unit) {
    // Normalize unit string to code
    const unitMap = {
      'inches': 'in',
      'inch': 'in',
      'feet': 'ft',
      'foot': 'ft',
      'pounds': 'lb',
      'pound': 'lb',
      'kilograms': 'kg',
      'kilogram': 'kg',
      'millimeters': 'mm',
      'millimeter': 'mm',
      'centimeters': 'cm',
      'centimeter': 'cm',
      'meters': 'm',
      'meter': 'm',
      'square feet': 'sq_ft',
      'sq ft': 'sq_ft',
      'square meters': 'sq_m',
      'sq m': 'sq_m',
      'gallons': 'gal',
      'gallon': 'gal',
      'liters': 'l',
      'liter': 'l',
      'fahrenheit': 'f',
      'celsius': 'c'
    };
    
    return unitMap[propDef.unit.toLowerCase()] || propDef.unit.toLowerCase();
  }
  
  return null;
}

/**
 * Normalize a property value
 * @param {string} key - Property key
 * @param {any} value - Property value (string, number, etc.)
 * @returns {Object} { normalizedValue: number|null, unit: string|null, measurementType: string }
 */
async function normalizeProperty(key, value) {
  if (value === null || value === undefined || value === '') {
    return { normalizedValue: null, unit: null, measurementType: null };
  }
  
  // Get property metadata
  const propDef = await getPropertyDefinition(key);
  const unit = await getPropertyUnit(key);
  const measurementType = await getMeasurementType(key);
  
  if (!unit || !measurementType || measurementType === 'other') {
    // Can't normalize - return as-is
    return { normalizedValue: null, unit: null, measurementType: null };
  }
  
  // Parse value based on dataType
  let numericValue = null;
  
  if (propDef && propDef.dataType === 'fraction') {
    // Use parseInches for fraction values
    numericValue = parseInches(value);
  } else if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    // Try to parse as number
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      numericValue = parsed;
    } else {
      // Try parseInches for fraction strings
      numericValue = parseInches(value);
    }
  }
  
  if (numericValue === null || isNaN(numericValue)) {
    return { normalizedValue: null, unit: unit || null, measurementType };
  }
  
  // Normalize to base unit
  const normalizedValue = normalizeToBase(numericValue, unit, measurementType);
  
  return {
    normalizedValue: normalizedValue !== null ? normalizedValue : numericValue,
    unit: unit,
    measurementType
  };
}

/**
 * Normalize all properties in a Map
 * @param {Map|Object} properties - Properties Map or object
 * @returns {Object} { propertiesNormalized: Map, propertyUnits: Map }
 */
async function normalizeProperties(properties) {
  const propertiesNormalized = new Map();
  const propertyUnits = new Map();
  
  if (!properties) {
    return { propertiesNormalized, propertyUnits };
  }
  
  // Convert to Map if needed
  const propsMap = properties instanceof Map 
    ? properties 
    : new Map(Object.entries(properties));
  
  // Process each property
  for (const [key, value] of propsMap) {
    const normalized = await normalizeProperty(key, value);
    
    if (normalized.normalizedValue !== null) {
      propertiesNormalized.set(key, normalized.normalizedValue);
    }
    
    if (normalized.unit) {
      propertyUnits.set(key, normalized.unit);
    }
  }
  
  return { propertiesNormalized, propertyUnits };
}

module.exports = {
  getPropertyDefinition,
  getMeasurementType,
  getPropertyUnit,
  normalizeProperty,
  normalizeProperties
};

