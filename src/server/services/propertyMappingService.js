/**
 * Property mapping service
 * Maps property keys to canonical keys and provides normalization
 */

const { parseInches, compareInches, normalizePropertyValue } = require('../utils/propertyNormalization');

/**
 * Property mappings: canonical keys with aliases and normalization functions
 */
const PROPERTY_MAPPINGS = {
  pipe_diameter: {
    canonicalKey: 'pipe_diameter',
    aliases: ['pipe_size', 'diameter', 'pipeSize'],
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  insulation_thickness: {
    canonicalKey: 'insulation_thickness',
    aliases: ['thickness', 'insulationThickness'],
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  wall_thickness: {
    canonicalKey: 'wall_thickness',
    aliases: ['thickness', 'wallThickness'],
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  width: {
    canonicalKey: 'width',
    aliases: [],
    category: 'dimension',
    dataType: 'number',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  height: {
    canonicalKey: 'height',
    aliases: [],
    category: 'dimension',
    dataType: 'number',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  length: {
    canonicalKey: 'length',
    aliases: [],
    category: 'dimension',
    dataType: 'number',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  pipe_type: {
    canonicalKey: 'pipe_type',
    aliases: ['pipeType', 'type'],
    category: 'material',
    dataType: 'enum',
    unit: null,
    normalize: (value) => String(value).toLowerCase(),
    compare: (a, b) => String(a).toLowerCase() === String(b).toLowerCase()
  },
  facing: {
    canonicalKey: 'facing',
    aliases: [],
    category: 'specification',
    dataType: 'enum',
    unit: null,
    normalize: (value) => String(value).toLowerCase(),
    compare: (a, b) => String(a).toLowerCase() === String(b).toLowerCase()
  },
  material: {
    canonicalKey: 'material',
    aliases: [],
    category: 'material',
    dataType: 'enum',
    unit: null,
    normalize: (value) => String(value).toLowerCase(),
    compare: (a, b) => String(a).toLowerCase() === String(b).toLowerCase()
  },
  gauge: {
    canonicalKey: 'gauge',
    aliases: [],
    category: 'specification',
    dataType: 'number',
    unit: null,
    normalize: (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    },
    compare: (a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum === bNum;
      }
      return String(a).toLowerCase() === String(b).toLowerCase();
    }
  }
};

/**
 * Get canonical key from any alias
 * 
 * @param {string} key - Property key (may be alias)
 * @returns {string} Canonical property key
 */
function getCanonicalKey(key) {
  if (!key) return key;
  
  const normalizedKey = key.toLowerCase();
  
  // Check if it's already a canonical key
  if (PROPERTY_MAPPINGS[normalizedKey]) {
    return PROPERTY_MAPPINGS[normalizedKey].canonicalKey;
  }
  
  // Check aliases
  for (const [canonical, config] of Object.entries(PROPERTY_MAPPINGS)) {
    if (canonical === normalizedKey || 
        config.aliases.some(alias => alias.toLowerCase() === normalizedKey)) {
      return config.canonicalKey;
    }
  }
  
  // Return original key if no mapping found
  return key;
}

/**
 * Get property mapping configuration
 * 
 * @param {string} key - Property key (may be alias)
 * @returns {Object|null} Property mapping configuration
 */
function getPropertyMapping(key) {
  const canonicalKey = getCanonicalKey(key);
  return PROPERTY_MAPPINGS[canonicalKey] || null;
}

/**
 * Normalize property value using appropriate normalization function
 * 
 * @param {string} key - Property key
 * @param {string|number} value - Property value
 * @returns {string|number} Normalized value
 */
function normalizeProperty(key, value) {
  const mapping = getPropertyMapping(key);
  if (mapping && mapping.normalize) {
    return mapping.normalize(value);
  }
  // Fallback to generic normalization
  return normalizePropertyValue(key, value);
}

/**
 * Compare two property values using appropriate comparison function
 * 
 * @param {string} key - Property key
 * @param {string|number} a - First value
 * @param {string|number} b - Second value
 * @returns {boolean} True if values match
 */
function compareProperty(key, a, b) {
  const mapping = getPropertyMapping(key);
  if (mapping && mapping.compare) {
    return mapping.compare(a, b);
  }
  // Fallback to string comparison
  return String(a).toLowerCase() === String(b).toLowerCase();
}

/**
 * Normalize all properties in an object
 * 
 * @param {Object|Map} properties - Properties object or Map
 * @returns {Object} Normalized properties object
 */
function normalizeProperties(properties) {
  if (!properties) return {};
  
  const propsObj = properties instanceof Map
    ? Object.fromEntries(properties)
    : properties;
  
  const normalized = {};
  for (const [key, value] of Object.entries(propsObj)) {
    const canonicalKey = getCanonicalKey(key);
    normalized[canonicalKey] = normalizeProperty(canonicalKey, value);
  }
  
  return normalized;
}

module.exports = {
  PROPERTY_MAPPINGS,
  getCanonicalKey,
  getPropertyMapping,
  normalizeProperty,
  compareProperty,
  normalizeProperties
};

