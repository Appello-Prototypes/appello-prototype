const mongoose = require('mongoose');
const ProductType = require('../models/ProductType');
const Product = require('../models/Product');

const productTypeController = {
  // GET /api/product-types
  getAllProductTypes: async (req, res) => {
    try {
      const { isActive } = req.query;
      
      const filter = {};
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      
      const productTypes = await ProductType.find(filter)
        .select('name slug description properties variantSettings isActive createdAt')
        .sort({ name: 1 })
        .lean();
      
      res.json({
        success: true,
        data: productTypes
      });
    } catch (error) {
      console.error('Error in getAllProductTypes:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching product types',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/product-types/:id
  getProductTypeById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product type ID format'
        });
      }

      const productType = await ProductType.findById(req.params.id).lean();

      if (!productType) {
        return res.status(404).json({
          success: false,
          message: 'Product type not found'
        });
      }

      res.json({
        success: true,
        data: productType
      });
    } catch (error) {
      console.error('Error in getProductTypeById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching product type',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/product-types
  createProductType: async (req, res) => {
    try {
      const productTypeData = {
        ...req.body,
        createdBy: req.user?.id || req.body.createdBy
      };

      // Validate property keys are unique
      const propertyKeys = productTypeData.properties?.map(p => p.key) || [];
      const uniqueKeys = new Set(propertyKeys);
      if (propertyKeys.length !== uniqueKeys.size) {
        return res.status(400).json({
          success: false,
          message: 'Property keys must be unique'
        });
      }

      const productType = await ProductType.create(productTypeData);

      res.status(201).json({
        success: true,
        data: productType
      });
    } catch (error) {
      console.error('Error in createProductType:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Product type with this name or slug already exists'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating product type',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/product-types/:id
  updateProductType: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product type ID format'
        });
      }

      // Validate property keys are unique if properties are being updated
      if (req.body.properties) {
        const propertyKeys = req.body.properties.map(p => p.key);
        const uniqueKeys = new Set(propertyKeys);
        if (propertyKeys.length !== uniqueKeys.size) {
          return res.status(400).json({
            success: false,
            message: 'Property keys must be unique'
          });
        }
      }

      const productType = await ProductType.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).lean();

      if (!productType) {
        return res.status(404).json({
          success: false,
          message: 'Product type not found'
        });
      }

      res.json({
        success: true,
        data: productType
      });
    } catch (error) {
      console.error('Error in updateProductType:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error updating product type',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // DELETE /api/product-types/:id
  deleteProductType: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product type ID format'
        });
      }

      // Check if any products are using this product type
      const productsUsingType = await Product.countDocuments({ productTypeId: req.params.id });
      if (productsUsingType > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete product type. ${productsUsingType} product(s) are using this type.`
        });
      }

      const productType = await ProductType.findByIdAndDelete(req.params.id);

      if (!productType) {
        return res.status(404).json({
          success: false,
          message: 'Product type not found'
        });
      }

      res.json({
        success: true,
        message: 'Product type deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteProductType:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting product type',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/product-types/:id/products
  getProductsByType: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product type ID format'
        });
      }

      const products = await Product.find({ productTypeId: req.params.id })
        .populate('productTypeId', 'name slug')
        .populate('suppliers.supplierId', 'name')
        .select('name description properties variants productTypeId')
        .lean();

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error in getProductsByType:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products by type',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = productTypeController;

