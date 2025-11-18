const System = require('../models/System');
const Area = require('../models/Area');
const Phase = require('../models/Phase');
const Module = require('../models/Module');
const Component = require('../models/Component');
const GLCategory = require('../models/GLCategory');
const GLAccount = require('../models/GLAccount');
const ScheduleOfValues = require('../models/ScheduleOfValues');
const Job = require('../models/Job');

// Generic CRUD operations for SOV components
const createComponent = (Model) => async (req, res) => {
  try {
    const component = new Model(req.body);
    await component.save();
    await component.populate(['jobId', 'projectId']);
    
    res.status(201).json({
      success: true,
      data: component
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating component',
      error: error.message
    });
  }
};

const getComponents = (Model) => async (req, res) => {
  try {
    const { jobId, projectId } = req.query;
    const filter = {};
    
    if (jobId) filter.jobId = jobId;
    if (projectId) filter.projectId = projectId;
    
    const components = await Model.find(filter)
      .populate(['jobId', 'projectId'])
      .sort({ sortOrder: 1, code: 1 });
    
    res.json({
      success: true,
      data: components
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching components',
      error: error.message
    });
  }
};

const updateComponent = (Model) => async (req, res) => {
  try {
    const component = await Model.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(['jobId', 'projectId']);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Component not found'
      });
    }
    
    res.json({
      success: true,
      data: component
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating component',
      error: error.message
    });
  }
};

const deleteComponent = (Model) => async (req, res) => {
  try {
    const component = await Model.findByIdAndDelete(req.params.id);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Component not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Component deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting component',
      error: error.message
    });
  }
};

// Systems
exports.createSystem = createComponent(System);
exports.getSystems = getComponents(System);
exports.updateSystem = updateComponent(System);
exports.deleteSystem = deleteComponent(System);

// Areas
exports.createArea = createComponent(Area);
exports.getAreas = getComponents(Area);
exports.updateArea = updateComponent(Area);
exports.deleteArea = deleteComponent(Area);

// Phases
exports.createPhase = createComponent(Phase);
exports.getPhases = getComponents(Phase);
exports.updatePhase = updateComponent(Phase);
exports.deletePhase = deleteComponent(Phase);

// Modules
exports.createModule = createComponent(Module);
exports.getModules = getComponents(Module);
exports.updateModule = updateComponent(Module);
exports.deleteModule = deleteComponent(Module);

// Components
exports.createComponent = createComponent(Component);
exports.getComponents = getComponents(Component);
exports.updateComponent = updateComponent(Component);
exports.deleteComponent = deleteComponent(Component);

