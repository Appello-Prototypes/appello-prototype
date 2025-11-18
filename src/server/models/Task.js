const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'not_started',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    required: true
  },
  
  // Assignment and ownership
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Scheduling
  dueDate: {
    type: Date
  },
  startDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Integration with Appello platform
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Work Order relationship (optional - tasks can exist without work orders)
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  
  // Work breakdown structure integration - Enhanced SOV
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
  testPackageId: {
    type: String // Reference to project.testPackages array
  },
  isometricDrawingId: {
    type: String // Reference to specific isometric drawing
  },
  
  // Cost code integration
  costCode: {
    type: String,
    required: true // Every task must be assigned to a cost code
  },
  
  // Schedule of Values integration
  scheduleOfValuesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduleOfValues'
  },
  
  // Task organization - Enhanced for ICI contractors
  category: {
    type: String,
    enum: [
      'installation', 
      'insulation',
      'heat_tracing',
      'fireproofing',
      'painting',
      'jacketing',
      'maintenance', 
      'inspection', 
      'repair', 
      'administrative', 
      'safety', 
      'quality_control',
      'material_handling',
      'documentation',
      'equipment_check',
      'progress_reporting',
      'preparation',
      'cleanup'
    ]
  },
  
  // ICI-specific task properties
  craft: {
    type: String,
    enum: ['insulation', 'painting', 'heat_tracing', 'fireproofing', 'general', 'equipment']
  },
  
  // Work order information (legacy field - kept for backward compatibility)
  // New tasks should use workOrderId instead
  workOrderNumber: {
    type: String
  },
  
  // Field operations
  requiresFieldSupervisorApproval: {
    type: Boolean,
    default: false
  },
  
  // Progress reporting integration
  progressReportingMethod: {
    type: String,
    enum: ['percentage', 'units_installed', 'dollar_complete'],
    default: 'percentage'
  },
  
  unitsToInstall: {
    quantity: Number,
    unit: String, // linear feet, square feet, each, etc.
    description: String
  },
  
  unitsInstalled: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Progress tracking
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Recurring tasks
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  
  // Attachments and documentation
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
  
  // Location data for field tasks
  location: {
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Workflow and approval
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

// Indexes for performance - optimized for common queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ jobId: 1, status: 1 });
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ jobId: 1, costCode: 1 });
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ costCode: 1 });
taskSchema.index({ systemId: 1, areaId: 1 });
taskSchema.index({ workOrderId: 1, status: 1 });
taskSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const diffTime = this.dueDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
taskSchema.pre('save', function(next) {
  // Auto-update completion percentage based on status
  if (this.status === 'completed' && this.completionPercentage < 100) {
    this.completionPercentage = 100;
  } else if (this.status === 'not_started' && this.completionPercentage > 0) {
    this.completionPercentage = 0;
  }
  
  next();
});

// Instance methods
taskSchema.methods.markCompleted = function(userId) {
  this.status = 'completed';
  this.completionPercentage = 100;
  this.metadata.set('completedBy', userId);
  this.metadata.set('completedAt', new Date());
  return this.save();
};

taskSchema.methods.addComment = function(userId, comment) {
  // This would integrate with a separate Comments model
  // For now, we'll add it to metadata
  const comments = this.metadata.get('comments') || [];
  comments.push({
    userId,
    comment,
    timestamp: new Date()
  });
  this.metadata.set('comments', comments);
  return this.save();
};

// Static methods
taskSchema.statics.findByJob = function(jobId, options = {}) {
  return this.find({ jobId, ...options })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

taskSchema.statics.findByProject = function(projectId, options = {}) {
  return this.find({ projectId, ...options })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

taskSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  })
    .populate('assignedTo', 'name email')
    .sort({ dueDate: 1 });
};

module.exports = mongoose.model('Task', taskSchema);
