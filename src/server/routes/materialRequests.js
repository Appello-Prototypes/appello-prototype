const express = require('express');
const materialRequestController = require('../controllers/materialRequestController');

const router = express.Router();

// Routes
router.get('/', materialRequestController.getAllMaterialRequests);
router.get('/:id', materialRequestController.getMaterialRequestById);
router.post('/', materialRequestController.createMaterialRequest);
router.patch('/:id', materialRequestController.updateMaterialRequest);
router.post('/:id/approve', materialRequestController.approveRequest);
router.post('/:id/reject', materialRequestController.rejectRequest);
router.post('/:id/convert-to-po', materialRequestController.convertToPO);
router.post('/:id/convert-to-pos', materialRequestController.convertToPOs);
router.post('/:id/fulfill', materialRequestController.fulfillRequest);
router.get('/:id/shop-printout', materialRequestController.getShopPrintout);
router.post('/batch-generate-pos', materialRequestController.batchGeneratePOs);
router.post('/ai-create', materialRequestController.createFromText);

module.exports = router;