// Schedule of Values specific operations
exports.createSOVLineItem = async (req, res) => {
  try {
    // Auto-generate cost code number if not provided
    if (!req.body.costCodeNumber || req.body.costCodeNumber.trim() === '') {
      // Find the highest numeric cost code number for this job
      const existingItems = await ScheduleOfValues.find({ jobId: req.body.jobId })
        .select('costCodeNumber')
        .lean();
      
      const numericCodes = existingItems
        .map(item => {
          if (!item.costCodeNumber) return 0
          const match = item.costCodeNumber.match(/(\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
        .filter(n => n > 0);
      
      const nextNumber = numericCodes.length > 0 
        ? Math.max(...numericCodes) + 1 
        : 1;
      
      req.body.costCodeNumber = String(nextNumber).padStart(3, '0');
    }

    // Auto-generate cost code name from system and area if not provided
    if ((!req.body.costCodeName || req.body.costCodeName.trim() === '') && 
        req.body.systemId && req.body.areaId) {
      const System = require('../models/System');
      const Area = require('../models/Area');
      const [system, area] = await Promise.all([
        System.findById(req.body.systemId).lean(),
        Area.findById(req.body.areaId).lean()
      ]);
      
      if (system && area) {
        const systemPart = system.code || system.name;
        const areaPart = area.code || area.name;
        req.body.costCodeName = `${systemPart}${areaPart}`;
      }
    }

    // Check for duplicate cost code number
    if (req.body.costCodeNumber) {
      const normalized = req.body.costCodeNumber.trim().toUpperCase();
      const existing = await ScheduleOfValues.findOne({ 
        jobId: req.body.jobId, 
        costCodeNumber: normalized 
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Cost code number must be unique',
          error: `Cost code number "${normalized}" already exists for this job`
        });
      }
      
      req.body.costCodeNumber = normalized;
    }

    const sovItem = new ScheduleOfValues(req.body);
    await sovItem.save();
    await sovItem.populate([
      'jobId', 'projectId', 'systemId', 'areaId', 'phaseId', 'moduleId', 'componentId',
      'glCategoryId', 'glAccountItemId'
    ]);
    
    res.status(201).json({
      success: true,
      data: sovItem
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Cost code number must be unique',
        error: 'A line item with this cost code number already exists for this job'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating SOV line item',
      error: error.message
    });
  }
};

exports.getSOVLineItems = async (req, res) => {
  try {
    const { jobId, projectId } = req.query;
    const filter = {};
    
    if (jobId) filter.jobId = jobId;
    if (projectId) filter.projectId = projectId;
    
    const sovItems = await ScheduleOfValues.find(filter)
      .populate([
        'jobId', 'projectId', 'systemId', 'areaId', 'phaseId', 'moduleId', 'componentId',
        'glCategoryId', 'glAccountItemId'
      ])
      .sort({ sortOrder: 1, lineNumber: 1 });
    
    res.json({
      success: true,
      data: sovItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching SOV line items',
      error: error.message
    });
  }
};

exports.updateSOVLineItem = async (req, res) => {
  try {
    // Find the item first to ensure it exists
    const existingItem = await ScheduleOfValues.findById(req.params.id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'SOV line item not found'
      });
    }

    // Auto-generate cost code name from system and area if system/area changed
    if ((req.body.systemId || req.body.areaId) && 
        (!req.body.costCodeName || req.body.costCodeName.trim() === '')) {
      const System = require('../models/System');
      const Area = require('../models/Area');
      const systemId = req.body.systemId || existingItem.systemId;
      const areaId = req.body.areaId || existingItem.areaId;
      
      if (systemId && areaId) {
        const [system, area] = await Promise.all([
          System.findById(systemId).lean(),
          Area.findById(areaId).lean()
        ]);
        
        if (system && area) {
          const systemPart = system.code || system.name;
          const areaPart = area.code || area.name;
          req.body.costCodeName = `${systemPart}${areaPart}`;
        }
      }
    }

    // Check for duplicate cost code number if it's being changed
    if (req.body.costCodeNumber && req.body.costCodeNumber !== existingItem.costCodeNumber) {
      const normalized = req.body.costCodeNumber.trim().toUpperCase();
      const duplicate = await ScheduleOfValues.findOne({ 
        jobId: existingItem.jobId, 
        costCodeNumber: normalized,
        _id: { $ne: req.params.id }
      });
      
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Cost code number must be unique',
          error: `Cost code number "${normalized}" already exists for this job`
        });
      }
      
      req.body.costCodeNumber = normalized;
    }

    // Update the item - mongoose pre-save middleware will recalculate derived fields
    const sovItem = await ScheduleOfValues.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      'jobId', 'projectId', 'systemId', 'areaId', 'phaseId', 'moduleId', 'componentId',
      'glCategoryId', 'glAccountItemId'
    ]);
    
    res.json({
      success: true,
      data: sovItem
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Cost code number must be unique',
        error: 'A line item with this cost code number already exists for this job'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error updating SOV line item',
      error: error.message
    });
  }
};

exports.deleteSOVLineItem = async (req, res) => {
  try {
    const sovItem = await ScheduleOfValues.findByIdAndDelete(req.params.id);
    
    if (!sovItem) {
      return res.status(404).json({
        success: false,
        message: 'SOV line item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'SOV line item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting SOV line item',
      error: error.message
    });
  }
};

// Bulk operations
exports.bulkCreateComponents = async (req, res) => {
  try {
    const { type, components } = req.body;
    const Model = getModelByType(type);
    
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component type'
      });
    }
    
    const createdComponents = await Model.insertMany(components);
    
    res.status(201).json({
      success: true,
      data: createdComponents,
      count: createdComponents.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating components in bulk',
      error: error.message
    });
  }
};

