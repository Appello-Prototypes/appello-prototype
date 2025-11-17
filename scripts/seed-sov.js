require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const Module = require('../src/server/models/Module');
const Component = require('../src/server/models/Component');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const Task = require('../src/server/models/Task');
const User = require('../src/server/models/User');

async function seedSOVData() {
  try {
    console.log('🌱 Starting SOV data seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing job and project
    const job = await Job.findOne().populate('projectId');
    const project = await Project.findOne();
    
    if (!job || !project) {
      console.error('❌ No existing job or project found. Run main seed script first.');
      return;
    }

    console.log(`📋 Using Job: ${job.name} (${job.jobNumber})`);
    console.log(`🏗️ Using Project: ${project.name} (${project.projectNumber})`);

    // Clear existing SOV data for this job
    await Promise.all([
      System.deleteMany({ jobId: job._id }),
      Area.deleteMany({ jobId: job._id }),
      Phase.deleteMany({ jobId: job._id }),
      Module.deleteMany({ jobId: job._id }),
      Component.deleteMany({ jobId: job._id }),
      ScheduleOfValues.deleteMany({ jobId: job._id })
    ]);

    // 1. CREATE SYSTEMS - Based on petrochemical plant systems
    const systemsData = [
      {
        name: 'Hot Oil System',
        code: 'HOS',
        description: 'Hot oil heating and circulation system for process units',
        sortOrder: 1
      },
      {
        name: 'Steam System', 
        code: 'STM',
        description: 'High pressure steam distribution and condensate return',
        sortOrder: 2
      },
      {
        name: 'Cooling Water System',
        code: 'CWS',
        description: 'Cooling water supply and return headers',
        sortOrder: 3
      },
      {
        name: 'Process Gas System',
        code: 'PGS', 
        description: 'Process gas piping and equipment',
        sortOrder: 4
      },
      {
        name: 'Utility Systems',
        code: 'UTL',
        description: 'Utility piping - air, nitrogen, fuel gas',
        sortOrder: 5
      }
    ];

    const systems = [];
    for (const systemData of systemsData) {
      const system = new System({
        ...systemData,
        jobId: job._id,
        projectId: project._id
      });
      await system.save();
      systems.push(system);
      console.log(`✅ Created System: ${system.code} - ${system.name}`);
    }

    // 2. CREATE AREAS - Based on typical plant layout
    const areasData = [
      {
        name: 'Process Unit 200A',
        code: 'U200A',
        description: 'Main process unit - reactors and separators',
        floor: 'Grade Level',
        zone: 'North',
        building: 'Process Building',
        sortOrder: 1
      },
      {
        name: 'Process Unit 200B', 
        code: 'U200B',
        description: 'Secondary process unit - heat exchangers',
        floor: 'Grade Level',
        zone: 'South', 
        building: 'Process Building',
        sortOrder: 2
      },
      {
        name: 'Pipe Rack Level 1',
        code: 'PR01',
        description: 'Main pipe rack - elevation 20 feet',
        floor: 'Level 1',
        zone: 'East-West',
        building: 'Pipe Rack',
        sortOrder: 3
      },
      {
        name: 'Pipe Rack Level 2',
        code: 'PR02', 
        description: 'Upper pipe rack - elevation 40 feet',
        floor: 'Level 2',
        zone: 'East-West',
        building: 'Pipe Rack',
        sortOrder: 4
      },
      {
        name: 'Utility Building',
        code: 'UTIL',
        description: 'Utility and maintenance building',
        floor: 'Grade Level',
        zone: 'West',
        building: 'Utility Building',
        sortOrder: 5
      }
    ];

    const areas = [];
    for (const areaData of areasData) {
      const area = new Area({
        ...areaData,
        jobId: job._id,
        projectId: project._id
      });
      await area.save();
      areas.push(area);
      console.log(`✅ Created Area: ${area.code} - ${area.name}`);
    }

    // 3. CREATE PHASES - Based on typical construction phases
    const phasesData = [
      {
        name: 'Preparation & Mobilization',
        code: 'PREP',
        description: 'Site preparation, scaffolding, material staging',
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-15'),
        status: 'completed',
        sortOrder: 1
      },
      {
        name: 'Piping Insulation - Phase 1',
        code: 'PIPE1',
        description: 'Main process piping insulation installation',
        startDate: new Date('2024-11-16'),
        endDate: new Date('2025-01-31'),
        status: 'in_progress',
        sortOrder: 2
      },
      {
        name: 'Equipment Insulation',
        code: 'EQUIP',
        description: 'Vessels, heat exchangers, and equipment insulation',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-03-15'),
        status: 'not_started',
        sortOrder: 3
      },
      {
        name: 'Jacketing & Finishing',
        code: 'JACK',
        description: 'Aluminum and stainless steel jacketing installation',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-04-30'),
        status: 'not_started',
        sortOrder: 4
      },
      {
        name: 'Testing & Commissioning',
        code: 'TEST',
        description: 'Final inspections, testing, and project closeout',
        startDate: new Date('2025-04-15'),
        endDate: new Date('2025-05-30'),
        status: 'not_started',
        sortOrder: 5
      }
    ];

    const phases = [];
    for (const phaseData of phasesData) {
      const phase = new Phase({
        ...phaseData,
        jobId: job._id,
        projectId: project._id
      });
      await phase.save();
      phases.push(phase);
      console.log(`✅ Created Phase: ${phase.code} - ${phase.name}`);
    }

    // 4. CREATE MODULES - Specific system modules
    const modulesData = [
      {
        name: 'Supply Headers',
        code: 'SUP',
        description: 'Main supply piping headers',
        systemId: systems.find(s => s.code === 'HOS')._id,
        moduleType: 'piping',
        sortOrder: 1
      },
      {
        name: 'Return Headers',
        code: 'RET',
        description: 'Return piping headers and condensate',
        systemId: systems.find(s => s.code === 'HOS')._id,
        moduleType: 'piping',
        sortOrder: 2
      },
      {
        name: 'Heat Exchangers',
        code: 'HX',
        description: 'Shell and tube heat exchangers',
        systemId: systems.find(s => s.code === 'HOS')._id,
        moduleType: 'equipment',
        sortOrder: 3
      },
      {
        name: 'Distribution Network',
        code: 'DIST',
        description: 'Steam distribution and branch connections',
        systemId: systems.find(s => s.code === 'STM')._id,
        moduleType: 'piping',
        sortOrder: 1
      },
      {
        name: 'Boiler Equipment',
        code: 'BOIL',
        description: 'Steam boilers and related equipment',
        systemId: systems.find(s => s.code === 'STM')._id,
        moduleType: 'equipment',
        sortOrder: 2
      }
    ];

    const modules = [];
    for (const moduleData of modulesData) {
      const module = new Module({
        ...moduleData,
        jobId: job._id,
        projectId: project._id
      });
      await module.save();
      modules.push(module);
      console.log(`✅ Created Module: ${module.code} - ${module.name}`);
    }

    // 5. CREATE COMPONENTS - Specific equipment/piping components
    const componentsData = [
      {
        name: '12" Supply Header',
        code: 'SUP12',
        description: '12 inch hot oil supply main header',
        moduleId: modules.find(m => m.code === 'SUP')._id,
        componentType: 'pipe',
        size: '12"',
        material: 'Carbon Steel',
        specification: 'ASTM A106 Gr B',
        sortOrder: 1
      },
      {
        name: '10" Return Header',
        code: 'RET10',
        description: '10 inch hot oil return main header', 
        moduleId: modules.find(m => m.code === 'RET')._id,
        componentType: 'pipe',
        size: '10"',
        material: 'Carbon Steel',
        specification: 'ASTM A106 Gr B',
        sortOrder: 2
      },
      {
        name: 'Heat Exchanger HX-201A',
        code: 'HX201A',
        description: 'Shell and tube heat exchanger 201A',
        moduleId: modules.find(m => m.code === 'HX')._id,
        componentType: 'heat_exchanger',
        size: '48" x 20\'',
        material: 'Carbon Steel',
        specification: 'TEMA BEM',
        sortOrder: 1
      },
      {
        name: 'Heat Exchanger HX-201B',
        code: 'HX201B',
        description: 'Shell and tube heat exchanger 201B',
        moduleId: modules.find(m => m.code === 'HX')._id,
        componentType: 'heat_exchanger',
        size: '36" x 16\'',
        material: 'Carbon Steel', 
        specification: 'TEMA BEM',
        sortOrder: 2
      }
    ];

    const components = [];
    for (const componentData of componentsData) {
      const component = new Component({
        ...componentData,
        jobId: job._id,
        projectId: project._id
      });
      await component.save();
      components.push(component);
      console.log(`✅ Created Component: ${component.code} - ${component.name}`);
    }

    // 6. CREATE SCHEDULE OF VALUES LINE ITEMS
    const sovLineItemsData = [
      {
        lineNumber: '1.1',
        costCode: 'INS-PIPE-CON-12',
        description: '12" Hot Oil Supply Header Insulation - 4" Mineral Wool with Aluminum Jacketing',
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200A')._id,
        phaseId: phases.find(p => p.code === 'PIPE1')._id,
        moduleId: modules.find(m => m.code === 'SUP')._id,
        componentId: components.find(c => c.code === 'SUP12')._id,
        totalCost: 45000,
        margin: 25,
        quantity: 240,
        unit: 'LF',
        unitDescription: '12" pipe insulation with 4" mineral wool',
        quantityComplete: 240,
        sortOrder: 1
      },
      {
        lineNumber: '1.2',
        costCode: 'INS-PIPE-CON-10',
        description: '10" Hot Oil Return Header Insulation - 3" Mineral Wool with Aluminum Jacketing',
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200A')._id,
        phaseId: phases.find(p => p.code === 'PIPE1')._id,
        moduleId: modules.find(m => m.code === 'RET')._id,
        componentId: components.find(c => c.code === 'RET10')._id,
        totalCost: 32000,
        margin: 25,
        quantity: 180,
        unit: 'LF',
        unitDescription: '10" pipe insulation with 3" mineral wool',
        quantityComplete: 81,
        sortOrder: 2
      },
      {
        lineNumber: '2.1',
        costCode: 'INS-EQUIP-HX',
        description: 'Heat Exchanger HX-201A Removable Insulation Blankets',
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200B')._id,
        phaseId: phases.find(p => p.code === 'EQUIP')._id,
        moduleId: modules.find(m => m.code === 'HX')._id,
        componentId: components.find(c => c.code === 'HX201A')._id,
        totalCost: 18500,
        margin: 30,
        quantity: 1,
        unit: 'EA',
        unitDescription: 'Custom fabricated removable insulation system',
        quantityComplete: 0,
        sortOrder: 3
      },
      {
        lineNumber: '2.2', 
        costCode: 'INS-EQUIP-HX',
        description: 'Heat Exchanger HX-201B Removable Insulation Blankets',
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200B')._id,
        phaseId: phases.find(p => p.code === 'EQUIP')._id,
        moduleId: modules.find(m => m.code === 'HX')._id,
        componentId: components.find(c => c.code === 'HX201B')._id,
        totalCost: 15200,
        margin: 30,
        quantity: 1,
        unit: 'EA',
        unitDescription: 'Custom fabricated removable insulation system',
        quantityComplete: 0,
        sortOrder: 4
      },
      {
        lineNumber: '3.1',
        costCode: 'STM-DIST-MAIN',
        description: 'Main Steam Distribution Headers - 8" & 6" Lines',
        systemId: systems.find(s => s.code === 'STM')._id,
        areaId: areas.find(a => a.code === 'PR01')._id,
        phaseId: phases.find(p => p.code === 'PIPE1')._id,
        moduleId: modules.find(m => m.code === 'DIST')._id,
        totalCost: 28000,
        margin: 22,
        quantity: 320,
        unit: 'LF',
        unitDescription: '6"-8" steam pipe insulation with SS jacketing',
        quantityComplete: 0,
        sortOrder: 5
      },
      {
        lineNumber: '4.1',
        costCode: 'PREP-SCAFFOLD',
        description: 'Scaffolding and Access Platforms',
        areaId: areas.find(a => a.code === 'PR01')._id,
        phaseId: phases.find(p => p.code === 'PREP')._id,
        totalCost: 25000,
        margin: 15,
        quantity: 1,
        unit: 'LS',
        unitDescription: 'Complete scaffolding system rental and installation',
        quantityComplete: 1,
        sortOrder: 6
      },
      {
        lineNumber: '4.2',
        costCode: 'PREP-CLEAN',
        description: 'Surface Preparation and Cleaning',
        phaseId: phases.find(p => p.code === 'PREP')._id,
        totalCost: 12000,
        margin: 20,
        quantity: 150,
        unit: 'LF',
        unitDescription: 'Steam cleaning and surface preparation',
        quantityComplete: 150,
        sortOrder: 7
      },
      {
        lineNumber: '5.1',
        costCode: 'JACK-ALUM-PIPE',
        description: 'Aluminum Jacketing for Pipe Insulation',
        systemId: systems.find(s => s.code === 'HOS')._id,
        phaseId: phases.find(p => p.code === 'JACK')._id,
        totalCost: 22000,
        margin: 28,
        quantity: 420,
        unit: 'LF',
        unitDescription: '0.032" aluminum jacketing with moisture seal',
        quantityComplete: 0,
        sortOrder: 8
      },
      {
        lineNumber: '5.2',
        costCode: 'JACK-SS-EQUIP',
        description: 'Stainless Steel Jacketing for Equipment',
        phaseId: phases.find(p => p.code === 'JACK')._id,
        totalCost: 8500,
        margin: 35,
        quantity: 2,
        unit: 'EA',
        unitDescription: '316SS jacketing for heat exchangers',
        quantityComplete: 0,
        sortOrder: 9
      },
      {
        lineNumber: '6.1',
        costCode: 'SAFETY-PROGRAM',
        description: 'Safety Program and Weekly Inspections',
        totalCost: 15000,
        margin: 10,
        quantity: 26,
        unit: 'EA',
        unitDescription: 'Weekly safety inspections and compliance',
        quantityComplete: 8,
        sortOrder: 10
      }
    ];

    const sovLineItems = [];
    for (const sovData of sovLineItemsData) {
      const sovItem = new ScheduleOfValues({
        ...sovData,
        jobId: job._id,
        projectId: project._id,
        totalValue: sovData.totalCost * (1 + sovData.margin / 100) // Calculate total value
      });
      await sovItem.save();
      sovLineItems.push(sovItem);
      console.log(`✅ Created SOV Line Item: ${sovItem.lineNumber} - ${sovItem.description.substring(0, 50)}...`);
    }

    // 7. UPDATE EXISTING TASKS WITH SOV ASSIGNMENTS
    const tasks = await Task.find({ jobId: job._id });
    
    const taskUpdates = [
      {
        title: 'Hot Oil Supply Header Insulation - ISO-HOS-001',
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200A')._id,
        phaseId: phases.find(p => p.code === 'PIPE1')._id,
        moduleId: modules.find(m => m.code === 'SUP')._id,
        componentId: components.find(c => c.code === 'SUP12')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '1.1')._id
      },
      {
        title: 'Hot Oil Return Header Insulation - ISO-HOS-002', 
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200A')._id,
        phaseId: phases.find(p => p.code === 'PIPE1')._id,
        moduleId: modules.find(m => m.code === 'RET')._id,
        componentId: components.find(c => c.code === 'RET10')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '1.2')._id
      },
      {
        title: 'Heat Exchanger Insulation - HX-201A',
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200B')._id,
        phaseId: phases.find(p => p.code === 'EQUIP')._id,
        moduleId: modules.find(m => m.code === 'HX')._id,
        componentId: components.find(c => c.code === 'HX201A')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '2.1')._id
      },
      {
        title: 'Steam Header Preparation - ISO-STM-001',
        systemId: systems.find(s => s.code === 'STM')._id,
        areaId: areas.find(a => a.code === 'PR01')._id,
        phaseId: phases.find(p => p.code === 'PREP')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '4.2')._id
      },
      {
        title: 'Weekly Safety Inspection - Week 47',
        areaId: areas.find(a => a.code === 'U200A')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '6.1')._id
      }
    ];

    for (const update of taskUpdates) {
      const task = tasks.find(t => t.title.includes(update.title.split(' - ')[0]));
      if (task) {
        await Task.findByIdAndUpdate(task._id, {
          systemId: update.systemId,
          areaId: update.areaId,
          phaseId: update.phaseId,
          moduleId: update.moduleId,
          componentId: update.componentId,
          scheduleOfValuesId: update.scheduleOfValuesId
        });
        console.log(`✅ Updated Task: ${task.title}`);
      }
    }

    // 8. CREATE ADDITIONAL REALISTIC TASKS
    const users = await User.find();
    const mikeWorker = users.find(u => u.name.includes('Mike'));
    const sarahSupervisor = users.find(u => u.name.includes('Sarah'));
    const johnManager = users.find(u => u.name.includes('John'));

    const additionalTasks = [
      {
        title: 'Steam Distribution Header Insulation - STM-DIST-001',
        description: 'Install 3" mineral wool insulation on 8" steam distribution headers with stainless steel jacketing',
        status: 'not_started',
        priority: 'high',
        assignedTo: mikeWorker._id,
        createdBy: johnManager._id,
        dueDate: new Date('2025-01-15'),
        estimatedHours: 32,
        actualHours: 0,
        jobId: job._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'STM')._id,
        areaId: areas.find(a => a.code === 'PR01')._id,
        phaseId: phases.find(p => p.code === 'PIPE1')._id,
        moduleId: modules.find(m => m.code === 'DIST')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '3.1')._id,
        costCode: 'STM-DIST-MAIN',
        category: 'insulation',
        craft: 'insulation',
        workOrderNumber: 'WO-STM-2025-001',
        requiresFieldSupervisorApproval: true,
        progressReportingMethod: 'units_installed',
        unitsToInstall: { quantity: 320, unit: 'LF', description: '8" steam pipe insulation' },
        unitsInstalled: 0,
        tags: ['steam-system', 'high-temp', 'stainless-jacketing'],
        completionPercentage: 0
      },
      {
        title: 'Aluminum Jacketing Installation - Phase 1',
        description: 'Install aluminum jacketing on completed pipe insulation in Process Unit 200A',
        status: 'not_started',
        priority: 'medium', 
        assignedTo: mikeWorker._id,
        createdBy: johnManager._id,
        dueDate: new Date('2025-03-01'),
        estimatedHours: 28,
        actualHours: 0,
        jobId: job._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200A')._id,
        phaseId: phases.find(p => p.code === 'JACK')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '5.1')._id,
        costCode: 'JACK-ALUM-PIPE',
        category: 'jacketing',
        craft: 'insulation',
        workOrderNumber: 'WO-JACK-2025-001',
        requiresFieldSupervisorApproval: true,
        progressReportingMethod: 'units_installed',
        unitsToInstall: { quantity: 420, unit: 'LF', description: 'Aluminum jacketing installation' },
        unitsInstalled: 0,
        tags: ['jacketing', 'aluminum', 'weather-protection'],
        completionPercentage: 0
      },
      {
        title: 'HX-201B Equipment Insulation',
        description: 'Design and install removable insulation blankets for heat exchanger HX-201B',
        status: 'not_started',
        priority: 'medium',
        assignedTo: mikeWorker._id,
        createdBy: johnManager._id, 
        dueDate: new Date('2025-02-28'),
        estimatedHours: 20,
        actualHours: 0,
        jobId: job._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'HOS')._id,
        areaId: areas.find(a => a.code === 'U200B')._id,
        phaseId: phases.find(p => p.code === 'EQUIP')._id,
        moduleId: modules.find(m => m.code === 'HX')._id,
        componentId: components.find(c => c.code === 'HX201B')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '2.2')._id,
        costCode: 'INS-EQUIP-HX',
        category: 'insulation',
        craft: 'insulation', 
        workOrderNumber: 'WO-EQUIP-2025-002',
        requiresFieldSupervisorApproval: true,
        progressReportingMethod: 'percentage',
        unitsToInstall: { quantity: 1, unit: 'EA', description: 'Heat exchanger insulation system' },
        unitsInstalled: 0,
        tags: ['heat-exchanger', 'removable', 'custom-fabrication'],
        completionPercentage: 0
      },
      {
        title: 'Scaffolding Installation - Process Unit 200A',
        description: 'Install and maintain scaffolding for insulation work access',
        status: 'completed',
        priority: 'high',
        assignedTo: sarahSupervisor._id,
        createdBy: johnManager._id,
        dueDate: new Date('2024-11-15'),
        estimatedHours: 40,
        actualHours: 38,
        jobId: job._id,
        projectId: project._id,
        areaId: areas.find(a => a.code === 'U200A')._id,
        phaseId: phases.find(p => p.code === 'PREP')._id,
        scheduleOfValuesId: sovLineItems.find(s => s.lineNumber === '4.1')._id,
        costCode: 'PREP-SCAFFOLD',
        category: 'preparation',
        craft: 'general',
        workOrderNumber: 'WO-PREP-2024-001',
        requiresFieldSupervisorApproval: false,
        progressReportingMethod: 'percentage',
        unitsToInstall: { quantity: 1, unit: 'LS', description: 'Complete scaffolding system' },
        unitsInstalled: 1,
        tags: ['scaffolding', 'access', 'safety'],
        completionPercentage: 100
      }
    ];

    for (const taskData of additionalTasks) {
      const task = new Task(taskData);
      await task.save();
      console.log(`✅ Created Task: ${task.title}`);
    }

    // 9. CALCULATE AND DISPLAY SUMMARY
    const totalSOVValue = sovLineItems.reduce((sum, item) => sum + item.totalValue, 0);
    const totalSOVCost = sovLineItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalMarginAmount = totalSOVValue - totalSOVCost;
    const averageMargin = (totalMarginAmount / totalSOVCost) * 100;

    console.log('\n🎯 SOV DATA SEEDING COMPLETE!');
    console.log('=====================================');
    console.log(`📊 Created ${systems.length} Systems`);
    console.log(`📍 Created ${areas.length} Areas`);
    console.log(`⏱️ Created ${phases.length} Phases`);
    console.log(`🧩 Created ${modules.length} Modules`);
    console.log(`🔧 Created ${components.length} Components`);
    console.log(`📋 Created ${sovLineItems.length} SOV Line Items`);
    console.log(`📝 Updated ${taskUpdates.length} Existing Tasks`);
    console.log(`➕ Created ${additionalTasks.length} New Tasks`);
    console.log('=====================================');
    console.log(`💰 Total Contract Value: $${totalSOVValue.toLocaleString()}`);
    console.log(`💵 Total Cost: $${totalSOVCost.toLocaleString()}`);
    console.log(`📈 Total Margin: $${totalMarginAmount.toLocaleString()} (${averageMargin.toFixed(1)}%)`);
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error seeding SOV data:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedSOVData();
