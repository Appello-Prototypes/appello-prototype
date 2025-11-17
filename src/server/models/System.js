const mongoose = require('mongoose');

const systemSchema = new mongoose.Schema({
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

// Compound index for job-specific systems
systemSchema.index({ jobId: 1, code: 1 }, { unique: true });
systemSchema.index({ jobId: 1, sortOrder: 1 });

// Virtual for full system identifier
systemSchema.virtual('fullCode').get(function() {
  return `SYS-${this.code}`;
});

systemSchema.set('toJSON', { virtuals: true });
systemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('System', systemSchema);
