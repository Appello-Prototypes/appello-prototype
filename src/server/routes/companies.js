const express = require('express');
const companyController = require('../controllers/companyController');

const router = express.Router();

// Routes
router.get('/', companyController.getAllCompanies);
router.get('/distributors', companyController.getDistributors);
router.get('/manufacturers', companyController.getManufacturers);
router.get('/search/autocomplete', companyController.searchCompanies);
router.get('/:id', companyController.getCompanyById);
router.get('/:id/products', companyController.getCompanyProducts);
router.get('/:id/manufacturers', companyController.getDistributorManufacturers);
router.get('/:id/distributors', companyController.getManufacturerDistributors);
router.get('/:id/distributor-suppliers', companyController.getDistributorSuppliers);
router.get('/:id/supplier-distributors', companyController.getSupplierDistributors);
router.post('/:id/distributor-suppliers', companyController.addDistributorSupplier);
router.delete('/:id/distributor-suppliers/:supplierId', companyController.removeDistributorSupplier);
router.post('/', companyController.createCompany);
router.patch('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

module.exports = router;

