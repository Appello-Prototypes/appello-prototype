const mongoose = require('mongoose');

/**
 * Unit of Measure Model
 * 
 * Defines standard units of measure for construction materials.
 * Supports both Imperial and Metric systems.
 * Industry-standard units for construction materials.
 */
const unitOfMeasureSchema = new mongoose.Schema({
  // Unit Code (unique identifier)
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  }, // 'IN', 'FT', 'M', 'MM', 'LB', 'KG', etc.
  
  // Display Information
  name: {
    type: String,
    required: true,
    trim: true
  }, // 'Inches', 'Feet', 'Meters', etc.
  abbreviation: {
    type: String,
    required: true,
    trim: true
  }, // 'in', 'ft', 'm', 'mm', 'lb', 'kg'
  symbol: {
    type: String,
    trim: true
  }, // '"', "'", 'm', 'mm', 'lb', 'kg'
  
  // System
  system: {
    type: String,
    enum: ['imperial', 'metric', 'both'],
    required: true,
    default: 'imperial'
  },
  
  // Category
  category: {
    type: String,
    enum: ['length', 'area', 'volume', 'weight', 'temperature', 'pressure', 'other'],
    required: true
  },
  
  // Conversion (to base unit in same category)
  conversionFactor: {
    type: Number,
    default: 1
  }, // Factor to convert to base unit (e.g., feet to inches: 12)
  baseUnit: {
    type: String,
    trim: true
  }, // Base unit code for conversions (e.g., 'IN' for length)
  
  // Usage
  usedFor: [{
    type: String,
    trim: true
  }], // ['dimension', 'thickness', 'weight', etc.]
  
  // Display Settings
  decimalPlaces: {
    type: Number,
    default: 2
  },
  displayFormat: {
    type: String,
    enum: ['decimal', 'fraction', 'mixed'],
    default: 'decimal'
  }, // How to display (e.g., fractions for inches)
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Standard Values (common values for this unit)
  standardValues: [{
    displayValue: String, // "1/2", "1", "1 1/2", "2"
    normalizedValue: Number, // 0.5, 1.0, 1.5, 2.0
    aliases: [String] // ["0.5", "1/2", "0.5""]
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (code already indexed via unique: true)
unitOfMeasureSchema.index({ system: 1 });
unitOfMeasureSchema.index({ category: 1 });
unitOfMeasureSchema.index({ isActive: 1 });

module.exports = mongoose.model('UnitOfMeasure', unitOfMeasureSchema);

