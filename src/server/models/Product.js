const mongoose = require('mongoose');

// Product variant schema
const productVariantSchema = new mongoose.Schema({
  // Variant identification
  sku: {
    type: String,
    trim: true,
    sparse: true // Allow null but enforce uniqueness when present
  },
  name: {
    type: String,
    trim: true
  },
  // Variant-specific property values
  properties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Normalized variant property values (for search/filtering)
  propertiesNormalized: {
    type: Map,
    of: Number,
    default: {}
  },
  // Variant property units
  propertyUnits: {
    type: Map,
    of: String,
    default: {}
  },
  // Variant-specific pricing (overrides product pricing)
  pricing: {
    standardCost: Number,
    lastPrice: Number, // Legacy field - use listPrice instead
    listPrice: Number, // List price from supplier
    netPrice: Number, // Net price after discount
    discountPercent: Number, // Discount percentage (0-100)
    discountAmount: Number // Discount amount (calculated or fixed)
  },
  // Variant-specific suppliers
  suppliers: [{
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    supplierPartNumber: String,
    lastPrice: Number, // Legacy field - use listPrice instead
    listPrice: Number, // List price from supplier
    netPrice: Number, // Net price after discount
    discountPercent: Number, // Discount percentage for this supplier
    lastPurchasedDate: Date,
    isPreferred: {
      type: Boolean,
      default: false
    }
  }],
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const supplierInfoSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  supplierPartNumber: {
    type: String,
    trim: true
  },
  lastPrice: {
    type: Number,
    min: 0,
    default: 0
  }, // Legacy field - use listPrice instead
  listPrice: {
    type: Number,
    min: 0
  }, // List price from supplier
  netPrice: {
    type: Number,
    min: 0
  }, // Net price after discount
  discountPercent: {
    type: Number,
    min: 0,
    max: 100
  }, // Discount percentage for this supplier
  lastPurchasedDate: {
    type: Date
  },
  isPreferred: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  // Product Identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  internalPartNumber: {
    type: String,
    trim: true
  },
  
  // Product Type (for configurable properties)
  productTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType'
  },
  
  // Custom Properties (dynamic based on product type)
  properties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Normalized Property Values (for cross-unit search/filtering)
  // Stores normalized values in base units (e.g., mm for length, kg for weight)
  propertiesNormalized: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Property Units (stores unit for each property, e.g., "in", "mm", "lb")
  propertyUnits: {
    type: Map,
    of: String,
    default: {}
  },
  
  // Product Variants (if product type supports variants)
  variants: {
    type: [productVariantSchema],
    default: []
  },
  
  // Multiple Suppliers Support
  suppliers: {
    type: [supplierInfoSchema],
    default: []
  },
  
  // Legacy fields (deprecated, kept for backward compatibility)
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  supplierCatalogNumber: {
    type: String,
    trim: true
  },
  
  // Pricing (deprecated, use suppliers[].lastPrice)
  lastPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  standardCost: {
    type: Number,
    min: 0
  },
  
  // Unit of Measure
  unitOfMeasure: {
    type: String,
    enum: ['EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ_FT', 'GAL', 'LB', 'KG', 'OTHER'],
    required: true,
    default: 'EA'
  },
  
  // Category (optional, for filtering/reporting)
  category: {
    type: String,
    trim: true
  },
  
  // Pricebook Metadata (for organizing by pricebook structure)
  pricebookSection: {
    type: String,
    trim: true,
    index: true
  },
  pricebookPageNumber: {
    type: String,
    trim: true,
    index: true
  },
  pricebookPageName: {
    type: String,
    trim: true
  },
  pricebookGroupCode: {
    type: String,
    trim: true,
    index: true
  },
  
  // Product-Level Discount (applies to all variants by default)
  productDiscount: {
    discountPercent: {
      type: Number,
      min: 0,
      max: 100
    },
    effectiveDate: {
      type: Date
    },
    expiresDate: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    }
  },
  
  // Historical Discount/Pricing Records (for tracking price changes over time)
  discountHistory: [{
    discountPercent: {
      type: Number,
      min: 0,
      max: 100
    },
    effectiveDate: {
      type: Date,
      required: true
    },
    expiresDate: {
      type: Date
    },
    appliedDate: {
      type: Date,
      default: Date.now
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true
    },
    // Snapshot of variant pricing at time of discount change
    variantSnapshots: [{
      variantId: mongoose.Schema.Types.ObjectId,
      variantName: String,
      sku: String,
      listPrice: Number,
      netPrice: Number,
      discountPercent: Number,
      properties: Map
    }]
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastPurchasedDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to migrate legacy supplierId to suppliers array and normalize properties
productSchema.pre('save', async function(next) {
  // If suppliers array is empty but supplierId exists, migrate it
  if ((!this.suppliers || this.suppliers.length === 0) && this.supplierId) {
    this.suppliers = [{
      supplierId: this.supplierId,
      supplierPartNumber: this.supplierCatalogNumber || '',
      lastPrice: this.lastPrice || 0,
      lastPurchasedDate: this.lastPurchasedDate
    }];
  }
  // Ensure at least one supplier exists (either in suppliers array or supplierId)
  if ((!this.suppliers || this.suppliers.length === 0) && !this.supplierId) {
    return next(new Error('Product must have at least one supplier'));
  }
  
  // Normalize product properties
  if (this.properties && this.properties.size > 0) {
    try {
      const { normalizeProperties } = require('../services/propertyNormalizationService');
      const { propertiesNormalized, propertyUnits } = await normalizeProperties(this.properties);
      this.propertiesNormalized = propertiesNormalized;
      this.propertyUnits = propertyUnits;
    } catch (error) {
      console.error('Error normalizing product properties:', error);
      // Don't fail save if normalization fails - just log error
    }
  }
  
  // Normalize variant properties
  if (this.variants && this.variants.length > 0) {
    try {
      const { normalizeProperties } = require('../services/propertyNormalizationService');
      for (const variant of this.variants) {
        if (variant.properties && (variant.properties instanceof Map ? variant.properties.size > 0 : Object.keys(variant.properties).length > 0)) {
          const { propertiesNormalized, propertyUnits } = await normalizeProperties(variant.properties);
          variant.propertiesNormalized = propertiesNormalized;
          variant.propertyUnits = propertyUnits;
        }
      }
    } catch (error) {
      console.error('Error normalizing variant properties:', error);
      // Don't fail save if normalization fails
    }
  }
  
  // Validate normalized values match original values (data integrity check)
  if (this.propertiesNormalized && this.propertiesNormalized.size > 0 && this.propertyUnits && this.propertyUnits.size > 0) {
    try {
      const { normalizeProperty } = require('../services/propertyNormalizationService');
      
      for (const [key, normalizedValue] of this.propertiesNormalized) {
        const originalValue = this.properties.get(key);
        const unit = this.propertyUnits.get(key);
        
        if (originalValue !== undefined && originalValue !== null && unit) {
          const { normalizedValue: expectedNormalized } = await normalizeProperty(key, originalValue);
          
          if (expectedNormalized !== null && Math.abs(normalizedValue - expectedNormalized) > 0.1) {
            // Recalculate if mismatch (within tolerance)
            const { normalizeProperties } = require('../services/propertyNormalizationService');
            const { propertiesNormalized: recalculated } = await normalizeProperties(this.properties);
            this.propertiesNormalized = recalculated;
            break; // Recalculated, exit loop
          }
        }
      }
    } catch (error) {
      console.error('Error validating normalized properties:', error);
      // Don't fail save - just log error
    }
  }
  
  next();
});

// Indexes
productSchema.index({ name: 'text', description: 'text' }); // Text search
productSchema.index({ supplierId: 1 }); // Legacy index
productSchema.index({ 'suppliers.supplierId': 1 }); // New index for supplier lookup
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: 1, supplierId: 1 }); // Legacy compound index
productSchema.index({ internalPartNumber: 1 }); // Internal part number lookup
productSchema.index({ productTypeId: 1 }); // Product type lookup
productSchema.index({ 'variants.sku': 1 }); // Variant SKU lookup

// Indexes for normalized property searches (common dimension properties)
// Note: MongoDB Map indexes require dot notation, but we'll query using $expr for flexibility
productSchema.index({ 'propertiesNormalized.width': 1 });
productSchema.index({ 'propertiesNormalized.height': 1 });
productSchema.index({ 'propertiesNormalized.length': 1 });
productSchema.index({ 'propertiesNormalized.pipe_diameter': 1 });
productSchema.index({ 'propertiesNormalized.insulation_thickness': 1 });
productSchema.index({ 'propertiesNormalized.wall_thickness': 1 });

module.exports = mongoose.model('Product', productSchema);

