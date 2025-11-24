const mongoose = require('mongoose');

// Property definition schema for configurable product properties
const propertyDefinitionSchema = new mongoose.Schema({
  // Reference to global PropertyDefinition (optional - for standardization)
  propertyDefinitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropertyDefinition'
  },
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_]+$/, 'Property key must contain only lowercase letters, numbers, and underscores']
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'date', 'enum', 'multiselect'],
    required: true
  },
  // Unit information (from PropertyDefinition or custom)
  unit: {
    type: String,
    trim: true
  }, // 'inches', 'feet', 'mm', 'cm', etc.
  unitOfMeasureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UnitOfMeasure'
  },
  unitSystem: {
    type: String,
    enum: ['imperial', 'metric', 'both'],
    default: 'imperial'
  },
  required: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed
  },
  // For enum/multiselect types
  options: [{
    value: String,
    label: String
  }],
  // Validation rules
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String, // Regex pattern
    message: String // Custom validation message
  },
  // UI display settings
  display: {
    order: {
      type: Number,
      default: 0
    },
    group: {
      type: String,
      trim: true
    },
    placeholder: String,
    helpText: String,
    hidden: {
      type: Boolean,
      default: false
    }
  },
  // Whether this property can be used for variant differentiation
  variantKey: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const productTypeSchema = new mongoose.Schema({
  // Product Type Identification
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Configurable Property Definitions
  properties: {
    type: [propertyDefinitionSchema],
    default: []
  },
  
  // Variant Configuration
  variantSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    // Properties that define variants (e.g., size, color, material)
    variantProperties: [{
      type: String, // Property keys
    }],
    // How to generate variant names (e.g., "{name} - {size} {color}")
    namingTemplate: {
      type: String,
      default: '{name} - {variant}'
    }
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

// Pre-save hook to generate slug from name
productTypeSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
productTypeSchema.index({ name: 1 });
productTypeSchema.index({ slug: 1 });
productTypeSchema.index({ isActive: 1 });
productTypeSchema.index({ 'properties.key': 1 });

module.exports = mongoose.model('ProductType', productTypeSchema);

