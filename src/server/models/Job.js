const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  jobNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Parent project relationship
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  
  // Client information
  client: {
    name: { type: String, required: true },
    contact: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  
  // Project details
  description: {
    type: String,
    trim: true
  },
  location: {
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Project timeline
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Financial information
  contractValue: {
    type: Number,
    required: true
  },
  
  // Project status
  status: {
    type: String,
    enum: ['bidding', 'awarded', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Job team
  jobManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fieldSupervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  foremen: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Job work breakdown structure
  phases: [{
    name: { type: String, required: true },
    description: String,
    startDate: Date,
    endDate: Date,
    budgetHours: Number,
    budgetCost: Number,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    }
  }],
  
  systems: [{
    name: { type: String, required: true },
    description: String,
    code: String, // System code for reporting
    budgetHours: Number,
    budgetCost: Number
  }],
  
  areas: [{
    name: { type: String, required: true },
    description: String,
    code: String, // Area code for reporting
    floor: String,
    zone: String
  }],
  
  // Schedule of Values breakdown
  scheduleOfValues: [{
    lineItem: { type: String, required: true },
    description: String,
    system: String,
    area: String,
    phase: String,
    quantity: Number,
    unit: String,
    unitPrice: Number,
    totalValue: Number,
    budgetHours: Number,
    costCode: String
  }],
  
  // Cost codes for time tracking
  costCodes: [{
    code: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['labor', 'material', 'equipment', 'subcontractor', 'other']
    },
    budgetHours: Number,
    budgetCost: Number,
    actualHours: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 }
  }],
  
  // Isometric drawings and test packages
  testPackages: [{
    name: { type: String, required: true },
    description: String,
    isometricDrawings: [{
      drawingNumber: String,
      title: String,
      revision: String,
      filePath: String,
      crafts: [String], // painting, insulation, heat tracing, etc.
      budgetHours: Number,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
      }
    }],
    assignedForeman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    }
  }],
  
  // Progress tracking
  overallProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Metadata
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
jobSchema.index({ jobNumber: 1 });
jobSchema.index({ projectId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ jobManager: 1 });
jobSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for earned value
jobSchema.virtual('earnedValue').get(function() {
  return (this.overallProgress / 100) * this.contractValue;
});

// Virtual for budget variance
jobSchema.virtual('budgetVariance').get(function() {
  if (!this.costCodes || !Array.isArray(this.costCodes)) return 0;
  const totalActualCost = this.costCodes.reduce((sum, code) => sum + (code.actualCost || 0), 0);
  const totalBudgetCost = this.costCodes.reduce((sum, code) => sum + (code.budgetCost || 0), 0);
  return totalBudgetCost - totalActualCost;
});

// Methods
jobSchema.methods.updateProgress = function() {
  // Calculate overall progress based on test packages
  if (!this.testPackages || !Array.isArray(this.testPackages)) return 0;
  
  const totalPackages = this.testPackages.length;
  if (totalPackages === 0) return 0;
  
  const completedPackages = this.testPackages.filter(pkg => pkg.status === 'completed').length;
  const inProgressPackages = this.testPackages.filter(pkg => pkg.status === 'in_progress').length;
  
  // Weight completed as 100%, in-progress as 50%
  this.overallProgress = Math.round(((completedPackages + (inProgressPackages * 0.5)) / totalPackages) * 100);
  return this.save();
};

jobSchema.methods.getCostCodeSummary = function() {
  if (!this.costCodes || !Array.isArray(this.costCodes)) return [];
  return this.costCodes.map(code => ({
    code: code.code,
    description: code.description,
    budgetHours: code.budgetHours,
    actualHours: code.actualHours,
    budgetCost: code.budgetCost,
    actualCost: code.actualCost,
    variance: (code.budgetCost || 0) - (code.actualCost || 0),
    hoursVariance: (code.budgetHours || 0) - (code.actualHours || 0)
  }));
};

module.exports = mongoose.model('Job', jobSchema);
