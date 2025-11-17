const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  // Basic information
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  
  // Date and time information
  date: {
    type: Date,
    required: true
  },
  
  startTime: {
    type: String // HH:MM format
  },
  
  endTime: {
    type: String // HH:MM format
  },
  
  // Hours breakdown
  regularHours: {
    type: Number,
    required: true,
    min: 0
  },
  
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  doubleTimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalHours: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Cost code allocation - CRITICAL for ICI contractors
  costCode: {
    type: String,
    required: true
  },
  
  costCodeDescription: {
    type: String
  },
  
  // Work breakdown structure
  phaseId: String,
  systemId: String,
  areaId: String,
  testPackageId: String,
  isometricDrawingId: String,
  
  // Schedule of Values integration
  scheduleOfValuesLineItem: String,
  
  // Work description
  workDescription: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Location information
  location: {
    floor: String,
    area: String,
    zone: String,
    building: String
  },
  
  // Craft and category
  craft: {
    type: String,
    enum: ['insulation', 'painting', 'heat_tracing', 'fireproofing', 'general', 'equipment'],
    required: true
  },
  
  category: {
    type: String,
    enum: [
      'concealed_pipe',
      'exposed_pipe', 
      'equipment',
      'ductwork',
      'vessels',
      'valves',
      'fittings',
      'preparation',
      'cleanup',
      'material_handling',
      'travel',
      'setup'
    ]
  },
  
  // Progress and productivity
  unitsCompleted: {
    quantity: Number,
    unit: String, // linear feet, square feet, each
    description: String
  },
  
  // Approval workflow
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },
  
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  submittedAt: Date,
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: Date,
  
  rejectionReason: String,
  
  // Field supervisor notes
  supervisorNotes: String,
  
  // Rate information (for payroll integration)
  hourlyRate: Number,
  overtimeRate: Number,
  doubleTimeRate: Number,
  
  // Calculated costs
  regularCost: Number,
  overtimeCost: Number,
  doubleTimeCost: Number,
  totalCost: Number,
  
  // Equipment and materials used
  equipmentUsed: [{
    equipmentId: String,
    description: String,
    hours: Number
  }],
  
  materialsUsed: [{
    materialId: String,
    description: String,
    quantity: Number,
    unit: String
  }],
  
  // Weather and conditions (affects productivity)
  weatherConditions: {
    temperature: Number,
    conditions: String, // sunny, rainy, snowy, etc.
    windSpeed: Number
  },
  
  // Safety and quality
  safetyIncidents: [{
    type: String,
    description: String,
    severity: {
      type: String,
      enum: ['minor', 'major', 'critical']
    }
  }],
  
  qualityIssues: [{
    description: String,
    resolved: Boolean,
    resolution: String
  }],
  
  // Mobile app integration
  entryMethod: {
    type: String,
    enum: ['mobile_app', 'web_portal', 'bulk_import', 'supervisor_entry'],
    default: 'mobile_app'
  },
  
  gpsLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  
  // Photos and documentation
  photos: [{
    filename: String,
    description: String,
    timestamp: Date,
    gpsLocation: {
      latitude: Number,
      longitude: Number
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
timeEntrySchema.index({ workerId: 1, date: 1 });
timeEntrySchema.index({ jobId: 1, date: 1 });
timeEntrySchema.index({ projectId: 1, date: 1 });
timeEntrySchema.index({ costCode: 1, date: 1 });
timeEntrySchema.index({ date: 1, status: 1 });
timeEntrySchema.index({ taskId: 1 });

// Pre-save middleware to calculate totals
timeEntrySchema.pre('save', function(next) {
  // Calculate total hours
  this.totalHours = this.regularHours + this.overtimeHours + this.doubleTimeHours;
  
  // Calculate costs if rates are provided
  if (this.hourlyRate) {
    this.regularCost = this.regularHours * this.hourlyRate;
    this.overtimeCost = this.overtimeHours * (this.overtimeRate || this.hourlyRate * 1.5);
    this.doubleTimeCost = this.doubleTimeHours * (this.doubleTimeRate || this.hourlyRate * 2);
    this.totalCost = this.regularCost + this.overtimeCost + this.doubleTimeCost;
  }
  
  next();
});

// Virtual for productivity rate
timeEntrySchema.virtual('productivityRate').get(function() {
  if (!this.unitsCompleted || !this.unitsCompleted.quantity || this.totalHours === 0) {
    return null;
  }
  return this.unitsCompleted.quantity / this.totalHours;
});

// Static methods for reporting
timeEntrySchema.statics.getCostCodeSummary = function(jobId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        jobId: new mongoose.Types.ObjectId(jobId),
        date: { $gte: startDate, $lte: endDate },
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$costCode',
        description: { $first: '$costCodeDescription' },
        totalHours: { $sum: '$totalHours' },
        totalCost: { $sum: '$totalCost' },
        entryCount: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

timeEntrySchema.statics.getWorkerProductivity = function(workerId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        workerId: new mongoose.Types.ObjectId(workerId),
        date: { $gte: startDate, $lte: endDate },
        status: 'approved',
        'unitsCompleted.quantity': { $exists: true, $gt: 0 }
      }
    },
    {
      $group: {
        _id: {
          costCode: '$costCode',
          unit: '$unitsCompleted.unit'
        },
        totalHours: { $sum: '$totalHours' },
        totalUnits: { $sum: '$unitsCompleted.quantity' },
        avgProductivity: { $avg: { $divide: ['$unitsCompleted.quantity', '$totalHours'] } }
      }
    }
  ]);
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
