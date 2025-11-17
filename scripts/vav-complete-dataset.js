#!/usr/bin/env node

/**
 * Complete VAV Terminal Installation Job Dataset
 * Creates SOV setup, AP Register, and Timelog Register data
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const Module = require('../src/server/models/Module');
const Component = require('../src/server/models/Component');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/appello-tasks';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

async function createVAVCompleteDataset() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('✅ Connected to MongoDB', colors.green);
    
    // Get the VAV job and related data
    const vavJob = await Job.findOne({ jobNumber: 'JOB-2024-001-B' });
    const project = await Project.findById(vavJob.projectId);
    const users = await User.find();
    
    if (!vavJob) {
      log('❌ VAV job not found');
      return;
    }
    
    log('📋 Creating complete dataset for: ' + vavJob.name, colors.blue);
    
    // Clear existing SOV setup and register data
    await Promise.all([
      System.deleteMany({ jobId: vavJob._id }),
      Area.deleteMany({ jobId: vavJob._id }),
      Phase.deleteMany({ jobId: vavJob._id }),
      Module.deleteMany({ jobId: vavJob._id }),
      Component.deleteMany({ jobId: vavJob._id }),
      APRegister.deleteMany({ jobId: vavJob._id }),
      TimelogRegister.deleteMany({ jobId: vavJob._id })
    ]);
    
    log('🧹 Cleared existing data', colors.yellow);
    
    // 1. CREATE SOV SETUP - SYSTEMS
    const systems = await System.create([
      {
        name: 'VAV Air Distribution System',
        code: 'VAV-ADS',
        description: 'Variable Air Volume terminal units and distribution system',
        jobId: vavJob._id,
        projectId: project._id,
        sortOrder: 1
      },
      {
        name: 'Ductwork and Connections',
        code: 'DUCT-SYS',
        description: 'Ductwork modifications and VAV unit connections',
        jobId: vavJob._id,
        projectId: project._id,
        sortOrder: 2
      },
      {
        name: 'Control Systems',
        code: 'CTRL-SYS',
        description: 'VAV control systems and building automation integration',
        jobId: vavJob._id,
        projectId: project._id,
        sortOrder: 3
      }
    ]);
    
    log('✅ Created ' + systems.length + ' systems', colors.green);
    
    // 2. CREATE SOV SETUP - AREAS
    const areas = await Area.create([
      {
        name: 'Lower Floors (1-6)',
        code: 'FLOOR-1-6',
        description: 'Office floors 1 through 6',
        jobId: vavJob._id,
        projectId: project._id,
        floor: '1-6',
        zone: 'Lower Zone',
        building: 'Metropolitan Tower'
      },
      {
        name: 'Upper Floors (7-12)',
        code: 'FLOOR-7-12',
        description: 'Office floors 7 through 12',
        jobId: vavJob._id,
        projectId: project._id,
        floor: '7-12',
        zone: 'Upper Zone',
        building: 'Metropolitan Tower'
      },
      {
        name: 'Mechanical Rooms',
        code: 'MECH-RM',
        description: 'Mechanical equipment rooms and shafts',
        jobId: vavJob._id,
        projectId: project._id,
        floor: 'Basement/Roof',
        zone: 'Mechanical Zone',
        building: 'Metropolitan Tower'
      }
    ]);
    
    log('✅ Created ' + areas.length + ' areas', colors.green);
    
    // 3. CREATE SOV SETUP - PHASES
    const phases = await Phase.create([
      {
        name: 'Phase 1 - Preparation',
        code: 'PHASE-1',
        description: 'Site preparation and existing equipment removal',
        jobId: vavJob._id,
        projectId: project._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31'),
        status: 'completed'
      },
      {
        name: 'Phase 2 - Installation',
        code: 'PHASE-2',
        description: 'VAV unit installation and ductwork connections',
        jobId: vavJob._id,
        projectId: project._id,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-05-31'),
        status: 'in_progress'
      },
      {
        name: 'Phase 3 - Controls & Testing',
        code: 'PHASE-3',
        description: 'Control system installation and commissioning',
        jobId: vavJob._id,
        projectId: project._id,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        status: 'not_started'
      }
    ]);
    
    log('✅ Created ' + phases.length + ' phases', colors.green);
    
    // 4. CREATE ROBUST AP REGISTER
    const apEntries = await APRegister.create([
      // March 2024 - Equipment deliveries
      {
        invoiceNumber: 'JC-VAV-001-2024',
        invoiceDate: new Date('2024-03-05'),
        dueDate: new Date('2024-04-04'),
        receivedDate: new Date('2024-03-07'),
        vendor: {
          name: 'Johnson Controls International',
          vendorNumber: 'VEND-JCI-001',
          address: '5757 North Green Bay Avenue, Milwaukee, WI 53209',
          phone: '414-524-1200',
          email: 'commercial.billing@jci.com'
        },
        invoiceAmount: 85500.00,
        taxAmount: 6840.00,
        totalAmount: 92340.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - Standard Pressure (24 units) - First Delivery',
        costCodeBreakdown: [
          {
            costCode: 'VAV-UNITS-001',
            amount: 92340.00,
            description: 'VAV Terminal Units with controls - Standard pressure rated'
          }
        ],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-03-28'),
        checkNumber: 'CHK-2024-0847',
        retentionAmount: 4617.00,
        netPayment: 87723.00
      },
      {
        invoiceNumber: 'MDF-2024-0312',
        invoiceDate: new Date('2024-03-12'),
        dueDate: new Date('2024-04-11'),
        receivedDate: new Date('2024-03-14'),
        vendor: {
          name: 'Metropolitan Ductwork Fabrication',
          vendorNumber: 'VEND-MDF-002',
          address: '1850 Industrial Boulevard, Queens, NY 11101',
          phone: '718-555-0123',
          email: 'billing@metroductwork.com'
        },
        invoiceAmount: 42120.00,
        taxAmount: 3369.60,
        totalAmount: 45489.60,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Custom ductwork modifications for VAV connections - Phase 1',
        costCodeBreakdown: [
          {
            costCode: 'VAV-DUCT-001',
            amount: 45489.60,
            description: 'Ductwork fabrication and installation materials'
          }
        ],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-05'),
        checkNumber: 'CHK-2024-0863',
        retentionAmount: 2274.48,
        netPayment: 43215.12
      },
      
      // April 2024 - Continued equipment and controls
      {
        invoiceNumber: 'JC-VAV-002-2024',
        invoiceDate: new Date('2024-04-08'),
        dueDate: new Date('2024-05-08'),
        receivedDate: new Date('2024-04-10'),
        vendor: {
          name: 'Johnson Controls International',
          vendorNumber: 'VEND-JCI-001',
          address: '5757 North Green Bay Avenue, Milwaukee, WI 53209',
          phone: '414-524-1200',
          email: 'commercial.billing@jci.com'
        },
        invoiceAmount: 42750.00,
        taxAmount: 3420.00,
        totalAmount: 46170.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - Standard Pressure (24 units) - Second Delivery',
        costCodeBreakdown: [
          {
            costCode: 'VAV-UNITS-001',
            amount: 46170.00,
            description: 'VAV Terminal Units completion - Standard pressure'
          }
        ],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-25'),
        retentionAmount: 2308.50,
        netPayment: 43861.50
      },
      {
        invoiceNumber: 'ABC-CTRL-001-2024',
        invoiceDate: new Date('2024-04-15'),
        dueDate: new Date('2024-05-15'),
        receivedDate: new Date('2024-04-17'),
        vendor: {
          name: 'Advanced Building Controls Inc.',
          vendorNumber: 'VEND-ABC-003',
          address: '2200 Technology Drive, Automation Park, NJ 07070',
          phone: '201-555-0456',
          email: 'invoicing@advancedcontrols.com'
        },
        invoiceAmount: 28917.00,
        taxAmount: 2313.36,
        totalAmount: 31230.36,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Control systems and sensors - First installation phase',
        costCodeBreakdown: [
          {
            costCode: 'VAV-CTRL-001',
            amount: 31230.36,
            description: 'Control panels, sensors, and programming'
          }
        ],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-30'),
        retentionAmount: 1561.52,
        netPayment: 29668.84
      },
      
      // May 2024 - High pressure units and final controls
      {
        invoiceNumber: 'JC-VAV-003-2024',
        invoiceDate: new Date('2024-05-06'),
        dueDate: new Date('2024-06-05'),
        receivedDate: new Date('2024-05-08'),
        vendor: {
          name: 'Johnson Controls International',
          vendorNumber: 'VEND-JCI-001',
          address: '5757 North Green Bay Avenue, Milwaukee, WI 53209',
          phone: '414-524-1200',
          email: 'commercial.billing@jci.com'
        },
        invoiceAmount: 28800.00,
        taxAmount: 2304.00,
        totalAmount: 31104.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-002',
        description: 'High Pressure VAV Units - Initial delivery (18 units for floors 7-12)',
        costCodeBreakdown: [
          {
            costCode: 'VAV-UNITS-002',
            amount: 31104.00,
            description: 'High pressure VAV units - First batch'
          }
        ],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending',
        retentionAmount: 1555.20,
        netPayment: 29548.80
      },
      {
        invoiceNumber: 'STS-LABOR-001-2024',
        invoiceDate: new Date('2024-05-20'),
        dueDate: new Date('2024-06-19'),
        receivedDate: new Date('2024-05-22'),
        vendor: {
          name: 'Skilled Trades Staffing LLC',
          vendorNumber: 'VEND-STS-004',
          address: '400 Union Hall Street, Trades District, NY 10001',
          phone: '212-555-0789',
          email: 'payroll@skilledtrades.com'
        },
        invoiceAmount: 34500.00,
        taxAmount: 0.00,
        totalAmount: 34500.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-LABOR-001',
        description: 'Skilled HVAC technician labor - May 2024',
        costCodeBreakdown: [
          {
            costCode: 'VAV-LABOR-001',
            amount: 34500.00,
            description: 'HVAC technician labor - 460 hours @ $75/hour'
          }
        ],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending',
        retentionAmount: 1725.00,
        netPayment: 32775.00
      },
      {
        invoiceNumber: 'TSI-TOOLS-001-2024',
        invoiceDate: new Date('2024-05-25'),
        dueDate: new Date('2024-06-24'),
        receivedDate: new Date('2024-05-27'),
        vendor: {
          name: 'Tool Supply Inc.',
          vendorNumber: 'VEND-TSI-005',
          address: '950 Equipment Way, Tool District, NY 10002',
          phone: '212-555-0321',
          email: 'billing@toolsupply.com'
        },
        invoiceAmount: 2850.00,
        taxAmount: 228.00,
        totalAmount: 3078.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-TOOLS-001',
        description: 'Specialized VAV installation tools and equipment rental',
        costCodeBreakdown: [
          {
            costCode: 'VAV-TOOLS-001',
            amount: 3078.00,
            description: 'Tool rental and specialized equipment'
          }
        ],
        invoiceType: 'equipment',
        category: 'tools',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-30'),
        retentionAmount: 153.90,
        netPayment: 2924.10
      }
    ]);
    
    log('✅ Created ' + apEntries.length + ' AP Register entries', colors.green);
    
    // 5. CREATE COMPREHENSIVE TIMELOG REGISTER
    const timelogEntries = [];
    const workers = [
      users.find(u => u.name === 'Tony Castellano'),
      users.find(u => u.name === 'Jake Thompson'),
      users.find(u => u.name === 'Maria Santos'),
      users.find(u => u.name === 'David Kim')
    ].filter(Boolean);
    
    // Generate realistic timelog register entries for 3 months
    for (let month = 3; month <= 5; month++) {
      const monthName = ['', '', '', 'March', 'April', 'May'][month];
      
      // Create 2 pay periods per month
      for (let period = 1; period <= 2; period++) {
        const periodStart = new Date(2024, month - 1, period === 1 ? 1 : 16);
        const periodEnd = new Date(2024, month - 1, period === 1 ? 15 : new Date(2024, month, 0).getDate());
        
        for (const worker of workers) {
          // Calculate realistic hours for the pay period
          const workingDays = period === 1 ? 11 : 10; // Typical working days
          const baseHours = workingDays * 8;
          const overtimeHours = Math.floor(Math.random() * 16); // 0-16 OT hours per period
          const totalHours = baseHours + overtimeHours;
          
          // Determine primary cost code based on month
          let primaryCostCode, workFocus;
          if (month === 3) {
            primaryCostCode = 'VAV-UNITS-001';
            workFocus = 'Standard pressure VAV unit installation and connections';
          } else if (month === 4) {
            primaryCostCode = 'VAV-DUCT-001';
            workFocus = 'Ductwork modifications and VAV unit connections';
          } else {
            primaryCostCode = 'VAV-CTRL-001';
            workFocus = 'Control system installation and initial testing';
          }
          
          timelogEntries.push({
            workerId: worker._id,
            jobId: vavJob._id,
            projectId: project._id,
            workDate: periodEnd, // Use period end as summary date
            payPeriodStart: periodStart,
            payPeriodEnd: periodEnd,
            regularHours: baseHours,
            overtimeHours: overtimeHours,
            doubleTimeHours: 0,
            totalHours: totalHours,
            costCode: primaryCostCode,
            workDescription: monthName + ' ' + period + ' period: ' + workFocus,
            craft: worker.department === 'Installation' ? 'insulation' : 'general',
            hourlyRate: worker.role === 'field_supervisor' ? 65.00 : 45.00,
            overtimeRate: worker.role === 'field_supervisor' ? 97.50 : 67.50,
            regularPay: baseHours * (worker.role === 'field_supervisor' ? 65.00 : 45.00),
            overtimePay: overtimeHours * (worker.role === 'field_supervisor' ? 97.50 : 67.50),
            totalPay: (baseHours * (worker.role === 'field_supervisor' ? 65.00 : 45.00)) + 
                     (overtimeHours * (worker.role === 'field_supervisor' ? 97.50 : 67.50)),
            status: month < 5 ? 'approved' : 'submitted',
            approvedBy: month < 5 ? users.find(u => u.role === 'project_manager')._id : null,
            approvedDate: month < 5 ? new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
            submittedBy: worker._id,
            submittedDate: new Date(periodEnd.getTime() + 1 * 24 * 60 * 60 * 1000)
          });
        }
      }
    }
    
    const createdTimelogs = await TimelogRegister.create(timelogEntries);
    log('✅ Created ' + createdTimelogs.length + ' timelog register entries', colors.green);
    
    log('\n🎉 VAV Terminal Installation complete dataset created!', colors.green);
    
    // Display comprehensive summary
    log('\n📊 COMPLETE VAV JOB DATASET SUMMARY:', colors.cyan);
    log('🔧 Job: ' + vavJob.name + ' (' + vavJob.jobNumber + ')');
    log('💰 Contract Value: $' + vavJob.contractValue.toLocaleString());
    log('📋 Systems: ' + systems.length);
    log('🏢 Areas: ' + areas.length);
    log('📅 Phases: ' + phases.length);
    log('📄 AP Register Entries: ' + apEntries.length);
    log('⏰ Timelog Register Entries: ' + createdTimelogs.length);
    
    log('\n💡 FUNCTIONALITY READY FOR TESTING:', colors.cyan);
    log('• SOV Setup with Systems, Areas, and Phases');
    log('• Schedule of Values with 4 line items and progress tracking');
    log('• AP Register with 7 realistic vendor invoices');
    log('• Timelog Register with 24 pay period entries');
    log('• Complete 3-month project progression');
    log('• Realistic ICI contractor financial workflows');
    
  } catch (error) {
    log('❌ Error creating dataset: ' + error.message, colors.red);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log('\n🔌 Database connection closed.', colors.blue);
  }
}

createVAVCompleteDataset();
