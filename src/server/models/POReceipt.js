const mongoose = require('mongoose');

const poReceiptSchema = new mongoose.Schema({
  // Receipt Identification
  receiptNumber: {
    type: String,
    unique: true,
    trim: true
  },
  
  // Purchase Order Reference
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
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
  
  // Receiving Details
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receivedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Delivery Information
  deliveryDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  deliveryTicketNumber: {
    type: String,
    trim: true
  },
  locationPlaced: {
    type: String,
    trim: true // e.g., "Floor 3, North Wing" or "Warehouse 1, Aisle 3"
  },
  
  // Bill of Lading (Critical)
  billOfLadingPhoto: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  
  // Material Photos
  materialPhotos: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now },
    description: String // e.g., "Delivered material", "Placement location"
  }],
  
  // Receipt Line Items
  receiptItems: [{
    poLineItemIndex: {
      type: Number,
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    quantityOrdered: {
      type: Number,
      required: true,
      min: 0
    },
    quantityReceived: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ_FT', 'GAL', 'LB', 'KG', 'OTHER'],
      required: true
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
    condition: {
      type: String,
      enum: ['good', 'damaged', 'incorrect_item'],
      default: 'good',
      required: true
    },
    conditionNotes: {
      type: String,
      trim: true
    },
    costCode: {
      type: String,
      trim: true,
      uppercase: true
    }
  }],
  
  // Receipt Totals
  totalReceived: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'submitted',
    required: true
  },
  
  // Over-receipt Handling
  overReceiptApproved: {
    type: Boolean,
    default: false
  },
  overReceiptApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  overReceiptApprovedAt: Date,
  
  // Offline Sync
  syncedFromOffline: {
    type: Boolean,
    default: false
  },
  offlineSyncDate: Date,
  
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

// Pre-save middleware to generate receipt number and calculate totals
poReceiptSchema.pre('save', async function(next) {
  // Calculate receipt totals
  this.totalReceived = this.receiptItems.reduce((sum, item) => {
    return sum + (item.extendedCost || 0);
  }, 0);
  
  // Generate receipt number if not set
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('POReceipt').countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.receiptNumber = `REC-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  
  next();
});

// Indexes (receiptNumber already indexed via unique: true)
poReceiptSchema.index({ purchaseOrderId: 1 });
poReceiptSchema.index({ jobId: 1 });
poReceiptSchema.index({ receivedBy: 1 });
poReceiptSchema.index({ receivedAt: 1 });
poReceiptSchema.index({ status: 1 });
poReceiptSchema.index({ deliveryTicketNumber: 1 });

module.exports = mongoose.model('POReceipt', poReceiptSchema);

