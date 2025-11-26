const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/locations - Get all locations
router.get('/', locationController.getAllLocations);

// GET /api/locations/:id - Get location by ID
router.get('/:id', locationController.getLocationById);

// POST /api/locations - Create new location
router.post('/', locationController.createLocation);

// PUT /api/locations/:id - Update location
router.put('/:id', locationController.updateLocation);

// DELETE /api/locations/:id - Delete location (soft delete by setting isActive to false)
router.delete('/:id', locationController.deleteLocation);

// GET /api/locations/:id/inventory - Get all inventory at a location
router.get('/:id/inventory', locationController.getInventoryByLocation);

module.exports = router;

