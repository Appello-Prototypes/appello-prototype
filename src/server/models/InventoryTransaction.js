const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  // Transaction Type
  transactionType: {
    type: String,
    enum: ['receipt', 'issue', 'return', 'adjustment', 'transfer'],
    required: true
  },
  
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
    trim: true
  },
  
  // Quantity
  quantity: {
    type: Number,
    required: true
  },
  
  // Cost Information
  unitCost: {
    type: Number,
    min: 0,
    required: true
  },
  totalCost: {
    type: Number,
    min: 0,
    required: true
  },
  
  // Job Reference (for issues/returns)
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  costCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  
  // Source References
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  receiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POReceipt'
  },
  
  // Adjustment Information
  adjustmentReason: {
    type: String,
    trim: true
  },
  adjustmentApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Transfer Information
  transferToLocation: {
    type: String,
    trim: true
  },
  
  // User Information
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
inventoryTransactionSchema.index({ productId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ transactionType: 1 });
inventoryTransactionSchema.index({ jobId: 1 });
inventoryTransactionSchema.index({ location: 1 });
inventoryTransactionSchema.index({ purchaseOrderId: 1 });
inventoryTransactionSchema.index({ receiptId: 1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);

