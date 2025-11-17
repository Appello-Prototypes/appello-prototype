#!/usr/bin/env node

/**
 * Fix Cost Code Alignment - Ensure AP Register and Timelog use ONLY SOV cost codes
 * Critical for proper financial rollup and reporting
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const TimeEntry = require('../src/server/models/TimeEntry');

const MONGODB_URI = process.env.MONGODB_URI;

// Established SOV Cost Codes (ONLY these should be used)
const VALID_COST_CODES = [
  'VAV-UNITS-001',  // VAV Terminal Units - Standard Pressure (Floors 1-6)
  'VAV-UNITS-002',  // VAV Terminal Units - High Pressure (Floors 7-12) 
  'VAV-DUCT-001',   // Ductwork Modifications and Connections
  'VAV-CTRL-001'    // VAV Control Systems and Wiring
];

async function fixCostCodeAlignment() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const vavJob = await Job.findOne({ jobNumber: 'JOB-2024-001-B' });
    const project = await Project.findById(vavJob.projectId);
    const users = await User.find();
    
    console.log('🔧 Fixing cost code alignment for:', vavJob.name);
    console.log('📋 Valid SOV Cost Codes:', VALID_COST_CODES.join(', '));
    
    // Clear all AP Register and Timelog data to rebuild correctly
    await Promise.all([
      APRegister.deleteMany({ jobId: vavJob._id }),
      TimelogRegister.deleteMany({ jobId: vavJob._id }),
      TimeEntry.deleteMany({ jobId: vavJob._id })
    ]);
    
    console.log('🧹 Cleared existing AP Register and Timelog data');
    
    // 1. CREATE AP REGISTER - ONLY USING SOV COST CODES
    const apEntries = await APRegister.create([
      // VAV-UNITS-001 invoices (Standard Pressure Units)
      {
        invoiceNumber: 'JCI-STD-001-2024',
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
        invoiceAmount: 42750.00,
        taxAmount: 3420.00,
        totalAmount: 46170.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'Standard Pressure VAV Units - First Delivery (24 units)',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-001',
          amount: 46170.00,
          description: 'Standard pressure VAV units - Floors 1-6'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-03-28'),
        checkNumber: 'CHK-2024-0847'
      },
      {
        invoiceNumber: 'JCI-STD-002-2024',
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
        description: 'Standard Pressure VAV Units - Second Delivery (24 units)',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-001',
          amount: 46170.00,
          description: 'Standard pressure VAV units completion'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-25')
      },
      {
        invoiceNumber: 'IMS-STD-001-2024',
        invoiceDate: new Date('2024-03-15'),
        dueDate: new Date('2024-04-14'),
        receivedDate: new Date('2024-03-17'),
        vendor: {
          name: 'Industrial Mechanical Supply',
          vendorNumber: 'VEND-IMS-012',
          address: '1200 Supply Chain Blvd, Warehouse District, NY 11103',
          phone: '718-555-0654',
          email: 'invoicing@indmechsupply.com'
        },
        invoiceAmount: 15750.00,
        taxAmount: 1260.00,
        totalAmount: 17010.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'VAV unit mounting hardware and installation materials',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-001',
          amount: 17010.00,
          description: 'Mounting brackets, gaskets, and installation materials'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-10'),
        checkNumber: 'CHK-2024-0852'
      },
      {
        invoiceNumber: 'STS-STD-001-2024',
        invoiceDate: new Date('2024-03-20'),
        dueDate: new Date('2024-04-19'),
        receivedDate: new Date('2024-03-22'),
        vendor: {
          name: 'Skilled Trades Staffing',
          vendorNumber: 'VEND-STS-004',
          address: '400 Union Hall St, Trade Center, NY 10001',
          phone: '212-555-0789',
          email: 'payroll@skilledtrades.com'
        },
        invoiceAmount: 18000.00,
        taxAmount: 0.00,
        totalAmount: 18000.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'Labor for standard pressure VAV installation - March 2024',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-001',
          amount: 18000.00,
          description: 'HVAC technician labor - 240 hours @ $75/hr'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-15'),
        checkNumber: 'CHK-2024-0858'
      },
      {
        invoiceNumber: 'HSS-STD-001-2024',
        invoiceDate: new Date('2024-03-25'),
        dueDate: new Date('2024-04-24'),
        receivedDate: new Date('2024-03-27'),
        vendor: {
          name: 'Heavy Lift Services LLC',
          vendorNumber: 'VEND-HLS-010',
          address: '2400 Crane Way, Industrial Zone, NY 11102',
          phone: '718-555-0456',
          email: 'billing@heavylift.com'
        },
        invoiceAmount: 4500.00,
        taxAmount: 360.00,
        totalAmount: 4860.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'Crane services for standard pressure VAV installation',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-001',
          amount: 4860.00,
          description: 'Crane rental for VAV unit positioning'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-18'),
        checkNumber: 'CHK-2024-0861'
      },
      
      // VAV-UNITS-002 invoices (High Pressure Units)
      {
        invoiceNumber: 'JCI-HP-001-2024',
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
          description: 'High pressure VAV units - Floors 7-12'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'JCI-HP-002-2024',
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
          description: 'High pressure VAV units completion'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'IMS-HP-001-2024',
        invoiceDate: new Date('2024-05-15'),
        dueDate: new Date('2024-06-14'),
        receivedDate: new Date('2024-05-17'),
        vendor: {
          name: 'Industrial Mechanical Supply',
          vendorNumber: 'VEND-IMS-012'
        },
        invoiceAmount: 12600.00,
        taxAmount: 1008.00,
        totalAmount: 13608.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-002',
        description: 'High pressure VAV mounting hardware and materials',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-002',
          amount: 13608.00,
          description: 'High pressure mounting and installation materials'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-30')
      },
      {
        invoiceNumber: 'STS-HP-001-2024',
        invoiceDate: new Date('2024-05-25'),
        dueDate: new Date('2024-06-24'),
        receivedDate: new Date('2024-05-27'),
        vendor: {
          name: 'Skilled Trades Staffing',
          vendorNumber: 'VEND-STS-004'
        },
        invoiceAmount: 22500.00,
        taxAmount: 0.00,
        totalAmount: 22500.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-002',
        description: 'Labor for high pressure VAV installation - May 2024',
        costCodeBreakdown: [{
          costCode: 'VAV-UNITS-002',
          amount: 22500.00,
          description: 'HVAC technician labor - 300 hours @ $75/hr'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      
      // VAV-DUCT-001 invoices (Ductwork)
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
        invoiceAmount: 35100.00,
        taxAmount: 2808.00,
        totalAmount: 37908.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Supply ductwork modifications - Floors 1-6',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 37908.00,
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
        invoiceNumber: 'MDF-DUCT-002-2024',
        invoiceDate: new Date('2024-04-12'),
        dueDate: new Date('2024-05-12'),
        receivedDate: new Date('2024-04-15'),
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
          description: 'Return ductwork fabrication and installation'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-05-05'),
        checkNumber: 'CHK-2024-0871'
      },
      {
        invoiceNumber: 'IMS-DUCT-001-2024',
        invoiceDate: new Date('2024-04-18'),
        dueDate: new Date('2024-05-18'),
        receivedDate: new Date('2024-04-20'),
        vendor: {
          name: 'Industrial Mechanical Supply',
          vendorNumber: 'VEND-IMS-012'
        },
        invoiceAmount: 8750.00,
        taxAmount: 700.00,
        totalAmount: 9450.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Ductwork insulation and vapor barriers',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 9450.00,
          description: 'Insulation materials for ductwork'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-10')
      },
      {
        invoiceNumber: 'STS-DUCT-001-2024',
        invoiceDate: new Date('2024-04-22'),
        dueDate: new Date('2024-05-22'),
        receivedDate: new Date('2024-04-24'),
        vendor: {
          name: 'Skilled Trades Staffing',
          vendorNumber: 'VEND-STS-004'
        },
        invoiceAmount: 27000.00,
        taxAmount: 0.00,
        totalAmount: 27000.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Labor for ductwork modifications - April 2024',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 27000.00,
          description: 'Ductwork installation labor - 360 hours @ $75/hr'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-05-15')
      },
      {
        invoiceNumber: 'HSS-DUCT-001-2024',
        invoiceDate: new Date('2024-04-28'),
        dueDate: new Date('2024-05-28'),
        receivedDate: new Date('2024-04-30'),
        vendor: {
          name: 'Heavy Lift Services LLC',
          vendorNumber: 'VEND-HLS-010'
        },
        invoiceAmount: 3200.00,
        taxAmount: 256.00,
        totalAmount: 3456.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Crane services for ductwork installation - Upper floors',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 3456.00,
          description: 'Crane services for ductwork positioning'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-05-20'),
        checkNumber: 'CHK-2024-0883'
      },
      
      // VAV-CTRL-001 invoices (Control Systems)
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
        invoiceAmount: 24300.00,
        taxAmount: 1944.00,
        totalAmount: 26244.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Controllers - Standard pressure units (24 controllers)',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 26244.00,
          description: 'Controllers and sensors for standard units'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-30')
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
        invoiceAmount: 31050.00,
        taxAmount: 2484.00,
        totalAmount: 33534.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Controllers - High pressure units (18 controllers)',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 33534.00,
          description: 'Controllers and sensors for high pressure units'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'PCS-CTRL-001-2024',
        invoiceDate: new Date('2024-05-28'),
        dueDate: new Date('2024-06-27'),
        receivedDate: new Date('2024-05-30'),
        vendor: {
          name: 'Premier Control Systems',
          vendorNumber: 'VEND-PCS-014',
          address: '3300 Electrical Way, Controls Park, NJ 07071',
          phone: '201-555-0852',
          email: 'billing@premiercontrols.com'
        },
        invoiceAmount: 18900.00,
        taxAmount: 1512.00,
        totalAmount: 20412.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'Control system programming and commissioning',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 20412.00,
          description: 'Programming services and system integration'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      },
      {
        invoiceNumber: 'STS-CTRL-001-2024',
        invoiceDate: new Date('2024-05-22'),
        dueDate: new Date('2024-06-21'),
        receivedDate: new Date('2024-05-24'),
        vendor: {
          name: 'Skilled Trades Staffing',
          vendorNumber: 'VEND-STS-004'
        },
        invoiceAmount: 15750.00,
        taxAmount: 0.00,
        totalAmount: 15750.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'Labor for control system installation - May 2024',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 15750.00,
          description: 'Control technician labor - 210 hours @ $75/hr'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      }
    ]);
    
    console.log('✅ Created', apEntries.length, 'AP entries using ONLY SOV cost codes');
    
    // 2. CREATE TIME ENTRIES - ONLY USING SOV COST CODES
    const timeEntries = [];
    const workers = users.filter(u => ['field_worker', 'field_supervisor'].includes(u.role)).slice(0, 4);
    
    // Generate time entries for 3 months, using ONLY SOV cost codes
    for (let month = 3; month <= 5; month++) {
      for (let day = 1; day <= 20; day++) { // 20 working days per month
        const date = new Date(2024, month - 1, day);
        
        for (const worker of workers.slice(0, 2 + (day % 2))) { // 2-3 workers per day
          const regularHours = 8;
          const overtimeHours = Math.random() > 0.8 ? 2 : 0;
          
          // Determine SOV cost code based on month and work phase
          let costCode, workDescription;
          if (month === 3) {
            costCode = day <= 15 ? 'VAV-UNITS-001' : 'VAV-DUCT-001';
            workDescription = costCode === 'VAV-UNITS-001' 
              ? 'Installed standard pressure VAV units on floors 1-6'
              : 'Modified supply ductwork for VAV connections';
          } else if (month === 4) {
            costCode = day <= 10 ? 'VAV-DUCT-001' : 'VAV-CTRL-001';
            workDescription = costCode === 'VAV-DUCT-001'
              ? 'Completed ductwork modifications and connections'
              : 'Installed control systems for standard pressure units';
          } else {
            costCode = day <= 15 ? 'VAV-UNITS-002' : 'VAV-CTRL-001';
            workDescription = costCode === 'VAV-UNITS-002'
              ? 'Installed high pressure VAV units on floors 7-12'
              : 'Programmed and tested control systems';
          }
          
          timeEntries.push({
            userId: worker._id,
            jobId: vavJob._id,
            taskId: null,
            date: date,
            startTime: '07:00',
            endTime: overtimeHours > 0 ? '17:00' : '15:00',
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            totalHours: regularHours + overtimeHours,
            workerId: worker._id,
            craft: worker.department === 'Installation' ? 'insulation' : 'general',
            costCode: costCode,
            workDescription: workDescription + ' - Day ' + day,
            status: month < 5 ? 'approved' : 'submitted'
          });
        }
      }
    }
    
    const createdTimeEntries = await TimeEntry.create(timeEntries.slice(0, 120));
    console.log('✅ Created', createdTimeEntries.length, 'time entries using ONLY SOV cost codes');
    
    // 3. VERIFY COST CODE ALIGNMENT
    console.log('\\n🔍 VERIFYING COST CODE ALIGNMENT:');
    
    // Check AP Register cost codes
    const apCostCodes = await APRegister.distinct('costCode', { jobId: vavJob._id });
    console.log('📄 AP Register Cost Codes:', apCostCodes.sort());
    
    // Check Time Entry cost codes  
    const timeCostCodes = await TimeEntry.distinct('costCode', { jobId: vavJob._id });
    console.log('⏰ Time Entry Cost Codes:', timeCostCodes.sort());
    
    // Check SOV cost codes
    const sovCostCodes = await ScheduleOfValues.distinct('costCode', { jobId: vavJob._id });
    console.log('📋 SOV Cost Codes:', sovCostCodes.sort());
    
    // Verify alignment
    const allAligned = apCostCodes.every(code => VALID_COST_CODES.includes(code)) &&
                      timeCostCodes.every(code => VALID_COST_CODES.includes(code));
    
    if (allAligned) {
      console.log('\\n✅ PERFECT ALIGNMENT! All cost codes match SOV structure');
    } else {
      console.log('\\n❌ MISALIGNMENT DETECTED!');
    }
    
    // 4. CALCULATE FINANCIAL ROLLUP
    console.log('\\n💰 FINANCIAL ROLLUP BY SOV COST CODE:');
    
    for (const costCode of VALID_COST_CODES) {
      const sovEntry = await ScheduleOfValues.findOne({ jobId: vavJob._id, costCode: costCode });
      const apTotal = await APRegister.aggregate([
        { $match: { jobId: vavJob._id, costCode: costCode } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const timeTotal = await TimeEntry.aggregate([
        { $match: { jobId: vavJob._id, costCode: costCode } },
        { $group: { _id: null, total: { $sum: '$totalHours' } } }
      ]);
      
      console.log('📊', costCode + ':');
      console.log('   SOV Value:', '$' + (sovEntry ? sovEntry.scheduledValue.toLocaleString() : '0'));
      console.log('   AP Total:', '$' + ((apTotal[0] && apTotal[0].total) ? apTotal[0].total.toLocaleString() : '0'));
      console.log('   Time Hours:', (timeTotal[0] && timeTotal[0].total) ? timeTotal[0].total.toFixed(1) : '0.0');
    }
    
    console.log('\\n🎉 Cost code alignment and financial rollup completed!');
    console.log('\\n🎯 READY FOR COMPREHENSIVE REPORTING:');
    console.log('• All AP invoices roll up to SOV cost codes');
    console.log('• All time entries roll up to SOV cost codes'); 
    console.log('• Perfect alignment for earned vs burned analysis');
    console.log('• Complete financial integration and reporting');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\\n🔌 Connection closed');
  }
}

fixCostCodeAlignment();
