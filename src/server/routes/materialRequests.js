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

module.exports = router;

