const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // User role and permissions
  role: {
    type: String,
    enum: ['admin', 'project_manager', 'field_supervisor', 'field_worker', 'office_staff', 'customer'],
    default: 'field_worker',
    required: true
  },
  
  // Contact information
  phone: {
    type: String,
    trim: true
  },
  
  // Employment details
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  department: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  
  // Skills and certifications
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    },
    certificationDate: Date,
    expiryDate: Date
  }],
  
  // Availability and scheduling
  workSchedule: {
    monday: { start: String, end: String, available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, available: { type: Boolean, default: true } },
    friday: { start: String, end: String, available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, available: { type: Boolean, default: false } },
    sunday: { start: String, end: String, available: { type: Boolean, default: false } }
  },
  
  // Notification preferences
  notifications: {
    email: {
      taskAssigned: { type: Boolean, default: true },
      taskDue: { type: Boolean, default: true },
      taskOverdue: { type: Boolean, default: true },
      taskCompleted: { type: Boolean, default: false },
      projectUpdates: { type: Boolean, default: true }
    },
    push: {
      taskAssigned: { type: Boolean, default: true },
      taskDue: { type: Boolean, default: true },
      taskOverdue: { type: Boolean, default: true },
      taskCompleted: { type: Boolean, default: false },
      projectUpdates: { type: Boolean, default: false }
    }
  },
  
  // Profile and preferences
  avatar: {
    type: String // URL or file path
  },
  timezone: {
    type: String,
    default: 'America/Toronto'
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  
  // Integration with main Appello platform
  appelloUserId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Mobile device information for push notifications
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ appelloUserId: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Virtual for full name if we had first/last name fields
userSchema.virtual('initials').get(function() {
  return this.name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('');
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Instance method to add device token
userSchema.methods.addDeviceToken = function(token, platform) {
  // Remove existing token if it exists
  this.deviceTokens = this.deviceTokens.filter(dt => dt.token !== token);
  
  // Add new token
  this.deviceTokens.push({ token, platform });
  
  // Keep only the 5 most recent tokens
  if (this.deviceTokens.length > 5) {
    this.deviceTokens = this.deviceTokens.slice(-5);
  }
  
  return this.save();
};

// Static methods
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true })
    .select('-password')
    .sort({ name: 1 });
};

userSchema.statics.findAvailableWorkers = function(skills = []) {
  const query = {
    role: { $in: ['field_worker', 'field_supervisor'] },
    isActive: true
  };
  
  if (skills.length > 0) {
    query['skills.name'] = { $in: skills };
  }
  
  return this.find(query)
    .select('-password')
    .sort({ name: 1 });
};

module.exports = mongoose.model('User', userSchema);
