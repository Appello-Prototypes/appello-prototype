const mongoose = require('mongoose');
const POReceipt = require('../models/POReceipt');
const PurchaseOrder = require('../models/PurchaseOrder');
const Job = require('../models/Job');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// Configuration for over-receipt tolerance
const OVER_RECEIPT_TOLERANCE = process.env.OVER_RECEIPT_TOLERANCE || 0.05; // Default 5%

const poReceiptController = {
  // GET /api/po-receipts
  getAllReceipts: async (req, res) => {
    try {
      const { purchaseOrderId, jobId, status } = req.query;
      
      const filter = {};
      if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
      if (jobId) filter.jobId = jobId;
      if (status) filter.status = status;
      
      const receipts = await POReceipt.find(filter)
        .populate('purchaseOrderId', 'poNumber supplierId')
        .populate('jobId', 'name jobNumber')
        .populate('receivedBy', 'name email')
        .select('receiptNumber purchaseOrderId jobId receivedAt totalReceived status')
        .sort({ receivedAt: -1 })
        .lean();
      
      res.json({
        success: true,
        data: receipts
      });
    } catch (error) {
      console.error('Error in getAllReceipts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching receipts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/po-receipts/:id
  getReceiptById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid receipt ID format'
        });
      }

      const receipt = await POReceipt.findById(req.params.id)
        .populate('purchaseOrderId')
        .populate('jobId')
        .populate('receivedBy')
        .populate('receiptItems.productId')
        .lean();

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      console.error('Error in getReceiptById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching receipt',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/po-receipts/job/:jobId/open-pos
  getOpenPOsForJob: async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const purchaseOrders = await PurchaseOrder.find({
        jobId,
        status: { $in: ['sent', 'partially_received'] }
      })
        .populate('supplierId', 'name')
        .populate('lineItems.productId', 'name unitOfMeasure')
        .select('poNumber supplierId requiredByDate lineItems total')
        .sort({ requiredByDate: 1 })
        .lean();

      res.json({
        success: true,
        data: purchaseOrders
      });
    } catch (error) {
      console.error('Error in getOpenPOsForJob:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching open POs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/po-receipts
  createReceipt: async (req, res) => {
    try {
      const receiptData = {
        ...req.body,
        receivedBy: req.user?.id || req.body.receivedBy,
        // Handle photo data - can be object with path/filename or file reference
        billOfLadingPhoto: req.body.billOfLadingPhoto || null,
        materialPhotos: req.body.materialPhotos || []
      };

      // Validate PO exists
      const purchaseOrder = await PurchaseOrder.findById(receiptData.purchaseOrderId)
        .populate('lineItems.productId');

      if (!purchaseOrder) {
        return res.status(400).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      if (purchaseOrder.status === 'cancelled' || purchaseOrder.status === 'closed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot receive against cancelled or closed PO'
        });
      }

      // Validate job matches PO
      if (receiptData.jobId.toString() !== purchaseOrder.jobId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Job ID does not match PO job ID'
        });
      }

      // Map receiptData.lineItems to receiptItems format expected by the model
      let receiptItems = (receiptData.lineItems || []).map((item, index) => {
        const poLineItem = purchaseOrder.lineItems.find(li => li._id?.toString() === item.poLineItemId?.toString());
        if (!poLineItem) {
          throw new Error(`PO line item not found: ${item.poLineItemId}`);
        }
        
        return {
          poLineItemIndex: purchaseOrder.lineItems.indexOf(poLineItem),
          productId: poLineItem.productId,
          productName: item.productName || poLineItem.productName,
          quantityOrdered: poLineItem.quantity || poLineItem.quantityOrdered,
          quantityReceived: parseFloat(item.quantityReceived) || 0,
          unit: item.unit || poLineItem.unit,
          unitPrice: poLineItem.unitPrice,
          condition: item.condition || 'good',
          notes: item.notes || ''
        };
      });

      receiptData.receiptItems = receiptItems;

      for (const item of receiptData.receiptItems) {
        const poLineItem = purchaseOrder.lineItems[item.poLineItemIndex];
        if (!poLineItem) {
          return res.status(400).json({
            success: false,
            message: `Invalid line item index: ${item.poLineItemIndex}`
          });
        }

        const quantityOrdered = poLineItem.quantityOrdered || poLineItem.quantity;
        const quantityReceivedToDate = poLineItem.quantityReceived || 0;
        const quantityReceivedNow = item.quantityReceived;
        const totalReceived = quantityReceivedToDate + quantityReceivedNow;

        // Check for over-receipt
        const overReceiptAmount = totalReceived - quantityOrdered;
        const overReceiptPercent = (overReceiptAmount / quantityOrdered) * 100;

        if (overReceiptPercent > (OVER_RECEIPT_TOLERANCE * 100)) {
          hasOverReceipt = true;
          overReceiptItems.push({
            productName: item.productName,
            ordered: quantityOrdered,
            received: totalReceived,
            overReceipt: overReceiptAmount,
            overReceiptPercent: overReceiptPercent.toFixed(2)
          });
        }

        // Update item with calculated values
        item.extendedCost = item.quantityReceived * (poLineItem.unitPrice || 0);
      }

      // Check for over-receipt
      let hasOverReceipt = false;
      const overReceiptItems = [];

      for (const item of receiptData.receiptItems) {
        const poLineItem = purchaseOrder.lineItems[item.poLineItemIndex];
        const quantityOrdered = poLineItem.quantityOrdered || poLineItem.quantity;
        const quantityReceivedToDate = poLineItem.quantityReceived || 0;
        const quantityReceivedNow = item.quantityReceived;
        const totalReceived = quantityReceivedToDate + quantityReceivedNow;

        // Check for over-receipt
        const overReceiptAmount = totalReceived - quantityOrdered;
        const overReceiptPercent = (overReceiptAmount / quantityOrdered) * 100;

        if (overReceiptPercent > (OVER_RECEIPT_TOLERANCE * 100)) {
          hasOverReceipt = true;
          overReceiptItems.push({
            productName: item.productName,
            ordered: quantityOrdered,
            received: totalReceived,
            overReceipt: overReceiptAmount,
            overReceiptPercent: overReceiptPercent.toFixed(2)
          });
        }
      }

      // Create receipt
      const receipt = await POReceipt.create(receiptData);

      // Update PO line items
      for (const item of receipt.receiptItems) {
        const poLineItem = purchaseOrder.lineItems[item.poLineItemIndex];
        poLineItem.quantityReceived = (poLineItem.quantityReceived || 0) + item.quantityReceived;
        
        const remaining = (poLineItem.quantityOrdered || poLineItem.quantity) - poLineItem.quantityReceived;
        if (remaining > 0) {
          poLineItem.quantityBackordered = remaining;
          poLineItem.status = 'partially_received';
        } else {
          poLineItem.quantityBackordered = 0;
          poLineItem.status = 'fully_received';
        }
      }

      // Update PO status
      const allReceived = purchaseOrder.lineItems.every(item => item.status === 'fully_received');
      const someReceived = purchaseOrder.lineItems.some(item => item.status === 'partially_received' || item.status === 'fully_received');
      
      if (allReceived) {
        purchaseOrder.status = 'fully_received';
      } else if (someReceived) {
        purchaseOrder.status = 'partially_received';
      }

      await purchaseOrder.save();

      // Update inventory for products with inventory tracking enabled
      for (const receiptItem of receipt.receiptItems) {
        if (receiptItem.productId) {
          try {
            const product = await Product.findById(receiptItem.productId);
            if (product && product.inventoryTracking?.enabled) {
              // Find or create inventory record
              let inventory = await Inventory.findOne({
                productId: receiptItem.productId,
                variantId: null // Base product, no variant
              });

              if (!inventory) {
                // Create new inventory record
                inventory = new Inventory({
                  productId: receiptItem.productId,
                  variantId: null,
                  inventoryType: product.inventoryTracking.type || 'bulk',
                  quantityOnHand: 0,
                  quantityReserved: 0,
                  primaryLocation: receipt.locationPlaced || product.inventoryTracking.defaultLocation || 'Warehouse',
                  costMethod: 'fifo',
                  averageCost: receiptItem.unitPrice || 0
                });
              }

              // Add receipt transaction
              const transactionQuantity = receiptItem.quantityReceived;
              const unitCost = receiptItem.unitPrice || inventory.averageCost || 0;
              
              if (inventory.inventoryType === 'bulk') {
                // Update bulk inventory
                inventory.quantityOnHand += transactionQuantity;
                
                // Update average cost (weighted average)
                const currentValue = inventory.quantityOnHand * inventory.averageCost;
                const receiptValue = transactionQuantity * unitCost;
                const newQuantity = inventory.quantityOnHand;
                inventory.averageCost = newQuantity > 0 ? (currentValue + receiptValue) / newQuantity : unitCost;
                
                // Update location if provided
                if (receipt.locationPlaced) {
                  const location = inventory.locations.find(l => l.location === receipt.locationPlaced);
                  if (location) {
                    location.quantity += transactionQuantity;
                  } else {
                    inventory.locations.push({
                      location: receipt.locationPlaced,
                      quantity: transactionQuantity
                    });
                  }
                  if (!inventory.primaryLocation) {
                    inventory.primaryLocation = receipt.locationPlaced;
                  }
                }
              }
              // For serialized items, serial numbers would be added via AddSerializedUnits API

              // Add transaction to history with full receipt details
              inventory.transactions.push({
                type: 'receipt',
                quantity: transactionQuantity,
                serialNumbers: [],
                unitCost: unitCost,
                totalCost: transactionQuantity * unitCost,
                referenceType: 'purchase_order',
                referenceId: receipt.purchaseOrderId,
                receiptId: receipt._id, // Link to PO Receipt document
                receiptNumber: receipt.receiptNumber, // Store receipt number for easy access
                toLocation: receipt.locationPlaced || inventory.primaryLocation,
                notes: receiptItem.conditionNotes || receipt.notes || `Received from ${receipt.receiptNumber || 'PO Receipt'}`,
                condition: receiptItem.condition, // Store condition (good/damaged/incorrect_item)
                performedBy: receipt.receivedBy,
                performedAt: receipt.receivedAt || new Date()
              });

              await inventory.save();
            }
          } catch (invError) {
            console.error(`Error updating inventory for product ${receiptItem.productId}:`, invError);
            // Don't fail the receipt creation if inventory update fails
          }
        }
      }

      // TODO: Post costs to job cost codes (Phase 4)

      res.status(201).json({
        success: true,
        data: receipt,
        warnings: hasOverReceipt ? {
          overReceipt: true,
          items: overReceiptItems,
          message: 'Over-receipt detected. PM approval may be required.'
        } : null
      });
    } catch (error) {
      console.error('Error in createReceipt:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating receipt',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/po-receipts/:id/approve-over-receipt
  approveOverReceipt: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid receipt ID format'
        });
      }

      const receipt = await POReceipt.findById(req.params.id);
      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      receipt.overReceiptApproved = true;
      receipt.overReceiptApprovedBy = req.user?.id || req.body.approvedBy;
      receipt.overReceiptApprovedAt = new Date();

      await receipt.save();

      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      console.error('Error in approveOverReceipt:', error);
      res.status(500).json({
        success: false,
        message: 'Error approving over-receipt',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/po-receipts/sync-offline
  syncOfflineReceipts: async (req, res) => {
    try {
      const { receipts } = req.body; // Array of receipt data created offline

      if (!Array.isArray(receipts) || receipts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Receipts array is required'
        });
      }

      const syncedReceipts = [];
      const errors = [];

      for (const receiptData of receipts) {
        try {
          receiptData.syncedFromOffline = true;
          receiptData.offlineSyncDate = new Date();
          
          const receipt = await POReceipt.create(receiptData);
          syncedReceipts.push(receipt);

          // Update PO (same logic as createReceipt)
          const purchaseOrder = await PurchaseOrder.findById(receipt.purchaseOrderId);
          // ... (same PO update logic)
          
        } catch (error) {
          errors.push({
            receiptData,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          synced: syncedReceipts.length,
          errors: errors.length,
          receipts: syncedReceipts,
          errors
        }
      });
    } catch (error) {
      console.error('Error in syncOfflineReceipts:', error);
      res.status(500).json({
        success: false,
        message: 'Error syncing offline receipts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = poReceiptController;

