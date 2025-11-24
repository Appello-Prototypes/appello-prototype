/**
 * Discount Model
 * 
 * Master discount list for managing category-based, customer-specific, and product-specific discounts
 */

const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  // Discount Identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    sparse: true // Not unique - multiple discounts can share same group code
  },
  
  // Discount Type
  discountType: {
    type: String,
    enum: ['category', 'customer', 'product', 'supplier', 'group', 'universal'],
    required: true,
    default: 'category'
  },
  
  // Category/Group Information (for category-based discounts)
  category: {
    type: String,
    trim: true
  },
  categoryGroup: {
    type: String,
    trim: true // e.g., "CAEG171", "CAEG164"
  },
  section: {
    type: String,
    trim: true // e.g., "FIBREGLASS", "MINERAL WOOL"
  },
  
  // Customer Information (for customer-specific discounts)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  customerName: {
    type: String,
    trim: true
  },
  
  // Product Information (for product-specific discounts)
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  productName: {
    type: String,
    trim: true
  },
  
  // Supplier Information (for supplier-specific discounts)
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  supplierName: {
    type: String,
    trim: true
  },
  
  // Discount Value
  discountPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    min: 0
  },
  
  // Effective Dates
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiresDate: {
    type: Date
  },
  replacesDate: {
    type: Date // Date of previous discount this replaces
  },
  
  // Pricebook Reference
  pricebookPage: {
    type: String,
    trim: true // e.g., "FIBREGLASS PIPE WITH ASJ"
  },
  pricebookPageNumber: {
    type: String,
    trim: true // e.g., "1.1", "1.2"
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastApplied: {
    type: Date // When this discount was last applied to products
  },
  productsAffected: {
    type: Number,
    default: 0 // Count of products/variants affected
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
discountSchema.index({ discountType: 1, category: 1 });
discountSchema.index({ categoryGroup: 1 });
discountSchema.index({ categoryGroup: 1, pricebookPageNumber: 1 }, { unique: true, sparse: true }); // Unique combination
discountSchema.index({ customerId: 1 });
discountSchema.index({ supplierId: 1 });
discountSchema.index({ productId: 1 });
discountSchema.index({ isActive: 1 });
discountSchema.index({ effectiveDate: 1 });
discountSchema.index({ code: 1 });

// Virtual: Check if discount is currently active
discountSchema.virtual('isCurrentlyActive').get(function() {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.effectiveDate && this.effectiveDate > now) return false;
  if (this.expiresDate && this.expiresDate < now) return false;
  return true;
});

module.exports = mongoose.model('Discount', discountSchema);

