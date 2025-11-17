const System = require('../models/System');
const Area = require('../models/Area');
const Phase = require('../models/Phase');
const Module = require('../models/Module');
const Component = require('../models/Component');
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
    const sovItem = new ScheduleOfValues(req.body);
    await sovItem.save();
    await sovItem.populate([
      'jobId', 'projectId', 'systemId', 'areaId', 'phaseId', 'moduleId', 'componentId'
    ]);
    
    res.status(201).json({
      success: true,
      data: sovItem
    });
  } catch (error) {
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
        'jobId', 'projectId', 'systemId', 'areaId', 'phaseId', 'moduleId', 'componentId'
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
    const sovItem = await ScheduleOfValues.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      'jobId', 'projectId', 'systemId', 'areaId', 'phaseId', 'moduleId', 'componentId'
    ]);
    
    if (!sovItem) {
      return res.status(404).json({
        success: false,
        message: 'SOV line item not found'
      });
    }
    
    res.json({
      success: true,
      data: sovItem
    });
  } catch (error) {
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
