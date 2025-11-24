const express = require('express');
const router = express.Router();
const propertyDefinitionController = require('../controllers/propertyDefinitionController');

// Property Definition routes
router.get('/', propertyDefinitionController.list);
router.get('/by-category', propertyDefinitionController.getByCategory);
router.get('/:id', propertyDefinitionController.get);
router.post('/', propertyDefinitionController.create);
router.patch('/:id', propertyDefinitionController.update);
router.delete('/:id', propertyDefinitionController.remove);

module.exports = router;

