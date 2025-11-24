const UnitOfMeasure = require('../models/UnitOfMeasure');

exports.createUnitOfMeasure = async (req, res, next) => {
  try {
    const unitOfMeasure = new UnitOfMeasure(req.body);
    await unitOfMeasure.save();
    res.status(201).json({ success: true, data: unitOfMeasure });
  } catch (error) {
    next(error);
  }
};

exports.getUnitsOfMeasure = async (req, res, next) => {
  try {
    const { system, category, isActive } = req.query;
    const filter = {};
    if (system) filter.system = system;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const units = await UnitOfMeasure.find(filter).sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, count: units.length, data: units });
  } catch (error) {
    next(error);
  }
};

exports.getUnitOfMeasureById = async (req, res, next) => {
  try {
    const unit = await UnitOfMeasure.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit of Measure not found' });
    }
    res.status(200).json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

exports.updateUnitOfMeasure = async (req, res, next) => {
  try {
    const unit = await UnitOfMeasure.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit of Measure not found' });
    }
    res.status(200).json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

exports.deleteUnitOfMeasure = async (req, res, next) => {
  try {
    const unit = await UnitOfMeasure.findByIdAndDelete(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit of Measure not found' });
    }
    res.status(200).json({ success: true, message: 'Unit of Measure deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getUnitCategories = async (req, res, next) => {
  try {
    const categories = await UnitOfMeasure.distinct('category');
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

