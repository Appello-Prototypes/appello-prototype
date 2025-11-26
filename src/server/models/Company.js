const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Company Identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  companyNumber: {
    type: String,
    trim: true,
    sparse: true // Allow null but enforce uniqueness when present
  },
  
  // Company Type - Single type only: Customer, Supplier, Distributor, Subcontractor, or Other
  companyType: {
    type: String,
    enum: ['customer', 'supplier', 'distributor', 'subcontractor', 'other'],
    required: true,
    default: 'supplier'
  },
  
  // Contact Information
  contact: {
    name: String,
    email: String,
    phone: String,
    title: String
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    province: String, // Province/State
    postalCode: String,
    country: { type: String, default: 'Canada' }
  },
  
  // Financial Information
  paymentTerms: {
    type: String,
    trim: true,
    default: 'Net 30'
  },
  taxId: {
    type: String,
    trim: true
  },
  
  // Supplier-specific fields
  supplierInfo: {
    catalogUrl: String,
    orderEmail: String,
    orderPhone: String,
    minimumOrder: Number,
    leadTimeDays: Number
  },
  
  // Distributor-Supplier Relationships (for distributors only)
  // Tracks which suppliers (manufacturers) this distributor works with
  distributorSuppliers: [{
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    }, // The supplier (manufacturer) this distributor carries
    isActive: {
      type: Boolean,
      default: true
    },
    addedDate: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
companySchema.index({ name: 1 });
companySchema.index({ companyType: 1 });
companySchema.index({ isActive: 1 });
companySchema.index({ name: 'text' }); // Text search index

module.exports = mongoose.model('Company', companySchema);

