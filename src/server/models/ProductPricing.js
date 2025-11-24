/**
 * Product Pricing Model
 * 
 * Manages pricing information including list prices, net prices, and discounts
 * Supports customer-specific pricing, effective dates, and pricing tiers
 */

const mongoose = require('mongoose');

const pricingTierSchema = new mongoose.Schema({
  // Tier identification
  name: {
    type: String,
    trim: true
  },
  // Pricing for this tier
  listPrice: {
    type: Number,
    min: 0,
    required: true
  },
  netPrice: {
    type: Number,
    min: 0
  },
  // Discount information
  discountPercent: {
    type: Number,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    min: 0
  },
  // Effective dates
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiresDate: {
    type: Date
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const customerPricingSchema = new mongoose.Schema({
  // Customer reference
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  customerName: {
    type: String,
    trim: true
  },
  // Pricing for this customer
  listPrice: {
    type: Number,
    min: 0
  },
  netPrice: {
    type: Number,
    min: 0,
    required: true
  },
  // Discount information
  discountPercent: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  discountAmount: {
    type: Number,
    min: 0
  },
  // Effective dates
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiresDate: {
    type: Date
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const productPricingSchema = new mongoose.Schema({
  // Product reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId // Reference to variant within product
  },
  
  // Supplier reference
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Base pricing (list price from supplier)
  listPrice: {
    type: Number,
    min: 0,
    required: true
  },
  
  // Standard net price (after standard discount)
  netPrice: {
    type: Number,
    min: 0
  },
  
  // Standard discount (applied to all customers unless overridden)
  standardDiscountPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Pricing tiers (volume discounts, etc.)
  pricingTiers: {
    type: [pricingTierSchema],
    default: []
  },
  
  // Customer-specific pricing
  customerPricing: {
    type: [customerPricingSchema],
    default: []
  },
  
  // Category/Group discount (from pricebook)
  categoryDiscountPercent: {
    type: Number,
    min: 0,
    max: 100
  },
  categoryGroup: {
    type: String,
    trim: true
  },
  
  // Effective dates
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiresDate: {
    type: Date
  },
  
  // Replaces previous pricing
  replacesDate: {
    type: Date
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Calculate net price from list price and discount
productPricingSchema.virtual('calculatedNetPrice').get(function() {
  if (this.netPrice) {
    return this.netPrice;
  }
  if (this.listPrice && this.standardDiscountPercent) {
    return this.listPrice * (1 - this.standardDiscountPercent / 100);
  }
  return this.listPrice;
});

// Method: Get price for specific customer
productPricingSchema.methods.getPriceForCustomer = function(customerId) {
  // Check for customer-specific pricing
  const customerPrice = this.customerPricing.find(
    cp => cp.customerId && cp.customerId.toString() === customerId.toString() && cp.isActive
  );
  
  if (customerPrice) {
    return {
      listPrice: customerPrice.listPrice || this.listPrice,
      netPrice: customerPrice.netPrice,
      discountPercent: customerPrice.discountPercent,
      source: 'customer-specific'
    };
  }
  
  // Use standard pricing
  return {
    listPrice: this.listPrice,
    netPrice: this.netPrice || this.calculatedNetPrice,
    discountPercent: this.standardDiscountPercent,
    source: 'standard'
  };
};

// Method: Calculate net price from list price and discount percent
productPricingSchema.methods.calculateNetPrice = function(discountPercent) {
  if (!this.listPrice) return null;
  const discount = discountPercent || this.standardDiscountPercent || 0;
  return this.listPrice * (1 - discount / 100);
};

// Indexes
productPricingSchema.index({ productId: 1, variantId: 1 });
productPricingSchema.index({ supplierId: 1 });
productPricingSchema.index({ productId: 1, supplierId: 1 });
productPricingSchema.index({ categoryGroup: 1 });
productPricingSchema.index({ effectiveDate: 1 });
productPricingSchema.index({ isActive: 1 });
productPricingSchema.index({ 'customerPricing.customerId': 1 });

module.exports = mongoose.model('ProductPricing', productPricingSchema);

