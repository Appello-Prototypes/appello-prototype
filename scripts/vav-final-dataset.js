#!/usr/bin/env node

/**
 * Final VAV Dataset - SOV Setup, AP Register, and Timelog Register
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');

const MONGODB_URI = process.env.MONGODB_URI;

async function createFinalVAVDataset() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const vavJob = await Job.findOne({ jobNumber: 'JOB-2024-001-B' });
    const project = await Project.findById(vavJob.projectId);
    const users = await User.find();
    
    console.log('📋 Creating final dataset for:', vavJob.name);
    
    // Clear existing data
    await Promise.all([
      System.deleteMany({ jobId: vavJob._id }),
      Area.deleteMany({ jobId: vavJob._id }),
      Phase.deleteMany({ jobId: vavJob._id }),
      APRegister.deleteMany({ jobId: vavJob._id }),
      TimelogRegister.deleteMany({ jobId: vavJob._id })
    ]);
    
    // 1. SOV SETUP - SYSTEMS
    const systems = await System.create([
      {
        name: 'VAV Air Distribution System',
        code: 'VAV-ADS',
        description: 'Variable Air Volume terminal units and distribution',
        jobId: vavJob._id,
        projectId: project._id,
        sortOrder: 1
      },
      {
        name: 'Ductwork System',
        code: 'DUCT-SYS',
        description: 'Ductwork modifications and connections',
        jobId: vavJob._id,
        projectId: project._id,
        sortOrder: 2
      },
      {
        name: 'Control System',
        code: 'CTRL-SYS',
        description: 'VAV controls and automation',
        jobId: vavJob._id,
        projectId: project._id,
        sortOrder: 3
      }
    ]);
    
    console.log('✅ Created', systems.length, 'systems');
    
    // 2. SOV SETUP - AREAS
    const areas = await Area.create([
      {
        name: 'Lower Floors',
        code: 'FL-1-6',
        description: 'Floors 1-6 office areas',
        jobId: vavJob._id,
        projectId: project._id,
        floor: '1-6',
        zone: 'Lower'
      },
      {
        name: 'Upper Floors',
        code: 'FL-7-12',
        description: 'Floors 7-12 office areas',
        jobId: vavJob._id,
        projectId: project._id,
        floor: '7-12',
        zone: 'Upper'
      }
    ]);
    
    console.log('✅ Created', areas.length, 'areas');
    
    // 3. SOV SETUP - PHASES
    const phases = await Phase.create([
      {
        name: 'Installation Phase',
        code: 'INSTALL',
        description: 'VAV unit installation and connections',
        jobId: vavJob._id,
        projectId: project._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-31'),
        status: 'in_progress'
      },
      {
        name: 'Testing Phase',
        code: 'TEST',
        description: 'System testing and commissioning',
        jobId: vavJob._id,
        projectId: project._id,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        status: 'not_started'
      }
    ]);
    
    console.log('✅ Created', phases.length, 'phases');
    
    // 4. AP REGISTER - REALISTIC VENDOR INVOICES
    const apEntries = await APRegister.create([
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
        description: 'VAV Terminal Units - Standard Pressure (24 units)',
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
        invoiceNumber: 'MDF-001-2024',
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
        invoiceAmount: 42120.00,
        taxAmount: 3369.60,
        totalAmount: 45489.60,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Ductwork modifications - Phase 1',
        costCodeBreakdown: [{
          costCode: 'VAV-DUCT-001',
          amount: 45489.60,
          description: 'Ductwork fabrication and installation'
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-05'),
        checkNumber: 'CHK-2024-0863'
      },
      {
        invoiceNumber: 'ABC-CTRL-001-2024',
        invoiceDate: new Date('2024-04-15'),
        dueDate: new Date('2024-05-15'),
        receivedDate: new Date('2024-04-17'),
        vendor: {
          name: 'Advanced Building Controls',
          vendorNumber: 'VEND-ABC-003',
          address: '2200 Tech Drive, NJ 07070',
          phone: '201-555-0456',
          email: 'billing@advancedcontrols.com'
        },
        invoiceAmount: 28917.00,
        taxAmount: 2313.36,
        totalAmount: 31230.36,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Control systems - First phase',
        costCodeBreakdown: [{
          costCode: 'VAV-CTRL-001',
          amount: 31230.36,
          description: 'Control panels and sensors'
        }],
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-30')
      },
      {
        invoiceNumber: 'STS-LABOR-001-2024',
        invoiceDate: new Date('2024-05-20'),
        dueDate: new Date('2024-06-19'),
        receivedDate: new Date('2024-05-22'),
        vendor: {
          name: 'Skilled Trades Staffing',
          vendorNumber: 'VEND-STS-004',
          address: '400 Union Hall St, NY 10001',
          phone: '212-555-0789',
          email: 'payroll@skilledtrades.com'
        },
        invoiceAmount: 34500.00,
        taxAmount: 0.00,
        totalAmount: 34500.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-LABOR-001',
        description: 'HVAC technician labor - May 2024',
        costCodeBreakdown: [{
          costCode: 'VAV-LABOR-001',
          amount: 34500.00,
          description: 'Skilled labor - 460 hours'
        }],
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending'
      }
    ]);
    
    console.log('✅ Created', apEntries.length, 'AP Register entries');
    
    // 5. TIMELOG REGISTER - REALISTIC DAILY ENTRIES
    const timelogEntries = [];
    const workers = users.filter(u => ['field_worker', 'field_supervisor'].includes(u.role)).slice(0, 4);
    
    // Create daily timelog entries for 3 months
    for (let month = 3; month <= 5; month++) {
      for (let week = 1; week <= 4; week++) {
        for (let day = 1; day <= 5; day++) { // Monday-Friday
          const date = new Date(2024, month - 1, (week - 1) * 7 + day);
          if (date.getMonth() !== month - 1) continue; // Skip if date rolled over to next month
          
          for (const worker of workers.slice(0, 2 + (day % 2))) { // 2-3 workers per day
            const regularHours = 8;
            const overtimeHours = Math.random() > 0.8 ? 2 : 0;
            const totalHours = regularHours + overtimeHours;
            
            // Determine cost code based on month and worker
            let costCode, workDesc;
            if (month === 3) {
              costCode = 'VAV-UNITS-001';
              workDesc = 'Installed standard pressure VAV units';
            } else if (month === 4) {
              costCode = 'VAV-DUCT-001';
              workDesc = 'Modified ductwork for VAV connections';
            } else {
              costCode = 'VAV-CTRL-001';
              workDesc = 'Installed control systems and wiring';
            }
            
            const baseRate = worker.role === 'field_supervisor' ? 65.00 : 45.00;
            const overtimeRate = baseRate * 1.5;
            const doubleTimeRate = baseRate * 2.0;
            
            timelogEntries.push({
              workerId: worker._id,
              jobId: vavJob._id,
              projectId: project._id,
              workDate: date,
              payPeriodStart: new Date(2024, month - 1, 1),
              payPeriodEnd: new Date(2024, month, 0),
              regularHours: regularHours,
              overtimeHours: overtimeHours,
              doubleTimeHours: 0,
              totalHours: totalHours,
              costCode: costCode,
              workDescription: workDesc + ' - Floor ' + (((day + week) % 12) + 1),
              craft: worker.department === 'Installation' ? 'insulation' : 'general',
              tradeLevel: worker.role === 'field_supervisor' ? 'supervisor' : 'journeyman',
              baseHourlyRate: baseRate,
              overtimeRate: overtimeRate,
              doubleTimeRate: doubleTimeRate,
              regularPay: regularHours * baseRate,
              overtimePay: overtimeHours * overtimeRate,
              doubleTimePay: 0,
              totalPay: (regularHours * baseRate) + (overtimeHours * overtimeRate),
              status: month < 5 ? 'approved' : 'submitted',
              approvedBy: month < 5 ? users.find(u => u.role === 'project_manager')._id : null,
              submittedBy: worker._id,
              submittedDate: new Date(date.getTime() + 1 * 24 * 60 * 60 * 1000)
            });
          }
        }
      }
    }
    
    // Create timelog entries in smaller batches
    const batchSize = 20;
    let createdCount = 0;
    
    for (let i = 0; i < timelogEntries.length; i += batchSize) {
      const batch = timelogEntries.slice(i, i + batchSize);
      try {
        const created = await TimelogRegister.create(batch);
        createdCount += created.length;
      } catch (error) {
        console.log('⚠️ Batch error:', error.message);
        break;
      }
    }
    
    console.log('✅ Created', createdCount, 'timelog register entries');
    
    console.log('\n🎉 VAV Terminal Installation complete dataset created!');
    console.log('\n📊 SUMMARY:');
    console.log('🔧 Job:', vavJob.name);
    console.log('💰 Contract Value: $' + vavJob.contractValue.toLocaleString());
    console.log('📋 Systems:', systems.length);
    console.log('🏢 Areas:', areas.length);
    console.log('📅 Phases:', phases.length);
    console.log('📄 AP Register:', apEntries.length, 'invoices');
    console.log('⏰ Timelog Register:', createdCount, 'entries');
    
    console.log('\n🎯 NOW READY FOR TESTING:');
    console.log('• SOV Setup with Systems, Areas, Phases');
    console.log('• AP Register with realistic vendor invoices');
    console.log('• Timelog Register with daily worker entries');
    console.log('• Complete financial workflow demonstration');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

createFinalVAVDataset();
