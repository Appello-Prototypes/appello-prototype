const express = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

// Routes
router.get('/', inventoryController.getAllInventory);
router.get('/transactions', inventoryController.getTransactions);
router.get('/:id', inventoryController.getInventoryById);
router.post('/issue-to-job', inventoryController.issueToJob);
router.post('/return-from-job', inventoryController.returnFromJob);
router.post('/adjust', inventoryController.adjustInventory);

module.exports = router;

