const mongoose = require('mongoose');

const glCategorySchema = new mongoose.Schema({
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

// Compound index for job-specific GL categories
glCategorySchema.index({ jobId: 1, code: 1 }, { unique: true });
glCategorySchema.index({ jobId: 1, sortOrder: 1 });

glCategorySchema.set('toJSON', { virtuals: true });
glCategorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GLCategory', glCategorySchema);

