const express = require('express');
const router = express.Router();
const unitOfMeasureController = require('../controllers/unitOfMeasureController');

router.route('/')
  .post(unitOfMeasureController.createUnitOfMeasure)
  .get(unitOfMeasureController.getUnitsOfMeasure);

router.route('/categories')
  .get(unitOfMeasureController.getUnitCategories);

router.route('/:id')
  .get(unitOfMeasureController.getUnitOfMeasureById)
  .patch(unitOfMeasureController.updateUnitOfMeasure)
  .delete(unitOfMeasureController.deleteUnitOfMeasure);

module.exports = router;

