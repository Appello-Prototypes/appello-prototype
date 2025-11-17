const mongoose = require('mongoose');

const scheduleOfValuesSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  lineNumber: {
    type: String,
    required: true,
    trim: true
  },
  costCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // SOV Components
  systemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System'
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area'
  },
  phaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Phase'
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  componentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Component'
  },

  // Financial Information
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  margin: {
    type: Number,
    required: true,
    min: 0,
    max: 100 // Percentage
  },
  totalValue: {
    type: Number,
    min: 0
  },

  // Quantity and Units
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['LF', 'SF', 'EA', 'CY', 'TON', 'HR', 'LS', 'LB', 'GAL', 'FT', 'YD', 'SQ'],
    trim: true,
    uppercase: true
  },
  unitDescription: {
    type: String,
    trim: true
  },

  // Progress Tracking
  quantityComplete: {
    type: Number,
    default: 0,
    min: 0
  },
  percentComplete: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  valueEarned: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status and Metadata
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'on_hold'],
    default: 'not_started'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound indexes
scheduleOfValuesSchema.index({ jobId: 1, lineNumber: 1 }, { unique: true });
scheduleOfValuesSchema.index({ jobId: 1, costCode: 1 });
scheduleOfValuesSchema.index({ jobId: 1, sortOrder: 1 });
scheduleOfValuesSchema.index({ systemId: 1 });
scheduleOfValuesSchema.index({ areaId: 1 });
scheduleOfValuesSchema.index({ phaseId: 1 });
scheduleOfValuesSchema.index({ moduleId: 1 });
scheduleOfValuesSchema.index({ componentId: 1 });

// Virtual for unit rate
scheduleOfValuesSchema.virtual('unitRate').get(function() {
  return this.quantity > 0 ? this.totalValue / this.quantity : 0;
});

// Virtual for remaining quantity
scheduleOfValuesSchema.virtual('quantityRemaining').get(function() {
  return Math.max(0, this.quantity - this.quantityComplete);
});

// Virtual for remaining value
scheduleOfValuesSchema.virtual('valueRemaining').get(function() {
  return Math.max(0, this.totalValue - this.valueEarned);
});

// Virtual for margin amount
scheduleOfValuesSchema.virtual('marginAmount').get(function() {
  return this.totalCost * (this.margin / 100);
});

// Pre-save middleware to calculate total value from cost and margin
scheduleOfValuesSchema.pre('save', function(next) {
  // Always calculate totalValue if totalCost and margin are present
  if (this.totalCost !== undefined && this.margin !== undefined) {
    this.totalValue = this.totalCost * (1 + this.margin / 100);
  }
  
  // Calculate percent complete from quantity
  if (this.isModified('quantityComplete') || this.isModified('quantity')) {
    this.percentComplete = this.quantity > 0 ? (this.quantityComplete / this.quantity) * 100 : 0;
  }
  
  // Calculate value earned from percent complete
  if (this.isModified('percentComplete') || this.isModified('totalValue')) {
    this.valueEarned = this.totalValue * (this.percentComplete / 100);
  }
  
  next();
});

scheduleOfValuesSchema.set('toJSON', { virtuals: true });
scheduleOfValuesSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ScheduleOfValues', scheduleOfValuesSchema);
