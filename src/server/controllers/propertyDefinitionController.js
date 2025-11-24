const PropertyDefinition = require('../models/PropertyDefinition');
const mongoose = require('mongoose');

/**
 * Property Definition Controller
 * 
 * CRUD operations for global property definitions
 * These properties are used across ProductTypes, Specifications, etc.
 */

// GET /api/property-definitions
exports.list = async (req, res) => {
  try {
    const { category, dataType, isActive } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (dataType) filter.dataType = dataType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const properties = await PropertyDefinition.find(filter)
      .sort({ category: 1, label: 1 })
      .lean();
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Error listing property definitions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property definitions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// GET /api/property-definitions/:id
exports.get = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property definition ID'
      });
    }
    
    const property = await PropertyDefinition.findById(id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property definition not found'
      });
    }
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Error getting property definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property definition',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// POST /api/property-definitions
exports.create = async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      createdBy: req.user?.id
    };
    
    // Validate key uniqueness
    const existing = await PropertyDefinition.findOne({ key: propertyData.key });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Property with key "${propertyData.key}" already exists`
      });
    }
    
    const property = await PropertyDefinition.create(propertyData);
    
    res.status(201).json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Error creating property definition:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating property definition',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// PATCH /api/property-definitions/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property definition ID'
      });
    }
    
    // Don't allow changing the key (it's the canonical identifier)
    const updateData = { ...req.body };
    delete updateData.key;
    
    const property = await PropertyDefinition.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property definition not found'
      });
    }
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Error updating property definition:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating property definition',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// DELETE /api/property-definitions/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property definition ID'
      });
    }
    
    // Check if property is used in any ProductTypes
    const ProductType = require('../models/ProductType');
    const productTypesUsingProperty = await ProductType.find({
      'properties.key': await PropertyDefinition.findById(id).then(p => p?.key)
    });
    
    if (productTypesUsingProperty.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete property definition: it is used in ${productTypesUsingProperty.length} product type(s)`,
        usedIn: productTypesUsingProperty.map(pt => ({ id: pt._id, name: pt.name }))
      });
    }
    
    const property = await PropertyDefinition.findByIdAndDelete(id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property definition not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Property definition deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting property definition:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting property definition',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// GET /api/property-definitions/by-category
exports.getByCategory = async (req, res) => {
  try {
    const properties = await PropertyDefinition.find({ isActive: true })
      .sort({ category: 1, label: 1 })
      .lean();
    
    // Group by category
    const grouped = properties.reduce((acc, prop) => {
      const category = prop.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(prop);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Error getting property definitions by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property definitions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

