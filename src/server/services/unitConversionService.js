/**
 * Unit Conversion Service
 * 
 * Handles conversion between Imperial and Metric units for property values.
 * Enables searching/filtering across products with different unit systems.
 */

const UnitOfMeasure = require('../models/UnitOfMeasure');

// Base units for each measurement type (for normalization)
const BASE_UNITS = {
  length: 'mm',      // Millimeters (metric base)
  area: 'sq_m',     // Square meters (metric base)
  volume: 'l',      // Liters (metric base)
  weight: 'kg',      // Kilograms (metric base)
  temperature: 'c',  // Celsius (metric base)
  time: 's',        // Seconds (SI base)
  count: 'ea',      // Each (no conversion)
  other: null       // No base unit
};

// Conversion factors to base unit (multiply by this to get base unit)
const CONVERSION_TO_BASE = {
  // Length (to mm)
  'in': 25.4,           // inches to mm
  'ft': 304.8,           // feet to mm
  'yd': 914.4,           // yards to mm
  'mi': 1609344,         // miles to mm
  'mm': 1,               // millimeters (base)
  'cm': 10,              // centimeters to mm
  'm': 1000,             // meters to mm
  'km': 1000000,         // kilometers to mm
  
  // Area (to sq_m)
  'sq_ft': 0.092903,     // square feet to sq_m
  'sq_in': 0.00064516,   // square inches to sq_m
  'sq_yd': 0.836127,     // square yards to sq_m
  'sq_m': 1,             // square meters (base)
  'sq_km': 1000000,     // square kilometers to sq_m
  
  // Volume (to liters)
  'gal': 3.78541,        // gallons to liters
  'qt': 0.946353,        // quarts to liters
  'pt': 0.473176,        // pints to liters
  'fl_oz': 0.0295735,    // fluid ounces to liters
  'l': 1,                // liters (base)
  'ml': 0.001,           // milliliters to liters
  
  // Weight (to kg)
  'lb': 0.453592,        // pounds to kg
  'oz': 0.0283495,       // ounces to kg
  'kg': 1,               // kilograms (base)
  'g': 0.001,            // grams to kg
  'ton': 907.185,        // US tons to kg
  
  // Temperature (to Celsius)
  'f': null,             // Fahrenheit (special conversion)
  'c': null,             // Celsius (base, but no linear conversion)
  
  // Count (no conversion)
  'ea': 1,               // each
  'pcs': 1,              // pieces
  'ct': 1                // count
};

/**
 * Convert Fahrenheit to Celsius
 */
function fahrenheitToCelsius(f) {
  return (f - 32) * 5 / 9;
}

/**
 * Convert Celsius to Fahrenheit
 */
function celsiusToFahrenheit(c) {
  return (c * 9 / 5) + 32;
}

/**
 * Normalize a value to base unit
 * @param {number} value - The value to normalize
 * @param {string} unit - The unit code (e.g., 'in', 'mm', 'ft')
 * @param {string} type - The measurement type (e.g., 'length', 'weight')
 * @returns {number|null} Normalized value in base unit, or null if conversion not possible
 */
function normalizeToBase(value, unit, type = 'length') {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  
  const unitCode = unit?.toLowerCase()?.trim();
  if (!unitCode) {
    return value; // No unit specified, return as-is
  }
  
  // Handle temperature (special case)
  if (type === 'temperature') {
    if (unitCode === 'f' || unitCode === '°f' || unitCode === 'fahrenheit') {
      return fahrenheitToCelsius(value);
    }
    if (unitCode === 'c' || unitCode === '°c' || unitCode === 'celsius') {
      return value; // Celsius is base
    }
    return value; // Unknown, return as-is
  }
  
  // Get conversion factor
  const factor = CONVERSION_TO_BASE[unitCode];
  if (factor === undefined || factor === null) {
    // Unit not found - try to find by alias or return as-is
    return value;
  }
  
  return value * factor;
}

/**
 * Convert normalized value back to target unit
 * @param {number} normalizedValue - Value in base unit
 * @param {string} targetUnit - Target unit code
 * @param {string} type - Measurement type
 * @returns {number|null} Value in target unit
 */
