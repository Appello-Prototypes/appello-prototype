const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const Job = require('../models/Job');
const User = require('../models/User');

const inventoryController = {
  // GET /api/inventory - Get all inventory items with filters
  getAllInventory: async (req, res) => {
    try {
      const { 
        productId, 
        variantId, 
        inventoryType, 
        location, 
        isActive,
        lowStock,
        search 
      } = req.query;
      
      const filter = {};
      if (productId) filter.productId = productId;
      if (variantId) filter.variantId = variantId;
      if (location) filter.primaryLocation = location;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      
      // Low stock filter (for bulk items below reorder point)
      if (lowStock === 'true') {
        filter.inventoryType = 'bulk';
        filter.$expr = { 
          $and: [
            { $lt: ['$quantityOnHand', '$reorderPoint'] },
            { $ne: ['$reorderPoint', null] }
          ]
        };
      } else if (inventoryType) {
        filter.inventoryType = inventoryType;
      }
      
      // If search is provided, we need to find products first, then filter inventory
      if (search) {
        const products = await Product.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { internalPartNumber: { $regex: search, $options: 'i' } }
          ]
        }).select('_id').lean();
        
        if (!Array.isArray(products) || products.length === 0) {
          // No products match search, return empty array
          return res.json({
            success: true,
            data: []
          });
        }
        
        const productIds = products.map(p => p._id).filter(id => id);
        if (productIds.length === 0) {
          return res.json({
            success: true,
            data: []
          });
        }
        filter.productId = { $in: productIds };
      }
      
      let inventory = await Inventory.find(filter)
        .populate({
          path: 'productId',
          select: 'name internalPartNumber unitOfMeasure productTypeId variants'
        })
        .sort({ createdAt: -1 })
        .lean();
      
      // Ensure inventory is an array
      if (!Array.isArray(inventory)) {
        inventory = [];
      }
      
      // Filter out any inventory items with null products (products that were deleted)
      inventory = inventory.filter(item => item.productId !== null && item.productId !== undefined);
      
      // Manually populate productTypeId if needed
      const productTypeIdsSet = new Set();
      for (const item of inventory) {
        const ptId = item.productId?.productTypeId;
        if (ptId) {
          const ptIdStr = ptId.toString ? ptId.toString() : String(ptId);
          if (mongoose.Types.ObjectId.isValid(ptIdStr)) {
            productTypeIdsSet.add(ptIdStr);
          }
        }
      }
      const productTypeIds = Array.from(productTypeIdsSet);
      
      let productTypesMap = {};
      if (productTypeIds.length > 0) {
        // Convert string IDs to ObjectIds for the query
        const objectIds = productTypeIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id).filter(id => id);
        if (objectIds.length > 0) {
          const productTypes = await ProductType.find({ _id: { $in: objectIds } })
            .select('name')
            .lean();
          productTypesMap = productTypes.reduce((acc, pt) => {
            acc[pt._id.toString()] = pt;
            return acc;
          }, {});
        }
      }
      
      // Attach productType data to products
      for (const item of inventory) {
        if (item.productId && item.productId.productTypeId) {
          const ptId = item.productId.productTypeId.toString ? 
            item.productId.productTypeId.toString() : 
            String(item.productId.productTypeId);
          if (productTypesMap[ptId]) {
            item.productId.productType = productTypesMap[ptId];
          }
        }
      }
      
      // Manually populate variant data if variantId exists
      for (const item of inventory) {
        if (item.variantId && item.productId && item.productId.variants) {
          const variant = item.productId.variants.find(
            v => v._id && v._id.toString() === item.variantId.toString()
          );
          if (variant) {
            // Handle variant properties - could be Map, object, or undefined
            let variantProperties = {};
            if (variant.properties) {
              if (variant.properties instanceof Map) {
                variantProperties = Object.fromEntries(variant.properties);
              } else if (typeof variant.properties === 'object' && variant.properties !== null) {
                variantProperties = variant.properties;
              }
            }
            
            item.variantId = {
              _id: variant._id,
              name: variant.name,
              variantProperties: variantProperties
            };
          } else {
            item.variantId = null;
          }
        } else {
          item.variantId = null;
        }
      }
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      console.error('Error in getAllInventory:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      if (error.stack) {
        const stackLines = error.stack.split('\n');
        console.error('First few stack lines:', stackLines.slice(0, 5).join('\n'));
      }
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // GET /api/inventory/product/:productId/:variantId? - Get inventory for a specific product/variant
  getInventoryByProduct: async (req, res) => {
    try {
      const { productId, variantId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }
      
      const filter = { productId };
      if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
        filter.variantId = variantId;
      } else {
        filter.variantId = null; // Base product, no variant
      }
      
      let inventory = await Inventory.findOne(filter)
        .populate('productId', 'name internalPartNumber unitOfMeasure productTypeId inventoryTracking variants')
        .populate('transactions.performedBy', 'name email')
        .populate('transactions.referenceId')
        .lean();
      
      // Manually populate productTypeId
      if (inventory && inventory.productId && inventory.productId.productTypeId) {
        const productType = await ProductType.findById(inventory.productId.productTypeId)
          .select('name')
          .lean();
        if (productType) {
          inventory.productId.productType = productType;
        }
      }
      
      // Manually populate variant if variantId exists
      if (inventory && inventory.variantId && inventory.productId && inventory.productId.variants) {
        const variant = inventory.productId.variants.find(
          v => v._id && v._id.toString() === inventory.variantId.toString()
        );
        if (variant) {
          inventory.variantId = {
            _id: variant._id,
            name: variant.name,
            variantProperties: variant.properties ? Object.fromEntries(variant.properties) : {}
          };
        } else {
          inventory.variantId = null;
        }
      }
      
      // If no inventory exists, return product info with empty inventory
      if (!inventory) {
        const product = await Product.findById(productId)
          .populate('productTypeId', 'name')
          .lean();
        
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }
        
        return res.json({
          success: true,
          data: {
            productId: product._id,
            variantId: variantId || null,
            inventoryType: product.inventoryTracking?.type || 'bulk',
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            serializedUnits: [],
            locations: [],
            transactions: [],
            product: product,
            isNew: true
          }
        });
      }
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      console.error('Error in getInventoryByProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/inventory/:id - Get inventory by ID
  getInventoryById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid inventory ID format'
        });
      }

      let inventory = await Inventory.findById(req.params.id)
        .populate('productId', 'name internalPartNumber unitOfMeasure productTypeId inventoryTracking variants')
        .populate('transactions.performedBy', 'name email')
        .populate('transactions.referenceId')
        .lean();
      
      // Manually populate productTypeId
      if (inventory && inventory.productId && inventory.productId.productTypeId) {
        const productType = await ProductType.findById(inventory.productId.productTypeId)
          .select('name')
          .lean();
        if (productType) {
          inventory.productId.productType = productType;
        }
      }
      
      // Manually populate variant if variantId exists
      if (inventory && inventory.variantId && inventory.productId && inventory.productId.variants) {
        const variant = inventory.productId.variants.find(
          v => v._id && v._id.toString() === inventory.variantId.toString()
        );
        if (variant) {
          inventory.variantId = {
            _id: variant._id,
            name: variant.name,
            variantProperties: variant.properties ? Object.fromEntries(variant.properties) : {}
          };
        } else {
          inventory.variantId = null;
        }
      }

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      console.error('Error in getInventoryById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/inventory - Create or update inventory
  createOrUpdateInventory: async (req, res) => {
    try {
      const {
        productId,
        variantId,
        inventoryType,
        quantityOnHand,
        quantityReserved,
        reorderPoint,
        reorderQuantity,
        primaryLocation,
        locations,
        costMethod,
        averageCost,
        notes
      } = req.body;

      if (!productId || !inventoryType) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and inventory type are required'
        });
      }

      if (!['bulk', 'serialized'].includes(inventoryType)) {
        return res.status(400).json({
          success: false,
          message: 'Inventory type must be "bulk" or "serialized"'
        });
      }

      // Find existing inventory
      const filter = { productId, variantId: variantId || null };
      let inventory = await Inventory.findOne(filter);

      if (inventory) {
        // Update existing
        if (inventoryType === 'bulk') {
          if (quantityOnHand !== undefined) inventory.quantityOnHand = quantityOnHand;
          if (quantityReserved !== undefined) inventory.quantityReserved = quantityReserved;
        }
        if (reorderPoint !== undefined) inventory.reorderPoint = reorderPoint;
        if (reorderQuantity !== undefined) inventory.reorderQuantity = reorderQuantity;
        if (primaryLocation !== undefined) inventory.primaryLocation = primaryLocation;
        if (locations !== undefined) inventory.locations = locations;
        if (costMethod !== undefined) inventory.costMethod = costMethod;
        if (averageCost !== undefined) inventory.averageCost = averageCost;
        if (notes !== undefined) inventory.notes = notes;
        inventory.lastUpdatedBy = req.user?.id || null;
      } else {
        // Create new
        inventory = new Inventory({
          productId,
          variantId: variantId || null,
          inventoryType,
          quantityOnHand: inventoryType === 'bulk' ? (quantityOnHand || 0) : 0,
          quantityReserved: inventoryType === 'bulk' ? (quantityReserved || 0) : 0,
          reorderPoint,
          reorderQuantity,
          primaryLocation,
          locations: locations || [],
          costMethod: costMethod || 'fifo',
          averageCost: averageCost || 0,
          notes,
          createdBy: req.user?.id || null
        });
      }

      await inventory.save();

      const populated = await Inventory.findById(inventory._id)
        .populate('productId', 'name internalPartNumber unitOfMeasure')
        .populate('variantId', 'name')
        .lean();

      res.json({
        success: true,
        data: populated
      });
    } catch (error) {
      console.error('Error in createOrUpdateInventory:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating/updating inventory',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/inventory/:id/transaction - Add a transaction
  addTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        type,
        quantity,
        serialNumbers,
        unitCost,
        referenceType,
        referenceId,
        fromLocation,
        toLocation,
        notes
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid inventory ID format'
        });
      }

      const inventory = await Inventory.findById(id);
      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      // Validate transaction type
      const validTypes = ['receipt', 'issue', 'adjustment', 'transfer', 'write_off', 'return'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Create transaction
      const transaction = {
        type,
        quantity,
        serialNumbers: serialNumbers || [],
        unitCost: unitCost || inventory.averageCost || 0,
        totalCost: (unitCost || inventory.averageCost || 0) * Math.abs(quantity),
        referenceType,
        referenceId: referenceId ? mongoose.Types.ObjectId(referenceId) : null,
        fromLocation,
        toLocation,
        notes,
        performedBy: req.user?.id || null,
        performedAt: new Date()
      };

      // Update inventory based on transaction type
      if (inventory.inventoryType === 'bulk') {
        if (type === 'receipt' || type === 'return') {
          inventory.quantityOnHand += quantity;
          // Update average cost if receipt
          if (type === 'receipt' && unitCost) {
            const currentValue = inventory.quantityOnHand * inventory.averageCost;
            const receiptValue = quantity * unitCost;
            const newQuantity = inventory.quantityOnHand;
            inventory.averageCost = newQuantity > 0 ? (currentValue + receiptValue) / newQuantity : unitCost;
          }
        } else if (type === 'issue' || type === 'write_off') {
          if (inventory.quantityOnHand < quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient quantity. Available: ${inventory.quantityOnHand}, Requested: ${quantity}`
            });
          }
          inventory.quantityOnHand -= quantity;
        } else if (type === 'adjustment') {
          inventory.quantityOnHand += quantity;
          if (inventory.quantityOnHand < 0) {
            return res.status(400).json({
              success: false,
              message: 'Adjustment would result in negative quantity'
            });
          }
        } else if (type === 'transfer') {
          // Handle location transfer
          if (fromLocation && toLocation) {
            // Update locations array
            const fromLoc = inventory.locations.find(l => l.location === fromLocation);
            const toLoc = inventory.locations.find(l => l.location === toLocation);
            
            if (fromLoc && fromLoc.quantity >= quantity) {
              fromLoc.quantity -= quantity;
              if (toLoc) {
                toLoc.quantity += quantity;
              } else {
                inventory.locations.push({ location: toLocation, quantity });
              }
            }
          }
        }
      } else {
        // Serialized items
        if (type === 'receipt' || type === 'return') {
          // Add serial numbers
          if (!serialNumbers || serialNumbers.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Serial numbers are required for serialized items'
            });
          }
          serialNumbers.forEach(serial => {
            inventory.serializedUnits.push({
              serialNumber: serial,
              status: 'available',
              location: toLocation || inventory.primaryLocation,
              receivedDate: new Date()
            });
          });
        } else if (type === 'issue') {
          // Mark serial numbers as assigned/in_use
          if (!serialNumbers || serialNumbers.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Serial numbers are required for issuing serialized items'
            });
          }
          serialNumbers.forEach(serial => {
            const unit = inventory.serializedUnits.find(u => u.serialNumber === serial && u.status === 'available');
            if (unit) {
              unit.status = 'in_use';
              unit.assignedTo = referenceId ? mongoose.Types.ObjectId(referenceId) : null;
            }
          });
        } else if (type === 'write_off') {
          serialNumbers.forEach(serial => {
            const unit = inventory.serializedUnits.find(u => u.serialNumber === serial);
            if (unit) {
              unit.status = 'retired';
            }
          });
        }
      }

      // Add transaction to history
      inventory.transactions.push(transaction);
      await inventory.save();

      const populated = await Inventory.findById(inventory._id)
        .populate('productId', 'name internalPartNumber unitOfMeasure')
        .populate('transactions.performedBy', 'name email')
        .lean();

      res.json({
        success: true,
        data: populated
      });
    } catch (error) {
      console.error('Error in addTransaction:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding transaction',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/inventory/:id/transactions - Get transactions for an inventory item
  getInventoryTransactions: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid inventory ID format'
        });
      }

      const inventory = await Inventory.findById(id)
        .select('transactions')
        .populate('transactions.performedBy', 'name email')
        .lean();

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      // Sort transactions by date (newest first)
      let transactions = inventory.transactions.sort((a, b) => 
        new Date(b.performedAt || b.createdAt) - new Date(a.performedAt || a.createdAt)
      );

      // Enhance transactions with receipt and PO details
      const POReceipt = require('../models/POReceipt');
      const PurchaseOrder = require('../models/PurchaseOrder');
      
      const enhancedTransactions = await Promise.all(
        transactions.map(async (txn) => {
          const enhanced = { ...txn };
          
          // If transaction has receiptId, fetch receipt details
          if (txn.receiptId) {
            try {
              const receipt = await POReceipt.findById(txn.receiptId)
                .populate('purchaseOrderId', 'poNumber supplierId')
                .populate('receivedBy', 'name email')
                .select('receiptNumber purchaseOrderId receivedBy deliveryDate locationPlaced notes billOfLadingPhoto')
                .lean();
              
              if (receipt) {
                enhanced.receipt = {
                  receiptNumber: receipt.receiptNumber,
                  deliveryDate: receipt.deliveryDate,
                  locationPlaced: receipt.locationPlaced,
                  notes: receipt.notes,
                  billOfLadingPhoto: receipt.billOfLadingPhoto,
                  receivedBy: receipt.receivedBy
                };
                
                // Also populate PO details
                if (receipt.purchaseOrderId) {
                  enhanced.purchaseOrder = {
                    _id: receipt.purchaseOrderId._id,
                    poNumber: receipt.purchaseOrderId.poNumber,
                    supplierId: receipt.purchaseOrderId.supplierId
                  };
                }
              }
            } catch (err) {
              console.error('Error fetching receipt details:', err);
            }
          }
          
          // If transaction has purchaseOrderId but no receipt, fetch PO details
          if (txn.purchaseOrderId && !enhanced.receipt) {
            try {
              const po = await PurchaseOrder.findById(txn.purchaseOrderId)
                .select('poNumber supplierId')
                .lean();
              
              if (po) {
                enhanced.purchaseOrder = {
                  _id: po._id,
                  poNumber: po.poNumber,
                  supplierId: po.supplierId
                };
              }
            } catch (err) {
              console.error('Error fetching PO details:', err);
            }
          }
          
          return enhanced;
        })
      );

      res.json({
        success: true,
        data: enhancedTransactions
      });
    } catch (error) {
      console.error('Error in getInventoryTransactions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transactions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/inventory/:id/serialized-units - Add serialized units
  addSerializedUnits: async (req, res) => {
    try {
      const { id } = req.params;
      const { serialNumbers, location, receivedDate } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid inventory ID format'
        });
      }

      const inventory = await Inventory.findById(id);
      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      if (inventory.inventoryType !== 'serialized') {
        return res.status(400).json({
          success: false,
          message: 'This inventory item is not configured for serialized tracking'
        });
      }

      if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Serial numbers array is required'
        });
      }

      // Add serialized units
      serialNumbers.forEach(serial => {
        // Check if serial number already exists
        const exists = inventory.serializedUnits.some(u => u.serialNumber === serial);
        if (!exists) {
          inventory.serializedUnits.push({
            serialNumber: serial,
            status: 'available',
            location: location || inventory.primaryLocation,
            receivedDate: receivedDate ? new Date(receivedDate) : new Date()
          });
        }
      });

      await inventory.save();

      const populated = await Inventory.findById(inventory._id)
        .populate('productId', 'name internalPartNumber unitOfMeasure')
        .lean();

      res.json({
        success: true,
        data: populated
      });
    } catch (error) {
      console.error('Error in addSerializedUnits:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding serialized units',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PUT /api/inventory/:id/serialized-units/:serialNumber - Update a serialized unit
  updateSerializedUnit: async (req, res) => {
    try {
      const { id, serialNumber } = req.params;
      const { status, assignedTo, assignedToTask, location, notes, lastMaintenanceDate } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid inventory ID format'
        });
      }

      const inventory = await Inventory.findById(id);
      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      const unit = inventory.serializedUnits.find(u => u.serialNumber === serialNumber);
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Serialized unit not found'
        });
      }

      if (status !== undefined) unit.status = status;
      if (assignedTo !== undefined) unit.assignedTo = assignedTo ? mongoose.Types.ObjectId(assignedTo) : null;
      if (assignedToTask !== undefined) unit.assignedToTask = assignedToTask ? mongoose.Types.ObjectId(assignedToTask) : null;
      if (location !== undefined) unit.location = location;
      if (notes !== undefined) unit.notes = notes;
      if (lastMaintenanceDate !== undefined) unit.lastMaintenanceDate = new Date(lastMaintenanceDate);

      await inventory.save();

      const populated = await Inventory.findById(inventory._id)
        .populate('productId', 'name internalPartNumber unitOfMeasure')
        .populate('serializedUnits.assignedTo', 'name jobNumber')
        .lean();

      res.json({
        success: true,
        data: populated
      });
    } catch (error) {
      console.error('Error in updateSerializedUnit:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating serialized unit',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = inventoryController;
