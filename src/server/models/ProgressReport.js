const mongoose = require('mongoose');

const progressReportSchema = new mongoose.Schema({
  // Report Information
  reportNumber: {
    type: String,
    required: true,
    trim: true
  },
  reportDate: {
    type: Date,
    required: true
  },
  reportPeriodStart: {
    type: Date,
    required: true
  },
  reportPeriodEnd: {
    type: Date,
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

  // Progress Report Line Items
  lineItems: [{
    scheduleOfValuesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleOfValues',
      required: true
    },
    lineNumber: {
      type: String,
      required: true
    },
    costCode: {
      type: String,
      required: true,
      uppercase: true
    },
    description: {
      type: String,
      required: true
    },
    
    // SOV Financial Data
    totalContractValue: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Progress Reporting
    previousProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currentProgress: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    progressThisPeriod: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // Earned Value Calculations
    previousEarnedValue: {
      type: Number,
      default: 0,
      min: 0
    },
    currentEarnedValue: {
      type: Number,
      min: 0
    },
    earnedThisPeriod: {
      type: Number,
      min: 0
    },
    
    // Cost Tracking (Burned)
    previousCostToDate: {
      type: Number,
      default: 0,
      min: 0
    },
    costThisPeriod: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCostToDate: {
      type: Number,
      min: 0
    },
    
    // Labor vs Material Breakdown
    laborCostThisPeriod: {
      type: Number,
      default: 0,
      min: 0
    },
    materialCostThisPeriod: {
      type: Number,
      default: 0,
      min: 0
    },
    equipmentCostThisPeriod: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Variance Analysis
    earnedVsBurnedVariance: {
      type: Number
    },
    scheduleVariance: {
      type: Number
    },
    costVariance: {
      type: Number
    },
    
    // Units and Productivity
    unitsCompletedThisPeriod: {
      quantity: Number,
      unit: String,
      description: String
    },
    cumulativeUnitsCompleted: {
      quantity: Number,
      unit: String,
      description: String
    },
    
    // Field Notes and Issues
    fieldNotes: {
      type: String,
      trim: true
    },
    issues: [{
      description: String,
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      status: { type: String, enum: ['open', 'resolved', 'deferred'] }
    }]
  }],

  // Report Summary
  summary: {
    totalEarnedThisPeriod: {
      type: Number,
      default: 0
    },
    totalCostThisPeriod: {
      type: Number,
      default: 0
    },
    totalEarnedToDate: {
      type: Number,
      default: 0
    },
    totalCostToDate: {
      type: Number,
      default: 0
    },
    overallProgress: {
      type: Number,
      min: 0,
      max: 100
    },
    earnedVsBurnedRatio: {
      type: Number
    },
    projectHealthStatus: {
      type: String,
      enum: ['on_track', 'at_risk', 'critical', 'ahead_of_schedule'],
      default: 'on_track'
    }
  },

  // Approval and Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved', 'invoiced'],
    default: 'draft'
  },
  
  // Workflow
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  
  // Notes and Comments
  submissionNotes: {
    type: String,
    trim: true
  },
  reviewNotes: {
    type: String,
    trim: true
  },
  approvalNotes: {
    type: String,
    trim: true
  },

  // Integration
  invoiceGenerated: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: String,
    trim: true
  },
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true
});

// Indexes
progressReportSchema.index({ jobId: 1, reportDate: -1 });
progressReportSchema.index({ reportNumber: 1 });
progressReportSchema.index({ status: 1 });
progressReportSchema.index({ reportPeriodStart: 1, reportPeriodEnd: 1 });

// Pre-save calculations
progressReportSchema.pre('save', function(next) {
  // Calculate summary values
  let totalEarnedThisPeriod = 0;
  let totalCostThisPeriod = 0;
  let totalEarnedToDate = 0;
  let totalCostToDate = 0;
  let totalContractValue = 0;

  this.lineItems.forEach(item => {
    // Calculate progress and earned values
    item.progressThisPeriod = item.currentProgress - item.previousProgress;
    item.earnedThisPeriod = (item.progressThisPeriod / 100) * item.totalContractValue;
    item.currentEarnedValue = (item.currentProgress / 100) * item.totalContractValue;
    
    // Calculate total cost
    item.totalCostToDate = item.previousCostToDate + item.costThisPeriod;
    
    // Calculate variances
    item.earnedVsBurnedVariance = item.currentEarnedValue - item.totalCostToDate;
    item.costVariance = item.totalContractValue - item.totalCostToDate;
    
    // Add to summary
    totalEarnedThisPeriod += item.earnedThisPeriod;
    totalCostThisPeriod += item.costThisPeriod;
    totalEarnedToDate += item.currentEarnedValue;
    totalCostToDate += item.totalCostToDate;
    totalContractValue += item.totalContractValue;
  });

  // Update summary
  this.summary.totalEarnedThisPeriod = totalEarnedThisPeriod;
  this.summary.totalCostThisPeriod = totalCostThisPeriod;
  this.summary.totalEarnedToDate = totalEarnedToDate;
  this.summary.totalCostToDate = totalCostToDate;
  this.summary.overallProgress = totalContractValue > 0 ? (totalEarnedToDate / totalContractValue) * 100 : 0;
  this.summary.earnedVsBurnedRatio = totalCostToDate > 0 ? totalEarnedToDate / totalCostToDate : 0;
  
  // Determine project health
  if (this.summary.earnedVsBurnedRatio >= 1.1) {
    this.summary.projectHealthStatus = 'ahead_of_schedule';
  } else if (this.summary.earnedVsBurnedRatio >= 0.95) {
    this.summary.projectHealthStatus = 'on_track';
  } else if (this.summary.earnedVsBurnedRatio >= 0.85) {
    this.summary.projectHealthStatus = 'at_risk';
  } else {
    this.summary.projectHealthStatus = 'critical';
  }

  next();
});

// Static methods for analysis
progressReportSchema.statics.getEarnedVsBurnedAnalysis = function(jobId, asOfDate) {
  return this.aggregate([
    { 
      $match: { 
        jobId: mongoose.Types.ObjectId(jobId),
        reportDate: { $lte: asOfDate },
        status: 'approved'
      }
    },
    { $sort: { reportDate: -1 } },
    { $limit: 1 },
    { $unwind: '$lineItems' },
    {
      $group: {
        _id: '$lineItems.costCode',
        totalEarned: { $sum: '$lineItems.currentEarnedValue' },
        totalCost: { $sum: '$lineItems.totalCostToDate' },
        currentProgress: { $last: '$lineItems.currentProgress' },
        contractValue: { $last: '$lineItems.totalContractValue' }
      }
    },
    {
      $project: {
        costCode: '$_id',
        totalEarned: 1,
        totalCost: 1,
        variance: { $subtract: ['$totalEarned', '$totalCost'] },
        variancePercent: {
          $multiply: [
            { $divide: [{ $subtract: ['$totalEarned', '$totalCost'] }, '$totalCost'] },
            100
          ]
        },
        currentProgress: 1,
        contractValue: 1
      }
    }
  ]);
};

progressReportSchema.set('toJSON', { virtuals: true });
progressReportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProgressReport', progressReportSchema);
