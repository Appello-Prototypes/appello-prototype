const mongoose = require('mongoose');
const Specification = require('../models/Specification');
const Product = require('../models/Product');
const { normalizeProperty, compareProperty, getCanonicalKey } = require('./propertyMappingService');
const { parseInches, isInRange } = require('../utils/propertyNormalization');

class SpecificationService {
  /**
   * Find matching specifications for given context
   * @param {Object} context - { jobId, systemId, areaId, pipeType, diameter, ... }
   * @returns {Array} Matching specifications sorted by priority
   */
  async findMatchingSpecs(context) {
    const { jobId, systemId, areaId, pipeType, diameter } = context;
    
    if (!jobId) {
      throw new Error('jobId is required');
    }
    
    // Build query
    const query = {
      jobId: new mongoose.Types.ObjectId(jobId),
      isActive: true,
      $or: []
    };
    
    // System matching: exact match or system-wide (null)
    if (systemId) {
      query.$or.push(
        { systemId: new mongoose.Types.ObjectId(systemId) },
        { systemId: null, systemName: null }
      );
      // Also check by name if systemId not available
      query.$or.push({ systemName: { $exists: false } });
    } else {
      query.$or.push({ systemId: null, systemName: null });
    }
    
    // Area matching: exact match or area-wide (null)
    if (areaId) {
      query.$or.push(
        { areaId: new mongoose.Types.ObjectId(areaId) },
        { areaId: null, areaName: null }
      );
    } else {
      query.$or.push({ areaId: null, areaName: null });
    }
    
    let specs = await Specification.find(query).lean();
    
    // Filter by conditions with normalization
    const matchingSpecs = specs.filter(spec => {
      // Check pipe type
      if (spec.conditions && spec.conditions.pipeTypes && spec.conditions.pipeTypes.length > 0 && pipeType) {
        const pipeTypeLower = String(pipeType).toLowerCase();
        if (!spec.conditions.pipeTypes.some(pt => pt.toLowerCase() === pipeTypeLower)) {
          return false;
        }
      }
      
      // Check diameter range (with normalization)
      if (diameter && spec.conditions) {
        const diameterNum = normalizeProperty('pipe_diameter', diameter);
        
        if (spec.conditions.minDiameter) {
          const minNum = normalizeProperty('pipe_diameter', spec.conditions.minDiameter);
          if (diameterNum === null || minNum === null || diameterNum < minNum) {
            return false;
          }
        }
        
        if (spec.conditions.maxDiameter) {
          const maxNum = normalizeProperty('pipe_diameter', spec.conditions.maxDiameter);
          if (diameterNum === null || maxNum === null || diameterNum > maxNum) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    // Sort by priority (higher = more specific)
    return matchingSpecs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  /**
   * Apply specification to product search parameters
   * @param {Object} spec - Specification object
   * @param {Object} searchParams - Current search parameters
   * @returns {Object} Enhanced search parameters
   */
  applySpecToProductSearch(spec, searchParams = {}) {
    const enhanced = { ...searchParams };
    
    // Add product type filter
    if (spec.productTypeId) {
      enhanced.productTypeId = spec.productTypeId;
    }
    
    // Add supplier filter
    if (spec.preferredSupplierId && !spec.allowOtherSuppliers) {
      enhanced.supplierId = spec.preferredSupplierId;
    }
    
    // Add property filters (will be used in variant matching)
    if (spec.requiredProperties) {
      enhanced.requiredProperties = spec.requiredProperties instanceof Map
        ? Object.fromEntries(spec.requiredProperties)
        : spec.requiredProperties;
    }
    
    // Add property matching rules
    if (spec.propertyMatchingRules) {
      enhanced.propertyMatchingRules = spec.propertyMatchingRules;
    }
    
    return enhanced;
  }
  
  /**
   * Find variants matching specification requirements
   * @param {Object} product - Product object with variants
   * @param {Object} spec - Specification object
   * @returns {Array} Matching variants
   */
  findVariantsMatchingSpec(product, spec) {
    if (!product.variants || product.variants.length === 0) return [];
    
    // Check product type match
    if (spec.productTypeId) {
      const productTypeId = product.productTypeId?._id || product.productTypeId;
      if (!productTypeId || productTypeId.toString() !== spec.productTypeId.toString()) {
        return [];
      }
    }
    
    // Match variants against specification
    return product.variants.filter(variant => {
      if (!variant.isActive) return false;
      
      const variantProps = variant.properties instanceof Map
        ? Object.fromEntries(variant.properties)
        : variant.properties || {};
      
      // Check required properties (exact matches)
      if (spec.requiredProperties) {
        const requiredProps = spec.requiredProperties instanceof Map
          ? Object.fromEntries(spec.requiredProperties)
          : spec.requiredProperties;
        
        for (const [key, requiredValue] of Object.entries(requiredProps)) {
          const canonicalKey = getCanonicalKey(key);
          const variantValue = variantProps[canonicalKey] || variantProps[key];
          
          if (!variantValue) return false;
          
          // Check property matching rules
          if (spec.propertyMatchingRules && spec.propertyMatchingRules.length > 0) {
            const rule = spec.propertyMatchingRules.find(r => 
              getCanonicalKey(r.propertyKey) === canonicalKey
            );
            
            if (rule) {
              if (rule.normalize) {
                // Use normalized comparison
                const normalizedRequired = normalizeProperty(canonicalKey, requiredValue);
                const normalizedVariant = normalizeProperty(canonicalKey, variantValue);
                
                if (rule.matchType === 'exact') {
                  if (typeof normalizedRequired === 'number' && typeof normalizedVariant === 'number') {
                    if (Math.abs(normalizedRequired - normalizedVariant) > 0.01) {
                      return false;
                    }
                  } else if (String(normalizedVariant).toLowerCase() !== String(normalizedRequired).toLowerCase()) {
                    return false;
                  }
                } else if (rule.matchType === 'max') {
                  if (typeof normalizedVariant === 'number' && typeof normalizedRequired === 'number') {
                    if (normalizedVariant > normalizedRequired) return false;
                  }
                } else if (rule.matchType === 'min') {
                  if (typeof normalizedVariant === 'number' && typeof normalizedRequired === 'number') {
                    if (normalizedVariant < normalizedRequired) return false;
                  }
                } else if (rule.matchType === 'range') {
                  const range = rule.value;
                  if (!isInRange(variantValue, range.min, range.max)) {
                    return false;
                  }
                }
              } else {
                // Exact string match (case-insensitive)
                if (String(variantValue).toLowerCase() !== String(requiredValue).toLowerCase()) {
                  return false;
                }
              }
            } else {
              // Default: exact match with normalization
              if (!compareProperty(canonicalKey, variantValue, requiredValue)) {
                return false;
              }
            }
          } else {
            // Default: exact match with normalization
            if (!compareProperty(canonicalKey, variantValue, requiredValue)) {
              return false;
            }
          }
        }
      }
      
      return true;
    });
  }
  
  /**
   * Get recommended product/variant for specification context
   * @param {Object} context - Specification context
   * @returns {Object} Recommended product and variant
   */
  async getRecommendedProduct(context) {
    const specs = await this.findMatchingSpecs(context);
    if (specs.length === 0) return null;
    
    const bestSpec = specs[0]; // Highest priority
    
    // Search for products matching spec
    const productQuery = {
      isActive: true
    };
    
    if (bestSpec.productTypeId) {
      productQuery.productTypeId = bestSpec.productTypeId;
    }
    
    if (bestSpec.preferredSupplierId && !bestSpec.allowOtherSuppliers) {
      productQuery.$or = [
        { manufacturerId: bestSpec.preferredSupplierId },
        { 'suppliers.manufacturerId': bestSpec.preferredSupplierId },
        { 'variants.suppliers.manufacturerId': bestSpec.preferredSupplierId }
      ];
    }
    
    const products = await Product.find(productQuery)
      .populate('productTypeId')
      .lean();
    
    // Find matching variants
    for (const product of products) {
      const matchingVariants = this.findVariantsMatchingSpec(product, bestSpec);
      if (matchingVariants.length > 0) {
        return {
          product,
          variant: matchingVariants[0], // Return first match
          specification: bestSpec
        };
      }
    }
    
    return null;
  }
}

module.exports = new SpecificationService();

