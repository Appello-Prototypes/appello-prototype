const express = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

// Routes
router.get('/', inventoryController.getAllInventory);
router.get('/product/:productId/:variantId?', inventoryController.getInventoryByProduct);
router.get('/:id', inventoryController.getInventoryById);
router.get('/:id/transactions', inventoryController.getInventoryTransactions);
router.post('/', inventoryController.createOrUpdateInventory);
router.post('/:id/transaction', inventoryController.addTransaction);
router.post('/:id/serialized-units', inventoryController.addSerializedUnits);
router.put('/:id/serialized-units/:serialNumber', inventoryController.updateSerializedUnit);

module.exports = router;

