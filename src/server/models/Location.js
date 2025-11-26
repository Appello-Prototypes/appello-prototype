const mongoose = require('mongoose');

/**
 * Location Model
 * 
 * Manages physical locations where inventory is stored
 * Supports hierarchical locations (e.g., "Warehouse A > Aisle 1 > Shelf 2")
 */
const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  parentLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  },
  locationType: {
    type: String,
    enum: ['warehouse', 'job_site', 'yard', 'office', 'vehicle', 'other'],
    default: 'warehouse'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'USA'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  capacity: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient hierarchical queries
locationSchema.index({ parentLocation: 1, isActive: 1 });
locationSchema.index({ name: 1, isActive: 1 });

// Virtual for full path (e.g., "Warehouse A > Aisle 1 > Shelf 2")
locationSchema.virtual('fullPath').get(function() {
  if (!this.parentLocation) {
    return this.name;
  }
  // Note: This requires population to work fully
  return this.name;
});

// Method to get full path with populated parent
locationSchema.methods.getFullPath = async function() {
  let path = this.name;
  let current = this;
  
  while (current.parentLocation) {
    await current.populate('parentLocation');
    if (current.parentLocation) {
      path = `${current.parentLocation.name} > ${path}`;
      current = current.parentLocation;
    } else {
      break;
    }
  }
  
  return path;
};

module.exports = mongoose.model('Location', locationSchema);

