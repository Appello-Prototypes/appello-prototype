const express = require('express');
const purchaseOrderController = require('../controllers/purchaseOrderController');

const router = express.Router();

// Routes
router.get('/', purchaseOrderController.getAllPurchaseOrders);
router.get('/:id', purchaseOrderController.getPurchaseOrderById);
router.post('/', purchaseOrderController.createPurchaseOrder);
router.patch('/:id', purchaseOrderController.updatePurchaseOrder);
router.post('/:id/submit-for-approval', purchaseOrderController.submitForApproval);
router.post('/:id/approve', purchaseOrderController.approvePO);
router.post('/:id/reject', purchaseOrderController.rejectPO);
router.post('/:id/issue', purchaseOrderController.issuePO);
router.post('/:id/cancel', purchaseOrderController.cancelPO);
router.get('/:id/pdf', purchaseOrderController.downloadPOPDF);
router.post('/:id/send-email', purchaseOrderController.sendPOEmail);

module.exports = router;

