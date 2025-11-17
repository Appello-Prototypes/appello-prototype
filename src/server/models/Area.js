const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
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
  floor: {
    type: String,
    trim: true
  },
  zone: {
    type: String,
    trim: true
  },
  building: {
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

// Compound index for job-specific areas
areaSchema.index({ jobId: 1, code: 1 }, { unique: true });
areaSchema.index({ jobId: 1, sortOrder: 1 });

// Virtual for full area identifier
areaSchema.virtual('fullCode').get(function() {
  return `AREA-${this.code}`;
});

// Virtual for location description
areaSchema.virtual('location').get(function() {
  const parts = [this.building, this.floor, this.zone].filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : null;
});

areaSchema.set('toJSON', { virtuals: true });
areaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Area', areaSchema);
