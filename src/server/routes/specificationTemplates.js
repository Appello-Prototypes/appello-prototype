const express = require('express');
const router = express.Router();
const specificationTemplateController = require('../controllers/specificationTemplateController');

// Template routes
router.get('/', specificationTemplateController.list);
router.get('/:id', specificationTemplateController.get);
router.post('/', specificationTemplateController.create);
router.patch('/:id', specificationTemplateController.update);
router.delete('/:id', specificationTemplateController.delete);

module.exports = router;

