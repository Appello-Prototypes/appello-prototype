require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const User = require('../src/server/models/User');
const Task = require('../src/server/models/Task');
const Project = require('../src/server/models/Project');
const Job = require('../src/server/models/Job');
const TimeEntry = require('../src/server/models/TimeEntry');

async function seedDatabase() {
  try {
    // Connect to MongoDB - use dev URI for local seeding
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Task.deleteMany({});
    await Project.deleteMany({});
    await Job.deleteMany({});
    await TimeEntry.deleteMany({});
    console.log('Cleared existing data');

    // Create demo users
    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@appello.com',
        password: 'password123',
        role: 'admin',
        phone: '555-0001',
        department: 'Administration',
        position: 'System Administrator'
      },
      {
        name: 'John Manager',
        email: 'john@appello.com',
        password: 'password123',
        role: 'project_manager',
        phone: '555-0002',
        department: 'Operations',
        position: 'Project Manager'
      },
      {
        name: 'Sarah Supervisor',
        email: 'sarah@appello.com',
        password: 'password123',
        role: 'field_supervisor',
        phone: '555-0003',
        department: 'Field Operations',
        position: 'Field Supervisor'
      },
      {
        name: 'Mike Worker',
        email: 'mike@appello.com',
        password: 'password123',
        role: 'field_worker',
        phone: '555-0004',
        department: 'Field Operations',
        position: 'Insulation Technician'
      },
      {
        name: 'Lisa Office',
        email: 'lisa@appello.com',
        password: 'password123',
        role: 'office_staff',
        phone: '555-0005',
        department: 'Administration',
        position: 'Office Coordinator'
      }
    ]);

    console.log('Created demo users');

    // Create demo project (high-level container)
    const project = await Project.create({
      name: 'Suncor Energy Petrochemical Expansion',
      projectNumber: 'PROJ-2024-SUNCOR-001',
      client: {
        name: 'Suncor Energy',
        contact: 'Jim Patterson',
        email: 'jim.patterson@suncor.com',
        phone: '403-555-0199'
      },
      description: 'Multi-phase petrochemical plant expansion including new processing units and infrastructure',
      location: {
        address: '9915 Highway 63, Fort McMurray, AB T9H 4A1',
        coordinates: [-111.3781, 56.7267]
      },
      startDate: new Date('2024-11-01'),
      endDate: new Date('2025-12-30'),
      totalContractValue: 8500000,
      status: 'active',
      projectManager: users[1]._id, // John Manager
      projectType: 'industrial',
      overallProgress: 15
    });

    console.log('Created demo project');

    // Create demo job within the project
    const job = await Job.create({
      name: 'Process Unit A - Thermal Insulation',
      jobNumber: 'JOB-2024-INS-002',
      projectId: project._id,
      client: {
        name: 'Suncor Energy',
        contact: 'Jim Patterson',
        email: 'jim.patterson@suncor.com',
        phone: '403-555-0199'
      },
      description: 'Complete thermal insulation system for new petrochemical processing units including piping, vessels, and equipment',
      location: {
        address: '9915 Highway 63, Fort McMurray, AB T9H 4A1',
        coordinates: [-111.3781, 56.7267]
      },
      startDate: new Date('2024-11-01'),
      endDate: new Date('2025-05-30'),
      contractValue: 2850000,
      status: 'active',
      jobManager: users[1]._id, // John Manager
      fieldSupervisor: users[2]._id, // Sarah Supervisor
      foremen: [users[3]._id], // Mike Worker as foreman
      
      // Project phases
      phases: [
        {
          name: 'Mobilization',
          description: 'Site setup, equipment delivery, safety orientation',
          startDate: new Date('2024-11-01'),
          endDate: new Date('2024-11-15'),
          budgetHours: 320,
          budgetCost: 28000,
          status: 'completed'
        },
        {
          name: 'Process Unit A',
          description: 'Insulation of primary processing equipment and piping',
          startDate: new Date('2024-11-16'),
          endDate: new Date('2025-02-28'),
          budgetHours: 2800,
          budgetCost: 380000,
          status: 'in_progress'
        },
        {
          name: 'Process Unit B',
          description: 'Secondary processing unit insulation',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-04-15'),
          budgetHours: 2200,
          budgetCost: 295000,
          status: 'not_started'
        },
        {
          name: 'Final Inspection & Closeout',
          description: 'Quality control, documentation, demobilization',
          startDate: new Date('2025-04-16'),
          endDate: new Date('2025-05-30'),
          budgetHours: 180,
          budgetCost: 22000,
          status: 'not_started'
        }
      ],
      
      // Systems breakdown
      systems: [
        { name: 'Hot Oil System', description: 'High temperature piping and equipment', code: 'HOS', budgetHours: 1200, budgetCost: 165000 },
        { name: 'Steam System', description: 'Steam generation and distribution', code: 'STM', budgetHours: 800, budgetCost: 110000 },
        { name: 'Process Vessels', description: 'Reactors, separators, and tanks', code: 'VES', budgetHours: 1400, budgetCost: 195000 },
        { name: 'Heat Exchangers', description: 'Shell and tube heat exchangers', code: 'HEX', budgetHours: 600, budgetCost: 85000 },
        { name: 'Pumps & Compressors', description: 'Rotating equipment insulation', code: 'PMP', budgetHours: 400, budgetCost: 58000 },
        { name: 'Instrumentation', description: 'Instrument and control line insulation', code: 'INS', budgetHours: 300, budgetCost: 42000 }
      ],
      
      // Areas breakdown
      areas: [
        { name: 'Unit 200A', description: 'Primary processing area', code: 'U200A', floor: 'Ground', zone: 'North' },
        { name: 'Unit 200B', description: 'Secondary processing area', code: 'U200B', floor: 'Ground', zone: 'South' },
        { name: 'Unit 300', description: 'Utilities and support systems', code: 'U300', floor: 'Ground', zone: 'East' },
        { name: 'Pipe Rack Level 1', description: 'Main pipe rack - lower level', code: 'PR1', floor: 'Elevation 100', zone: 'Central' },
        { name: 'Pipe Rack Level 2', description: 'Main pipe rack - upper level', code: 'PR2', floor: 'Elevation 120', zone: 'Central' }
      ],
      
      // Cost codes for time tracking
      costCodes: [
        { code: 'INS-PIPE-CON', description: 'Concealed Pipe Insulation', category: 'labor', budgetHours: 1800, budgetCost: 144000, actualHours: 245, actualCost: 19600 },
        { code: 'INS-PIPE-EXP', description: 'Exposed Pipe Insulation', category: 'labor', budgetHours: 1200, budgetCost: 96000, actualHours: 156, actualCost: 12480 },
        { code: 'INS-EQUIP', description: 'Equipment Insulation', category: 'labor', budgetHours: 1600, budgetCost: 128000, actualHours: 89, actualCost: 7120 },
        { code: 'INS-VESSEL', description: 'Vessel Insulation', category: 'labor', budgetHours: 800, budgetCost: 64000, actualHours: 67, actualCost: 5360 },
        { code: 'JACK-ALUM', description: 'Aluminum Jacketing', category: 'labor', budgetHours: 600, budgetCost: 48000, actualHours: 23, actualCost: 1840 },
        { code: 'JACK-SS', description: 'Stainless Steel Jacketing', category: 'labor', budgetHours: 400, budgetCost: 32000, actualHours: 12, actualCost: 960 },
        { code: 'PREP-CLEAN', description: 'Surface Preparation & Cleaning', category: 'labor', budgetHours: 300, budgetCost: 21000, actualHours: 45, actualCost: 3150 },
        { code: 'MAT-HANDLE', description: 'Material Handling', category: 'labor', budgetHours: 200, budgetCost: 14000, actualHours: 34, actualCost: 2380 }
      ],
      
      // Schedule of Values
      scheduleOfValues: [
        {
          lineItem: 'SOV-001',
          description: 'Hot Oil System - Concealed Piping',
          system: 'Hot Oil System',
          area: 'Unit 200A',
          phase: 'Process Unit A',
          quantity: 2400,
          unit: 'LF',
          unitPrice: 45.50,
          totalValue: 109200,
          budgetHours: 480,
          costCode: 'INS-PIPE-CON'
        },
        {
          lineItem: 'SOV-002',
          description: 'Steam System - Equipment Insulation',
          system: 'Steam System',
          area: 'Unit 200B',
          phase: 'Process Unit A',
          quantity: 12,
          unit: 'EA',
          unitPrice: 8500.00,
          totalValue: 102000,
          budgetHours: 320,
          costCode: 'INS-EQUIP'
        },
        {
          lineItem: 'SOV-003',
          description: 'Process Vessels - Large Tanks',
          system: 'Process Vessels',
          area: 'Unit 200A',
          phase: 'Process Unit A',
          quantity: 1800,
          unit: 'SF',
          unitPrice: 32.75,
          totalValue: 58950,
          budgetHours: 240,
          costCode: 'INS-VESSEL'
        }
      ],
      
      // Test packages with isometric drawings
      testPackages: [
        {
          name: 'TP-001-HOS',
          description: 'Hot Oil System - Main Headers',
          isometricDrawings: [
            {
              drawingNumber: 'ISO-HOS-001',
              title: 'Hot Oil Supply Header - 12" Main Line',
              revision: 'C',
              crafts: ['insulation', 'heat_tracing'],
              budgetHours: 48,
              status: 'completed'
            },
            {
              drawingNumber: 'ISO-HOS-002',
              title: 'Hot Oil Return Header - 10" Return Line',
              revision: 'B',
              crafts: ['insulation', 'heat_tracing'],
              budgetHours: 40,
              status: 'in_progress'
            }
          ],
          assignedForeman: users[3]._id,
          status: 'in_progress'
        },
        {
          name: 'TP-002-STM',
          description: 'Steam System - Distribution Network',
          isometricDrawings: [
            {
              drawingNumber: 'ISO-STM-001',
              title: 'Main Steam Header - 8" Distribution',
              revision: 'A',
              crafts: ['insulation'],
              budgetHours: 32,
              status: 'not_started'
            }
          ],
          assignedForeman: users[3]._id,
          status: 'not_started'
        }
      ],
      
      overallProgress: 18
    });

    console.log('Created demo job with comprehensive ICI structure');

    // Create enhanced tasks linked to job structure
    const tasks = await Task.create([
      {
        title: 'Hot Oil Supply Header Insulation - ISO-HOS-001',
        description: 'Install 4" mineral wool insulation on 12" hot oil supply header. Temperature rating 650°F. Include vapor barrier and aluminum jacketing.',
        status: 'completed',
        priority: 'high',
        assignedTo: users[3]._id, // Mike Worker (Foreman)
        createdBy: users[1]._id,  // John Manager
        jobId: job._id,
        projectId: project._id,
        phaseId: job.phases[1]._id.toString(), // Process Unit A
        systemId: job.systems[0]._id.toString(), // Hot Oil System
        areaId: job.areas[0]._id.toString(), // Unit 200A
        testPackageId: job.testPackages[0]._id.toString(),
        isometricDrawingId: job.testPackages[0].isometricDrawings[0]._id.toString(),
        costCode: 'INS-PIPE-CON',
        scheduleOfValuesLineItem: job.scheduleOfValues[0]._id.toString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        estimatedHours: 48,
        actualHours: 46,
        category: 'insulation',
        craft: 'insulation',
        workOrderNumber: 'WO-PP-2024-INS-002-TP001-001',
        tags: ['hot-oil', 'high-temp', 'mineral-wool'],
        completionPercentage: 100,
        unitsToInstall: { quantity: 240, unit: 'LF', description: '12" pipe insulation' },
        unitsInstalled: 240,
        progressReportingMethod: 'units_installed',
        requiresFieldSupervisorApproval: true
      },
      {
        title: 'Hot Oil Return Header Insulation - ISO-HOS-002',
        description: 'Install 3" mineral wool insulation on 10" hot oil return header. Include heat tracing protection and weather barrier.',
        status: 'in_progress',
        priority: 'high',
        assignedTo: users[3]._id, // Mike Worker (Foreman)
        createdBy: users[1]._id,  // John Manager
        jobId: job._id,
        projectId: project._id,
        phaseId: job.phases[1]._id.toString(),
        systemId: job.systems[0]._id.toString(),
        areaId: job.areas[0]._id.toString(),
        testPackageId: job.testPackages[0]._id.toString(),
        isometricDrawingId: job.testPackages[0].isometricDrawings[1]._id.toString(),
        costCode: 'INS-PIPE-CON',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        estimatedHours: 40,
        actualHours: 18,
        category: 'insulation',
        craft: 'insulation',
        workOrderNumber: 'WO-PP-2024-INS-002-TP001-002',
        tags: ['hot-oil', 'heat-tracing', 'return-line'],
        completionPercentage: 45,
        unitsToInstall: { quantity: 180, unit: 'LF', description: '10" pipe insulation' },
        unitsInstalled: 81,
        progressReportingMethod: 'units_installed',
        requiresFieldSupervisorApproval: true
      },
      {
        title: 'Steam Header Preparation - ISO-STM-001',
        description: 'Surface preparation and cleaning for main steam header before insulation installation. Remove old insulation and clean surfaces.',
        status: 'not_started',
        priority: 'medium',
        assignedTo: users[3]._id,
        createdBy: users[2]._id,  // Sarah Supervisor
        jobId: job._id,
        projectId: project._id,
        phaseId: job.phases[1]._id.toString(),
        systemId: job.systems[1]._id.toString(),
        areaId: job.areas[1]._id.toString(),
        testPackageId: job.testPackages[1]._id.toString(),
        costCode: 'PREP-CLEAN',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estimatedHours: 16,
        category: 'preparation',
        craft: 'general',
        workOrderNumber: 'WO-PP-2024-INS-002-TP002-001',
        tags: ['steam-system', 'preparation', 'cleaning'],
        completionPercentage: 0,
        unitsToInstall: { quantity: 150, unit: 'LF', description: '8" steam pipe preparation' },
        progressReportingMethod: 'units_installed',
        requiresFieldSupervisorApproval: true
      },
      {
        title: 'Heat Exchanger Insulation - HX-201A',
        description: 'Install removable insulation blankets on shell and tube heat exchanger HX-201A. Custom fabricated covers with quick-release fasteners.',
        status: 'not_started',
        priority: 'medium',
        assignedTo: users[3]._id,
        createdBy: users[1]._id,
        jobId: job._id,
        projectId: project._id,
        phaseId: job.phases[1]._id.toString(),
        systemId: job.systems[3]._id.toString(), // Heat Exchangers
        areaId: job.areas[0]._id.toString(),
        costCode: 'INS-EQUIP',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedHours: 24,
        category: 'insulation',
        craft: 'insulation',
        workOrderNumber: 'WO-PP-2024-INS-002-HX-001',
        tags: ['heat-exchanger', 'removable', 'custom'],
        completionPercentage: 0,
        unitsToInstall: { quantity: 1, unit: 'EA', description: 'Heat exchanger insulation system' },
        progressReportingMethod: 'percentage',
        requiresFieldSupervisorApproval: true
      },
      {
        title: 'Weekly Safety Inspection - Week 47',
        description: 'Conduct weekly safety inspection of work areas, equipment, and personnel. Document any hazards or non-compliance issues.',
        status: 'not_started',
        priority: 'high',
        assignedTo: users[2]._id, // Sarah Supervisor
        createdBy: users[1]._id,
        jobId: job._id,
        projectId: project._id,
        costCode: 'SAFETY-INSP',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        estimatedHours: 4,
        category: 'safety',
        craft: 'general',
        tags: ['weekly', 'safety', 'inspection'],
        completionPercentage: 0,
        requiresFieldSupervisorApproval: false
      }
    ]);

    console.log('Created demo tasks');

    // Add some task comments/metadata
    for (let task of tasks) {
      if (task.status === 'in_progress' || task.status === 'completed') {
        const comments = [];
        if (task.status === 'in_progress') {
          comments.push({
            userId: task.assignedTo,
            comment: 'Started work on this task. Initial assessment looks good.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          });
        }
        if (task.status === 'completed') {
          comments.push({
            userId: task.assignedTo,
            comment: 'Task completed successfully. All requirements met.',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
          });
        }
        if (!task.metadata) {
          task.metadata = new Map();
        }
        task.metadata.set('comments', comments);
        await task.save();
      }
    }

    console.log('Added task metadata');

    // Create sample time entries for cost code tracking
    const timeEntries = await TimeEntry.create([
      {
        workerId: users[3]._id, // Mike Worker
        jobId: job._id,
        projectId: project._id,
        taskId: tasks[0]._id, // Hot Oil Supply Header
        date: new Date('2024-11-14'),
        regularHours: 8,
        overtimeHours: 2,
        totalHours: 10,
        costCode: 'INS-PIPE-CON',
        costCodeDescription: 'Concealed Pipe Insulation',
        craft: 'insulation',
        category: 'concealed_pipe',
        workDescription: 'Installed mineral wool insulation on 12" hot oil supply header sections 1-4',
        unitsCompleted: { quantity: 120, unit: 'LF', description: '12" pipe insulation completed' },
        status: 'approved',
        approvedBy: users[2]._id,
        approvedAt: new Date('2024-11-14T17:00:00Z'),
        hourlyRate: 35,
        regularCost: 280,
        overtimeCost: 105,
        totalCost: 385,
        location: { area: 'Unit 200A', zone: 'North', building: 'Process Building' },
        entryMethod: 'mobile_app'
      },
      {
        workerId: users[3]._id,
        jobId: job._id,
        projectId: project._id,
        taskId: tasks[0]._id,
        date: new Date('2024-11-15'),
        regularHours: 8,
        totalHours: 8,
        costCode: 'INS-PIPE-CON',
        costCodeDescription: 'Concealed Pipe Insulation',
        craft: 'insulation',
        category: 'concealed_pipe',
        workDescription: 'Completed remaining sections of hot oil supply header insulation and aluminum jacketing',
        unitsCompleted: { quantity: 120, unit: 'LF', description: '12" pipe insulation and jacketing' },
        status: 'approved',
        approvedBy: users[2]._id,
        approvedAt: new Date('2024-11-15T17:00:00Z'),
        hourlyRate: 35,
        regularCost: 280,
        totalCost: 280,
        location: { area: 'Unit 200A', zone: 'North', building: 'Process Building' },
        entryMethod: 'mobile_app'
      },
      {
        workerId: users[3]._id,
        jobId: job._id,
        projectId: project._id,
        taskId: tasks[1]._id, // Hot Oil Return Header
        date: new Date('2024-11-16'),
        regularHours: 6,
        totalHours: 6,
        costCode: 'INS-PIPE-CON',
        costCodeDescription: 'Concealed Pipe Insulation',
        craft: 'insulation',
        category: 'concealed_pipe',
        workDescription: 'Started insulation on hot oil return header, completed heat tracing protection',
        unitsCompleted: { quantity: 81, unit: 'LF', description: '10" pipe insulation in progress' },
        status: 'submitted',
        submittedBy: users[3]._id,
        submittedAt: new Date('2024-11-16T16:30:00Z'),
        hourlyRate: 35,
        regularCost: 210,
        totalCost: 210,
        location: { area: 'Unit 200A', zone: 'North', building: 'Process Building' },
        entryMethod: 'mobile_app'
      }
    ]);

    console.log('Created sample time entries for cost code tracking');

    console.log('\n✅ Database seeded successfully with enhanced ICI contractor data!');
    console.log('\n🏗️ Project Created: Suncor Energy Petrochemical Expansion');
    console.log('📊 Total Contract Value: $8,500,000');
    console.log('\n🔧 Job Created: Process Unit A - Thermal Insulation');
    console.log('💰 Job Value: $2,850,000');
    console.log('⏱️ Total Budget Hours: 5,500');
    console.log('📋 Cost Codes: 8 active cost codes for time tracking');
    console.log('📐 Test Packages: 2 packages with isometric drawings');
    console.log('🎯 Schedule of Values: 3 line items with progress tracking');
    console.log('\n🧑‍💼 Access as Demo User - No authentication required');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('🔧 Backend API: http://localhost:3001');
    console.log('\n📋 Hierarchy: Project → Job → Tasks → Time Entries');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