function convertFromBase(normalizedValue, targetUnit, type = 'length') {
  if (normalizedValue === null || normalizedValue === undefined || isNaN(normalizedValue)) {
    return null;
  }
  
  const unitCode = targetUnit?.toLowerCase()?.trim();
  if (!unitCode) {
    return normalizedValue;
  }
  
  // Handle temperature (special case)
  if (type === 'temperature') {
    if (unitCode === 'f' || unitCode === '°f' || unitCode === 'fahrenheit') {
      return celsiusToFahrenheit(normalizedValue);
    }
    if (unitCode === 'c' || unitCode === '°c' || unitCode === 'celsius') {
      return normalizedValue; // Celsius is base
    }
    return normalizedValue;
  }
  
  // Get conversion factor
  const factor = CONVERSION_TO_BASE[unitCode];
  if (factor === undefined || factor === null || factor === 0) {
    return normalizedValue;
  }
  
  return normalizedValue / factor;
}

/**
 * Convert value from one unit to another
 * @param {number} value - Value to convert
 * @param {string} fromUnit - Source unit code
 * @param {string} toUnit - Target unit code
 * @param {string} type - Measurement type
 * @returns {number|null} Converted value
 */
function convert(value, fromUnit, toUnit, type = 'length') {
  const normalized = normalizeToBase(value, fromUnit, type);
  if (normalized === null) return null;
  return convertFromBase(normalized, toUnit, type);
}

/**
 * Compare two values with different units
 * @param {number} value1 - First value
 * @param {string} unit1 - First unit
 * @param {number} value2 - Second value
 * @param {string} unit2 - Second unit
 * @param {string} type - Measurement type
 * @param {number} tolerance - Comparison tolerance (default: 0.01)
 * @returns {boolean} True if values are equal (within tolerance)
 */
function compareValues(value1, unit1, value2, unit2, type = 'length', tolerance = 0.01) {
  const norm1 = normalizeToBase(value1, unit1, type);
  const norm2 = normalizeToBase(value2, unit2, type);
  
  if (norm1 === null || norm2 === null) {
    return false;
  }
  
  return Math.abs(norm1 - norm2) < tolerance;
}

/**
 * Check if value is within range (handles different units)
 * @param {number} value - Value to check
 * @param {string} valueUnit - Unit of value
 * @param {number|null} min - Minimum value
 * @param {string|null} minUnit - Unit of minimum value
 * @param {number|null} max - Maximum value
 * @param {string|null} maxUnit - Unit of maximum value
 * @param {string} type - Measurement type
 * @returns {boolean} True if value is within range
 */
function isInRange(value, valueUnit, min, minUnit, max, maxUnit, type = 'length') {
  const normValue = normalizeToBase(value, valueUnit, type);
  if (normValue === null) return false;
  
  if (min !== null && min !== undefined) {
    const normMin = normalizeToBase(min, minUnit || valueUnit, type);
    if (normMin === null) return false;
    if (normValue < normMin) return false;
  }
  
  if (max !== null && max !== undefined) {
    const normMax = normalizeToBase(max, maxUnit || valueUnit, type);
    if (normMax === null) return false;
    if (normValue > normMax) return false;
  }
  
  return true;
}

/**
 * Get base unit for a measurement type
 * @param {string} type - Measurement type
 * @returns {string|null} Base unit code
 */
function getBaseUnit(type) {
  return BASE_UNITS[type] || null;
}

/**
 * Format value with unit for display
 * @param {number} value - Value to format
 * @param {string} unit - Unit code
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string (e.g., "12.00 in")
 */
function formatValue(value, unit, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  const formatted = value.toFixed(decimals).replace(/\.?0+$/, '');
  return `${formatted} ${unit}`;
}

module.exports = {
  normalizeToBase,
  convertFromBase,
  convert,
  compareValues,
  isInRange,
  getBaseUnit,
  formatValue,
  BASE_UNITS,
  CONVERSION_TO_BASE
};

