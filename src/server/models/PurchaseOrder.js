const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  // PO Identification
  poNumber: {
    type: String,
    unique: true,
    required: false, // Will be auto-generated in pre-save hook
    trim: true,
    uppercase: true
  },
  
  // Supplier Information
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Job Assignment
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
  
  // Default Cost Code (can be overridden per line)
  defaultCostCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  
  // Delivery Information
  requiredByDate: {
    type: Date,
    required: true
  },
  shipToAddress: {
    street: String,
    city: String,
    province: String,
    postalCode: String,
    country: String
  },
  deliveryInstructions: {
    type: String,
    trim: true
  },
  
  // Buyer Information
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Line Items
  lineItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      // Variant ID within the product's variants array
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    variantName: {
      type: String,
      trim: true
    },
    sku: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ_FT', 'GAL', 'LB', 'KG', 'OTHER'],
      required: true,
      default: 'EA'
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    extendedCost: {
      type: Number,
      required: true,
      min: 0
    },
    costCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    // Receiving tracking
    quantityOrdered: {
      type: Number,
      default: function() { return this.quantity; }
    },
    quantityReceived: {
      type: Number,
      default: 0
    },
    quantityBackordered: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'partially_received', 'fully_received', 'cancelled'],
      default: 'pending'
    }
  }],
  
  // Financial Totals
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  freightAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // Approval Workflow
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'fully_received', 'cancelled', 'closed'],
    default: 'draft',
    required: true
  },
  approvalRequired: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: {
    type: String,
    trim: true
  },
  
  // Issuance Information
  issuedAt: Date,
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  
  // Revision Tracking
  revisionNumber: {
    type: Number,
    default: 0
  },
  parentPOId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  
  // Notes
  internalNotes: {
    type: String,
    trim: true
  },
  supplierNotes: {
    type: String,
    trim: true
  },
  
  // Source Material Request
  materialRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialRequest'
  },
  
  // Committed Cost Tracking
  committedCostPosted: {
    type: Boolean,
    default: false
  },
  committedCostPostedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to calculate totals and generate PO number
purchaseOrderSchema.pre('save', async function(next) {
  // Calculate line item extended costs
  this.lineItems.forEach(item => {
    if (!item.extendedCost || item.extendedCost === 0) {
      item.extendedCost = (item.quantity || 0) * (item.unitPrice || 0);
    }
  });
  
  // Calculate totals
  this.subtotal = this.lineItems.reduce((sum, item) => sum + (item.extendedCost || 0), 0);
  this.total = this.subtotal + (this.taxAmount || 0) + (this.freightAmount || 0);
  
  // Generate PO number if not set
  if (!this.poNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseOrder').countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  
  next();
});

// Indexes (poNumber already indexed via unique: true)
purchaseOrderSchema.index({ supplierId: 1, status: 1 });
purchaseOrderSchema.index({ jobId: 1, status: 1 });
purchaseOrderSchema.index({ buyerId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ requiredByDate: 1 });
purchaseOrderSchema.index({ materialRequestId: 1 });
purchaseOrderSchema.index({ parentPOId: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);

