const mongoose = require('mongoose');

/**
 * Global Property Definition Model
 * 
 * Defines canonical properties used across all product types.
 * Ensures consistent property keys, values, and validation across the application.
 */
const propertyDefinitionSchema = new mongoose.Schema({
  // Canonical Key (unique identifier)
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_]+$/, 'Property key must contain only lowercase letters, numbers, and underscores']
  },
  
  // Display Information
  label: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['dimension', 'material', 'specification', 'performance', 'other'],
    default: 'other'
  },
  
  // Data Type & Validation
  dataType: {
    type: String,
    enum: ['text', 'number', 'fraction', 'boolean', 'date', 'enum'],
    required: true
  },
  unit: {
    type: String,
    trim: true
  }, // 'inches', 'feet', 'pounds', etc. (legacy - use unitOfMeasureId)
  unitOfMeasureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UnitOfMeasure'
  }, // Reference to UnitOfMeasure for standardized units
  unitSystem: {
    type: String,
    enum: ['imperial', 'metric', 'both'],
    default: 'imperial'
  }, // Preferred unit system
  
  // Normalization & Comparison
  normalization: {
    // Function name to use for normalization (e.g., 'parseInches', 'parseFraction')
    function: {
      type: String,
      enum: ['parseInches', 'parseFraction', 'parseNumber', 'toLowerCase', 'none'],
      default: 'none'
    },
    // Comparison tolerance for numeric values
    tolerance: {
      type: Number,
      default: 0.01
    }
  },
  
  // Enum Options (for enum dataType)
  enumOptions: [{
    value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    aliases: [{
      type: String,
      trim: true,
      lowercase: true
    }] // Alternative values that map to this option
  }],
  
  // Validation Rules
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String, // Regex pattern
    required: {
      type: Boolean,
      default: false
    },
    message: String // Custom validation message
  },
  
  // Property Aliases (other keys that mean the same thing)
  aliases: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Standard Values (for common values with normalized representations)
  // When standardValues exist, property should use dropdown instead of text input
  standardValues: [{
    displayValue: String, // How it's displayed: "1 1/2""
    normalizedValue: mongoose.Schema.Types.Mixed, // Normalized: 1.5
    aliases: [String], // Alternative representations: ["1-1/2"", "1.5""]
    unit: String // Optional: unit for this value (if different from property unit)
  }],
  useStandardValuesAsDropdown: {
    type: Boolean,
    default: false
  }, // If true, always show dropdown when standardValues exist
  
  // UI Display Settings
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
    },
    inputType: {
      type: String,
      enum: ['text', 'number', 'select', 'multiselect', 'checkbox', 'date'],
      default: 'text'
    }
  },
  
  // Usage Tracking
  usedInProductTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType'
  }],
  
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

// Indexes
propertyDefinitionSchema.index({ key: 1 });
propertyDefinitionSchema.index({ category: 1 });
propertyDefinitionSchema.index({ dataType: 1 });
propertyDefinitionSchema.index({ isActive: 1 });
propertyDefinitionSchema.index({ 'aliases': 1 });

// Virtual: All possible keys (canonical + aliases)
propertyDefinitionSchema.virtual('allKeys').get(function() {
  return [this.key, ...(this.aliases || [])];
});

module.exports = mongoose.model('PropertyDefinition', propertyDefinitionSchema);

