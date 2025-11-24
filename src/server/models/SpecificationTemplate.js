const mongoose = require('mongoose');

const specificationTemplateSchema = new mongoose.Schema({
  // Template Identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }, // null = company-wide template
  
  // Same structure as Specification but without jobId
  conditions: {
    pipeTypes: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    minDiameter: {
      type: String,
      trim: true
    },
    maxDiameter: {
      type: String,
      trim: true
    },
    temperatureRange: {
      min: Number,
      max: Number
    }
  },
  
  productTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType'
  },
  requiredProperties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  propertyMatchingRules: [{
    propertyKey: {
      type: String,
      required: true
    },
    matchType: {
      type: String,
      enum: ['exact', 'range', 'min', 'max', 'enum', 'contains'],
      default: 'exact'
    },
    value: mongoose.Schema.Types.Mixed,
    normalize: {
      type: Boolean,
      default: true
    }
  }],
  
  preferredSupplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  allowOtherSuppliers: {
    type: Boolean,
    default: false
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
specificationTemplateSchema.index({ companyId: 1, isActive: 1 });
specificationTemplateSchema.index({ productTypeId: 1 });
specificationTemplateSchema.index({ name: 1 });

module.exports = mongoose.model('SpecificationTemplate', specificationTemplateSchema);

