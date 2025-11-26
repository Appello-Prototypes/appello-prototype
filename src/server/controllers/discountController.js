const mongoose = require('mongoose');
const Discount = require('../models/Discount');
const Product = require('../models/Product');

const discountController = {
  // GET /api/discounts
  getAllDiscounts: async (req, res) => {
    try {
      const { discountType, category, isActive } = req.query;
      
      const filter = {};
      if (discountType) filter.discountType = discountType;
      if (category) filter.category = category;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      
      const discounts = await Discount.find(filter)
        .sort({ discountType: 1, category: 1, effectiveDate: -1 })
        .lean();
      
      res.json({
        success: true,
        data: discounts
      });
    } catch (error) {
      console.error('Error in getAllDiscounts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching discounts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/discounts/:id
  getDiscountById: async (req, res) => {
    try {
      const discount = await Discount.findById(req.params.id).lean();
      
      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }
      
      res.json({
        success: true,
        data: discount
      });
    } catch (error) {
      console.error('Error in getDiscountById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching discount',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/discounts
  createDiscount: async (req, res) => {
    try {
      const discount = new Discount(req.body);
      await discount.save();
      
      res.status(201).json({
        success: true,
        data: discount
      });
    } catch (error) {
      console.error('Error in createDiscount:', error);
      res.status(400).json({
        success: false,
        message: 'Error creating discount',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Invalid discount data'
      });
    }
  },

  // PUT /api/discounts/:id
  updateDiscount: async (req, res) => {
    try {
      const discount = await Discount.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }
      
      res.json({
        success: true,
        data: discount
      });
    } catch (error) {
      console.error('Error in updateDiscount:', error);
      res.status(400).json({
        success: false,
        message: 'Error updating discount',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Invalid discount data'
      });
    }
  },

  // DELETE /api/discounts/:id
  deleteDiscount: async (req, res) => {
    try {
      const discount = await Discount.findByIdAndDelete(req.params.id);
      
      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Discount deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteDiscount:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting discount',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/discounts/:id/apply
  applyDiscount: async (req, res) => {
    try {
      const discount = await Discount.findById(req.params.id);
      
      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }
      
      if (!discount.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Discount is not active'
        });
      }
      
      let updatedProducts = 0;
      let updatedVariants = 0;
      
      // Find products to update based on discount type
      let query = {};
      
      if (discount.discountType === 'category') {
        if (discount.category) {
          query.category = discount.category;
        }
        if (discount.categoryGroup) {
          // Match products with this category group in properties
          query['properties.categoryGroup'] = discount.categoryGroup;
        }
      } else if (discount.discountType === 'product') {
        query._id = discount.productId;
      } else if (discount.discountType === 'supplier') {
        // Check both manufacturerId and suppliers.manufacturerId
        query.$or = [
          { manufacturerId: discount.supplierId },
          { 'suppliers.manufacturerId': discount.supplierId }
        ];
      }
      
      const products = await Product.find(query);
      
      for (const product of products) {
        let productUpdated = false;
        
        // Update product-level pricing
        if (product.suppliers && product.suppliers.length > 0) {
          product.suppliers.forEach(supplier => {
            if (supplier.listPrice) {
              supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
              supplier.discountPercent = discount.discountPercent;
              productUpdated = true;
            }
          });
        }
        
        // Update variant pricing
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(variant => {
            if (variant.pricing?.listPrice) {
              variant.pricing.netPrice = variant.pricing.listPrice * (1 - discount.discountPercent / 100);
              variant.pricing.discountPercent = discount.discountPercent;
              updatedVariants++;
              productUpdated = true;
            }
            
            // Update variant suppliers
            if (variant.suppliers && variant.suppliers.length > 0) {
              variant.suppliers.forEach(supplier => {
                if (supplier.listPrice) {
                  supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
                  supplier.discountPercent = discount.discountPercent;
                }
              });
            }
          });
        }
        
        if (productUpdated) {
          await product.save();
          updatedProducts++;
        }
      }
      
      // Update discount record
      discount.lastApplied = new Date();
      discount.productsAffected = updatedVariants;
      await discount.save();
      
      res.json({
        success: true,
        data: {
          productsUpdated: updatedProducts,
          variantsUpdated: updatedVariants,
          discount: discount
        }
      });
    } catch (error) {
      console.error('Error in applyDiscount:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying discount',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/discounts/apply-all
  applyAllDiscounts: async (req, res) => {
    try {
      const discounts = await Discount.find({ isActive: true });
      
      let totalProductsUpdated = 0;
      let totalVariantsUpdated = 0;
      const results = [];
      
      for (const discount of discounts) {
        try {
          let updatedProducts = 0;
          let updatedVariants = 0;
          
          // Find products to update
          let query = {};
          
          if (discount.discountType === 'category') {
            if (discount.category) {
              query.category = discount.category;
            }
            if (discount.categoryGroup) {
              query['properties.categoryGroup'] = discount.categoryGroup;
            }
          } else if (discount.discountType === 'product') {
            query._id = discount.productId;
          } else if (discount.discountType === 'supplier') {
            // Check both manufacturerId and suppliers.manufacturerId
            query.$or = [
              { manufacturerId: discount.supplierId },
              { 'suppliers.manufacturerId': discount.supplierId }
            ];
          }
          
          const products = await Product.find(query);
          
          for (const product of products) {
            let productUpdated = false;
            
            // Update product-level pricing
            if (product.suppliers && product.suppliers.length > 0) {
              product.suppliers.forEach(supplier => {
                if (supplier.listPrice) {
                  supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
                  supplier.discountPercent = discount.discountPercent;
                  productUpdated = true;
                }
              });
            }
            
            // Update variant pricing
            if (product.variants && product.variants.length > 0) {
              product.variants.forEach(variant => {
                if (variant.pricing?.listPrice) {
                  variant.pricing.netPrice = variant.pricing.listPrice * (1 - discount.discountPercent / 100);
                  variant.pricing.discountPercent = discount.discountPercent;
                  updatedVariants++;
                  productUpdated = true;
                }
                
                // Update variant suppliers
                if (variant.suppliers && variant.suppliers.length > 0) {
                  variant.suppliers.forEach(supplier => {
                    if (supplier.listPrice) {
                      supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
                      supplier.discountPercent = discount.discountPercent;
                    }
                  });
                }
              });
            }
            
            if (productUpdated) {
              await product.save();
              updatedProducts++;
            }
          }
          
          // Update discount record
          discount.lastApplied = new Date();
          discount.productsAffected = updatedVariants;
          await discount.save();
          
          totalProductsUpdated += updatedProducts;
          totalVariantsUpdated += updatedVariants;
          
          results.push({
            discountId: discount._id,
            discountName: discount.name,
            productsUpdated: updatedProducts,
            variantsUpdated: updatedVariants
          });
        } catch (error) {
          console.error(`Error applying discount ${discount._id}:`, error);
          results.push({
            discountId: discount._id,
            discountName: discount.name,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          totalProductsUpdated,
          totalVariantsUpdated,
          discountsProcessed: discounts.length,
          results
        }
      });
    } catch (error) {
      console.error('Error in applyAllDiscounts:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying all discounts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = discountController;

