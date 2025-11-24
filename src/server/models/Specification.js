const mongoose = require('mongoose');

const specificationSchema = new mongoose.Schema({
  // Job and System/Area References
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  systemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System'
  },
  systemName: {
    type: String,
    trim: true
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area'
  },
  areaName: {
    type: String,
    trim: true
  },
  
  // Specification Identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Matching Conditions (all optional - null means "any")
  conditions: {
    pipeTypes: [{
      type: String,
      trim: true,
      lowercase: true
    }], // ['copper', 'iron']
    minDiameter: {
      type: String,
      trim: true
    }, // '1/2"' (will be normalized)
    maxDiameter: {
      type: String,
      trim: true
    }, // '2"' (will be normalized)
    temperatureRange: {
      min: Number,
      max: Number
    },
    // Add more condition types as needed
  },
  
  // Product Selection Rules
  productTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType'
  },
  requiredProperties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Property Matching Rules (enhanced matching with normalization)
  propertyMatchingRules: [{
    propertyKey: {
      type: String,
      required: true
    }, // Canonical property key
    matchType: {
      type: String,
      enum: ['exact', 'range', 'min', 'max', 'enum', 'contains'],
      default: 'exact'
    },
    value: mongoose.Schema.Types.Mixed, // Exact value or range object
    normalize: {
      type: Boolean,
      default: true
    } // Use normalization for comparison
  }],
  
  // Supplier Preferences
  preferredSupplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  allowOtherSuppliers: {
    type: Boolean,
    default: false
  },
  
  // Priority (higher = more specific, checked first)
  priority: {
    type: Number,
    default: 0
  },
  
  // Template reference (if created from template)
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpecificationTemplate'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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

// Indexes for efficient querying
specificationSchema.index({ jobId: 1, systemId: 1, areaId: 1 });
specificationSchema.index({ jobId: 1, isActive: 1, priority: -1 });
specificationSchema.index({ productTypeId: 1 });
specificationSchema.index({ preferredSupplierId: 1 });

module.exports = mongoose.model('Specification', specificationSchema);

