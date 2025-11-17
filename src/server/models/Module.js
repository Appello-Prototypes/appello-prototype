const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
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
  systemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System'
  },
  moduleType: {
    type: String,
    enum: ['piping', 'equipment', 'structural', 'electrical', 'instrumentation', 'hvac', 'other'],
    default: 'other'
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

// Compound index for job-specific modules
moduleSchema.index({ jobId: 1, code: 1 }, { unique: true });
moduleSchema.index({ jobId: 1, sortOrder: 1 });
moduleSchema.index({ systemId: 1 });

// Virtual for full module identifier
moduleSchema.virtual('fullCode').get(function() {
  return `MOD-${this.code}`;
});

moduleSchema.set('toJSON', { virtuals: true });
moduleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Module', moduleSchema);
