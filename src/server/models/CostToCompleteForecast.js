const mongoose = require('mongoose');

const costToCompleteForecastSchema = new mongoose.Schema({
  // Job and Project References
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },

  // Forecast Period Information
  forecastPeriod: {
    type: String,
    required: true, // e.g., "Month 1", "Month 2"
    trim: true
  },
  monthNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  
  // Progress Report Reference
  progressReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgressReport',
    required: false // Made optional - may not always have a progress report
  },
  progressReportNumber: {
    type: String,
    required: false // Made optional - may not always have a progress report
  },
  progressReportDate: {
    type: Date,
    required: false // Made optional - may not always have a progress report
  },

  // Line Items (Area/System breakdown)
  lineItems: [{
    jobCode: String,
    area: String,
    system: String,
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area'
    },
    systemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'System'
    },
    
    // Budget Information
    totalCost: Number,
    totalValue: Number,
    
    // Actual Costs
    costThisPeriod: Number,
    costToDate: Number,
    laborCostToDate: Number,
    apCostToDate: Number,
    
    // Earned Value
    approvedCTD: Number, // Percent
    approvedCTDAmount: Number,
    earnedThisPeriod: Number,
    earnedToDate: Number,
    
    // Fee Analysis
    fee: Number,
    feePercent: Number,
    
    // Forecasts (user-editable)
    forecastedFinalCost: Number,
    forecastedFinalValue: Number
  }],

  // Summary Metrics
  summary: {
    contractTotalValue: Number,
    totalBudget: Number,
    costThisPeriod: Number,
    costToDate: Number,
    earnedThisPeriod: Number,
    earnedToDate: Number,
    periodFee: Number,
    periodFeePercent: Number,
    forecastFinalCost: Number,
    forecastFinalValue: Number,
    forecastVariance: Number,
    forecastVariancePercent: Number,
    marginAtCompletion: Number,
    marginAtCompletionPercent: Number,
    cpi: Number,
    linesOverBudget: Number,
    linesWithNegativeFee: Number,
    insights: String
  },

  // Status and Metadata
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'archived'],
    default: 'draft'
  },
  
  // User Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  submittedAt: Date,
  approvedAt: Date,
  
  // Notes/Comments
  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  }
}, {
  timestamps: true
});

// Indexes
costToCompleteForecastSchema.index({ jobId: 1, forecastPeriod: 1 });
costToCompleteForecastSchema.index({ jobId: 1, monthNumber: 1 });
costToCompleteForecastSchema.index({ progressReportId: 1 });
costToCompleteForecastSchema.index({ status: 1 });
costToCompleteForecastSchema.index({ createdAt: -1 });

// Virtual for forecast age
costToCompleteForecastSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Methods
costToCompleteForecastSchema.methods.submit = function(userId) {
  this.status = 'submitted';
  this.submittedBy = userId;
  this.submittedAt = new Date();
  return this.save();
};

costToCompleteForecastSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

costToCompleteForecastSchema.set('toJSON', { virtuals: true });
costToCompleteForecastSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CostToCompleteForecast', costToCompleteForecastSchema);

