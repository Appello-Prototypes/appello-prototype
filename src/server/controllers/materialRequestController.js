const mongoose = require('mongoose');
const MaterialRequest = require('../models/MaterialRequest');
const PurchaseOrder = require('../models/PurchaseOrder');
const Job = require('../models/Job');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { generateShopPrintoutPDF } = require('../utils/pdfGenerator');

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
  },

  // POST /api/material-requests/:id/convert-to-pos
  convertToPOs: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material request ID format'
        });
      }

      const request = await MaterialRequest.findById(req.params.id)
        .populate('jobId')
        .populate('lineItems.productId')
        .populate('lineItems.productId.manufacturerId', 'name companyType')
        .populate('lineItems.productId.distributorId', 'name companyType')
        .populate('lineItems.productId.suppliers.distributorId', 'name companyType')
        .populate('lineItems.productId.suppliers.manufacturerId', 'name companyType')
        .populate('lineItems.productId.variants.suppliers.distributorId', 'name companyType')
        .populate('lineItems.productId.variants.suppliers.manufacturerId', 'name companyType');

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

      const { conversions } = req.body;

      if (!conversions || !Array.isArray(conversions) || conversions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one conversion is required'
        });
      }

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

      // Ensure jobId is properly extracted
      const jobId = request.jobId?._id || request.jobId;
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required. Material request must be associated with a job.'
        });
      }

      const createdPOs = [];
      const errors = [];

      // Create a PO for each conversion
      for (const conversion of conversions) {
        try {
          const { supplierId, lineItemIndices, defaultCostCode } = conversion;

          if (!supplierId) {
            errors.push({ supplierId: null, error: 'Supplier ID is required' });
            continue;
          }

          // Convert supplierId to ObjectId if it's a string
          let supplierObjectId = supplierId;
          if (typeof supplierId === 'string') {
            if (!mongoose.Types.ObjectId.isValid(supplierId)) {
              errors.push({ supplierId, error: 'Invalid supplier ID format' });
              continue;
            }
            supplierObjectId = new mongoose.Types.ObjectId(supplierId);
          }

          // Filter line items for this supplier
          const supplierLineItems = request.lineItems
            .filter((item, index) => lineItemIndices.includes(index))
            .map(item => {
              const product = item.productId;
              
              // Find supplier-specific pricing
              let unitPrice = 0;
              const variant = product?.variants?.find(v => 
                v._id?.toString() === item.variantId?.toString()
              );
              
              // Check variant suppliers first, then product suppliers
              const suppliers = variant?.suppliers || product?.suppliers || [];
              const supplierInfo = suppliers.find(s => {
                const sId = s.supplierId?._id || s.supplierId || s.supplier?._id || s.supplier;
                return sId?.toString() === supplierObjectId.toString();
              });

              if (supplierInfo) {
                unitPrice = supplierInfo.netPrice || supplierInfo.listPrice || supplierInfo.lastPrice || 0;
              } else if (product?.lastPrice) {
                unitPrice = product.lastPrice;
              }

              return {
                productId: product?._id || null,
                variantId: item.variantId || null,
                productName: item.productName,
                description: item.description || product?.description || '',
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: unitPrice,
                extendedCost: item.quantity * unitPrice,
                costCode: defaultCostCode || request.jobId?.costCodes?.[0]?.code || ''
              };
            });

          if (supplierLineItems.length === 0) {
            errors.push({ supplierId, error: 'No line items found for this supplier' });
            continue;
          }

          // Create purchase order
          const purchaseOrder = await PurchaseOrder.create({
            supplierId: supplierObjectId,
            jobId: jobId,
            projectId: projectId,
            defaultCostCode: defaultCostCode || undefined,
            requiredByDate: request.requiredByDate,
            shipToAddress: shipToAddress,
            deliveryInstructions: request.deliveryNotes,
            buyerId: buyerId,
            lineItems: supplierLineItems,
            materialRequestId: request._id,
            status: 'draft'
          });

          createdPOs.push(purchaseOrder);
        } catch (error) {
          console.error(`Error creating PO for supplier ${conversion.supplierId}:`, error);
          console.error('Full error:', error);
          errors.push({ 
            supplierId: conversion.supplierId, 
            error: error.message || 'Failed to create PO' 
          });
        }
      }

      // Update request status if at least one PO was created
      if (createdPOs.length > 0) {
        request.status = 'po_issued';
        // Store all PO IDs (if multiple)
        if (createdPOs.length === 1) {
          request.purchaseOrderId = createdPOs[0]._id;
        }
        // For multiple POs, we could add a purchaseOrderIds array field
        await request.save();
      }

      res.status(201).json({
        success: true,
        data: {
          purchaseOrders: createdPOs,
          materialRequest: request,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      console.error('Error in convertToPOs:', error);
      res.status(500).json({
        success: false,
        message: 'Error converting material request to POs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/material-requests/:id/fulfill
  fulfillRequest: async (req, res) => {
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

      const { lineItemFulfillments } = req.body; // Array of { lineItemIndex, fulfillmentSource, supplierId?, inventoryLocation?, costCode? }

      if (!lineItemFulfillments || !Array.isArray(lineItemFulfillments)) {
        return res.status(400).json({
          success: false,
          message: 'lineItemFulfillments array is required'
        });
      }

      // Update each line item with fulfillment information and issue inventory if needed
      for (const fulfillment of lineItemFulfillments) {
        const lineItem = request.lineItems[fulfillment.lineItemIndex];
        if (!lineItem) {
          continue;
        }

        // Update line item fulfillment info
        lineItem.fulfillmentSource = fulfillment.fulfillmentSource;
        lineItem.supplierId = fulfillment.supplierId || null;
        lineItem.inventoryLocation = fulfillment.inventoryLocation || null;
        lineItem.costCode = fulfillment.costCode || null;

        // If fulfilling from inventory, issue the inventory
        if (fulfillment.fulfillmentSource === 'inventory' && fulfillment.inventoryId && lineItem.productId) {
          try {
            const inventory = await Inventory.findById(fulfillment.inventoryId);
            if (inventory) {
              const issueQuantity = fulfillment.quantity || lineItem.quantity;
              
              // Create issue transaction
              inventory.transactions.push({
                type: 'issue',
                quantity: -issueQuantity,
                serialNumbers: [],
                referenceType: 'material_request',
                referenceId: request._id,
                notes: `Issued for Material Request ${request.requestNumber || request._id}`,
                performedBy: req.user?.id || request.requestedBy,
                performedAt: new Date()
              });

              // Update quantities
              if (inventory.inventoryType === 'bulk') {
                inventory.quantityOnHand = Math.max(0, inventory.quantityOnHand - issueQuantity);
              }

              await inventory.save();
            }
          } catch (invError) {
            console.error(`Error issuing inventory for MR ${request._id}:`, invError);
            // Continue with fulfillment even if inventory issue fails
          }
        }
      }(({ lineItemIndex, fulfillmentSource, supplierId, inventoryLocation, costCode }) => {
        if (request.lineItems[lineItemIndex]) {
          request.lineItems[lineItemIndex].fulfillmentSource = fulfillmentSource;
          if (supplierId) {
            request.lineItems[lineItemIndex].supplierId = supplierId;
          }
          if (inventoryLocation) {
            request.lineItems[lineItemIndex].inventoryLocation = inventoryLocation;
          }
          if (costCode) {
            request.lineItems[lineItemIndex].costCode = costCode.toUpperCase();
          }
        }
      });

      // Update status based on fulfillment
      const allFulfilled = request.lineItems.every(item => item.fulfillmentSource);
      if (allFulfilled) {
        request.status = 'approved';
      }

      await request.save();

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('Error in fulfillRequest:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing fulfillment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/material-requests/batch-generate-pos
  batchGeneratePOs: async (req, res) => {
    try {
      const { materialRequestIds } = req.body;

      if (!materialRequestIds || !Array.isArray(materialRequestIds) || materialRequestIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'materialRequestIds array is required'
        });
      }

      // Fetch all material requests
      const requests = await MaterialRequest.find({
        _id: { $in: materialRequestIds },
        status: { $in: ['approved', 'submitted'] }
      })
        .populate('jobId')
        .populate('lineItems.productId')
        .populate('lineItems.supplierId');

      if (requests.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid material requests found'
        });
      }

      // Group line items by supplier
      const supplierGroups = {};
      const requestMap = {}; // Track which requests contribute to which POs

      requests.forEach(request => {
        request.lineItems.forEach((item, itemIndex) => {
          if (!item.fulfillmentSource || item.fulfillmentSource !== 'supplier' || !item.supplierId) {
            return; // Skip items not fulfilled by supplier
          }

          const supplierId = item.supplierId._id || item.supplierId;
          if (!supplierGroups[supplierId]) {
            supplierGroups[supplierId] = {
              supplierId,
              items: [],
              jobs: new Set(),
              requests: new Set()
            };
          }

          supplierGroups[supplierId].items.push({
            ...item.toObject(),
            materialRequestId: request._id,
            materialRequestNumber: request.requestNumber,
            jobId: request.jobId._id || request.jobId,
            jobNumber: request.jobId.jobNumber || request.jobId.name
          });

          supplierGroups[supplierId].jobs.add(request.jobId._id || request.jobId);
          supplierGroups[supplierId].requests.add(request._id);
        });
      });

      // Create POs for each supplier
      const createdPOs = [];
      const buyerId = req.user?.id;

      for (const [supplierId, group] of Object.entries(supplierGroups)) {
        // Get all unique jobs for this PO
        const jobIds = Array.from(group.jobs);
        const primaryJobId = jobIds[0];
        const primaryJob = requests.find(r => 
          (r.jobId._id || r.jobId).toString() === primaryJobId.toString()
        )?.jobId;

        // Group items by job for PO line items
        const lineItems = group.items.map(item => {
          const product = item.productId;
          return {
            productId: product?._id || null,
            productName: item.productName,
            variantName: item.variantName,
            description: item.description || product?.description || '',
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: product?.lastPrice || product?.variants?.find(v => v._id?.toString() === item.variantId?.toString())?.pricing?.netPrice || 0,
            extendedCost: item.quantity * (product?.lastPrice || product?.variants?.find(v => v._id?.toString() === item.variantId?.toString())?.pricing?.netPrice || 0),
            costCode: item.costCode || '',
            jobId: item.jobId,
            jobNumber: item.jobNumber,
            materialRequestId: item.materialRequestId,
            materialRequestNumber: item.materialRequestNumber
          };
        });

        // Determine ship-to address (use first request's delivery address)
        const firstRequest = requests.find(r => 
          Array.from(group.requests).some(reqId => reqId.toString() === r._id.toString())
        );
        
        let shipToAddress = null;
        if (firstRequest?.deliveryAddress) {
          if (typeof firstRequest.deliveryAddress === 'string') {
            shipToAddress = {
              street: firstRequest.deliveryAddress,
              city: '',
              province: '',
              postalCode: '',
              country: 'Canada'
            };
          } else {
            shipToAddress = firstRequest.deliveryAddress;
          }
        } else if (primaryJob?.location) {
          if (typeof primaryJob.location === 'string') {
            shipToAddress = {
              street: primaryJob.location,
              city: '',
              province: '',
              postalCode: '',
              country: 'Canada'
            };
          } else {
            shipToAddress = primaryJob.location;
          }
        }

        // Get earliest required-by date
        const requiredByDate = requests
          .filter(r => Array.from(group.requests).some(reqId => reqId.toString() === r._id.toString()))
          .map(r => r.requiredByDate)
          .sort((a, b) => new Date(a) - new Date(b))[0];

        // Create PO
        const purchaseOrder = await PurchaseOrder.create({
          supplierId,
          jobId: primaryJobId,
          projectId: primaryJob?.projectId || requests.find(r => 
            (r.jobId._id || r.jobId).toString() === primaryJobId.toString()
          )?.projectId,
          requiredByDate,
          shipToAddress,
          deliveryInstructions: firstRequest?.deliveryNotes || '',
          buyerId: buyerId || firstRequest?.reviewedBy,
          lineItems,
          status: 'draft'
        });

        // Update material request statuses
        const requestIds = Array.from(group.requests);
        await MaterialRequest.updateMany(
          { _id: { $in: requestIds } },
          { 
            $set: { 
              status: 'po_issued',
              purchaseOrderId: purchaseOrder._id
            }
          }
        );

        createdPOs.push(purchaseOrder);
      }

      res.status(201).json({
        success: true,
        data: {
          purchaseOrders: createdPOs,
          summary: {
            totalPOs: createdPOs.length,
            suppliers: Object.keys(supplierGroups).length,
            materialRequests: materialRequestIds.length
          }
        }
      });
    } catch (error) {
      console.error('Error in batchGeneratePOs:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating purchase orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/material-requests/:id/shop-printout
  getShopPrintout: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material request ID format'
        });
      }

      const request = await MaterialRequest.findById(req.params.id)
        .populate('jobId')
        .populate('lineItems.productId')
        .lean();

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Material request not found'
        });
      }

      const pdfBuffer = await generateShopPrintoutPDF(request, request.jobId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="shop-printout-${request.requestNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error in getShopPrintout:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating shop printout',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/material-requests/ai-create
  createFromText: async (req, res) => {
    try {
      const { text, jobId } = req.body;

      if (!text || !jobId) {
        return res.status(400).json({
          success: false,
          message: 'Text and jobId are required'
        });
      }

      // Validate job exists
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Simple AI parsing (can be enhanced with actual AI service)
      // For now, parse common patterns like "200 feet of 1/2" x 1" pipe insulation"
      const lineItems = [];
      
      // Pattern matching for common formats
      // Example: "200 feet of 1/2" x 1" pipe insulation"
      const quantityPattern = /(\d+(?:\.\d+)?)\s*(feet|ft|ea|each|box|roll|sq\s*ft|gal|lb|kg|m)/gi;
      const productPattern = /(?:of|for|need|want|require)\s+(.+?)(?:\s+for|\s+to|$)/gi;
      
      // Try to extract quantities and products
      const quantityMatches = [...text.matchAll(quantityPattern)];
      const productMatches = [...text.matchAll(productPattern)];
      
      if (quantityMatches.length > 0) {
        quantityMatches.forEach((match, index) => {
          const quantity = parseFloat(match[1]);
          const unit = match[2].toUpperCase().replace(/\s+/g, '_');
          const productName = productMatches[index]?.[1]?.trim() || text.split(quantityPattern)[0]?.trim() || 'Material';
          
          lineItems.push({
            productName: productName,
            quantity: quantity,
            unit: unit === 'FT' ? 'FT' : unit === 'EA' || unit === 'EACH' ? 'EA' : 'OTHER',
            notes: `Parsed from: ${text}`
          });
        });
      } else {
        // Fallback: create single line item with full text
        lineItems.push({
          productName: text,
          quantity: 1,
          unit: 'EA',
          notes: 'AI parsed - please review'
        });
      }

      // Create material request
      const materialRequest = await MaterialRequest.create({
        jobId,
        projectId: job.projectId,
        requestedBy: req.user?.id,
        requiredByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
        priority: 'standard',
        deliveryLocation: 'jobsite',
        lineItems
      });

      res.status(201).json({
        success: true,
        data: materialRequest,
        message: 'Material request created from text. Please review and update details.'
      });
    } catch (error) {
      console.error('Error in createFromText:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating material request from text',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = materialRequestController;

