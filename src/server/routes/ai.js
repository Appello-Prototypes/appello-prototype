const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

// Chat endpoint
router.post('/chat', aiController.chat);

// Analytics endpoints
router.get('/jobs/:id/analytics', aiController.getJobAnalytics);
router.get('/jobs/:id/forecast', aiController.getJobForecast);

// Models endpoint
router.get('/models', aiController.getAvailableModels);

module.exports = router;

