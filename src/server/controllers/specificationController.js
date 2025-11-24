const Specification = require('../models/Specification');
const SpecificationTemplate = require('../models/SpecificationTemplate');
const specificationService = require('../services/specificationService');
const mongoose = require('mongoose');

const specificationController = {
  /**
   * Create a new specification
   */
  create: async (req, res) => {
    try {
      const { jobId } = req.params;
      const specData = req.body;
      
      // Ensure jobId matches
      specData.jobId = jobId;
      
      // Convert requiredProperties to Map if provided as object
      if (specData.requiredProperties && typeof specData.requiredProperties === 'object' && !(specData.requiredProperties instanceof Map)) {
        specData.requiredProperties = new Map(Object.entries(specData.requiredProperties));
      }
      
      const specification = new Specification(specData);
      await specification.save();
      
      res.status(201).json({
        success: true,
        data: specification
      });
    } catch (error) {
      console.error('Error creating specification:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating specification',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Get all specifications for a job
   */
  list: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { systemId, areaId, isActive } = req.query;
      
      const query = { jobId };
      
      if (systemId) {
        query.$or = [
          { systemId: new mongoose.Types.ObjectId(systemId) },
          { systemName: systemId }
        ];
      }
      
      if (areaId) {
        query.areaId = new mongoose.Types.ObjectId(areaId);
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }
      
      const specifications = await Specification.find(query)
        .populate('productTypeId', 'name slug')
        .populate('preferredSupplierId', 'name')
        .populate('systemId')
        .populate('areaId')
        .sort({ priority: -1, createdAt: -1 })
        .lean();
      
      res.json({
        success: true,
        data: specifications
      });
    } catch (error) {
      console.error('Error listing specifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing specifications',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Get a single specification
   */
  get: async (req, res) => {
    try {
      const { id } = req.params;
      
      const specification = await Specification.findById(id)
        .populate('productTypeId', 'name slug')
        .populate('preferredSupplierId', 'name')
        .populate('systemId')
        .populate('areaId')
        .lean();
      
      if (!specification) {
        return res.status(404).json({
          success: false,
          message: 'Specification not found'
        });
      }
      
      res.json({
        success: true,
        data: specification
      });
    } catch (error) {
      console.error('Error getting specification:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting specification',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Update a specification
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Convert requiredProperties to Map if provided as object
      if (updateData.requiredProperties && typeof updateData.requiredProperties === 'object' && !(updateData.requiredProperties instanceof Map)) {
        updateData.requiredProperties = new Map(Object.entries(updateData.requiredProperties));
      }
      
      const specification = await Specification.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('productTypeId', 'name slug')
        .populate('preferredSupplierId', 'name')
        .populate('systemId')
        .populate('areaId')
        .lean();
      
      if (!specification) {
        return res.status(404).json({
          success: false,
          message: 'Specification not found'
        });
      }
      
      res.json({
        success: true,
        data: specification
      });
    } catch (error) {
      console.error('Error updating specification:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating specification',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Delete a specification
   */
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      const specification = await Specification.findByIdAndDelete(id);
      
      if (!specification) {
        return res.status(404).json({
          success: false,
          message: 'Specification not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Specification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting specification:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting specification',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Match specifications for a given context
   */
  match: async (req, res) => {
    try {
      const context = req.body;
      
      const matchingSpecs = await specificationService.findMatchingSpecs(context);
      const recommendedProduct = await specificationService.getRecommendedProduct(context);
      
      res.json({
        success: true,
        data: {
          specifications: matchingSpecs,
          recommendedProduct
        }
      });
    } catch (error) {
      console.error('Error matching specifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error matching specifications',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  /**
   * Apply template to job (create specifications from template)
   */
  applyTemplate: async (req, res) => {
    try {
      const { jobId } = req.params;
      const { templateId, systems, areas } = req.body;
      
      const template = await SpecificationTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      
      const createdSpecs = [];
      const systemIds = systems || [null]; // null = system-wide
      const areaIds = areas || [null]; // null = area-wide
      
      for (const systemId of systemIds) {
        for (const areaId of areaIds) {
          const specData = {
            jobId,
            systemId: systemId || undefined,
            areaId: areaId || undefined,
            name: template.name,
            description: template.description,
            conditions: template.conditions,
            productTypeId: template.productTypeId,
            requiredProperties: template.requiredProperties,
            propertyMatchingRules: template.propertyMatchingRules,
            preferredSupplierId: template.preferredSupplierId,
            allowOtherSuppliers: template.allowOtherSuppliers,
            templateId: template._id
          };
          
          const specification = new Specification(specData);
          await specification.save();
          createdSpecs.push(specification);
        }
      }
      
      // Update template usage count
      template.usageCount = (template.usageCount || 0) + createdSpecs.length;
      await template.save();
      
      res.status(201).json({
        success: true,
        data: createdSpecs,
        message: `Created ${createdSpecs.length} specification(s) from template`
      });
    } catch (error) {
      console.error('Error applying template:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying template',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = specificationController;

