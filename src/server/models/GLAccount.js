const mongoose = require('mongoose');

const glAccountSchema = new mongoose.Schema({
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
  glCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GLCategory'
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

// Compound index for job-specific GL accounts
glAccountSchema.index({ jobId: 1, code: 1 }, { unique: true });
glAccountSchema.index({ jobId: 1, sortOrder: 1 });
glAccountSchema.index({ glCategoryId: 1 });

glAccountSchema.set('toJSON', { virtuals: true });
glAccountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GLAccount', glAccountSchema);

