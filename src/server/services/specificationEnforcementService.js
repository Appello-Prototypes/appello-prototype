/**
 * Specification Enforcement Service
 * 
 * Enforces that products/variants match active specifications when ordering
 */

const Specification = require('../models/Specification');
const { getCanonicalKey, normalizeProperty, compareProperty } = require('./propertyMappingService');
const { parseInches, isInRange } = require('../utils/propertyNormalization');

/**
 * Check if a product/variant matches active specifications for a given context
 * @param {Object} productOrVariant - Product or variant object
 * @param {string} jobId - Job ID
 * @param {string} systemId - System ID (optional)
 * @param {string} areaId - Area ID (optional)
 * @param {string} pipeType - Pipe type (optional)
 * @param {string} pipeDiameter - Pipe diameter (optional)
 * @returns {Promise<Object>} { allowed: boolean, matchingSpecs: Array, violations: Array }
 */
async function checkSpecificationCompliance(productOrVariant, jobId, systemId, areaId, pipeType, pipeDiameter) {
  if (!jobId) {
    return { allowed: true, matchingSpecs: [], violations: [] }; // No job = no restrictions
  }

  // Find active specifications for this context
  const specs = await Specification.find({
    jobId,
    isActive: true,
    $or: [
      { systemId: systemId || null },
      { systemId: null } // System-wide specs
    ],
    $or: [
      { areaId: areaId || null },
      { areaId: null } // Area-wide specs
    ]
  })
    .populate('productTypeId')
    .populate('preferredSupplierId')
    .sort({ priority: -1 });

  if (specs.length === 0) {
    return { allowed: true, matchingSpecs: [], violations: [] }; // No specs = no restrictions
  }

  const violations = [];
  const matchingSpecs = [];

  // Get product/variant properties
  const properties = productOrVariant.properties instanceof Map
    ? Object.fromEntries(productOrVariant.properties)
    : productOrVariant.properties || {};

  // Check each specification
  for (const spec of specs) {
    // Check if this spec applies to this context
    let appliesToContext = true;

    // Check system match
    if (systemId && spec.systemId) {
      if (spec.systemId.toString() !== systemId.toString()) {
        appliesToContext = false;
      }
    }

    // Check area match
    if (areaId && spec.areaId) {
      if (spec.areaId.toString() !== areaId.toString()) {
        appliesToContext = false;
      }
    }

    // Check conditions
    if (appliesToContext && spec.conditions) {
      // Check pipe type
      if (pipeType && spec.conditions.pipeTypes && spec.conditions.pipeTypes.length > 0) {
        if (!spec.conditions.pipeTypes.includes(pipeType.toLowerCase())) {
          appliesToContext = false;
        }
      }

      // Check diameter range
      if (pipeDiameter && appliesToContext) {
        const diameterNum = normalizeProperty('pipe_diameter', pipeDiameter);
        if (spec.conditions.minDiameter) {
          const minNum = normalizeProperty('pipe_diameter', spec.conditions.minDiameter);
          if (diameterNum === null || minNum === null || diameterNum < minNum) {
            appliesToContext = false;
          }
        }
        if (spec.conditions.maxDiameter) {
          const maxNum = normalizeProperty('pipe_diameter', spec.conditions.maxDiameter);
          if (diameterNum === null || maxNum === null || diameterNum > maxNum) {
            appliesToContext = false;
          }
        }
      }
    }

    if (!appliesToContext) {
      continue; // This spec doesn't apply to this context
    }

    // Check if product type matches
    if (spec.productTypeId) {
      const productTypeId = productOrVariant.productTypeId?._id || productOrVariant.productTypeId;
      if (!productTypeId || productTypeId.toString() !== spec.productTypeId._id.toString()) {
        violations.push({
          specId: spec._id,
          specName: spec.name,
          reason: `Product type mismatch. Specification requires: ${spec.productTypeId.name}`
        });
        continue;
      }
    }

    // Check required properties
    if (spec.requiredProperties && spec.requiredProperties.size > 0) {
      const requiredProps = spec.requiredProperties instanceof Map
        ? Object.fromEntries(spec.requiredProperties)
        : spec.requiredProperties;

      for (const [key, requiredValue] of Object.entries(requiredProps)) {
        const canonicalKey = getCanonicalKey(key);
        const productValue = properties[canonicalKey] || properties[key];

        if (!productValue) {
          violations.push({
            specId: spec._id,
            specName: spec.name,
            reason: `Missing required property: ${canonicalKey}`
          });
          continue;
        }

        // Check property matching rules
        if (spec.propertyMatchingRules && spec.propertyMatchingRules.length > 0) {
          const rule = spec.propertyMatchingRules.find(r => 
            getCanonicalKey(r.propertyKey) === canonicalKey
          );

          if (rule) {
            let matches = false;
            if (rule.normalize) {
              // Use normalized comparison
              switch (rule.matchType) {
                case 'exact':
                  matches = compareProperty(canonicalKey, productValue, rule.value);
                  break;
                case 'min':
                  const normalizedProduct = normalizeProperty(canonicalKey, productValue);
                  const normalizedMin = normalizeProperty(canonicalKey, rule.value);
                  matches = normalizedProduct !== null && normalizedMin !== null && normalizedProduct >= normalizedMin;
                  break;
                case 'max':
                  const normalizedProductMax = normalizeProperty(canonicalKey, productValue);
                  const normalizedMax = normalizeProperty(canonicalKey, rule.value);
                  matches = normalizedProductMax !== null && normalizedMax !== null && normalizedProductMax <= normalizedMax;
                  break;
                case 'range':
                  matches = isInRange(productValue, rule.value.min, rule.value.max);
                  break;
                case 'enum':
                  const normalizedProductEnum = normalizeProperty(canonicalKey, productValue);
                  matches = Array.isArray(rule.value) && rule.value.some(val => 
                    compareProperty(canonicalKey, normalizedProductEnum, val)
                  );
                  break;
              }
            } else {
              // Direct comparison
              matches = String(productValue).toLowerCase() === String(rule.value).toLowerCase();
            }

            if (!matches) {
              violations.push({
                specId: spec._id,
                specName: spec.name,
                reason: `Property ${canonicalKey} does not match specification requirement: ${rule.value}`
              });
            }
          } else {
            // Default: exact match
            if (!compareProperty(canonicalKey, productValue, requiredValue)) {
              violations.push({
                specId: spec._id,
                specName: spec.name,
                reason: `Property ${canonicalKey} does not match specification requirement: ${requiredValue}`
              });
            }
          }
        } else {
          // Default: exact match
          if (!compareProperty(canonicalKey, productValue, requiredValue)) {
            violations.push({
              specId: spec._id,
              specName: spec.name,
              reason: `Property ${canonicalKey} does not match specification requirement: ${requiredValue}`
            });
          }
        }
      }
    }

    // If no violations, this spec matches
    if (violations.length === 0 || !violations.some(v => v.specId.toString() === spec._id.toString())) {
      matchingSpecs.push(spec);
    }
  }

  // Product is allowed if it matches at least one specification OR there are no applicable specs
  const allowed = matchingSpecs.length > 0 || violations.length === 0;

  return {
    allowed,
    matchingSpecs,
    violations: violations.filter((v, i, arr) => 
      arr.findIndex(v2 => v2.specId.toString() === v.specId.toString()) === i
    ) // Remove duplicates
  };
}

/**
 * Filter products/variants to only those that match specifications
 * @param {Array} products - Array of products or variants
 * @param {Object} context - { jobId, systemId, areaId, pipeType, pipeDiameter }
 * @returns {Promise<Array>} Filtered array of products/variants
 */
async function filterBySpecifications(products, context) {
  const { jobId, systemId, areaId, pipeType, pipeDiameter } = context;

  if (!jobId) {
    return products; // No job = no filtering
  }

  const filtered = [];
  for (const product of products) {
    const compliance = await checkSpecificationCompliance(
      product,
      jobId,
      systemId,
      areaId,
      pipeType,
      pipeDiameter
    );
    if (compliance.allowed) {
      filtered.push(product);
    }
  }

  return filtered;
}

module.exports = {
  checkSpecificationCompliance,
  filterBySpecifications
};

