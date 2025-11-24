const express = require('express');
const productController = require('../controllers/productController');

const router = express.Router();

// Routes
router.get('/', productController.getAllProducts);
router.get('/by-pricebook', productController.getProductsByPricebook);
router.get('/search/autocomplete', productController.searchProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/suppliers', productController.getProductSuppliers);
router.post('/', productController.createProduct);
router.post('/import-csv', productController.importCSV);
router.patch('/:id', productController.updateProduct);
// Variant routes
router.post('/:id/variants', productController.createVariant);
router.patch('/:productId/variants/:variantId', productController.updateVariant);
router.delete('/:productId/variants/:variantId', productController.deleteVariant);
router.patch('/:id/discount', productController.updateProductDiscount);
router.patch('/:id/discount/selective', productController.updateProductDiscountSelective);

module.exports = router;

