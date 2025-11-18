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
  // Cost Code - keeping old field for migration, new fields below
  costCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  costCodeNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  costCodeName: {
    type: String,
    trim: true
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
  unitCost: {
    type: Number,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  marginAmount: {
    type: Number,
    min: 0
  },
  marginPercent: {
    type: Number,
    min: 0,
    max: 100 // Percentage
  },
  // Keep old margin field for backward compatibility during migration
  margin: {
    type: Number,
    min: 0,
    max: 100 // Percentage
  },
  totalValue: {
    type: Number,
    min: 0
  },
  
  // GL Account Information
  glCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GLCategory'
  },
  glAccountItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GLAccount'
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
scheduleOfValuesSchema.index({ jobId: 1, costCodeNumber: 1 }, { unique: true, sparse: true }); // Unique cost code number per job
scheduleOfValuesSchema.index({ jobId: 1, sortOrder: 1 });
scheduleOfValuesSchema.index({ systemId: 1 });
scheduleOfValuesSchema.index({ areaId: 1 });
scheduleOfValuesSchema.index({ phaseId: 1 });
scheduleOfValuesSchema.index({ moduleId: 1 });
scheduleOfValuesSchema.index({ componentId: 1 });
scheduleOfValuesSchema.index({ glCategoryId: 1 });
scheduleOfValuesSchema.index({ glAccountItemId: 1 });
scheduleOfValuesSchema.index({ costCodeNumber: 1 });

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

// Pre-save middleware to calculate derived fields
scheduleOfValuesSchema.pre('save', function(next) {
  // Calculate unitCost from totalCost and quantity
  if (this.isModified('totalCost') || this.isModified('quantity') || this.isModified('unitCost')) {
    if (this.quantity && this.quantity > 0) {
      // If unitCost is provided, use it; otherwise calculate from totalCost
      if (this.unitCost === undefined || this.unitCost === null) {
        this.unitCost = this.totalCost / this.quantity;
      }
      // If unitCost changed, recalculate totalCost
      if (this.isModified('unitCost') && this.unitCost !== undefined && this.unitCost !== null) {
        this.totalCost = this.unitCost * this.quantity;
      }
    }
  }
  
  // Calculate marginAmount and marginPercent from totalValue and totalCost
  // Priority: marginPercent (if provided) > totalValue > marginAmount
  if (this.isModified('totalValue') || this.isModified('totalCost') || 
      this.isModified('marginPercent') || this.isModified('marginAmount')) {
    
    const totalCost = this.totalCost || 0;
    
    // If marginPercent is explicitly set and totalCost exists, calculate totalValue
    if (this.isModified('marginPercent') && this.marginPercent !== undefined && this.marginPercent !== null && totalCost > 0) {
      // Margin percent is a percentage of totalValue, so: totalValue = totalCost / (1 - marginPercent/100)
      // This means if margin is 25%, totalValue = totalCost / 0.75
      if (this.marginPercent > 0 && this.marginPercent < 100) {
        this.totalValue = totalCost / (1 - this.marginPercent / 100);
        this.marginAmount = this.totalValue - totalCost;
      } else {
        this.totalValue = totalCost;
        this.marginAmount = 0;
        this.marginPercent = 0;
      }
    } else if (this.totalValue !== undefined && this.totalValue !== null && this.totalValue > 0) {
      // Calculate marginAmount from totalValue - totalCost
      this.marginAmount = this.totalValue - totalCost;
      
      // Calculate marginPercent from marginAmount / totalValue
      if (this.totalValue > 0) {
        this.marginPercent = (this.marginAmount / this.totalValue) * 100;
      } else {
        this.marginPercent = 0;
      }
    } else if (this.marginAmount !== undefined && this.marginAmount !== null && totalCost > 0) {
      // Calculate totalValue from totalCost + marginAmount
      this.totalValue = totalCost + this.marginAmount;
      if (this.totalValue > 0) {
        this.marginPercent = (this.marginAmount / this.totalValue) * 100;
      } else {
        this.marginPercent = 0;
      }
    }
    
    // Backward compatibility: sync old margin field
    if (this.marginPercent !== undefined && this.marginPercent !== null) {
      this.margin = this.marginPercent;
    } else if (this.margin !== undefined && this.margin !== null && totalCost > 0) {
      // Legacy: calculate from old margin field (treating as markup percentage)
      this.totalValue = totalCost * (1 + this.margin / 100);
      this.marginAmount = this.totalValue - totalCost;
      this.marginPercent = this.margin;
    }
  }
  
  // Calculate percent complete from quantity
  if (this.isModified('quantityComplete') || this.isModified('quantity')) {
    this.percentComplete = this.quantity > 0 ? (this.quantityComplete / this.quantity) * 100 : 0;
  }
  
  // Calculate value earned from percent complete
  if (this.isModified('percentComplete') || this.isModified('totalValue')) {
    this.valueEarned = (this.totalValue || 0) * (this.percentComplete / 100);
  }
  
  next();
});

scheduleOfValuesSchema.set('toJSON', { virtuals: true });
scheduleOfValuesSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ScheduleOfValues', scheduleOfValuesSchema);
