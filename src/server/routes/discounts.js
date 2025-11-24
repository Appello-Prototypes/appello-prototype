const express = require('express');
const discountController = require('../controllers/discountController');

const router = express.Router();

// Routes
router.get('/', discountController.getAllDiscounts);
router.get('/:id', discountController.getDiscountById);
router.post('/', discountController.createDiscount);
router.put('/:id', discountController.updateDiscount);
router.delete('/:id', discountController.deleteDiscount);
router.post('/:id/apply', discountController.applyDiscount);
router.post('/apply-all', discountController.applyAllDiscounts);

module.exports = router;

