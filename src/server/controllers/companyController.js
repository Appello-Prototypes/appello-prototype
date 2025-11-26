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
      // Check both manufacturerId and suppliers.manufacturerId
      const products = await Product.find({
        $or: [
          { manufacturerId: req.params.id },
          { 'suppliers.manufacturerId': req.params.id }
        ],
        isActive: true
      })
        .select('name description internalPartNumber unitOfMeasure category suppliers manufacturerId distributorId')
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
  },

  // GET /api/companies/distributors
  getDistributors: async (req, res) => {
    try {
      const distributors = await Company.find({
        companyType: 'distributor',
        isActive: true
      })
        .select('name companyType contact address paymentTerms')
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: distributors
      });
    } catch (error) {
      console.error('Error in getDistributors:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching distributors',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/manufacturers
  // Manufacturers are suppliers who make products - identified by being referenced as manufacturerId in products
  getManufacturers: async (req, res) => {
    try {
      // Get all unique manufacturer IDs from products
      const manufacturerIds = await Product.distinct('manufacturerId', {
        manufacturerId: { $exists: true, $ne: null }
      });

      const manufacturers = await Company.find({
        _id: { $in: manufacturerIds },
        isActive: true
      })
        .select('name companyType contact address paymentTerms')
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: manufacturers
      });
    } catch (error) {
      console.error('Error in getManufacturers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching manufacturers',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/:id/manufacturers
  getDistributorManufacturers: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const distributor = await Company.findById(req.params.id);
      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: 'Distributor not found'
        });
      }

      // Find all unique manufacturers for products distributed by this distributor
      // Check both primary distributorId AND suppliers array (for multi-distributor products)
      const products = await Product.find({
        $or: [
          { distributorId: req.params.id },
          { 'suppliers.distributorId': req.params.id }
        ],
        manufacturerId: { $ne: null },
        isActive: true
      })
        .populate('manufacturerId', 'name companyType')
        .populate('suppliers.manufacturerId', 'name companyType')
        .select('manufacturerId suppliers.manufacturerId')
        .lean();

      // Get unique manufacturers from both primary manufacturerId and suppliers array
      const manufacturerMap = new Map();
      products.forEach(product => {
        // Add primary manufacturer
        if (product.manufacturerId && product.manufacturerId._id) {
          const mfrId = product.manufacturerId._id.toString();
          if (!manufacturerMap.has(mfrId)) {
            manufacturerMap.set(mfrId, product.manufacturerId);
          }
        }
        // Add manufacturers from suppliers array
        if (product.suppliers && Array.isArray(product.suppliers)) {
          product.suppliers.forEach(supplier => {
            if (supplier.distributorId && 
                (supplier.distributorId.toString() === req.params.id || 
                 (typeof supplier.distributorId === 'object' && supplier.distributorId._id && supplier.distributorId._id.toString() === req.params.id))) {
              if (supplier.manufacturerId) {
                const manId = typeof supplier.manufacturerId === 'object' 
                  ? supplier.manufacturerId._id.toString() 
                  : supplier.manufacturerId.toString();
                if (!manufacturerMap.has(manId)) {
                  const manufacturer = typeof supplier.manufacturerId === 'object' 
                    ? supplier.manufacturerId 
                    : { _id: supplier.manufacturerId, name: 'Unknown' };
                  manufacturerMap.set(manId, manufacturer);
                }
              }
            }
          });
        }
      });

      const manufacturers = Array.from(manufacturerMap.values());

      // Get product counts per manufacturer
      // Count unique products per manufacturer
      const distributorObjectId = new mongoose.Types.ObjectId(req.params.id);
      const manufacturerStats = await Product.aggregate([
        {
          $match: {
            $or: [
              { distributorId: distributorObjectId },
              { 'suppliers.distributorId': distributorObjectId }
            ],
            isActive: true
          }
        },
        {
          $group: {
            _id: '$manufacturerId',
            productCount: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        }
      ]);

      // Merge stats with manufacturer data
      const manufacturersWithStats = manufacturers.map(mfr => {
        const stat = manufacturerStats.find(s => s._id.toString() === mfr._id.toString());
        return {
          ...mfr,
          productCount: stat ? stat.productCount : 0
        };
      });

      res.json({
        success: true,
        data: manufacturersWithStats
      });
    } catch (error) {
      console.error('Error in getDistributorManufacturers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching distributor manufacturers',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/:id/distributors
  getManufacturerDistributors: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const manufacturer = await Company.findById(req.params.id);
      if (!manufacturer) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturer not found'
        });
      }

      // Find all unique distributors for products made by this manufacturer
      // Check both primary manufacturerId AND suppliers array (for multi-distributor products)
      const products = await Product.find({
        $or: [
          { manufacturerId: req.params.id },
          { 'suppliers.manufacturerId': req.params.id }
        ],
        distributorId: { $ne: null },
        isActive: true
      })
        .populate('distributorId', 'name companyType')
        .populate('suppliers.distributorId', 'name companyType')
        .select('distributorId suppliers.distributorId')
        .lean();

      // Get unique distributors from both primary distributorId and suppliers array
      const distributorMap = new Map();
      products.forEach(product => {
        // Add primary distributor
        if (product.distributorId && product.distributorId._id) {
          const distId = product.distributorId._id.toString();
          if (!distributorMap.has(distId)) {
            distributorMap.set(distId, product.distributorId);
          }
        }
        // Add distributors from suppliers array
        if (product.suppliers && Array.isArray(product.suppliers)) {
          product.suppliers.forEach(supplier => {
            if (supplier.manufacturerId && 
                (supplier.manufacturerId.toString() === req.params.id || 
                 (typeof supplier.manufacturerId === 'object' && supplier.manufacturerId._id && supplier.manufacturerId._id.toString() === req.params.id))) {
              if (supplier.distributorId) {
                const distId = typeof supplier.distributorId === 'object' 
                  ? supplier.distributorId._id.toString() 
                  : supplier.distributorId.toString();
                if (!distributorMap.has(distId)) {
                  const distributor = typeof supplier.distributorId === 'object' 
                    ? supplier.distributorId 
                    : { _id: supplier.distributorId, name: 'Unknown' };
                  distributorMap.set(distId, distributor);
                }
              }
            }
          });
        }
      });

      const distributors = Array.from(distributorMap.values());

      // Get product counts per distributor
      // Count unique products per distributor
      const manufacturerObjectId = new mongoose.Types.ObjectId(req.params.id);
      const distributorStats = await Product.aggregate([
        {
          $match: {
            $or: [
              { manufacturerId: manufacturerObjectId },
              { 'suppliers.manufacturerId': manufacturerObjectId }
            ],
            isActive: true
          }
        },
        {
          $group: {
            _id: '$distributorId',
            productCount: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        }
      ]);

      // Merge stats with distributor data
      const distributorsWithStats = distributors.map(dist => {
        const stat = distributorStats.find(s => s._id.toString() === dist._id.toString());
        return {
          ...dist,
          productCount: stat ? stat.productCount : 0
        };
      });

      res.json({
        success: true,
        data: distributorsWithStats
      });
    } catch (error) {
      console.error('Error in getManufacturerDistributors:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching manufacturer distributors',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/companies/:id/distributor-suppliers
  // Add a supplier to a distributor's supplier list
  addDistributorSupplier: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const distributor = await Company.findById(req.params.id);
      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: 'Distributor not found'
        });
      }

      if (distributor.companyType !== 'distributor') {
        return res.status(400).json({
          success: false,
          message: 'Company must be a distributor to add suppliers'
        });
      }

      const { supplierId, notes } = req.body;
      if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({
          success: false,
          message: 'Valid supplierId is required'
        });
      }

      const supplier = await Company.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      if (supplier.companyType !== 'supplier') {
        return res.status(400).json({
          success: false,
          message: 'Company must be a supplier to be added to distributor'
        });
      }

      // Check if relationship already exists
      const existingRelationship = distributor.distributorSuppliers?.find(
        ds => ds.supplierId.toString() === supplierId
      );

      if (existingRelationship) {
        // Update existing relationship
        existingRelationship.isActive = req.body.isActive !== undefined ? req.body.isActive : true;
        existingRelationship.notes = notes || existingRelationship.notes;
        await distributor.save();
      } else {
        // Add new relationship
        if (!distributor.distributorSuppliers) {
          distributor.distributorSuppliers = [];
        }
        distributor.distributorSuppliers.push({
          supplierId,
          isActive: true,
          notes: notes || ''
        });
        await distributor.save();
      }

      await distributor.populate('distributorSuppliers.supplierId', 'name companyType');
      
      res.json({
        success: true,
        data: distributor.distributorSuppliers
      });
    } catch (error) {
      console.error('Error in addDistributorSupplier:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding supplier to distributor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // DELETE /api/companies/:id/distributor-suppliers/:supplierId
  // Remove a supplier from a distributor's supplier list
  removeDistributorSupplier: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.supplierId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const distributor = await Company.findById(req.params.id);
      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: 'Distributor not found'
        });
      }

      if (distributor.companyType !== 'distributor') {
        return res.status(400).json({
          success: false,
          message: 'Company must be a distributor'
        });
      }

      distributor.distributorSuppliers = distributor.distributorSuppliers?.filter(
        ds => ds.supplierId.toString() !== req.params.supplierId
      ) || [];

      await distributor.save();

      res.json({
        success: true,
        message: 'Supplier removed from distributor'
      });
    } catch (error) {
      console.error('Error in removeDistributorSupplier:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing supplier from distributor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/:id/distributor-suppliers
  // Get all suppliers for a distributor
  getDistributorSuppliers: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const distributor = await Company.findById(req.params.id)
        .populate('distributorSuppliers.supplierId', 'name companyType contact address')
        .lean();

      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: 'Distributor not found'
        });
      }

      const suppliers = distributor.distributorSuppliers || [];
      const activeSuppliers = suppliers.filter(ds => ds.isActive !== false);

      res.json({
        success: true,
        data: activeSuppliers
      });
    } catch (error) {
      console.error('Error in getDistributorSuppliers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching distributor suppliers',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/companies/:id/supplier-distributors
  // Get all distributors for a supplier (manufacturer)
  getSupplierDistributors: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID format'
        });
      }

      const supplier = await Company.findById(req.params.id);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      // Find all distributors that have this supplier in their distributorSuppliers array
      const distributors = await Company.find({
        companyType: 'distributor',
        'distributorSuppliers.supplierId': req.params.id,
        'distributorSuppliers.isActive': { $ne: false }
      })
        .select('name companyType contact address distributorSuppliers')
        .lean();

      // Filter to only include this supplier in the results
      const distributorsWithSupplier = distributors.map(dist => ({
        ...dist,
        relationship: dist.distributorSuppliers?.find(
          ds => ds.supplierId.toString() === req.params.id
        )
      })).filter(dist => dist.relationship);

      res.json({
        success: true,
        data: distributorsWithSupplier
      });
    } catch (error) {
      console.error('Error in getSupplierDistributors:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching supplier distributors',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = companyController;

