const Location = require('../models/Location');
const Inventory = require('../models/Inventory');

/**
 * Get all locations
 */
exports.getAllLocations = async (req, res) => {
  try {
    const { isActive, locationType, parentLocation } = req.query;
    
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (locationType) {
      filter.locationType = locationType;
    }
    if (parentLocation) {
      filter.parentLocation = parentLocation === 'null' ? null : parentLocation;
    }

    const locations = await Location.find(filter)
      .populate('parentLocation', 'name code')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get location by ID
 */
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('parentLocation');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Create new location
 */
exports.createLocation = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      parentLocation,
      locationType,
      address,
      capacity,
      notes
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    // Check for duplicate code if provided
    if (code) {
      const existing = await Location.findOne({ code, isActive: true });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Location code already exists'
        });
      }
    }

    const location = new Location({
      name,
      code,
      description,
      parentLocation: parentLocation || null,
      locationType: locationType || 'warehouse',
      address,
      capacity,
      notes,
      isActive: true
    });

    await location.save();

    await location.populate('parentLocation', 'name code');

    res.status(201).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Update location
 */
exports.updateLocation = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      parentLocation,
      locationType,
      address,
      capacity,
      notes,
      isActive
    } = req.body;

    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check for duplicate code if changing
    if (code && code !== location.code) {
      const existing = await Location.findOne({ code, isActive: true, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Location code already exists'
        });
      }
    }

    // Update fields
    if (name !== undefined) location.name = name;
    if (code !== undefined) location.code = code;
    if (description !== undefined) location.description = description;
    if (parentLocation !== undefined) location.parentLocation = parentLocation === 'null' ? null : parentLocation;
    if (locationType !== undefined) location.locationType = locationType;
    if (address !== undefined) location.address = address;
    if (capacity !== undefined) location.capacity = capacity;
    if (notes !== undefined) location.notes = notes;
    if (isActive !== undefined) location.isActive = isActive;

    await location.save();
    await location.populate('parentLocation', 'name code');

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete location (soft delete)
 */
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if location has inventory
    const inventoryCount = await Inventory.countDocuments({
      $or: [
        { primaryLocation: location.name },
        { 'locations.location': location.name }
      ],
      isActive: true
    });

    if (inventoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location: ${inventoryCount} inventory item(s) are assigned to this location`
      });
    }

    // Soft delete
    location.isActive = false;
    await location.save();

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all inventory at a specific location
 */
exports.getInventoryByLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Find all inventory at this location
    const inventory = await Inventory.find({
      $or: [
        { primaryLocation: location.name },
        { 'locations.location': location.name }
      ],
      isActive: true
    })
      .populate('productId', 'name internalPartNumber unitOfMeasure')
      .populate('variantId')
      .sort({ 'productId.name': 1 });

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Error fetching inventory by location:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory by location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

