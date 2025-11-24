const SpecificationTemplate = require('../models/SpecificationTemplate');
const mongoose = require('mongoose');

const specificationTemplateController = {
  /**
   * Create a new specification template
   */
  create: async (req, res) => {
    try {
      const templateData = req.body;
      
      // Convert requiredProperties to Map if provided as object
      if (templateData.requiredProperties && typeof templateData.requiredProperties === 'object' && !(templateData.requiredProperties instanceof Map)) {
        templateData.requiredProperties = new Map(Object.entries(templateData.requiredProperties));
      }
      
      const template = new SpecificationTemplate(templateData);
      await template.save();
      
      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error creating specification template:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating specification template',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Get all specification templates
   */
  list: async (req, res) => {
    try {
      const { companyId, isActive } = req.query;
      
      const query = {};
      
      if (companyId) {
        query.$or = [
          { companyId: new mongoose.Types.ObjectId(companyId) },
          { companyId: null } // Company-wide templates
        ];
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }
      
      const templates = await SpecificationTemplate.find(query)
        .populate('productTypeId', 'name slug')
        .populate('preferredSupplierId', 'name')
        .populate('companyId', 'name')
        .sort({ usageCount: -1, createdAt: -1 })
        .lean();
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error listing specification templates:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing specification templates',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Get a single specification template
   */
  get: async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await SpecificationTemplate.findById(id)
        .populate('productTypeId', 'name slug')
        .populate('preferredSupplierId', 'name')
        .populate('companyId', 'name')
        .lean();
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Specification template not found'
        });
      }
      
      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error getting specification template:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting specification template',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Update a specification template
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Convert requiredProperties to Map if provided as object
      if (updateData.requiredProperties && typeof updateData.requiredProperties === 'object' && !(updateData.requiredProperties instanceof Map)) {
        updateData.requiredProperties = new Map(Object.entries(updateData.requiredProperties));
      }
      
      const template = await SpecificationTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('productTypeId', 'name slug')
        .populate('preferredSupplierId', 'name')
        .populate('companyId', 'name')
        .lean();
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Specification template not found'
        });
      }
      
      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error updating specification template:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating specification template',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Delete a specification template
   */
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await SpecificationTemplate.findByIdAndDelete(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Specification template not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Specification template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting specification template:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting specification template',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = specificationTemplateController;

