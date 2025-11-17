const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
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
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  componentType: {
    type: String,
    enum: ['pipe', 'valve', 'fitting', 'equipment', 'vessel', 'heat_exchanger', 'pump', 'compressor', 'tank', 'other'],
    default: 'other'
  },
  size: {
    type: String,
    trim: true
  },
  material: {
    type: String,
    trim: true
  },
  specification: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for job-specific components
componentSchema.index({ jobId: 1, code: 1 }, { unique: true });
componentSchema.index({ jobId: 1, sortOrder: 1 });
componentSchema.index({ moduleId: 1 });

// Virtual for full component identifier
componentSchema.virtual('fullCode').get(function() {
  return `COMP-${this.code}`;
});

// Virtual for full specification
componentSchema.virtual('fullSpec').get(function() {
  const parts = [this.size, this.material, this.specification].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
});

componentSchema.set('toJSON', { virtuals: true });
componentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Component', componentSchema);
