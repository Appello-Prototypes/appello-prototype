const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  projectNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Client information
  client: {
    name: { type: String, required: true },
    contact: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  
  // Project details
  description: {
    type: String,
    trim: true
  },
  location: {
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Project timeline
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Financial information
  totalContractValue: {
    type: Number,
    required: true
  },
  
  // Project status
  status: {
    type: String,
    enum: ['bidding', 'awarded', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Project team
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Project-level information
  projectType: {
    type: String,
    enum: ['commercial', 'industrial', 'institutional', 'residential'],
    default: 'commercial'
  },
  
  // Progress tracking (rolled up from jobs)
  overallProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Metadata
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectSchema.index({ projectNumber: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ projectManager: 1 });
projectSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for total contract value from jobs
projectSchema.virtual('totalJobsValue').get(function() {
  // This would be calculated from associated jobs
  return this.totalContractValue;
});

// Methods
projectSchema.methods.updateProgressFromJobs = async function() {
  const Job = require('./Job');
  const jobs = await Job.find({ projectId: this._id });
  
  if (jobs.length === 0) {
    this.overallProgress = 0;
    return this.save();
  }
  
  const totalProgress = jobs.reduce((sum, job) => sum + (job.overallProgress || 0), 0);
  this.overallProgress = Math.round(totalProgress / jobs.length);
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema);
