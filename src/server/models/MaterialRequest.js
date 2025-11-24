const mongoose = require('mongoose');

const materialRequestSchema = new mongoose.Schema({
  // Request Identification
  requestNumber: {
    type: String,
    unique: true,
    trim: true
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
  
  // Requestor Information
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Request Details
  requiredByDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['urgent', 'standard', 'low'],
    default: 'standard',
    required: true
  },
  
  // Delivery Information
  deliveryLocation: {
    type: String,
    enum: ['jobsite', 'warehouse', 'pick_up'],
    required: true,
    default: 'jobsite'
  },
  deliveryAddress: {
    type: String,
    trim: true
  },
  deliveryNotes: {
    type: String,
    trim: true
  },
  
  // Line Items
  lineItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: {
      type: String,
      required: true,
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
    notes: {
      type: String,
      trim: true
    }
  }],
  
  // Attachments (photos)
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now },
    description: String // e.g., "Photo of existing material", "Drawing/spec", "Site conditions"
  }],
  
  // Status Tracking
  status: {
    type: String,
    enum: ['submitted', 'approved', 'po_issued', 'delivered', 'closed', 'rejected', 'clarification_requested'],
    default: 'submitted',
    required: true
  },
  
  // Office Actions
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  approvalNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  clarificationRequest: {
    type: String,
    trim: true
  },
  
  // Linked Purchase Order
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
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

// Pre-save middleware to generate request number
materialRequestSchema.pre('save', async function(next) {
  if (!this.requestNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('MaterialRequest').countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.requestNumber = `MR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Indexes (requestNumber already indexed via unique: true)
materialRequestSchema.index({ jobId: 1, status: 1 });
materialRequestSchema.index({ requestedBy: 1 });
materialRequestSchema.index({ status: 1 });
materialRequestSchema.index({ requiredByDate: 1 });
materialRequestSchema.index({ purchaseOrderId: 1 });

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);

