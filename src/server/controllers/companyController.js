const mongoose = require('mongoose');
const Company = require('../models/Company');
const Product = require('../models/Product');

const companyController = {
  // GET /api/companies
  getAllCompanies: async (req, res) => {
    try {
      const { companyType, isActive, search } = req.query;
      
      const filter = {};
      if (companyType) filter.companyType = companyType;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (search) {
        filter.$text = { $search: search };
      }
      
      const companies = await Company.find(filter)
        .select('name companyType contact address paymentTerms isActive')
        .sort({ name: 1 })
        .lean();
      
      res.json({
        success: true,
        data: companies
      });
    } catch (error) {
      console.error('Error in getAllCompanies:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching companies',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/:id
  getCompanyById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const company = await Company.findById(req.params.id).lean();

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Error in getCompanyById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching company',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/companies
  createCompany: async (req, res) => {
    try {
      const companyData = {
        ...req.body,
        createdBy: req.user?.id || req.body.createdBy
      };

      const company = await Company.create(companyData);

      res.status(201).json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Error in createCompany:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating company',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/companies/:id
  updateCompany: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const company = await Company.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).lean();

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Error in updateCompany:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating company',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // DELETE /api/companies/:id
  deleteCompany: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const company = await Company.findByIdAndDelete(req.params.id);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.json({
        success: true,
        message: 'Company deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteCompany:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting company',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/search/autocomplete
  searchCompanies: async (req, res) => {
    try {
      const { q, companyType } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const filter = {
        $text: { $search: q },
        isActive: true
      };
      if (companyType) filter.companyType = companyType;

      const companies = await Company.find(filter)
        .select('name companyType contact.email contact.phone')
        .limit(10)
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: companies
      });
    } catch (error) {
      console.error('Error in searchCompanies:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching companies',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/:id/products
  getCompanyProducts: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Find products that have this supplier in their suppliers array
      const products = await Product.find({
        'suppliers.supplierId': req.params.id,
        isActive: true
      })
        .select('name description internalPartNumber unitOfMeasure category suppliers')
        .lean();

      // Format products with supplier-specific info
      const formattedProducts = products.map(product => {
        const supplierInfo = product.suppliers.find(
          s => s.supplierId.toString() === req.params.id
        );
        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          internalPartNumber: product.internalPartNumber,
          unitOfMeasure: product.unitOfMeasure,
          category: product.category,
          supplierPartNumber: supplierInfo?.supplierPartNumber || '',
          lastPrice: supplierInfo?.lastPrice || 0,
          lastPurchasedDate: supplierInfo?.lastPurchasedDate,
          isPreferred: supplierInfo?.isPreferred || false
        };
      });

      res.json({
        success: true,
        data: formattedProducts
      });
    } catch (error) {
      console.error('Error in getCompanyProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching company products',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = companyController;

