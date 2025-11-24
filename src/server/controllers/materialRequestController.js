const mongoose = require('mongoose');
const MaterialRequest = require('../models/MaterialRequest');
const PurchaseOrder = require('../models/PurchaseOrder');
const Job = require('../models/Job');
const Product = require('../models/Product');

const materialRequestController = {
  // GET /api/material-requests
  getAllMaterialRequests: async (req, res) => {
    try {
      const { jobId, status, priority, requestedBy } = req.query;
      
      const filter = {};
      if (jobId) filter.jobId = jobId;
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (requestedBy) filter.requestedBy = requestedBy;
      
      const requests = await MaterialRequest.find(filter)
        .populate('jobId', 'name jobNumber')
        .populate('requestedBy', 'name email')
        .populate('reviewedBy', 'name')
        .select('requestNumber jobId requestedBy requiredByDate priority status createdAt')
        .sort({ requiredByDate: 1, createdAt: -1 })
        .lean();
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error in getAllMaterialRequests:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching material requests',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/material-requests/:id
  getMaterialRequestById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material request ID format'
        });
      }

      const request = await MaterialRequest.findById(req.params.id)
        .populate('jobId')
        .populate('projectId')
        .populate('requestedBy', 'name email phone')
        .populate('reviewedBy', 'name email')
        .populate('purchaseOrderId', 'poNumber status')
        .populate('lineItems.productId')
        .lean();

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Material request not found'
        });
      }

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('Error in getMaterialRequestById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching material request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/material-requests
  createMaterialRequest: async (req, res) => {
    try {
      const requestData = {
        ...req.body,
        requestedBy: req.user?.id || req.body.requestedBy
      };

      // Validate job exists
      const job = await Job.findById(requestData.jobId);
      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Set projectId from job if not provided
      if (!requestData.projectId) {
        requestData.projectId = job.projectId;
      }

      const materialRequest = await MaterialRequest.create(requestData);

      res.status(201).json({
        success: true,
        data: materialRequest
      });
    } catch (error) {
      console.error('Error in createMaterialRequest:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating material request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/material-requests/:id
  updateMaterialRequest: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material request ID format'
        });
      }

      const request = await MaterialRequest.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate('jobId').populate('requestedBy').lean();

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Material request not found'
        });
      }

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('Error in updateMaterialRequest:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating material request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/material-requests/:id/approve
  approveRequest: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material request ID format'
        });
      }

      const request = await MaterialRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Material request not found'
        });
      }

      request.status = 'approved';
      request.reviewedBy = req.user?.id || req.body.reviewedBy;
      request.reviewedAt = new Date();
      request.approvalNotes = req.body.approvalNotes || '';

      await request.save();

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('Error in approveRequest:', error);
      res.status(500).json({
        success: false,
        message: 'Error approving material request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/material-requests/:id/reject
  rejectRequest: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material request ID format'
        });
      }

      const request = await MaterialRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Material request not found'
        });
      }

      request.status = 'rejected';
      request.reviewedBy = req.user?.id || req.body.reviewedBy;
      request.reviewedAt = new Date();
      request.rejectionReason = req.body.rejectionReason || '';

      await request.save();

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('Error in rejectRequest:', error);
      res.status(500).json({
        success: false,
        message: 'Error rejecting material request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/material-requests/:id/convert-to-po
  convertToPO: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material request ID format'
        });
      }

      const request = await MaterialRequest.findById(req.params.id)
        .populate('jobId')
        .populate('lineItems.productId');

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Material request not found'
        });
      }

      if (request.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Material request must be approved before converting to PO'
        });
      }

      const { supplierId, defaultCostCode } = req.body;

      if (!supplierId) {
        return res.status(400).json({
          success: false,
          message: 'Supplier ID is required'
        });
      }

      // Create PO line items from request line items
      const lineItems = request.lineItems.map(item => {
        const product = item.productId;
        return {
          productId: product?._id || null,
          productName: item.productName,
          description: item.description || product?.description || '',
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: product?.lastPrice || 0,
          extendedCost: item.quantity * (product?.lastPrice || 0),
          costCode: defaultCostCode || request.jobId?.costCodes?.[0]?.code || ''
        };
      });

      // Ensure projectId is set
      const projectId = request.projectId || request.jobId?.projectId;
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required. Material request must be associated with a project.'
        });
      }

      // Format shipToAddress properly
      let shipToAddress = null;
      if (request.deliveryAddress) {
        // If deliveryAddress is a string, parse it or use as street
        if (typeof request.deliveryAddress === 'string') {
          shipToAddress = {
            street: request.deliveryAddress,
            city: '',
            province: '',
            postalCode: '',
            country: 'Canada'
          };
        } else {
          shipToAddress = request.deliveryAddress;
        }
      } else if (request.jobId?.location) {
        // Use job location if available
        if (typeof request.jobId.location === 'string') {
          shipToAddress = {
            street: request.jobId.location,
            city: '',
            province: '',
            postalCode: '',
            country: 'Canada'
          };
        } else {
          shipToAddress = request.jobId.location;
        }
      }

      // Ensure buyerId is set
      const buyerId = req.user?.id || request.reviewedBy;
      if (!buyerId) {
        return res.status(400).json({
          success: false,
          message: 'Buyer ID is required. User must be authenticated or request must have a reviewer.'
        });
      }

      // Ensure jobId is properly extracted (handle both populated and unpopulated)
      const jobId = request.jobId?._id || request.jobId;
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required. Material request must be associated with a job.'
        });
      }

      // Create purchase order
      const purchaseOrder = await PurchaseOrder.create({
        supplierId,
        jobId: jobId,
        projectId: projectId,
        defaultCostCode,
        requiredByDate: request.requiredByDate,
        shipToAddress: shipToAddress,
        deliveryInstructions: request.deliveryNotes,
        buyerId: buyerId,
        lineItems,
        materialRequestId: request._id,
        status: 'draft'
      });

      // Update request status
      request.status = 'po_issued';
      request.purchaseOrderId = purchaseOrder._id;
      await request.save();

      res.status(201).json({
        success: true,
        data: {
          purchaseOrder,
          materialRequest: request
        }
      });
    } catch (error) {
      console.error('Error in convertToPO:', error);
      res.status(500).json({
        success: false,
        message: 'Error converting material request to PO',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = materialRequestController;

