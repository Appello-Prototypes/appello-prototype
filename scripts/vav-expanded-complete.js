#!/usr/bin/env node

/**
 * Expanded VAV Dataset - 20+ AP invoices, complete SOV structure, and Progress Reports
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const Module = require('../src/server/models/Module');
const Component = require('../src/server/models/Component');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const APRegister = require('../src/server/models/APRegister');
const ProgressReport = require('../src/server/models/ProgressReport');

const MONGODB_URI = process.env.MONGODB_URI;

async function createExpandedVAVDataset() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const vavJob = await Job.findOne({ jobNumber: 'JOB-2024-001-B' });
    const project = await Project.findById(vavJob.projectId);
    const users = await User.find();
    
    console.log('📋 Creating expanded dataset for:', vavJob.name);
    
    // Get existing systems and areas
    const systems = await System.find({ jobId: vavJob._id });
    const areas = await Area.find({ jobId: vavJob._id });
    const phases = await Phase.find({ jobId: vavJob._id });
    
    // Clear existing complex data
    await Promise.all([
      Module.deleteMany({ jobId: vavJob._id }),
      Component.deleteMany({ jobId: vavJob._id }),
      APRegister.deleteMany({ jobId: vavJob._id }),
      ProgressReport.deleteMany({ jobId: vavJob._id })
    ]);
    
    // 1. CREATE MODULES
    const modules = await Module.create([
      {
        name: 'Standard Pressure VAV Units',
        code: 'SP-VAV',
        description: 'Standard pressure VAV terminal units for floors 1-6',
        jobId: vavJob._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'VAV-ADS')._id,
        areaId: areas.find(a => a.code === 'FL-1-6')._id,
        sortOrder: 1
      },
      {
        name: 'High Pressure VAV Units',
        code: 'HP-VAV',
        description: 'High pressure VAV terminal units for floors 7-12',
        jobId: vavJob._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'VAV-ADS')._id,
        areaId: areas.find(a => a.code === 'FL-7-12')._id,
        sortOrder: 2
      },
      {
        name: 'Supply Ductwork',
        code: 'SUP-DUCT',
        description: 'Supply air ductwork modifications',
        jobId: vavJob._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'DUCT-SYS')._id,
        sortOrder: 3
      },
      {
        name: 'Return Ductwork',
        code: 'RET-DUCT',
        description: 'Return air ductwork modifications',
        jobId: vavJob._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'DUCT-SYS')._id,
        sortOrder: 4
      },
      {
        name: 'VAV Controllers',
        code: 'VAV-CTRL',
        description: 'VAV terminal unit controllers and sensors',
        jobId: vavJob._id,
        projectId: project._id,
        systemId: systems.find(s => s.code === 'CTRL-SYS')._id,
        sortOrder: 5
      }
    ]);
    
    console.log('✅ Created', modules.length, 'modules');
    
    // 2. CREATE COMPONENTS
    const components = await Component.create([
      {
        name: 'VAV Terminal Unit - Standard',
        code: 'VAV-STD',
        description: 'Standard pressure VAV terminal unit with reheat coil',
        jobId: vavJob._id,
        projectId: project._id,
        moduleId: modules.find(m => m.code === 'SP-VAV')._id,
        sortOrder: 1
      },
      {
        name: 'VAV Terminal Unit - High Pressure',
        code: 'VAV-HP',
        description: 'High pressure VAV terminal unit with reheat coil',
        jobId: vavJob._id,
        projectId: project._id,
        moduleId: modules.find(m => m.code === 'HP-VAV')._id,
        sortOrder: 2
      },
      {
        name: 'Supply Duct Connections',
        code: 'SUP-CONN',
        description: 'Supply duct connections and transitions',
        jobId: vavJob._id,
        projectId: project._id,
        moduleId: modules.find(m => m.code === 'SUP-DUCT')._id,
        sortOrder: 3
      },
      {
        name: 'VAV Controller Unit',
        code: 'VAV-CTL-UNIT',
        description: 'Individual VAV controller with sensors',
        jobId: vavJob._id,
        projectId: project._id,
        moduleId: modules.find(m => m.code === 'VAV-CTRL')._id,
        sortOrder: 4
      }
    ]);
    
    console.log('✅ Created', components.length, 'components');
    
    // 3. UPDATE EXISTING SOV TO USE STRUCTURE
    const existingSOV = await ScheduleOfValues.find({ jobId: vavJob._id });
    
    for (const sov of existingSOV) {
      let updateData = {};
      
      if (sov.costCode === 'VAV-UNITS-001') {
        updateData = {
          systemId: systems.find(s => s.code === 'VAV-ADS')._id,
          areaId: areas.find(a => a.code === 'FL-1-6')._id,
          moduleId: modules.find(m => m.code === 'SP-VAV')._id,
          componentId: components.find(c => c.code === 'VAV-STD')._id
        };
      } else if (sov.costCode === 'VAV-UNITS-002') {
        updateData = {
          systemId: systems.find(s => s.code === 'VAV-ADS')._id,
          areaId: areas.find(a => a.code === 'FL-7-12')._id,
          moduleId: modules.find(m => m.code === 'HP-VAV')._id,
          componentId: components.find(c => c.code === 'VAV-HP')._id
        };
      } else if (sov.costCode === 'VAV-DUCT-001') {
        updateData = {
          systemId: systems.find(s => s.code === 'DUCT-SYS')._id,
          moduleId: modules.find(m => m.code === 'SUP-DUCT')._id,
          componentId: components.find(c => c.code === 'SUP-CONN')._id
        };
      } else if (sov.costCode === 'VAV-CTRL-001') {
        updateData = {
          systemId: systems.find(s => s.code === 'CTRL-SYS')._id,
          moduleId: modules.find(m => m.code === 'VAV-CTRL')._id,
          componentId: components.find(c => c.code === 'VAV-CTL-UNIT')._id
        };
      }
      
      await ScheduleOfValues.findByIdAndUpdate(sov._id, updateData);
    }
    
    console.log('✅ Updated', existingSOV.length, 'SOV entries with structure');
    
    // 4. CREATE EXPANDED AP REGISTER (20+ INVOICES)
    const apEntries = await APRegister.create([
      // MARCH 2024 - Project Kickoff
      {
        invoiceNumber: 'JCI-VAV-001-2024',
        invoiceDate: new Date('2024-03-05'),
        dueDate: new Date('2024-04-04'),
        receivedDate: new Date('2024-03-07'),
        vendor: {
          name: 'Johnson Controls International',
          vendorNumber: 'VEND-JCI-001',
          address: '5757 North Green Bay Avenue, Milwaukee, WI 53209',
          phone: '414-524-1200',
          email: 'billing@jci.com'
        },
        invoiceAmount: 85500.00,
        taxAmount: 6840.00,
        totalAmount: 92340.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - Standard Pressure (24 units) - First delivery',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-001',
          amount: 92340.00,
          description: 'Standard pressure VAV units with controls'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-03-28'),
        checkNumber: 'CHK-2024-0847'
      },
      {
        invoiceNumber: 'MDF-DUCT-001-2024',
        invoiceDate: new Date('2024-03-12'),
        dueDate: new Date('2024-04-11'),
        receivedDate: new Date('2024-03-14'),
        vendor: {
          name: 'Metro Ductwork Fabrication',
          vendorNumber: 'VEND-MDF-002',
          address: '1850 Industrial Blvd, Queens, NY 11101',
          phone: '718-555-0123',
          email: 'billing@metroduct.com'
        },
        invoiceAmount: 28500.00,
        taxAmount: 2280.00,
        totalAmount: 30780.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Supply ductwork modifications - Floors 1-3',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 30780.00,
          description: 'Supply ductwork fabrication and installation'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-05'),
        checkNumber: 'CHK-2024-0863'
      },
      {
        invoiceNumber: 'HSS-CRANE-001-2024',
        invoiceDate: new Date('2024-03-18'),
        dueDate: new Date('2024-04-17'),
        receivedDate: new Date('2024-03-20'),
        vendor: {
          name: 'Heavy Lift Services LLC',
          vendorNumber: 'VEND-HLS-010',
          address: '2400 Crane Way, Industrial Zone, NY 11102',
          phone: '718-555-0456',
          email: 'billing@heavylift.com'
        },
        invoiceAmount: 4800.00,
        taxAmount: 384.00,
        totalAmount: 5184.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CRANE-001',
        description: 'Crane services for VAV unit installation - Week 1',
        costCodeBreakdown: [{
          costCode: 'VAV-CRANE-001',
          amount: 5184.00,
          description: 'Mobile crane rental - 2 days'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-10'),
        checkNumber: 'CHK-2024-0851'
      },
      {
        invoiceNumber: 'SES-SAFETY-001-2024',
        invoiceDate: new Date('2024-03-22'),
        dueDate: new Date('2024-04-21'),
        receivedDate: new Date('2024-03-25'),
        vendor: {
          name: 'Safety Equipment Solutions',
          vendorNumber: 'VEND-SES-011',
          address: '800 Safety Drive, Protection Plaza, NY 10003',
          phone: '212-555-0987',
          email: 'orders@safetyequip.com'
        },
        invoiceAmount: 2850.00,
        taxAmount: 228.00,
        totalAmount: 3078.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-SAFETY-001',
        description: 'Safety equipment and fall protection gear',
        costCodeBreakdown: [{
          costCode: 'VAV-SAFETY-001',
          amount: 3078.00,
          description: 'Harnesses, hard hats, safety barriers'
        }],
        invoiceType: 'material',
        category: 'safety',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-15'),
        checkNumber: 'CHK-2024-0856'
      },
      
      // APRIL 2024 - Peak Installation
      {
        invoiceNumber: 'JCI-VAV-002-2024',
        invoiceDate: new Date('2024-04-08'),
        dueDate: new Date('2024-05-08'),
        receivedDate: new Date('2024-04-10'),
        vendor: {
          name: 'Johnson Controls International',
          vendorNumber: 'VEND-JCI-001'
        },
        invoiceAmount: 42750.00,
        taxAmount: 3420.00,
        totalAmount: 46170.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - Standard Pressure (24 units) - Second delivery',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-001',
          amount: 46170.00,
          description: 'Completion of standard pressure units'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-25')
      },
      {
        invoiceNumber: 'MDF-DUCT-002-2024',
        invoiceDate: new Date('2024-04-12'),
        dueDate: new Date('2024-05-12'),
        receivedDate: new Date('2024-04-15'),
        vendor: {
          name: 'Metro Ductwork Fabrication',
          vendorNumber: 'VEND-MDF-002'
        },
        invoiceAmount: 32400.00,
        taxAmount: 2592.00,
        totalAmount: 34992.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Supply ductwork modifications - Floors 4-6',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 34992.00,
          description: 'Supply ductwork - Upper floors phase'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-05-05'),
        checkNumber: 'CHK-2024-0871'
      },
      {
        invoiceNumber: 'ABC-CTRL-001-2024',
        invoiceDate: new Date('2024-04-15'),
        dueDate: new Date('2024-05-15'),
        receivedDate: new Date('2024-04-17'),
        vendor: {
          name: 'Advanced Building Controls',
          vendorNumber: 'VEND-ABC-003',
          address: '2200 Tech Drive, Automation Park, NJ 07070',
          phone: '201-555-0456',
          email: 'billing@advancedcontrols.com'
        },
        invoiceAmount: 18900.00,
        taxAmount: 1512.00,
        totalAmount: 20412.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Controllers - Standard pressure units (24 units)',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 20412.00,
          description: 'Controllers and sensors - Standard units'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-30')
      },
      {
        invoiceNumber: 'HSS-CRANE-002-2024',
        invoiceDate: new Date('2024-04-20'),
        dueDate: new Date('2024-05-20'),
        receivedDate: new Date('2024-04-22'),
        vendor: {
          name: 'Heavy Lift Services LLC',
          vendorNumber: 'VEND-HLS-010'
        },
        invoiceAmount: 3600.00,
        taxAmount: 288.00,
        totalAmount: 3888.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CRANE-001',
        description: 'Crane services - Upper floor installations',
        costCodeBreakdown: [{
          costCode: 'VAV-CRANE-001',
          amount: 3888.00,
          description: 'Crane rental - Upper floors'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-05-10'),
        checkNumber: 'CHK-2024-0879'
      },
      {
        invoiceNumber: 'IMS-INSUL-001-2024',
        invoiceDate: new Date('2024-04-25'),
        dueDate: new Date('2024-05-25'),
        receivedDate: new Date('2024-04-27'),
        vendor: {
          name: 'Industrial Mechanical Supply',
          vendorNumber: 'VEND-IMS-012',
          address: '1200 Supply Chain Blvd, Warehouse District, NY 11103',
          phone: '718-555-0654',
          email: 'invoicing@indmechsupply.com'
        },
        invoiceAmount: 8750.00,
        taxAmount: 700.00,
        totalAmount: 9450.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-INSUL-001',
        description: 'Insulation materials for VAV connections',
        costCodeBreakdown: [{
          costCode: 'VAV-INSUL-001',
          amount: 9450.00,
          description: 'Fiberglass insulation and vapor barriers'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-15')
      },
      
      // MAY 2024 - High Pressure Phase
      {
        invoiceNumber: 'JCI-VAV-003-2024',
        invoiceDate: new Date('2024-05-06'),
        dueDate: new Date('2024-06-05'),
        receivedDate: new Date('2024-05-08'),
        vendor: {
          name: 'Johnson Controls International',
          vendorNumber: 'VEND-JCI-001'
        },
        invoiceAmount: 57600.00,
        taxAmount: 4608.00,
        totalAmount: 62208.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-002',
        description: 'High Pressure VAV Units - First batch (18 units)',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-002',
          amount: 62208.00,
          description: 'High pressure VAV units - First delivery'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'JCI-VAV-004-2024',
        invoiceDate: new Date('2024-05-20'),
        dueDate: new Date('2024-06-19'),
        receivedDate: new Date('2024-05-22'),
        vendor: {
          name: 'Johnson Controls International',
          vendorNumber: 'VEND-JCI-001'
        },
        invoiceAmount: 57600.00,
        taxAmount: 4608.00,
        totalAmount: 62208.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-002',
        description: 'High Pressure VAV Units - Second batch (18 units)',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-002',
          amount: 62208.00,
          description: 'High pressure VAV units - Final delivery'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'MDF-DUCT-003-2024',
        invoiceDate: new Date('2024-05-10'),
        dueDate: new Date('2024-06-09'),
        receivedDate: new Date('2024-05-12'),
        vendor: {
          name: 'Metro Ductwork Fabrication',
          vendorNumber: 'VEND-MDF-002'
        },
        invoiceAmount: 38700.00,
        taxAmount: 3096.00,
        totalAmount: 41796.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Return ductwork modifications - Floors 7-12',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 41796.00,
          description: 'Return air ductwork - Upper floors'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-25')
      },
      {
        invoiceNumber: 'ABC-CTRL-002-2024',
        invoiceDate: new Date('2024-05-15'),
        dueDate: new Date('2024-06-14'),
        receivedDate: new Date('2024-05-17'),
        vendor: {
          name: 'Advanced Building Controls',
          vendorNumber: 'VEND-ABC-003'
        },
        invoiceAmount: 23400.00,
        taxAmount: 1872.00,
        totalAmount: 25272.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Controllers - High pressure units (18 units)',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 25272.00,
          description: 'Controllers and sensors - High pressure units'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-30')
      },
      {
        invoiceNumber: 'STS-LABOR-001-2024',
        invoiceDate: new Date('2024-05-01'),
        dueDate: new Date('2024-05-31'),
        receivedDate: new Date('2024-05-03'),
        vendor: {
          name: 'Skilled Trades Staffing',
          vendorNumber: 'VEND-STS-004',
          address: '400 Union Hall St, Trade Center, NY 10001',
          phone: '212-555-0789',
          email: 'payroll@skilledtrades.com'
        },
        invoiceAmount: 28800.00,
        taxAmount: 0.00,
        totalAmount: 28800.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-LABOR-001',
        description: 'HVAC technician labor - April 2024 (384 hours)',
        costCodeBreakdown: [{
          costCode: 'VAV-LABOR-001',
          amount: 28800.00,
          description: 'Skilled HVAC labor - 384 hours @ $75/hr'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-20')
      },
      {
        invoiceNumber: 'TSI-TOOLS-001-2024',
        invoiceDate: new Date('2024-05-08'),
        dueDate: new Date('2024-06-07'),
        receivedDate: new Date('2024-05-10'),
        vendor: {
          name: 'Tool Supply Inc.',
          vendorNumber: 'VEND-TSI-005',
          address: '950 Equipment Way, Tool District, NY 10002',
          phone: '212-555-0321',
          email: 'billing@toolsupply.com'
        },
        invoiceAmount: 3250.00,
        taxAmount: 260.00,
        totalAmount: 3510.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-TOOLS-001',
        description: 'Specialized VAV installation tools - Month 2',
        costCodeBreakdown: [{
          costCode: 'VAV-TOOLS-001',
          amount: 3510.00,
          description: 'Torque wrenches, duct blasters, flow meters'
        }],
        invoiceType: 'equipment',
        category: 'tools',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-05-28'),
        checkNumber: 'CHK-2024-0885'
      },
      {
        invoiceNumber: 'ETS-TESTING-001-2024',
        invoiceDate: new Date('2024-05-18'),
        dueDate: new Date('2024-06-17'),
        receivedDate: new Date('2024-05-20'),
        vendor: {
          name: 'Environmental Testing Services',
          vendorNumber: 'VEND-ETS-013',
          address: '1600 Testing Lane, Quality District, NY 10004',
          phone: '212-555-0147',
          email: 'billing@envtesting.com'
        },
        invoiceAmount: 5400.00,
        taxAmount: 432.00,
        totalAmount: 5832.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-TEST-001',
        description: 'Air flow testing and balancing - Phase 1',
        costCodeBreakdown: [{
          costCode: 'VAV-TEST-001',
          amount: 5832.00,
          description: 'TAB services - Standard pressure units'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-06-01')
      },
      {
        invoiceNumber: 'IMS-INSUL-002-2024',
        invoiceDate: new Date('2024-05-22'),
        dueDate: new Date('2024-06-21'),
        receivedDate: new Date('2024-05-24'),
        vendor: {
          name: 'Industrial Mechanical Supply',
          vendorNumber: 'VEND-IMS-012'
        },
        invoiceAmount: 6750.00,
        taxAmount: 540.00,
        totalAmount: 7290.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-INSUL-001',
        description: 'Additional insulation materials - Upper floors',
        costCodeBreakdown: [{
          costCode: 'VAV-INSUL-001',
          amount: 7290.00,
          description: 'Insulation and jacketing - Upper floors'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'STS-LABOR-002-2024',
        invoiceDate: new Date('2024-05-25'),
        dueDate: new Date('2024-06-24'),
        receivedDate: new Date('2024-05-27'),
        vendor: {
          name: 'Skilled Trades Staffing',
          vendorNumber: 'VEND-STS-004'
        },
        invoiceAmount: 36000.00,
        taxAmount: 0.00,
        totalAmount: 36000.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-LABOR-001',
        description: 'HVAC technician labor - May 2024 (480 hours)',
        costCodeBreakdown: [{
          costCode: 'VAV-LABOR-001',
          amount: 36000.00,
          description: 'Skilled HVAC labor - 480 hours @ $75/hr'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      
      // ADDITIONAL COMPLEXITY - Subcontractors and Materials
      {
        invoiceNumber: 'PCS-ELEC-001-2024',
        invoiceDate: new Date('2024-03-28'),
        dueDate: new Date('2024-04-27'),
        receivedDate: new Date('2024-03-30'),
        vendor: {
          name: 'Premier Control Systems',
          vendorNumber: 'VEND-PCS-014',
          address: '3300 Electrical Way, Controls Park, NJ 07071',
          phone: '201-555-0852',
          email: 'billing@premiercontrols.com'
        },
        invoiceAmount: 12600.00,
        taxAmount: 1008.00,
        totalAmount: 13608.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-ELEC-001',
        description: 'Electrical connections and control wiring',
        costCodeBreakdown: [{
          costCode: 'VAV-ELEC-001',
          amount: 13608.00,
          description: 'Control wiring and electrical connections'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-20'),
        checkNumber: 'CHK-2024-0867'
      },
      {
        invoiceNumber: 'HSM-HANGERS-001-2024',
        invoiceDate: new Date('2024-04-02'),
        dueDate: new Date('2024-05-02'),
        receivedDate: new Date('2024-04-04'),
        vendor: {
          name: 'HVAC Support & Mounting',
          vendorNumber: 'VEND-HSM-015',
          address: '750 Support Street, Hardware Hub, NY 11104',
          phone: '718-555-0369',
          email: 'orders@hvacsupport.com'
        },
        invoiceAmount: 4950.00,
        taxAmount: 396.00,
        totalAmount: 5346.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-HANG-001',
        description: 'VAV unit hangers and mounting hardware',
        costCodeBreakdown: [{
          costCode: 'VAV-HANG-001',
          amount: 5346.00,
          description: 'Structural hangers and mounting brackets'
        }],
        invoiceType: 'material',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-25'),
        checkNumber: 'CHK-2024-0873'
      },
      {
        invoiceNumber: 'DFS-DAMPER-001-2024',
        invoiceDate: new Date('2024-04-18'),
        dueDate: new Date('2024-05-18'),
        receivedDate: new Date('2024-04-20'),
        vendor: {
          name: 'Damper & Fire Safety Corp',
          vendorNumber: 'VEND-DFS-016',
          address: '2100 Fire Safety Blvd, Protection Plaza, NY 10005',
          phone: '212-555-0741',
          email: 'billing@dampersafety.com'
        },
        invoiceAmount: 7800.00,
        taxAmount: 624.00,
        totalAmount: 8424.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DAMPER-001',
        description: 'Fire dampers and smoke control integration',
        costCodeBreakdown: [{
          costCode: 'VAV-DAMPER-001',
          amount: 8424.00,
          description: 'Fire dampers and actuators'
        }],
        invoiceType: 'equipment',
        category: 'safety',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-10')
      },
      {
        invoiceNumber: 'CCS-COMM-001-2024',
        invoiceDate: new Date('2024-05-28'),
        dueDate: new Date('2024-06-27'),
        receivedDate: new Date('2024-05-30'),
        vendor: {
          name: 'Commercial Commissioning Services',
          vendorNumber: 'VEND-CCS-017',
          address: '1800 Commissioning Court, Testing Town, NJ 07072',
          phone: '201-555-0963',
          email: 'invoices@commcommissioning.com'
        },
        invoiceAmount: 8500.00,
        taxAmount: 680.00,
        totalAmount: 9180.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-COMM-001',
        description: 'Commissioning services - Phase 1 preparation',
        costCodeBreakdown: [{
          costCode: 'VAV-COMM-001',
          amount: 9180.00,
          description: 'Pre-commissioning and documentation'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      
      // ADDITIONAL VENDORS AND COMPLEXITY
      {
        invoiceNumber: 'MTS-MATERIAL-001-2024',
        invoiceDate: new Date('2024-04-05'),
        dueDate: new Date('2024-05-05'),
        receivedDate: new Date('2024-04-07'),
        vendor: {
          name: 'Mechanical Trade Supply',
          vendorNumber: 'VEND-MTS-018',
          address: '500 Trade Supply Ave, Industrial Park, NY 11105',
          phone: '718-555-0258',
          email: 'accounts@mechtrade.com'
        },
        invoiceAmount: 3780.00,
        taxAmount: 302.40,
        totalAmount: 4082.40,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-MISC-001',
        description: 'Miscellaneous materials and hardware',
        costCodeBreakdown: [{
          costCode: 'VAV-MISC-001',
          amount: 4082.40,
          description: 'Fasteners, gaskets, and miscellaneous hardware'
        }],
        invoiceType: 'material',
        category: 'other',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-28'),
        checkNumber: 'CHK-2024-0876'
      },
      {
        invoiceNumber: 'ERS-EQUIP-001-2024',
        invoiceDate: new Date('2024-04-22'),
        dueDate: new Date('2024-05-22'),
        receivedDate: new Date('2024-04-24'),
        vendor: {
          name: 'Equipment Rental Solutions',
          vendorNumber: 'VEND-ERS-019',
          address: '1400 Rental Row, Equipment Zone, NY 11106',
          phone: '718-555-0147',
          email: 'billing@equiprental.com'
        },
        invoiceAmount: 5600.00,
        taxAmount: 448.00,
        totalAmount: 6048.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-EQUIP-001',
        description: 'Lift equipment and specialized tools rental',
        costCodeBreakdown: [{
          costCode: 'VAV-EQUIP-001',
          amount: 6048.00,
          description: 'Scissor lifts and installation equipment'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-15')
      },
      
      // JUNE 2024 - Final Phase Preparation
      {
        invoiceNumber: 'ABC-CTRL-003-2024',
        invoiceDate: new Date('2024-06-03'),
        dueDate: new Date('2024-07-03'),
        receivedDate: new Date('2024-06-05'),
        vendor: {
          name: 'Advanced Building Controls',
          vendorNumber: 'VEND-ABC-003'
        },
        invoiceAmount: 15750.00,
        taxAmount: 1260.00,
        totalAmount: 17010.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'Final controller batch and programming software',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 17010.00,
          description: 'Remaining controllers and software licenses'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'ETS-TESTING-002-2024',
        invoiceDate: new Date('2024-06-10'),
        dueDate: new Date('2024-07-10'),
        receivedDate: new Date('2024-06-12'),
        vendor: {
          name: 'Environmental Testing Services',
          vendorNumber: 'VEND-ETS-013'
        },
        invoiceAmount: 7200.00,
        taxAmount: 576.00,
        totalAmount: 7776.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-TEST-001',
        description: 'Comprehensive air flow testing - High pressure units',
        costCodeBreakdown: [{
          costCode: 'VAV-TEST-001',
          amount: 7776.00,
          description: 'TAB services - High pressure units'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'SES-SAFETY-002-2024',
        invoiceDate: new Date('2024-06-01'),
        dueDate: new Date('2024-06-31'),
        receivedDate: new Date('2024-06-03'),
        vendor: {
          name: 'Safety Equipment Solutions',
          vendorNumber: 'VEND-SES-011'
        },
        invoiceAmount: 1850.00,
        taxAmount: 148.00,
        totalAmount: 1998.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-SAFETY-001',
        description: 'Additional safety equipment for upper floor work',
        costCodeBreakdown: [{
          costCode: 'VAV-SAFETY-001',
          amount: 1998.00,
          description: 'Safety harnesses and fall protection'
        }],
        invoiceType: 'material',
        category: 'safety',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      
      // OVERHEAD AND ADMINISTRATIVE
      {
        invoiceNumber: 'OFC-ADMIN-001-2024',
        invoiceDate: new Date('2024-05-31'),
        dueDate: new Date('2024-06-30'),
        receivedDate: new Date('2024-06-02'),
        vendor: {
          name: 'Office Administrative Services',
          vendorNumber: 'VEND-OAS-020',
          address: '100 Admin Plaza, Business District, NY 10006',
          phone: '212-555-0456',
          email: 'billing@officeadmin.com'
        },
        invoiceAmount: 2400.00,
        taxAmount: 192.00,
        totalAmount: 2592.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-ADMIN-001',
        description: 'Project administration and documentation services',
        costCodeBreakdown: [{
          costCode: 'VAV-ADMIN-001',
          amount: 2592.00,
          description: 'Administrative support and documentation'
        }],
        invoiceType: 'other',
        category: 'overhead',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-06-15')
      },
      {
        invoiceNumber: 'TRS-TRANSPORT-001-2024',
        invoiceDate: new Date('2024-04-30'),
        dueDate: new Date('2024-05-30'),
        receivedDate: new Date('2024-05-02'),
        vendor: {
          name: 'Transportation & Logistics LLC',
          vendorNumber: 'VEND-TRL-021',
          address: '2500 Logistics Lane, Shipping Center, NJ 07073',
          phone: '201-555-0741',
          email: 'billing@translogistics.com'
        },
        invoiceAmount: 3200.00,
        taxAmount: 256.00,
        totalAmount: 3456.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-TRANS-001',
        description: 'Equipment transportation and delivery coordination',
        costCodeBreakdown: [{
          costCode: 'VAV-TRANS-001',
          amount: 3456.00,
          description: 'Transportation and logistics services'
        }],
        invoiceType: 'other',
        category: 'overhead',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-05-20'),
        checkNumber: 'CHK-2024-0881'
      },
      {
        invoiceNumber: 'QCS-QUALITY-001-2024',
        invoiceDate: new Date('2024-05-12'),
        dueDate: new Date('2024-06-11'),
        receivedDate: new Date('2024-05-14'),
        vendor: {
          name: 'Quality Control Specialists',
          vendorNumber: 'VEND-QCS-022',
          address: '900 Quality Circle, Inspection District, NY 10007',
          phone: '212-555-0852',
          email: 'billing@qualitycontrol.com'
        },
        invoiceAmount: 4500.00,
        taxAmount: 360.00,
        totalAmount: 4860.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-QC-001',
        description: 'Quality control inspections and documentation',
        costCodeBreakdown: [{
          costCode: 'VAV-QC-001',
          amount: 4860.00,
          description: 'QC inspections and compliance documentation'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-28')
      }
    ]);
    
    console.log('✅ Created', apEntries.length, 'comprehensive AP Register entries');
    
    // 5. CREATE PROGRESS REPORTS
    const progressReports = await ProgressReport.create([
      // March 2024 Progress Report
      {
        reportNumber: 'PR-VAV-2024-03',
        reportDate: new Date('2024-03-31'),
        reportPeriodStart: new Date('2024-03-01'),
        reportPeriodEnd: new Date('2024-03-31'),
        jobId: vavJob._id,
        projectId: project._id,
        lineItems: [
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-UNITS-001')._id,
            lineNumber: '001',
            costCode: 'VAV-UNITS-001',
            description: 'VAV Terminal Units - Standard Pressure',
            totalContractValue: 171000,
            previouslyCompleted: 0,
            completedThisPeriod: 85500,
            totalCompleted: 85500,
            percentComplete: 50,
            balanceToFinish: 85500
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-DUCT-001')._id,
            lineNumber: '003',
            costCode: 'VAV-DUCT-001',
            description: 'Ductwork Modifications and Connections',
            totalContractValue: 140400,
            previouslyCompleted: 0,
            completedThisPeriod: 30780,
            totalCompleted: 30780,
            percentComplete: 22,
            balanceToFinish: 109620
          }
        ],
        totalScheduledValue: 311400,
        totalPreviouslyCompleted: 0,
        totalCompletedThisPeriod: 116280,
        totalCompleted: 116280,
        overallPercentComplete: 37,
        totalBalanceToFinish: 195120,
        totalRetainage: 11628,
        weatherDays: 2,
        workingDays: 21,
        manHoursThisPeriod: 504,
        cumulativeManHours: 504,
        safetyIncidents: 0,
        qualityIssues: 0,
        scheduleVariance: 2,
        costVariance: -1500,
        reportedBy: users.find(u => u.role === 'field_supervisor')._id,
        reviewedBy: users.find(u => u.role === 'project_manager')._id,
        status: 'approved',
        notes: 'Excellent progress on standard pressure VAV units. Ahead of schedule due to favorable weather and strong team performance.'
      },
      
      // April 2024 Progress Report
      {
        reportNumber: 'PR-VAV-2024-04',
        reportDate: new Date('2024-04-30'),
        reportPeriodStart: new Date('2024-04-01'),
        reportPeriodEnd: new Date('2024-04-30'),
        jobId: vavJob._id,
        projectId: project._id,
        lineItems: [
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-UNITS-001')._id,
            lineNumber: '001',
            costCode: 'VAV-UNITS-001',
            description: 'VAV Terminal Units - Standard Pressure',
            totalContractValue: 171000,
            previouslyCompleted: 85500,
            completedThisPeriod: 42750,
            totalCompleted: 128250,
            percentComplete: 75,
            balanceToFinish: 42750
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-DUCT-001')._id,
            lineNumber: '003',
            costCode: 'VAV-DUCT-001',
            description: 'Ductwork Modifications and Connections',
            totalContractValue: 140400,
            previouslyCompleted: 30780,
            completedThisPeriod: 34992,
            totalCompleted: 65772,
            percentComplete: 47,
            balanceToFinish: 74628
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-CTRL-001')._id,
            lineNumber: '004',
            costCode: 'VAV-CTRL-001',
            description: 'VAV Control Systems and Wiring',
            totalContractValue: 96390,
            previouslyCompleted: 0,
            completedThisPeriod: 20412,
            totalCompleted: 20412,
            percentComplete: 21,
            balanceToFinish: 75978
          }
        ],
        totalScheduledValue: 407790,
        totalPreviouslyCompleted: 116280,
        totalCompletedThisPeriod: 98154,
        totalCompleted: 214434,
        overallPercentComplete: 53,
        totalBalanceToFinish: 193356,
        totalRetainage: 21443,
        weatherDays: 3,
        workingDays: 20,
        manHoursThisPeriod: 640,
        cumulativeManHours: 1144,
        safetyIncidents: 1,
        qualityIssues: 0,
        scheduleVariance: 1,
        costVariance: -2300,
        reportedBy: users.find(u => u.role === 'field_supervisor')._id,
        reviewedBy: users.find(u => u.role === 'project_manager')._id,
        status: 'approved',
        notes: 'Strong progress on ductwork modifications. Minor safety incident (slip, no injury) on 4/18. Control system installation commenced ahead of schedule.'
      },
      
      // May 2024 Progress Report
      {
        reportNumber: 'PR-VAV-2024-05',
        reportDate: new Date('2024-05-31'),
        reportPeriodStart: new Date('2024-05-01'),
        reportPeriodEnd: new Date('2024-05-31'),
        jobId: vavJob._id,
        projectId: project._id,
        lineItems: [
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-UNITS-001')._id,
            lineNumber: '001',
            costCode: 'VAV-UNITS-001',
            description: 'VAV Terminal Units - Standard Pressure',
            totalContractValue: 171000,
            previouslyCompleted: 128250,
            completedThisPeriod: 0,
            totalCompleted: 128250,
            percentComplete: 75,
            balanceToFinish: 42750
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-UNITS-002')._id,
            lineNumber: '002',
            costCode: 'VAV-UNITS-002',
            description: 'VAV Terminal Units - High Pressure',
            totalContractValue: 144000,
            previouslyCompleted: 0,
            completedThisPeriod: 62208,
            totalCompleted: 62208,
            percentComplete: 43,
            balanceToFinish: 81792
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-DUCT-001')._id,
            lineNumber: '003',
            costCode: 'VAV-DUCT-001',
            description: 'Ductwork Modifications and Connections',
            totalContractValue: 140400,
            previouslyCompleted: 65772,
            completedThisPeriod: 41796,
            totalCompleted: 107568,
            percentComplete: 77,
            balanceToFinish: 32832
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-CTRL-001')._id,
            lineNumber: '004',
            costCode: 'VAV-CTRL-001',
            description: 'VAV Control Systems and Wiring',
            totalContractValue: 96390,
            previouslyCompleted: 20412,
            completedThisPeriod: 25272,
            totalCompleted: 45684,
            percentComplete: 47,
            balanceToFinish: 50706
          }
        ],
        totalScheduledValue: 551790,
        totalPreviouslyCompleted: 214434,
        totalCompletedThisPeriod: 129276,
        totalCompleted: 343710,
        overallPercentComplete: 62,
        totalBalanceToFinish: 208080,
        totalRetainage: 34371,
        weatherDays: 4,
        workingDays: 19,
        manHoursThisPeriod: 608,
        cumulativeManHours: 1752,
        safetyIncidents: 0,
        qualityIssues: 2,
        scheduleVariance: 0,
        costVariance: -1200,
        reportedBy: users.find(u => u.role === 'field_supervisor')._id,
        reviewedBy: users.find(u => u.role === 'project_manager')._id,
        status: 'submitted',
        notes: 'Significant progress on high pressure VAV units. Two quality issues identified with controller calibration - resolved with vendor support. Project remains on schedule and under budget.'
      }
    ]);
    
    console.log('✅ Created', progressReports.length, 'comprehensive progress reports');
    
    console.log('\n🎉 Expanded VAV dataset creation completed!');
    console.log('\n📊 COMPREHENSIVE SUMMARY:');
    console.log('🔧 Job:', vavJob.name);
    console.log('💰 Contract Value: $' + vavJob.contractValue.toLocaleString());
    console.log('📋 Systems:', systems.length);
    console.log('🏢 Areas:', areas.length);
    console.log('📅 Phases:', phases.length);
    console.log('🔧 Modules:', modules.length);
    console.log('⚙️ Components:', components.length);
    console.log('📄 AP Register:', apEntries.length, 'invoices');
    console.log('📈 Progress Reports:', progressReports.length, 'monthly reports');
    
    console.log('\n🎯 ENHANCED FUNCTIONALITY:');
    console.log('• Complete SOV hierarchy with Systems/Areas/Modules/Components');
    console.log('• 20+ vendor invoices with diverse categories');
    console.log('• Monthly progress reports with variance tracking');
    console.log('• Comprehensive cost code structure');
    console.log('• Realistic 3-month project progression');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

createExpandedVAVDataset();
