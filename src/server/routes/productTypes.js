const express = require('express');
const productTypeController = require('../controllers/productTypeController');

const router = express.Router();

// Routes
router.get('/', productTypeController.getAllProductTypes);
router.get('/:id/products', productTypeController.getProductsByType); // Must come before /:id
router.get('/:id', productTypeController.getProductTypeById);
router.post('/', productTypeController.createProductType);
router.patch('/:id', productTypeController.updateProductType);
router.delete('/:id', productTypeController.deleteProductType);

module.exports = router;

