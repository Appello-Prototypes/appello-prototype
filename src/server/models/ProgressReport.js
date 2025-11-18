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

  // Report completed by
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedByName: {
    type: String,
    trim: true
  },

  // Progress Report Line Items - organized by Area and System
  lineItems: [{
    scheduleOfValuesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleOfValues',
      required: true
    },
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area'
    },
    areaName: {
      type: String,
      required: true,
      trim: true
    },
    systemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'System'
    },
    systemName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    
    // SOV Financial Data
    assignedCost: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Submitted CTD (Complete To Date) - what field reports
    submittedCTD: {
      amount: {
        type: Number,
        default: 0,
        min: 0
      },
      percent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    
    // Approved CTD - what's approved for billing
    approvedCTD: {
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      percent: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      }
    },
    
    // Previous Complete - from previous progress report
    previousComplete: {
      amount: {
        type: Number,
        default: 0,
        min: 0
      },
      percent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    
    // Holdback This Period (typically 10%)
    holdbackThisPeriod: {
      type: Number,
      default: 0,
      min: 0
    },
    holdbackPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    },
    
    // Due This Period - calculated from approved CTD minus previous complete minus holdback
    dueThisPeriod: {
      type: Number,
      default: 0
    }
  }],

  // Report Summary
  summary: {
    totalAssignedCost: {
      type: Number,
      default: 0
    },
    totalSubmittedCTD: {
      amount: { type: Number, default: 0 },
      percent: { type: Number, default: 0 }
    },
    totalApprovedCTD: {
      amount: { type: Number, default: 0 },
      percent: { type: Number, default: 0 }
    },
    totalPreviousComplete: {
      amount: { type: Number, default: 0 },
      percent: { type: Number, default: 0 }
    },
    totalHoldbackThisPeriod: {
      type: Number,
      default: 0
    },
    totalDueThisPeriod: {
      type: Number,
      default: 0
    },
    calculatedPercentCTD: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
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
  let totalAssignedCost = 0;
  let totalSubmittedCTDAmount = 0;
  let totalApprovedCTDAmount = 0;
  let totalPreviousCompleteAmount = 0;
  let totalHoldbackThisPeriod = 0;
  let totalDueThisPeriod = 0;

  this.lineItems.forEach(item => {
    // Calculate due this period: (Approved CTD - Previous Complete) - Holdback
    const amountThisPeriod = item.approvedCTD.amount - item.previousComplete.amount;
    item.holdbackThisPeriod = (amountThisPeriod * (item.holdbackPercent || 10)) / 100;
    item.dueThisPeriod = amountThisPeriod - item.holdbackThisPeriod;
    
    // Add to summary
    totalAssignedCost += item.assignedCost || 0;
    totalSubmittedCTDAmount += item.submittedCTD?.amount || 0;
    totalApprovedCTDAmount += item.approvedCTD?.amount || 0;
    totalPreviousCompleteAmount += item.previousComplete?.amount || 0;
    totalHoldbackThisPeriod += item.holdbackThisPeriod || 0;
    totalDueThisPeriod += item.dueThisPeriod || 0;
  });

  // Update summary
  this.summary.totalAssignedCost = totalAssignedCost;
  this.summary.totalSubmittedCTD = {
    amount: totalSubmittedCTDAmount,
    percent: totalAssignedCost > 0 ? (totalSubmittedCTDAmount / totalAssignedCost) * 100 : 0
  };
  this.summary.totalApprovedCTD = {
    amount: totalApprovedCTDAmount,
    percent: totalAssignedCost > 0 ? (totalApprovedCTDAmount / totalAssignedCost) * 100 : 0
  };
  this.summary.totalPreviousComplete = {
    amount: totalPreviousCompleteAmount,
    percent: totalAssignedCost > 0 ? (totalPreviousCompleteAmount / totalAssignedCost) * 100 : 0
  };
  this.summary.totalHoldbackThisPeriod = totalHoldbackThisPeriod;
  this.summary.totalDueThisPeriod = totalDueThisPeriod;
  this.summary.calculatedPercentCTD = this.summary.totalApprovedCTD.percent;

  next();
});

// Static method to get previous progress report for a job
progressReportSchema.statics.getPreviousReport = async function(jobId, currentReportDate) {
  return this.findOne({
    jobId,
    reportDate: { $lt: currentReportDate }
  })
    .sort({ reportDate: -1 })
    .limit(1);
};

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
        _id: '$lineItems.scheduleOfValuesId',
        totalEarned: { $sum: '$lineItems.approvedCTD.amount' },
        currentProgress: { $last: '$lineItems.approvedCTD.percent' },
        contractValue: { $last: '$lineItems.assignedCost' }
      }
    },
    {
      $project: {
        sovId: '$_id',
        totalEarned: 1,
        currentProgress: 1,
        contractValue: 1
      }
    }
  ]);
};

progressReportSchema.set('toJSON', { virtuals: true });
progressReportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProgressReport', progressReportSchema);
