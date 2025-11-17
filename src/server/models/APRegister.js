const mongoose = require('mongoose');

const apRegisterSchema = new mongoose.Schema({
  // Invoice Information
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  
  // Vendor Information
  vendor: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    vendorNumber: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    }
  },

  // Financial Information
  invoiceAmount: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
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

  // Cost Code Breakdown - Can be split across multiple cost codes
  costCodeBreakdown: [{
    costCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
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
    }
  }],

  // GL Account Information
  glAccount: {
    type: String,
    trim: true
  },
  glDescription: {
    type: String,
    trim: true
  },

  // Invoice Type and Category
  invoiceType: {
    type: String,
    enum: ['material', 'subcontractor', 'equipment', 'other', 'overhead'],
    required: true
  },
  category: {
    type: String,
    enum: ['insulation_materials', 'jacketing_materials', 'labor_subcontract', 'equipment_rental', 'tools', 'safety', 'overhead', 'other'],
    required: true
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'disputed', 'cancelled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  checkNumber: {
    type: String,
    trim: true
  },

  // Approval Workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: {
    type: Date
  },
  approvalNotes: {
    type: String,
    trim: true
  },

  // Document Management
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Tracking and Audit
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually']
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
apRegisterSchema.index({ jobId: 1, invoiceDate: -1 });
apRegisterSchema.index({ invoiceNumber: 1, vendor: 1 });
apRegisterSchema.index({ 'costCodeBreakdown.costCode': 1 });
apRegisterSchema.index({ paymentStatus: 1 });
apRegisterSchema.index({ invoiceDate: 1 });
apRegisterSchema.index({ dueDate: 1 });

// Virtual for total cost code amount validation
apRegisterSchema.virtual('totalCostCodeAmount').get(function() {
  return this.costCodeBreakdown.reduce((sum, breakdown) => sum + breakdown.amount, 0);
});

// Pre-save validation to ensure cost code breakdown equals total
apRegisterSchema.pre('save', function(next) {
  const totalBreakdown = this.costCodeBreakdown.reduce((sum, breakdown) => sum + breakdown.amount, 0);
  const tolerance = 0.01; // Allow 1 cent variance for rounding
  
  if (Math.abs(totalBreakdown - this.totalAmount) > tolerance) {
    return next(new Error(`Cost code breakdown total ($${totalBreakdown}) must equal invoice total ($${this.totalAmount})`));
  }
  
  next();
});

// Instance method to add cost code breakdown
apRegisterSchema.methods.addCostCodeBreakdown = function(costCode, amount, description, sovId) {
  this.costCodeBreakdown.push({
    costCode,
    amount,
    description,
    scheduleOfValuesId: sovId
  });
  return this.save();
};

apRegisterSchema.set('toJSON', { virtuals: true });
apRegisterSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('APRegister', apRegisterSchema);
