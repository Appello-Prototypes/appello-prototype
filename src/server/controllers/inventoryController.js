const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const Job = require('../models/Job');

const inventoryController = {
  // GET /api/inventory
  getAllInventory: async (req, res) => {
    try {
      const { location, productId, isLowStock } = req.query;
      
      const filter = {};
      if (location) filter.location = location;
      if (productId) filter.productId = productId;
      if (isLowStock === 'true') filter.isLowStock = true;
      
      const inventory = await Inventory.find(filter)
        .populate('productId')
        .select('productId location onHandQuantity lastCost averageCost totalValue isLowStock')
        .sort({ location: 1, 'productId.name': 1 })
        .lean();
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      console.error('Error in getAllInventory:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/inventory/:id
  getInventoryById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid inventory ID format'
        });
      }

      const inventory = await Inventory.findById(req.params.id)
        .populate('productId')
        .lean();

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

  // POST /api/inventory/issue-to-job
  issueToJob: async (req, res) => {
    try {
      const { inventoryId, quantity, jobId, costCode } = req.body;

      if (!inventoryId || !quantity || !jobId) {
        return res.status(400).json({
          success: false,
          message: 'Inventory ID, quantity, and job ID are required'
        });
      }

      const inventory = await Inventory.findById(inventoryId).populate('productId');
      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      if (inventory.onHandQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity. Available: ${inventory.onHandQuantity}, Requested: ${quantity}`
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

      const unitCost = inventory.averageCost || inventory.lastCost || 0;
      const totalCost = quantity * unitCost;

      // Update inventory
      inventory.onHandQuantity -= quantity;
      await inventory.save();

      // Create transaction
      const transaction = await InventoryTransaction.create({
        transactionType: 'issue',
        productId: inventory.productId._id,
        location: inventory.location,
        quantity: -quantity, // Negative for issue
        unitCost,
        totalCost,
        jobId,
        costCode,
        performedBy: req.user?.id || req.body.performedBy
      });

      // TODO: Post cost to job cost code (Phase 4)

      res.json({
        success: true,
        data: {
          inventory,
          transaction
        }
      });
    } catch (error) {
      console.error('Error in issueToJob:', error);
      res.status(500).json({
        success: false,
        message: 'Error issuing inventory to job',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/inventory/return-from-job
  returnFromJob: async (req, res) => {
    try {
      const { productId, location, quantity, jobId, condition } = req.body;

      if (!productId || !location || !quantity || !jobId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, location, quantity, and job ID are required'
        });
      }

      // Find or create inventory record
      let inventory = await Inventory.findOne({
        productId,
        location
      });

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'Product not found'
        });
      }

      const unitCost = product.lastPrice || 0;
      const totalCost = quantity * unitCost;

      if (!inventory) {
        // Create new inventory record
        inventory = await Inventory.create({
          productId,
          location,
          onHandQuantity: quantity,
          lastCost: unitCost,
          averageCost: unitCost
        });
      } else {
        // Update existing inventory (average cost method)
        const currentValue = inventory.onHandQuantity * inventory.averageCost;
        const returnValue = quantity * unitCost;
        const newQuantity = inventory.onHandQuantity + quantity;
        inventory.averageCost = (currentValue + returnValue) / newQuantity;
        inventory.onHandQuantity = newQuantity;
        await inventory.save();
      }

      // Create transaction
      const transaction = await InventoryTransaction.create({
        transactionType: 'return',
        productId,
        location,
        quantity,
        unitCost,
        totalCost,
        jobId,
        performedBy: req.user?.id || req.body.performedBy,
        notes: condition ? `Returned in ${condition} condition` : ''
      });

      // TODO: Credit job cost code (Phase 4)

      res.json({
        success: true,
        data: {
          inventory,
          transaction
        }
      });
    } catch (error) {
      console.error('Error in returnFromJob:', error);
      res.status(500).json({
        success: false,
        message: 'Error returning inventory from job',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/inventory/adjust
  adjustInventory: async (req, res) => {
    try {
      const { inventoryId, quantity, reason } = req.body;

      if (!inventoryId || quantity === undefined || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Inventory ID, quantity adjustment, and reason are required'
        });
      }

      const inventory = await Inventory.findById(inventoryId).populate('productId');
      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      const unitCost = inventory.averageCost || inventory.lastCost || 0;
      const totalCost = Math.abs(quantity) * unitCost;

      // Update inventory
      inventory.onHandQuantity += quantity;
      if (inventory.onHandQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustment would result in negative quantity'
        });
      }
      await inventory.save();

      // Create transaction
      const transaction = await InventoryTransaction.create({
        transactionType: 'adjustment',
        productId: inventory.productId._id,
        location: inventory.location,
        quantity,
        unitCost,
        totalCost,
        adjustmentReason: reason,
        adjustmentApprovedBy: req.user?.id || req.body.approvedBy,
        performedBy: req.user?.id || req.body.performedBy
      });

      res.json({
        success: true,
        data: {
          inventory,
          transaction
        }
      });
    } catch (error) {
      console.error('Error in adjustInventory:', error);
      res.status(500).json({
        success: false,
        message: 'Error adjusting inventory',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/inventory/transactions
  getTransactions: async (req, res) => {
    try {
      const { productId, jobId, transactionType, location } = req.query;
      
      const filter = {};
      if (productId) filter.productId = productId;
      if (jobId) filter.jobId = jobId;
      if (transactionType) filter.transactionType = transactionType;
      if (location) filter.location = location;
      
      const transactions = await InventoryTransaction.find(filter)
        .populate('productId', 'name')
        .populate('jobId', 'name jobNumber')
        .populate('performedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      
      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error in getTransactions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transactions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = inventoryController;

