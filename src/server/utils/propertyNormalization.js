/**
 * Property normalization utilities for specification matching
 * Handles conversion of text-based property values to comparable formats
 */

/**
 * Parse inches from various string formats
 * Supports: "2"", "1 1/2"", "1/2"", "1-1/2"", "2.5"", "2"
 * Returns: number (inches as decimal) or null if invalid
 * 
 * Examples:
 *   "2"" -> 2.0
 *   "1 1/2"" -> 1.5
 *   "1/2"" -> 0.5
 *   "1-1/2"" -> 1.5
 *   "2.5"" -> 2.5
 *   "2" -> 2.0
 */
function parseInches(value) {
  if (typeof value === 'number') return value;
  if (!value) return null;
  
  const str = String(value).replace(/"/g, '').trim();
  if (!str || str === '-' || str === '') return null;
  
  // Handle mixed numbers with fractions: "1 1/2" or "1-1/2" or "1/2"
  const fractionMatch = str.match(/(\d+)\s*[- ]\s*(\d+)\/(\d+)/);
  if (fractionMatch) {
    const whole = parseFloat(fractionMatch[1]);
    const num = parseFloat(fractionMatch[2]);
    const den = parseFloat(fractionMatch[3]);
    if (den === 0) return null;
    return whole + (num / den);
  }
  
  // Handle simple fractions: "1/2" or "3/4"
  const simpleFractionMatch = str.match(/^(\d+)\/(\d+)$/);
  if (simpleFractionMatch) {
    const num = parseFloat(simpleFractionMatch[1]);
    const den = parseFloat(simpleFractionMatch[2]);
    if (den === 0) return null;
    return num / den;
  }
  
  // Handle decimal numbers: "2.5" or "2.75"
  const decimalMatch = str.match(/^(\d+\.?\d*)$/);
  if (decimalMatch) {
    const num = parseFloat(decimalMatch[1]);
    if (!isNaN(num)) return num;
  }
  
  // Handle whole numbers: "2" or "10"
  const wholeMatch = str.match(/^(\d+)$/);
  if (wholeMatch) {
    return parseFloat(wholeMatch[1]);
  }
  
  return null;
}

/**
 * Compare two inch values (handles strings and numbers)
 * Returns: true if values are equal (within tolerance), false otherwise
 * 
 * @param {string|number} a - First value
 * @param {string|number} b - Second value
 * @param {number} tolerance - Tolerance for comparison (default: 0.01)
 */
function compareInches(a, b, tolerance = 0.01) {
  const aNum = parseInches(a);
  const bNum = parseInches(b);
  if (aNum === null || bNum === null) return false;
  return Math.abs(aNum - bNum) < tolerance;
}

/**
 * Check if value is within range
 * Returns: true if value is >= min and <= max, false otherwise
 * 
 * @param {string|number} value - Value to check
 * @param {string|number|null} min - Minimum value (null = no minimum)
 * @param {string|number|null} max - Maximum value (null = no maximum)
 */
function isInRange(value, min, max) {
  const num = parseInches(value);
  if (num === null) return false;
  
  if (min !== null && min !== undefined) {
    const minNum = parseInches(min);
    if (minNum === null) return false;
    if (num < minNum) return false;
  }
  
  if (max !== null && max !== undefined) {
    const maxNum = parseInches(max);
    if (maxNum === null) return false;
    if (num > maxNum) return false;
  }
  
  return true;
}

/**
 * Normalize property value based on property key
 * Automatically applies appropriate normalization function
 * 
 * @param {string} key - Property key (e.g., 'pipe_diameter', 'insulation_thickness')
 * @param {string|number} value - Property value to normalize
 * @returns {number|string} Normalized value
 */
function normalizePropertyValue(key, value) {
  // Properties that should be normalized as inches
  const inchProperties = [
    'pipe_diameter',
    'pipe_size',
    'insulation_thickness',
    'thickness',
    'wall_thickness',
    'width',
    'height',
    'length',
    'dimensions' // May contain inches, will attempt to parse
  ];
  
  // Check if key matches any inch property (including aliases)
  const normalizedKey = key.toLowerCase();
  if (inchProperties.some(prop => normalizedKey.includes(prop) || prop.includes(normalizedKey))) {
    const parsed = parseInches(value);
    return parsed !== null ? parsed : value; // Return original if can't parse
  }
  
  // For other properties, return as-is (or add more normalization functions)
  return value;
}

/**
 * Compare two property values with normalization
 * 
 * @param {string} key - Property key
 * @param {string|number} a - First value
 * @param {string|number} b - Second value
 * @returns {boolean} True if values match
 */
function comparePropertyValues(key, a, b) {
  const normalizedA = normalizePropertyValue(key, a);
  const normalizedB = normalizePropertyValue(key, b);
  
  // If normalization produced numbers, use numeric comparison
  if (typeof normalizedA === 'number' && typeof normalizedB === 'number') {
    return compareInches(normalizedA, normalizedB);
  }
  
  // Otherwise, use string comparison (case-insensitive)
  return String(normalizedA).toLowerCase() === String(normalizedB).toLowerCase();
}

module.exports = {
  parseInches,
  compareInches,
  isInRange,
  normalizePropertyValue,
  comparePropertyValues
};

