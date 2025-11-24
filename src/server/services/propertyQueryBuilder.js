/**
 * Property Query Builder
 * 
 * Builds MongoDB queries for property-based searches with automatic unit conversion.
 * Handles both legacy (simple values) and new (normalized) property formats.
 */

const { normalizeToBase, isInRange } = require('./unitConversionService');
const { getMeasurementType, getPropertyUnit } = require('./propertyNormalizationService');

/**
 * Build MongoDB query for property filters
 * @param {Object} filters - Property filters object
 *   Example: { width: { min: 10, max: 14, unit: 'in' }, height: { value: 12, unit: 'in' } }
 * @returns {Object} MongoDB query object
 */
async function buildPropertyQuery(filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return {};
  }
  
  const queryConditions = [];
  
  for (const [key, filter] of Object.entries(filters)) {
    // Skip empty/null/undefined filters
    if (!filter || filter === '' || filter === null || filter === undefined) continue;
    
    // Handle simple string values (from dropdowns) - treat as exact match
    if (typeof filter === 'string' || typeof filter === 'number') {
      // Simple string/number value - match exactly on both product and variant properties
      // For variants, use $elemMatch since variants is an array
      const exactMatchConditions = [
        { [`properties.${key}`]: filter },
        { 
          variants: {
            $elemMatch: {
              [`properties.${key}`]: filter
            }
          }
        }
      ];
      
      queryConditions.push({
        $or: exactMatchConditions
      });
      continue;
    }
    
    // Handle object format (for advanced filtering with ranges, units, etc.)
    if (typeof filter !== 'object') continue;
    
    const measurementType = await getMeasurementType(key);
    const defaultUnit = await getPropertyUnit(key);
    const unit = filter.unit || defaultUnit;
    
    if (!unit || measurementType === 'other') {
      // Can't normalize - use exact match on original property (both product and variant)
      if (filter.value !== undefined) {
        queryConditions.push({
          $or: [
            { [`properties.${key}`]: filter.value },
            { 
              variants: {
                $elemMatch: {
                  [`properties.${key}`]: filter.value
                }
              }
            }
          ]
        });
      }
      continue;
    }
    
    // Build normalized query
    const normalizedConditions = [];
    
    // Handle range query (min/max)
    if (filter.min !== undefined || filter.max !== undefined) {
      const minNormalized = filter.min !== undefined 
        ? normalizeToBase(filter.min, filter.minUnit || unit, measurementType)
        : null;
      const maxNormalized = filter.max !== undefined
        ? normalizeToBase(filter.max, filter.maxUnit || unit, measurementType)
        : null;
      
      if (minNormalized !== null || maxNormalized !== null) {
        const rangeQuery = {};
        if (minNormalized !== null) rangeQuery.$gte = minNormalized - 0.01; // Tolerance
        if (maxNormalized !== null) rangeQuery.$lte = maxNormalized + 0.01;
        
        // Check normalized properties (both product and variant)
        normalizedConditions.push({
          [`propertiesNormalized.${key}`]: rangeQuery
        });
        normalizedConditions.push({
          variants: {
            $elemMatch: {
              [`propertiesNormalized.${key}`]: rangeQuery
            }
          }
        });
        
        // Also check legacy format (for backward compatibility)
        if (filter.min !== undefined && filter.max !== undefined) {
          normalizedConditions.push({
            $and: [
              { [`properties.${key}`]: { $gte: filter.min - 0.01 } },
              { [`properties.${key}`]: { $lte: filter.max + 0.01 } }
            ]
          });
          normalizedConditions.push({
            variants: {
              $elemMatch: {
                $and: [
                  { [`properties.${key}`]: { $gte: filter.min - 0.01 } },
                  { [`properties.${key}`]: { $lte: filter.max + 0.01 } }
                ]
              }
            }
          });
        }
      }
    }
    
    // Handle exact value query
    if (filter.value !== undefined) {
      const normalizedValue = normalizeToBase(filter.value, unit, measurementType);
      
      if (normalizedValue !== null) {
        const rangeQuery = {
          $gte: normalizedValue - 0.01,
          $lte: normalizedValue + 0.01
        };
        
        normalizedConditions.push({
          [`propertiesNormalized.${key}`]: rangeQuery
        });
        normalizedConditions.push({
          variants: {
            $elemMatch: {
              [`propertiesNormalized.${key}`]: rangeQuery
            }
          }
        });
      }
      
      // Also check legacy format (exact match)
      normalizedConditions.push({
        [`properties.${key}`]: filter.value
      });
      normalizedConditions.push({
        variants: {
          $elemMatch: {
            [`properties.${key}`]: filter.value
          }
        }
      });
    }
    
    if (normalizedConditions.length > 0) {
      // Use $or to match either normalized or legacy format (product or variant)
      queryConditions.push({
        $or: normalizedConditions
      });
    }
  }
  
  if (queryConditions.length === 0) {
    return {};
  }
  
  // FACETED FILTERING: Combine all conditions with $and
  // Each filter narrows down the results - ALL filters must match
  // Example: { pipe_diameter: "2\"" } AND { thickness: "1\"" }
  // Results must have BOTH properties matching (either at product or variant level)
  return queryConditions.length === 1 ? queryConditions[0] : { $and: queryConditions };
}

/**
 * Build query for variant property filters
 * @param {Object} filters - Property filters (same format as buildPropertyQuery)
 * @returns {Object} MongoDB query for variants
 */
async function buildVariantPropertyQuery(filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return {};
  }
  
  const queryConditions = [];
  
  for (const [key, filter] of Object.entries(filters)) {
    if (!filter) continue;
    
    const measurementType = await getMeasurementType(key);
    const defaultUnit = await getPropertyUnit(key);
    const unit = filter.unit || defaultUnit;
    
    if (!unit || measurementType === 'other') {
      if (filter.value !== undefined) {
        queryConditions.push({
          'variants.properties': { $elemMatch: { [key]: filter.value } }
        });
      }
      continue;
    }
    
    const normalizedConditions = [];
    
    if (filter.min !== undefined || filter.max !== undefined) {
      const minNormalized = filter.min !== undefined
        ? normalizeToBase(filter.min, filter.minUnit || unit, measurementType)
        : null;
      const maxNormalized = filter.max !== undefined
        ? normalizeToBase(filter.max, filter.maxUnit || unit, measurementType)
        : null;
      
      if (minNormalized !== null || maxNormalized !== null) {
        const rangeQuery = {};
        if (minNormalized !== null) rangeQuery.$gte = minNormalized - 0.01;
        if (maxNormalized !== null) rangeQuery.$lte = maxNormalized + 0.01;
        
        normalizedConditions.push({
          'variants.propertiesNormalized': {
            $elemMatch: { [key]: rangeQuery }
          }
        });
      }
    }
    
    if (filter.value !== undefined) {
      const normalizedValue = normalizeToBase(filter.value, unit, measurementType);
      
      if (normalizedValue !== null) {
        normalizedConditions.push({
          'variants.propertiesNormalized': {
            $elemMatch: {
              [key]: {
                $gte: normalizedValue - 0.01,
                $lte: normalizedValue + 0.01
              }
            }
          }
        });
      }
    }
    
    if (normalizedConditions.length > 0) {
      queryConditions.push({
        $or: normalizedConditions
      });
    }
  }
  
  return queryConditions.length === 0 ? {} : (queryConditions.length === 1 ? queryConditions[0] : { $and: queryConditions });
}

module.exports = {
  buildPropertyQuery,
  buildVariantPropertyQuery
};

