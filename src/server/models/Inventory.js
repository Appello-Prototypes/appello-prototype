const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // Product Reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Location
  location: {
    type: String,
    required: true,
    trim: true,
    default: 'Warehouse 1'
  },
  
  // Quantity Tracking
  onHandQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // Cost Tracking
  lastCost: {
    type: Number,
    min: 0,
    default: 0
  },
  averageCost: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Valuation
  totalValue: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Low Stock Alert
  lowStockThreshold: {
    type: Number,
    min: 0
  },
  isLowStock: {
    type: Boolean,
    default: false
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for product + location
inventorySchema.index({ productId: 1, location: 1 }, { unique: true });
inventorySchema.index({ location: 1 });
inventorySchema.index({ isLowStock: 1 });

// Pre-save middleware to update valuation and low stock status
inventorySchema.pre('save', function(next) {
  // Update total value
  this.totalValue = (this.onHandQuantity || 0) * (this.averageCost || 0);
  
  // Update low stock status
  if (this.lowStockThreshold && this.onHandQuantity <= this.lowStockThreshold) {
    this.isLowStock = true;
  } else {
    this.isLowStock = false;
  }
  
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);

