const express = require('express');
const poReceiptController = require('../controllers/poReceiptController');

const router = express.Router();

// Routes
router.get('/', poReceiptController.getAllReceipts);
router.get('/job/:jobId/open-pos', poReceiptController.getOpenPOsForJob);
router.get('/:id', poReceiptController.getReceiptById);
router.post('/', poReceiptController.createReceipt);
router.post('/sync-offline', poReceiptController.syncOfflineReceipts);
router.post('/:id/approve-over-receipt', poReceiptController.approveOverReceipt);

module.exports = router;

