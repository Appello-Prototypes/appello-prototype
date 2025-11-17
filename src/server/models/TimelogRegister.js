const mongoose = require('mongoose');

const timelogRegisterSchema = new mongoose.Schema({
  // Worker Information
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Job Assignment
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
  
  // Date and Period
  workDate: {
    type: Date,
    required: true
  },
  payPeriodStart: {
    type: Date,
    required: true
  },
  payPeriodEnd: {
    type: Date,
    required: true
  },

  // Time Breakdown
  regularHours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 24
  },
  doubleTimeHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 24
  },
  totalHours: {
    type: Number,
    min: 0
  },

  // Cost Code Assignment - Enhanced for SOV integration
  costCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  costCodeDescription: {
    type: String,
    trim: true
  },

  // SOV Integration
  scheduleOfValuesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduleOfValues'
  },
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

  // Work Details
  workDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  craft: {
    type: String,
    enum: ['insulation', 'painting', 'heat_tracing', 'fireproofing', 'general', 'equipment', 'supervision'],
    required: true
  },
  tradeLevel: {
    type: String,
    enum: ['apprentice', 'journeyman', 'foreman', 'supervisor', 'general_foreman'],
    required: true
  },

  // Wage Information
  baseHourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  overtimeRate: {
    type: Number,
    required: true,
    min: 0
  },
  doubleTimeRate: {
    type: Number,
    required: true,
    min: 0
  },

  // Cost Calculation
  regularCost: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeCost: {
    type: Number,
    default: 0,
    min: 0
  },
  doubleTimeCost: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLaborCost: {
    type: Number,
    default: 0,
    min: 0
  },

  // Burden and Benefits (for true job costing)
  burdenRate: {
    type: Number,
    default: 0.35, // 35% burden rate (benefits, taxes, insurance)
    min: 0,
    max: 1
  },
  totalBurdenCost: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCostWithBurden: {
    type: Number,
    default: 0,
    min: 0
  },

  // Productivity Tracking
  unitsCompleted: {
    quantity: {
      type: Number,
      min: 0
    },
    unit: {
      type: String,
      enum: ['LF', 'SF', 'EA', 'CY', 'TON', 'HR', 'LS', 'LB', 'GAL', 'FT', 'YD', 'SQ'],
      uppercase: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  productivityRate: {
    type: Number,
    min: 0 // Units per hour
  },

  // Location and Conditions
  location: {
    area: String,
    zone: String,
    building: String,
    elevation: String
  },
  weatherConditions: {
    temperature: Number,
    conditions: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'extreme_heat', 'extreme_cold']
    },
    windSpeed: Number
  },

  // Status and Approval
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'paid'],
    default: 'submitted'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },

  // Equipment and Materials Used
  equipmentUsed: [{
    equipmentId: String,
    equipmentName: String,
    hoursUsed: Number,
    rate: Number
  }],
  materialsUsed: [{
    materialCode: String,
    description: String,
    quantity: Number,
    unit: String,
    unitCost: Number
  }],

  // Quality and Safety
  qualityIssues: [{
    description: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    reportedAt: { type: Date, default: Date.now }
  }],
  safetyIncidents: [{
    description: String,
    severity: { type: String, enum: ['near_miss', 'minor', 'major', 'serious'] },
    reportedAt: { type: Date, default: Date.now }
  }],

  // Entry Method and Source
  entryMethod: {
    type: String,
    enum: ['mobile_app', 'web_portal', 'bulk_import', 'supervisor_entry'],
    default: 'mobile_app'
  },
  
  // Integration with existing TimeEntry
  originalTimeEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeEntry'
  },

  // Audit Trail
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revisionNumber: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
timelogRegisterSchema.index({ jobId: 1, workDate: -1 });
timelogRegisterSchema.index({ workerId: 1, workDate: -1 });
timelogRegisterSchema.index({ costCode: 1, workDate: -1 });
timelogRegisterSchema.index({ payPeriodStart: 1, payPeriodEnd: 1 });
timelogRegisterSchema.index({ status: 1 });
timelogRegisterSchema.index({ craft: 1, tradeLevel: 1 });

// Pre-save middleware for calculations
timelogRegisterSchema.pre('save', function(next) {
  // Calculate total hours
  this.totalHours = this.regularHours + (this.overtimeHours || 0) + (this.doubleTimeHours || 0);
  
  // Calculate labor costs
  this.regularCost = this.regularHours * this.baseHourlyRate;
  this.overtimeCost = (this.overtimeHours || 0) * this.overtimeRate;
  this.doubleTimeCost = (this.doubleTimeHours || 0) * this.doubleTimeRate;
  this.totalLaborCost = this.regularCost + this.overtimeCost + this.doubleTimeCost;
  
  // Calculate burden costs
  this.totalBurdenCost = this.totalLaborCost * this.burdenRate;
  this.totalCostWithBurden = this.totalLaborCost + this.totalBurdenCost;
  
  // Calculate productivity rate
  if (this.unitsCompleted.quantity && this.totalHours > 0) {
    this.productivityRate = this.unitsCompleted.quantity / this.totalHours;
  }
  
  next();
});

// Static methods for reporting
timelogRegisterSchema.statics.getCostByJob = function(jobId, startDate, endDate) {
  const mongoose = require('mongoose');
  const match = { jobId: new mongoose.Types.ObjectId(jobId), status: 'approved' };
  if (startDate && endDate) {
    match.workDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$costCode',
        totalHours: { $sum: '$totalHours' },
        totalCost: { $sum: '$totalCostWithBurden' },
        regularHours: { $sum: '$regularHours' },
        overtimeHours: { $sum: '$overtimeHours' },
        entries: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

timelogRegisterSchema.statics.getProductivityReport = function(jobId, startDate, endDate) {
  const match = { 
    jobId, 
    status: 'approved',
    'unitsCompleted.quantity': { $gt: 0 }
  };
  if (startDate && endDate) {
    match.workDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          costCode: '$costCode',
          craft: '$craft',
          unit: '$unitsCompleted.unit'
        },
        totalUnits: { $sum: '$unitsCompleted.quantity' },
        totalHours: { $sum: '$totalHours' },
        avgProductivity: { $avg: '$productivityRate' },
        entries: { $sum: 1 }
      }
    }
  ]);
};

timelogRegisterSchema.set('toJSON', { virtuals: true });
timelogRegisterSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TimelogRegister', timelogRegisterSchema);
