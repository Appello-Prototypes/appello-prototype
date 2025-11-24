const express = require('express');
const companyController = require('../controllers/companyController');

const router = express.Router();

// Routes
router.get('/', companyController.getAllCompanies);
router.get('/search/autocomplete', companyController.searchCompanies);
router.get('/:id', companyController.getCompanyById);
router.get('/:id/products', companyController.getCompanyProducts);
router.post('/', companyController.createCompany);
router.patch('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

module.exports = router;

