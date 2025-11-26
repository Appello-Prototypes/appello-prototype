const mongoose = require('mongoose');

/**
 * Inventory Model
 * 
 * Tracks inventory for products, supporting both:
 * - Bulk items: Quantity-based tracking (e.g., "5,000 brackets")
 * - Serialized items: Individual unit tracking with serial numbers (e.g., "Forklift #12345")
 * 
 * Based on research:
 * - Equipment system already supports serialized vs non-serialized concept
 * - Bulk items track quantity on hand, assigned quantities, check-in/check-out
 * - Serialized items track individual units with serial numbers
 * - Both types need to support purchase orders and material requests
 */
const inventoryItemSchema = new mongoose.Schema({
  // Product reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product.variants',
    index: true
  },
  
  // Inventory Type
  inventoryType: {
    type: String,
    enum: ['bulk', 'serialized'],
    required: true,
    default: 'bulk',
    index: true
  },
  
  // Bulk Inventory Fields (for inventoryType: 'bulk')
  quantityOnHand: {
    type: Number,
    min: 0,
    default: 0
  },
  quantityReserved: {
    type: Number,
    min: 0,
    default: 0
  },
  quantityAvailable: {
    type: Number,
    min: 0,
    default: 0
  },
  reorderPoint: {
    type: Number,
    min: 0
  },
  reorderQuantity: {
    type: Number,
    min: 0
  },
  
  // Serialized Inventory Fields (for inventoryType: 'serialized')
  serializedUnits: [{
    serialNumber: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['available', 'assigned', 'in_use', 'maintenance', 'retired'],
      default: 'available',
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    assignedToTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    location: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    receivedDate: {
      type: Date
    },
    lastMaintenanceDate: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Location Tracking
  primaryLocation: {
    type: String,
    trim: true,
    index: true
  },
  locations: [{
    location: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      min: 0,
      default: 0
    },
    // For serialized items, track which serial numbers are at this location
    serialNumbers: [String]
  }],
  
  // Cost Tracking (FIFO, LIFO, or Average Cost)
  costMethod: {
    type: String,
    enum: ['fifo', 'lifo', 'average'],
    default: 'fifo'
  },
  averageCost: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Transaction History (for audit trail)
  transactions: [{
    type: {
      type: String,
      enum: ['receipt', 'issue', 'adjustment', 'transfer', 'write_off', 'return'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    // For serialized items
    serialNumbers: [String],
    // For bulk items
    unitCost: Number,
    totalCost: Number,
    // Reference to source document
    referenceType: {
      type: String,
      enum: ['purchase_order', 'material_request', 'work_order', 'adjustment', 'transfer']
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId
    },
    // PO Receipt reference (for receipt transactions)
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POReceipt'
    },
    receiptNumber: {
      type: String,
      trim: true
    },
    // Condition for receipt transactions
    condition: {
      type: String,
      enum: ['good', 'damaged', 'incorrect_item']
    },
    fromLocation: String,
    toLocation: String,
    notes: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Metadata
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Calculate available quantity
inventoryItemSchema.virtual('calculatedAvailable').get(function() {
  if (this.inventoryType === 'bulk') {
    return Math.max(0, this.quantityOnHand - this.quantityReserved)
  } else {
    // For serialized items, count available units
    return this.serializedUnits.filter(u => u.status === 'available').length
  }
});

// Pre-save hook: Update quantityAvailable
inventoryItemSchema.pre('save', function(next) {
  if (this.inventoryType === 'bulk') {
    this.quantityAvailable = Math.max(0, this.quantityOnHand - this.quantityReserved)
  } else {
    // For serialized items, count available units
    this.quantityAvailable = this.serializedUnits.filter(u => u.status === 'available').length
    this.quantityOnHand = this.serializedUnits.length
  }
  next()
});

// Indexes
inventoryItemSchema.index({ productId: 1, variantId: 1 }, { unique: true })
inventoryItemSchema.index({ inventoryType: 1, isActive: 1 })
inventoryItemSchema.index({ primaryLocation: 1 })
inventoryItemSchema.index({ 'serializedUnits.serialNumber': 1 })
inventoryItemSchema.index({ 'serializedUnits.status': 1 })
inventoryItemSchema.index({ 'serializedUnits.assignedTo': 1 })

module.exports = mongoose.model('Inventory', inventoryItemSchema);
