const express = require('express');
const router = express.Router();
const specificationController = require('../controllers/specificationController');

// Specification routes for a job
router.post('/jobs/:jobId/specifications', specificationController.create);
router.get('/jobs/:jobId/specifications', specificationController.list);
router.post('/jobs/:jobId/specifications/apply-template', specificationController.applyTemplate);

// Specification routes (individual)
router.get('/specifications/:id', specificationController.get);
router.patch('/specifications/:id', specificationController.update);
router.delete('/specifications/:id', specificationController.delete);

// Specification matching
router.post('/specifications/match', specificationController.match);

module.exports = router;