// Job setup - Initialize all SOV components for a job
exports.initializeJobSOV = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { systems, areas, phases, modules, components } = req.body;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    const results = {};
    
    // Create systems
    if (systems && systems.length > 0) {
      const systemData = systems.map(s => ({ ...s, jobId, projectId: job.projectId }));
      results.systems = await System.insertMany(systemData);
    }
    
    // Create areas
    if (areas && areas.length > 0) {
      const areaData = areas.map(a => ({ ...a, jobId, projectId: job.projectId }));
      results.areas = await Area.insertMany(areaData);
    }
    
    // Create phases
    if (phases && phases.length > 0) {
      const phaseData = phases.map(p => ({ ...p, jobId, projectId: job.projectId }));
      results.phases = await Phase.insertMany(phaseData);
    }
    
    // Create modules
    if (modules && modules.length > 0) {
      const moduleData = modules.map(m => ({ ...m, jobId, projectId: job.projectId }));
      results.modules = await Module.insertMany(moduleData);
    }
    
    // Create components
    if (components && components.length > 0) {
      const componentData = components.map(c => ({ ...c, jobId, projectId: job.projectId }));
      results.components = await Component.insertMany(componentData);
    }
    
    res.status(201).json({
      success: true,
      message: 'Job SOV components initialized successfully',
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error initializing job SOV',
      error: error.message
    });
  }
};

// Get SOV line items for a specific job
exports.getJobSOVLineItems = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const sovLineItems = await ScheduleOfValues.find({ jobId })
      .populate([
        'systemId', 'areaId', 'phaseId', 'moduleId', 'componentId',
        'glCategoryId', 'glAccountItemId'
      ])
      .sort({ sortOrder: 1, lineNumber: 1 });

    res.json({
      success: true,
      data: sovLineItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job SOV line items',
      error: error.message
    });
  }
};

// Get SOV structure for a job (all dropdown options)
exports.getSOVStructure = async (req, res) => {
  try {
    const { jobId } = req.params;
    const mongoose = require('mongoose');
    
    // Ensure jobId is converted to ObjectId
    const jobObjectId = mongoose.Types.ObjectId.isValid(jobId) 
      ? new mongoose.Types.ObjectId(jobId) 
      : jobId;
    
    // Query all SOV structure components
    const [systems, areas, phases, modules, components] = await Promise.all([
      System.find({ jobId: jobObjectId }).sort({ sortOrder: 1, code: 1 }).lean(),
      Area.find({ jobId: jobObjectId }).sort({ sortOrder: 1, code: 1 }).lean(),
      Phase.find({ jobId: jobObjectId }).sort({ sortOrder: 1, code: 1 }).lean(),
      Module.find({ jobId: jobObjectId }).sort({ sortOrder: 1, code: 1 }).lean(),
      Component.find({ jobId: jobObjectId }).sort({ sortOrder: 1, code: 1 }).lean()
    ]);
    
    // Query GL Categories and Accounts using native driver to bypass model issues
    const db = mongoose.connection.db;
    const [glCategoriesRaw, glAccountsRaw] = await Promise.all([
      db.collection('glcategories').find({ jobId: jobObjectId }).sort({ sortOrder: 1, code: 1 }).toArray(),
      db.collection('glaccounts').find({ jobId: jobObjectId }).sort({ sortOrder: 1, code: 1 }).toArray()
    ]);
    
    // Convert _id to string for consistency
    const glCategories = glCategoriesRaw.map(cat => ({
      ...cat,
      _id: cat._id.toString(),
      jobId: cat.jobId.toString(),
      projectId: cat.projectId?.toString()
    }));
    const glAccounts = glAccountsRaw.map(acct => ({
      ...acct,
      _id: acct._id.toString(),
      jobId: acct.jobId.toString(),
      projectId: acct.projectId?.toString(),
      glCategoryId: acct.glCategoryId?.toString()
    }));

    res.json({
      success: true,
      data: {
        systems,
        areas,
        phases,
        modules,
        components,
        glCategories,
        glAccounts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching SOV structure',
      error: error.message
    });
  }
};

// Helper function to get model by type
function getModelByType(type) {
  const models = {
    'system': System,
    'area': Area,
    'phase': Phase,
    'module': Module,
    'component': Component
  };
  return models[type.toLowerCase()];
}
