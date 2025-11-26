const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const MaterialRequest = require('../models/MaterialRequest');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const { generatePOPDF } = require('../utils/pdfGenerator');
const { sendPOEmail } = require('../utils/emailService');
const { sendPOEmailViaGmail } = require('../utils/gmailService');
const Product = require('../models/Product');

// Configuration for approval threshold
const APPROVAL_THRESHOLD = process.env.PO_APPROVAL_THRESHOLD || 1000; // Default $1,000

const purchaseOrderController = {
  // GET /api/purchase-orders
  getAllPurchaseOrders: async (req, res) => {
    try {
      const { jobId, supplierId, status, buyerId } = req.query;
      
      const filter = {};
      if (jobId) filter.jobId = jobId;
      if (supplierId) filter.supplierId = supplierId;
      if (status) filter.status = status;
      if (buyerId) filter.buyerId = buyerId;
      
      const purchaseOrders = await PurchaseOrder.find(filter)
        .populate('supplierId', 'name companyType contact.email')
        .populate('jobId', 'name jobNumber')
        .populate('buyerId', 'name email')
        .select('poNumber supplierId jobId total status requiredByDate createdAt')
        .sort({ createdAt: -1 })
        .lean();
      
      res.json({
        success: true,
        data: purchaseOrders
      });
    } catch (error) {
      console.error('Error in getAllPurchaseOrders:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching purchase orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/purchase-orders/:id
  getPurchaseOrderById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id)
        .populate('supplierId')
        .populate('jobId')
        .populate('projectId')
        .populate('buyerId', 'name email')
        .populate('approvedBy', 'name email')
        .populate('lineItems.productId')
        .populate('materialRequestId')
        .lean();

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error in getPurchaseOrderById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching purchase order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/purchase-orders
  createPurchaseOrder: async (req, res) => {
    try {
      const poData = {
        ...req.body,
        buyerId: req.user?.id || req.user?._id || req.body.buyerId
      };
      
      // Validate buyerId is present
      if (!poData.buyerId) {
        // Try to get from req.user if available (from auth middleware)
        if (req.user) {
          poData.buyerId = req.user._id || req.user.id
        }
        
        if (!poData.buyerId) {
          return res.status(400).json({
            success: false,
            message: 'buyerId is required. Please ensure you are logged in and include buyerId in the request.'
          });
        }
      }
      
      // Ensure buyerId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(poData.buyerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid buyerId format'
        });
      }

      // Validate supplier exists
      const supplier = await Company.findById(poData.supplierId);
      if (!supplier) {
        return res.status(400).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      // Validate job exists
      const job = await Job.findById(poData.jobId);
      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Set projectId from job if not provided
      if (!poData.projectId) {
        if (job.projectId) {
          poData.projectId = job.projectId;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Job does not have an associated project. Please select a job with a project.'
          });
        }
      }
      
      // Validate projectId exists
      if (poData.projectId && !mongoose.Types.ObjectId.isValid(poData.projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID format'
        });
      }

      // Calculate totals if not provided
      if (!poData.subtotal && poData.lineItems) {
        poData.subtotal = poData.lineItems.reduce((sum, item) => {
          return sum + (item.extendedCost || (item.quantity * item.unitPrice));
        }, 0);
      }
      if (!poData.total) {
        poData.total = (poData.subtotal || 0) + (poData.taxAmount || 0) + (poData.freightAmount || 0);
      }

      // Determine if approval is required
      poData.approvalRequired = poData.total >= APPROVAL_THRESHOLD;
      if (!poData.approvalRequired) {
        poData.status = 'approved'; // Auto-approve if under threshold
      } else {
        poData.status = 'pending_approval';
      }

      const purchaseOrder = await PurchaseOrder.create(poData);

      res.status(201).json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error in createPurchaseOrder:', error);
      if (error.name === 'ValidationError') {
        // Extract detailed validation errors
        const validationErrors = {};
        if (error.errors) {
          Object.keys(error.errors).forEach(key => {
            validationErrors[key] = error.errors[key].message;
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message,
          validationErrors: Object.keys(validationErrors).length > 0 ? validationErrors : undefined
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating purchase order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/purchase-orders/:id
  updatePurchaseOrder: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      // Don't allow updates to issued POs (must use revision)
      if (purchaseOrder.status === 'sent' || purchaseOrder.status === 'fully_received') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update issued PO. Create a revision instead.'
        });
      }

      // Update fields
      Object.assign(purchaseOrder, req.body);

      // Recalculate totals if line items changed
      if (req.body.lineItems) {
        purchaseOrder.subtotal = purchaseOrder.lineItems.reduce((sum, item) => {
          return sum + (item.extendedCost || (item.quantity * item.unitPrice));
        }, 0);
        purchaseOrder.total = purchaseOrder.subtotal + (purchaseOrder.taxAmount || 0) + (purchaseOrder.freightAmount || 0);
        
        // Re-check approval requirement
        purchaseOrder.approvalRequired = purchaseOrder.total >= APPROVAL_THRESHOLD;
        if (purchaseOrder.status === 'approved' && purchaseOrder.approvalRequired) {
          purchaseOrder.status = 'pending_approval';
          purchaseOrder.approvedBy = null;
          purchaseOrder.approvedAt = null;
        }
      }

      await purchaseOrder.save();

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error in updatePurchaseOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating purchase order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/purchase-orders/:id/submit-for-approval
  submitForApproval: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      if (purchaseOrder.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'PO must be in draft status to submit for approval'
        });
      }

      // Check if approval is required
      if (purchaseOrder.total >= APPROVAL_THRESHOLD) {
        purchaseOrder.status = 'pending_approval';
        purchaseOrder.approvalRequired = true;
      } else {
        purchaseOrder.status = 'approved';
        purchaseOrder.approvalRequired = false;
        purchaseOrder.approvedBy = req.user?.id;
        purchaseOrder.approvedAt = new Date();
      }

      await purchaseOrder.save();

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error in submitForApproval:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting PO for approval',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/purchase-orders/:id/approve
  approvePO: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      if (purchaseOrder.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'PO is not pending approval'
        });
      }

      purchaseOrder.status = 'approved';
      purchaseOrder.approvedBy = req.user?.id || req.body.approvedBy;
      purchaseOrder.approvedAt = new Date();

      await purchaseOrder.save();

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error in approvePO:', error);
      res.status(500).json({
        success: false,
        message: 'Error approving PO',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/purchase-orders/:id/reject
  rejectPO: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      purchaseOrder.status = 'draft';
      purchaseOrder.rejectionReason = req.body.rejectionReason || '';

      await purchaseOrder.save();

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error in rejectPO:', error);
      res.status(500).json({
        success: false,
        message: 'Error rejecting PO',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/purchase-orders/:id/issue
  issuePO: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id)
        .populate('supplierId')
        .populate('jobId')
        .populate('buyerId');

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      if (purchaseOrder.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'PO must be approved before issuing'
        });
      }

      // Update PO status
      purchaseOrder.status = 'sent';
      purchaseOrder.issuedAt = new Date();
      purchaseOrder.issuedBy = req.user?.id || purchaseOrder.buyerId._id;
      purchaseOrder.emailSent = false; // Will be set to true after email is sent

      await purchaseOrder.save();

      // Post committed cost to job (if not already posted)
      if (!purchaseOrder.committedCostPosted) {
        // TODO: Update job committed cost (Phase 4 - Job Cost Integration)
        purchaseOrder.committedCostPosted = true;
        purchaseOrder.committedCostPostedAt = new Date();
        await purchaseOrder.save();
      }

      res.json({
        success: true,
        data: purchaseOrder,
        message: 'PO issued successfully. Use the email endpoint to send to supplier.'
      });
    } catch (error) {
      console.error('Error in issuePO:', error);
      res.status(500).json({
        success: false,
        message: 'Error issuing PO',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/purchase-orders/:id/cancel
  cancelPO: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      if (purchaseOrder.status === 'fully_received' || purchaseOrder.status === 'closed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel fully received or closed PO'
        });
      }

      purchaseOrder.status = 'cancelled';
      await purchaseOrder.save();

      // TODO: Release committed cost from job (Phase 4)
      // Note: Cancellation email can be sent using the email endpoint if needed

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error in cancelPO:', error);
      res.status(500).json({
        success: false,
        message: 'Error cancelling PO',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/purchase-orders/:id/pdf
  downloadPOPDF: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid PO ID format'
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(req.params.id)
        .populate('supplierId')
        .populate('jobId')
        .populate('buyerId')
        .lean();

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      // Fetch products for package quantities
      const productIds = purchaseOrder.lineItems
        .map(item => item.productId)
        .filter(Boolean);
      const products = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean()
        : [];

      // Generate PDF
      const pdfBuffer = await generatePOPDF(
        purchaseOrder,
        purchaseOrder.supplierId,
        purchaseOrder.jobId,
        purchaseOrder.buyerId,
        products
      );

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO-${purchaseOrder.poNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PO PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating PDF',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/purchase-orders/:id/send-email
  sendPOEmail: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid PO ID format'
        });
      }

      const { toEmail } = req.body;

      const purchaseOrder = await PurchaseOrder.findById(req.params.id)
        .populate('supplierId')
        .populate('jobId')
        .populate('buyerId')
        .lean();

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      // Get current user with Google OAuth info
      const userId = req.user?.id || purchaseOrder.buyerId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required to send email'
        });
      }

      const currentUser = await User.findById(userId);
      
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Try Gmail API first (if user has Google connected), fallback to SMTP
      let emailResult;
      let emailMethod = 'smtp';

      if (currentUser?.googleOAuth?.refreshToken) {
        try {
          // Use Gmail API
          emailMethod = 'gmail';
          
          // Generate PDF
          // Fetch products for package quantities
          const productIds = purchaseOrder.lineItems
            .map(item => item.productId)
            .filter(Boolean);
          const products = productIds.length > 0
            ? await Product.find({ _id: { $in: productIds } }).lean()
            : [];

          const pdfBuffer = await generatePOPDF(
            purchaseOrder,
            purchaseOrder.supplierId,
            purchaseOrder.jobId,
            purchaseOrder.buyerId,
            products
          );

          emailResult = await sendPOEmailViaGmail({
            user: currentUser,
            po: purchaseOrder,
            supplier: purchaseOrder.supplierId,
            pdfBuffer,
            toEmail
          });
        } catch (gmailError) {
          console.error('Gmail API failed, falling back to SMTP:', gmailError);
          // Fall through to SMTP fallback
          emailMethod = 'smtp';
        }
      }

      // Fallback to SMTP if Gmail API not available or failed
      if (emailMethod === 'smtp') {
        // Check if SMTP is configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          return res.status(500).json({
            success: false,
            message: 'Email service not configured. Please connect your Google account or set SMTP_USER and SMTP_PASS environment variables.',
            requiresGoogleAuth: !currentUser?.googleOAuth?.refreshToken
          });
        }

        // Generate PDF
        const pdfBuffer = await generatePOPDF(
          purchaseOrder,
          purchaseOrder.supplierId,
          purchaseOrder.jobId,
          purchaseOrder.buyerId
        );

        // Send email via SMTP
        emailResult = await sendPOEmail({
          po: purchaseOrder,
          supplier: purchaseOrder.supplierId,
          pdfBuffer,
          toEmail
        });
      }

      // Update PO email status
      await PurchaseOrder.findByIdAndUpdate(req.params.id, {
        emailSent: true,
        emailSentAt: new Date()
      });

      res.json({
        success: true,
        data: {
          messageId: emailResult.messageId || emailResult.threadId,
          method: emailMethod
        },
        message: `PO email sent successfully via ${emailMethod.toUpperCase()}`
      });
    } catch (error) {
      console.error('Error sending PO email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error sending email',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = purchaseOrderController;

