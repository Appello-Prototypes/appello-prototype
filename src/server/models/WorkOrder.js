const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  // Work Order Identification
  workOrderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Parent relationships
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Work Order Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  
  // Issuance Information
  issuedBy: {
    type: String, // Client/GC name
    required: true
  },
  issuedByContact: {
    name: String,
    email: String,
    phone: String
  },
  issuedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  
  // Status and Priority
  status: {
    type: String,
    enum: ['draft', 'pending', 'issued', 'acknowledged', 'in_progress', 'completed', 'closed', 'cancelled'],
    default: 'draft',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    required: true
  },
  
  // Scheduling
  dueDate: {
    type: Date
  },
  startDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  
  // Work Breakdown Structure Integration
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
  
  // Schedule of Values Integration
  scheduleOfValuesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduleOfValues'
  },
  
  // Cost Code Integration
  costCodes: [{
    code: { type: String, required: true },
    description: String,
    estimatedHours: Number,
    estimatedCost: Number
  }],
  
  // Scope and Specifications
  scopeOfWork: {
    type: String,
    trim: true
  },
  specifications: {
    type: String,
    trim: true
  },
  drawings: [{
    drawingNumber: String,
    title: String,
    revision: String,
    filePath: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Isometric Drawings and Test Packages
  testPackageId: {
    type: String // Reference to job.testPackages array
  },
  isometricDrawings: [{
    drawingNumber: String,
    title: String,
    revision: String,
    filePath: String
  }],
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Foreman or supervisor
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Progress Tracking
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Financial Tracking
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  estimatedCost: {
    type: Number,
    min: 0
  },
  actualCost: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Change Orders
  isChangeOrder: {
    type: Boolean,
    default: false
  },
  changeOrderNumber: {
    type: String
  },
  originalWorkOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  
  // Approval Workflow
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  
  // Attachments and Documentation
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Field Notes and Comments
  fieldNotes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Location
  location: {
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
workOrderSchema.index({ workOrderNumber: 1 });
workOrderSchema.index({ jobId: 1, status: 1 });
workOrderSchema.index({ projectId: 1 });
workOrderSchema.index({ status: 1, priority: 1 });
workOrderSchema.index({ assignedTo: 1, status: 1 });
workOrderSchema.index({ dueDate: 1, status: 1 });
workOrderSchema.index({ createdAt: -1 });
workOrderSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for task count (will be populated via aggregation)
workOrderSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'workOrderId',
  count: true
});

// Virtual for completed task count
workOrderSchema.virtual('completedTaskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'workOrderId',
  count: true,
  match: { status: 'completed' }
});

// Virtual for overdue status
workOrderSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed' && this.status !== 'closed';
});

// Pre-save middleware
workOrderSchema.pre('save', function(next) {
  // Auto-update completion percentage based on status
  if (this.status === 'completed' && this.completionPercentage < 100) {
    this.completionPercentage = 100;
    this.completedDate = new Date();
  } else if (this.status === 'closed' && this.completionPercentage < 100) {
    this.completionPercentage = 100;
  } else if (this.status === 'draft' && this.completionPercentage > 0) {
    this.completionPercentage = 0;
  }
  
  // Auto-generate work order number if not provided
  if (!this.workOrderNumber && this.jobId) {
    // This will be handled in the controller to ensure uniqueness
  }
  
  next();
});

// Instance methods
workOrderSchema.methods.markCompleted = function(userId) {
  this.status = 'completed';
  this.completionPercentage = 100;
  this.completedDate = new Date();
  this.metadata.set('completedBy', userId);
  this.metadata.set('completedAt', new Date());
  return this.save();
};

workOrderSchema.methods.addFieldNote = function(userId, note) {
  this.fieldNotes.push({
    note,
    createdBy: userId,
    createdAt: new Date()
  });
  return this.save();
};

// Static methods
workOrderSchema.statics.findByJob = function(jobId, options = {}) {
  return this.find({ jobId, ...options })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('systemId', 'name code')
    .populate('areaId', 'name code')
    .populate('phaseId', 'name code')
    .sort({ createdAt: -1 });
};

workOrderSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'closed', 'cancelled'] }
  })
    .populate('assignedTo', 'name email')
    .populate('jobId', 'name jobNumber')
    .sort({ dueDate: 1 });
};

module.exports = mongoose.model('WorkOrder', workOrderSchema);

