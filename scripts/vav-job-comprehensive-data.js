#!/usr/bin/env node

/**
 * Comprehensive VAV Terminal Installation Job Data
 * Creates realistic SOV, AP Register, Timelog Register, and Progress Reports
 * Assumes 3 months into the job (March 2024 - May 2024)
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const ProgressReport = require('../src/server/models/ProgressReport');
const Task = require('../src/server/models/Task');
const TimeEntry = require('../src/server/models/TimeEntry');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/appello-tasks';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

async function createVAVJobData() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('✅ Connected to MongoDB', colors.green);
    
    // Get the VAV job and related data
    const vavJob = await Job.findOne({ jobNumber: 'JOB-2024-001-B' });
    const project = await Project.findById(vavJob.projectId);
    const users = await User.find();
    
    if (!vavJob) {
      log('❌ VAV Terminal Installation job not found', colors.red);
      return;
    }
    
    log(`📋 Creating comprehensive data for: ${vavJob.name}`, colors.blue);
    log(`💰 Contract Value: $${vavJob.contractValue.toLocaleString()}`, colors.cyan);
    
    // Clear existing data for this job
    await Promise.all([
      ScheduleOfValues.deleteMany({ jobId: vavJob._id }),
      APRegister.deleteMany({ jobId: vavJob._id }),
      TimelogRegister.deleteMany({ jobId: vavJob._id }),
      ProgressReport.deleteMany({ jobId: vavJob._id })
    ]);
    
    log('🧹 Cleared existing job data', colors.yellow);
    
    // 1. CREATE DETAILED SCHEDULE OF VALUES
    const sovEntries = await ScheduleOfValues.create([
      {
        jobId: vavJob._id,
        projectId: project._id,
        lineNumber: '001',
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - Standard Pressure Independent (Floors 1-6)',
        unit: 'EA',
        quantity: 48,
        unitCost: 2850,
        totalCost: 136800,
        margin: 0.25,
        scheduledValue: 171000,
        previouslyCompleted: 85500,
        completedThisPeriod: 42750,
        totalCompleted: 128250,
        percentComplete: 75,
        balanceToFinish: 42750,
        retainage: 8550,
        status: 'in_progress'
      },
      {
        jobId: vavJob._id,
        projectId: project._id,
        lineNumber: '002',
        costCode: 'VAV-UNITS-002',
        description: 'VAV Terminal Units - High Pressure (Floors 7-12)',
        unit: 'EA',
        quantity: 36,
        unitCost: 3200,
        totalCost: 115200,
        margin: 0.25,
        scheduledValue: 144000,
        previouslyCompleted: 0,
        completedThisPeriod: 28800,
        totalCompleted: 28800,
        percentComplete: 20,
        balanceToFinish: 115200,
        retainage: 2880,
        status: 'in_progress'
      },
      {
        jobId: vavJob._id,
        projectId: project._id,
        lineNumber: '003',
        costCode: 'VAV-DUCT-001',
        description: 'Ductwork Modifications and Connections',
        unit: 'LF',
        quantity: 2400,
        unitCost: 45,
        totalCost: 108000,
        margin: 0.30,
        scheduledValue: 140400,
        previouslyCompleted: 56160,
        completedThisPeriod: 42120,
        totalCompleted: 98280,
        percentComplete: 70,
        balanceToFinish: 42120,
        retainage: 7020,
        status: 'in_progress'
      },
      {
        jobId: vavJob._id,
        projectId: project._id,
        lineNumber: '004',
        costCode: 'VAV-CTRL-001',
        description: 'VAV Control Systems and Wiring',
        unit: 'EA',
        quantity: 84,
        unitCost: 850,
        totalCost: 71400,
        margin: 0.35,
        scheduledValue: 96390,
        previouslyCompleted: 28917,
        completedThisPeriod: 19278,
        totalCompleted: 48195,
        percentComplete: 50,
        balanceToFinish: 48195,
        retainage: 4819,
        status: 'in_progress'
      },
      {
        jobId: vavJob._id,
        projectId: project._id,
        lineNumber: '005',
        costCode: 'VAV-TEST-001',
        description: 'System Testing and Commissioning',
        unit: 'LS',
        quantity: 1,
        unitCost: 85000,
        totalCost: 85000,
        margin: 0.20,
        scheduledValue: 102000,
        previouslyCompleted: 0,
        completedThisPeriod: 0,
        totalCompleted: 0,
        percentComplete: 0,
        balanceToFinish: 102000,
        retainage: 0,
        status: 'not_started'
      },
      {
        jobId: vavJob._id,
        projectId: project._id,
        lineNumber: '006',
        costCode: 'VAV-STARTUP-001',
        description: 'System Startup and Performance Verification',
        unit: 'LS',
        quantity: 1,
        unitCost: 25000,
        totalCost: 25000,
        margin: 0.20,
        scheduledValue: 30000,
        previouslyCompleted: 0,
        completedThisPeriod: 0,
        totalCompleted: 0,
        percentComplete: 0,
        balanceToFinish: 30000,
        retainage: 0,
        status: 'not_started'
      }
    ]);
    
    log(`✅ Created ${sovEntries.length} detailed SOV line items`, colors.green);
    
    // 2. CREATE REALISTIC AP REGISTER (3 months of invoices)
    const apEntries = await APRegister.create([
      // March 2024 invoices
      {
        invoiceNumber: 'INV-VAV-2024-001',
        invoiceDate: new Date('2024-03-05'),
        dueDate: new Date('2024-04-04'),
        receivedDate: new Date('2024-03-07'),
        vendor: {
          name: 'Johnson Controls VAV Systems',
          vendorNumber: 'VEND-001',
          address: '1500 Industrial Blvd, Manufacturing City, NY 12345',
          phone: '555-2001',
          email: 'billing@johnsoncontrols.com'
        },
        invoiceAmount: 85500.00,
        taxAmount: 6840.00,
        totalAmount: 92340.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - First Delivery (24 units)',
        costCodeBreakdown: [
          {
            costCode: 'VAV-UNITS-001',
            amount: 92340.00,
            description: 'VAV Terminal Units - Standard Pressure (24 units)'
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
        invoiceNumber: 'INV-DUCT-2024-001',
        invoiceDate: new Date('2024-03-12'),
        dueDate: new Date('2024-04-11'),
        receivedDate: new Date('2024-03-14'),
        vendor: {
          name: 'Metro Ductwork Fabrication',
          vendorNumber: 'VEND-002',
          address: '850 Sheet Metal Way, Industrial Park, NY 12346',
          phone: '555-2002',
          email: 'accounts@metroduct.com'
        },
        invoiceAmount: 56160.00,
        taxAmount: 4492.80,
        totalAmount: 60652.80,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Ductwork modifications and connections - Phase 1',
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'paid',
        paymentDate: new Date('2024-04-05'),
        checkNumber: 'CHK-2024-0863',
        retentionAmount: 3032.64,
        netPayment: 57620.16
      },
      
      // April 2024 invoices
      {
        invoiceNumber: 'INV-VAV-2024-002',
        invoiceDate: new Date('2024-04-08'),
        dueDate: new Date('2024-05-08'),
        receivedDate: new Date('2024-04-10'),
        vendor: {
          name: 'Johnson Controls VAV Systems',
          vendorNumber: 'VEND-001',
          address: '1500 Industrial Blvd, Manufacturing City, NY 12345',
          phone: '555-2001',
          email: 'billing@johnsoncontrols.com'
        },
        invoiceAmount: 42750.00,
        taxAmount: 3420.00,
        totalAmount: 46170.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - Second Delivery (24 units)',
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-25'),
        retentionAmount: 2308.50,
        netPayment: 43861.50
      },
      {
        invoiceNumber: 'INV-CTRL-2024-001',
        invoiceDate: new Date('2024-04-15'),
        dueDate: new Date('2024-05-15'),
        receivedDate: new Date('2024-04-17'),
        vendor: {
          name: 'Advanced Building Controls Inc.',
          vendorNumber: 'VEND-003',
          address: '2200 Technology Drive, Control Systems Park, NY 12347',
          phone: '555-2003',
          email: 'invoicing@advancedcontrols.com'
        },
        invoiceAmount: 28917.00,
        taxAmount: 2313.36,
        totalAmount: 31230.36,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Control systems - First phase installation',
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        approvedDate: new Date('2024-04-30'),
        retentionAmount: 1561.52,
        netPayment: 29668.84
      },
      {
        invoiceNumber: 'INV-DUCT-2024-002',
        invoiceDate: new Date('2024-04-22'),
        dueDate: new Date('2024-05-22'),
        receivedDate: new Date('2024-04-24'),
        vendor: {
          name: 'Metro Ductwork Fabrication',
          vendorNumber: 'VEND-002',
          address: '850 Sheet Metal Way, Industrial Park, NY 12346',
          phone: '555-2002',
          email: 'accounts@metroduct.com'
        },
        invoiceAmount: 42120.00,
        taxAmount: 3369.60,
        totalAmount: 45489.60,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-DUCT-001',
        description: 'Ductwork modifications and connections - Phase 2',
        invoiceType: 'material',
        category: 'insulation_materials',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending',
        retentionAmount: 2274.48,
        netPayment: 43215.12
      },
      
      // May 2024 invoices
      {
        invoiceNumber: 'INV-VAV-2024-003',
        invoiceDate: new Date('2024-05-06'),
        dueDate: new Date('2024-06-05'),
        receivedDate: new Date('2024-05-08'),
        vendor: {
          name: 'Johnson Controls VAV Systems',
          vendorNumber: 'VEND-001',
          address: '1500 Industrial Blvd, Manufacturing City, NY 12345',
          phone: '555-2001',
          email: 'billing@johnsoncontrols.com'
        },
        invoiceAmount: 28800.00,
        taxAmount: 2304.00,
        totalAmount: 31104.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-UNITS-002',
        description: 'High Pressure VAV Units - Initial delivery (Floors 7-12)',
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending',
        retentionAmount: 1555.20,
        netPayment: 29548.80
      },
      {
        invoiceNumber: 'INV-CTRL-2024-002',
        invoiceDate: new Date('2024-05-13'),
        dueDate: new Date('2024-06-12'),
        receivedDate: new Date('2024-05-15'),
        vendor: {
          name: 'Advanced Building Controls Inc.',
          vendorNumber: 'VEND-003',
          address: '2200 Technology Drive, Control Systems Park, NY 12347',
          phone: '555-2003',
          email: 'invoicing@advancedcontrols.com'
        },
        invoiceAmount: 19278.00,
        taxAmount: 1542.24,
        totalAmount: 20820.24,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-CTRL-001',
        description: 'VAV Control systems - Second phase installation',
        invoiceType: 'equipment',
        category: 'equipment_rental',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'approved',
        retentionAmount: 1041.01,
        netPayment: 19779.23
      },
      {
        invoiceNumber: 'INV-LABOR-2024-001',
        invoiceDate: new Date('2024-05-20'),
        dueDate: new Date('2024-06-19'),
        receivedDate: new Date('2024-05-22'),
        vendor: {
          name: 'Skilled Trades Labor Services',
          vendorNumber: 'VEND-004',
          address: '400 Union Hall Street, Trades District, NY 12348',
          phone: '555-2004',
          email: 'payroll@skilledtrades.org'
        },
        invoiceAmount: 34500.00,
        taxAmount: 0.00, // Labor typically not taxed
        totalAmount: 34500.00,
        jobId: vavJob._id,
        projectId: project._id,
        costCode: 'VAV-LABOR-001',
        description: 'Skilled labor for VAV installation - Month 2',
        invoiceType: 'subcontractor',
        category: 'labor_subcontract',
        enteredBy: users.find(u => u.role === 'office_staff')._id,
        paymentStatus: 'pending',
        retentionAmount: 1725.00,
        netPayment: 32775.00
      }
    ]);
    
    log(`✅ Created ${apEntries.length} realistic AP Register entries`, colors.green);
    
    // 3. CREATE COMPREHENSIVE TIMELOG REGISTER
    const timelogEntries = [];
    const workers = users.filter(u => ['field_worker', 'field_supervisor'].includes(u.role));
    
    // Generate daily timelog entries for 3 months (March-May 2024)
    for (let month = 3; month <= 5; month++) {
      const daysInMonth = new Date(2024, month, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        // Skip weekends
        const date = new Date(2024, month - 1, day);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        // Create entries for 2-4 workers per day
        const workersToday = workers.slice(0, Math.floor(Math.random() * 3) + 2);
        
        for (const worker of workersToday) {
          const regularHours = 8;
          const overtimeHours = Math.random() > 0.7 ? Math.floor(Math.random() * 4) : 0;
          const totalHours = regularHours + overtimeHours;
          
          // Determine work focus based on project phase
          let costCode, workDescription;
          if (month === 3) {
            costCode = Math.random() > 0.5 ? 'VAV-UNITS-001' : 'VAV-DUCT-001';
            workDescription = costCode === 'VAV-UNITS-001' 
              ? 'Installed VAV terminal units on floors 1-6, connected ductwork and controls'
              : 'Modified existing ductwork and installed new connections for VAV units';
          } else if (month === 4) {
            costCode = Math.random() > 0.3 ? 'VAV-CTRL-001' : 'VAV-DUCT-001';
            workDescription = costCode === 'VAV-CTRL-001'
              ? 'Installed control wiring and programmed VAV controllers'
              : 'Completed ductwork modifications and tested airflow';
          } else {
            costCode = Math.random() > 0.4 ? 'VAV-UNITS-002' : 'VAV-CTRL-001';
            workDescription = costCode === 'VAV-UNITS-002'
              ? 'Installed high-pressure VAV units on floors 7-12'
              : 'Commissioned control systems and performed initial testing';
          }
          
          timelogEntries.push({
            workerId: worker._id,
            jobId: vavJob._id,
            projectId: project._id,
            workDate: date,
            payPeriodStart: new Date(date.getFullYear(), date.getMonth(), 1),
            payPeriodEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0),
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            totalHours: totalHours,
            costCode: costCode,
            workDescription: workDescription,
            craft: worker.department === 'Installation' ? 'insulation' : 'general',
            hourlyRate: worker.role === 'field_supervisor' ? 65.00 : 45.00,
            regularPay: regularHours * (worker.role === 'field_supervisor' ? 65.00 : 45.00),
            overtimePay: overtimeHours * (worker.role === 'field_supervisor' ? 97.50 : 67.50),
            totalPay: (regularHours * (worker.role === 'field_supervisor' ? 65.00 : 45.00)) + 
                     (overtimeHours * (worker.role === 'field_supervisor' ? 97.50 : 67.50)),
            status: date < new Date('2024-05-01') ? 'approved' : 'submitted',
            approvedBy: date < new Date('2024-05-01') ? users.find(u => u.role === 'project_manager')._id : undefined,
            approvedDate: date < new Date('2024-05-01') ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined
          });
        }
      }
    }
    
    const createdTimelogs = await TimelogRegister.create(timelogEntries.slice(0, 50)); // Limit for performance
    log(`✅ Created ${createdTimelogs.length} comprehensive timelog entries`, colors.green);
    
    // 4. CREATE MONTHLY PROGRESS REPORTS
    const progressReports = await ProgressReport.create([
      // March 2024 Progress Report
      {
        reportNumber: 'PR-VAV-2024-03',
        reportDate: new Date('2024-03-31'),
        reportPeriodStart: new Date('2024-03-01'),
        reportPeriodEnd: new Date('2024-03-31'),
        jobId: vavJob._id,
        projectId: project._id,
        lineItems: sovEntries.slice(0, 3).map(sov => ({
          scheduleOfValuesId: sov._id,
          lineNumber: sov.lineNumber,
          costCode: sov.costCode,
          description: sov.description,
          totalContractValue: sov.scheduledValue,
          previouslyCompleted: 0,
          completedThisPeriod: sov.lineNumber === '001' ? 85500 : (sov.lineNumber === '003' ? 56160 : 0),
          totalCompleted: sov.lineNumber === '001' ? 85500 : (sov.lineNumber === '003' ? 56160 : 0),
          percentComplete: sov.lineNumber === '001' ? 50 : (sov.lineNumber === '003' ? 40 : 0),
          balanceToFinish: sov.lineNumber === '001' ? 85500 : (sov.lineNumber === '003' ? 84240 : sov.scheduledValue)
        })),
        totalScheduledValue: 455400,
        totalPreviouslyCompleted: 0,
        totalCompletedThisPeriod: 141660,
        totalCompleted: 141660,
        overallPercentComplete: 31,
        totalBalanceToFinish: 313740,
        totalRetainage: 14166,
        weatherDays: 2,
        workingDays: 21,
        manHoursThisPeriod: 504,
        cumulativeManHours: 504,
        safetyIncidents: 0,
        qualityIssues: 0,
        scheduleVariance: 2, // 2 days ahead
        costVariance: -1500, // Under budget
        reportedBy: users.find(u => u.role === 'field_supervisor')._id,
        reviewedBy: users.find(u => u.role === 'project_manager')._id,
        status: 'approved'
      },
      
      // April 2024 Progress Report
      {
        reportNumber: 'PR-VAV-2024-04',
        reportDate: new Date('2024-04-30'),
        reportPeriodStart: new Date('2024-04-01'),
        reportPeriodEnd: new Date('2024-04-30'),
        jobId: vavJob._id,
        projectId: project._id,
        lineItems: sovEntries.slice(0, 4).map(sov => ({
          scheduleOfValuesId: sov._id,
          lineNumber: sov.lineNumber,
          costCode: sov.costCode,
          description: sov.description,
          totalContractValue: sov.scheduledValue,
          previouslyCompleted: sov.lineNumber === '001' ? 85500 : (sov.lineNumber === '003' ? 56160 : 0),
          completedThisPeriod: sov.lineNumber === '001' ? 42750 : 
                              (sov.lineNumber === '002' ? 28800 : 
                               sov.lineNumber === '003' ? 42120 : 
                               sov.lineNumber === '004' ? 28917 : 0),
          totalCompleted: sov.totalCompleted,
          percentComplete: sov.percentComplete,
          balanceToFinish: sov.balanceToFinish
        })),
        totalScheduledValue: 551790,
        totalPreviouslyCompleted: 141660,
        totalCompletedThisPeriod: 142587,
        totalCompleted: 284247,
        overallPercentComplete: 52,
        totalBalanceToFinish: 267543,
        totalRetainage: 28424,
        weatherDays: 3,
        workingDays: 20,
        manHoursThisPeriod: 640,
        cumulativeManHours: 1144,
        safetyIncidents: 1, // Minor incident recorded
        qualityIssues: 0,
        scheduleVariance: 1, // 1 day ahead
        costVariance: -2300, // Under budget
        reportedBy: users.find(u => u.role === 'field_supervisor')._id,
        reviewedBy: users.find(u => u.role === 'project_manager')._id,
        status: 'approved'
      },
      
      // May 2024 Progress Report
      {
        reportNumber: 'PR-VAV-2024-05',
        reportDate: new Date('2024-05-31'),
        reportPeriodStart: new Date('2024-05-01'),
        reportPeriodEnd: new Date('2024-05-31'),
        jobId: vavJob._id,
        projectId: project._id,
        lineItems: sovEntries.slice(0, 4).map(sov => ({
          scheduleOfValuesId: sov._id,
          lineNumber: sov.lineNumber,
          costCode: sov.costCode,
          description: sov.description,
          totalContractValue: sov.scheduledValue,
          previouslyCompleted: sov.totalCompleted - (sov.completedThisPeriod || 0),
          completedThisPeriod: sov.lineNumber === '004' ? 19278 : 0,
          totalCompleted: sov.totalCompleted,
          percentComplete: sov.percentComplete,
          balanceToFinish: sov.balanceToFinish
        })),
        totalScheduledValue: 551790,
        totalPreviouslyCompleted: 284247,
        totalCompletedThisPeriod: 19278,
        totalCompleted: 303525,
        overallPercentComplete: 55,
        totalBalanceToFinish: 248265,
        totalRetainage: 30352,
        weatherDays: 4,
        workingDays: 19,
        manHoursThisPeriod: 456,
        cumulativeManHours: 1600,
        safetyIncidents: 0,
        qualityIssues: 1, // Quality issue with VAV calibration
        scheduleVariance: 0, // On schedule
        costVariance: -800, // Slightly under budget
        reportedBy: users.find(u => u.role === 'field_supervisor')._id,
        reviewedBy: users.find(u => u.role === 'project_manager')._id,
        status: 'submitted' // Latest report pending approval
      }
    ]);
    
    log(`✅ Created ${progressReports.length} monthly progress reports`, colors.green);
    
    // 5. CREATE ADDITIONAL REALISTIC TIME ENTRIES FOR VAV JOB
    const additionalTimeEntries = [];
    
    // Recent detailed time entries for May 2024
    const recentDates = [
      new Date('2024-05-15'),
      new Date('2024-05-16'),
      new Date('2024-05-17'),
      new Date('2024-05-20'),
      new Date('2024-05-21')
    ];
    
    for (const date of recentDates) {
      // Tony Castellano (Field Supervisor) entries
      additionalTimeEntries.push({
        userId: users.find(u => u.name === 'Tony Castellano')._id,
        jobId: vavJob._id,
        taskId: null, // General job supervision
        date: date,
        startTime: '06:30',
        endTime: '16:00',
        regularHours: 8,
        overtimeHours: 1.5,
        totalHours: 9.5,
        workerId: users.find(u => u.name === 'Tony Castellano')._id,
        craft: 'general',
        costCode: 'VAV-SUPER-001',
        workDescription: 'Field supervision of VAV installation team, quality control, and coordination with building management',
        status: 'submitted'
      });
      
      // Jake Thompson (HVAC Technician) entries
      additionalTimeEntries.push({
        userId: users.find(u => u.name === 'Jake Thompson')._id,
        jobId: vavJob._id,
        taskId: null,
        date: date,
        startTime: '07:00',
        endTime: '15:30',
        regularHours: 8,
        overtimeHours: 0.5,
        totalHours: 8.5,
        workerId: users.find(u => u.name === 'Jake Thompson')._id,
        craft: 'general',
        costCode: 'VAV-UNITS-002',
        workDescription: 'Installed high-pressure VAV units on floor ' + (7 + (date.getDate() % 6)) + ', connected ductwork and performed initial testing',
        status: 'submitted'
      });
      
      // Maria Santos (Insulation Specialist) entries
      additionalTimeEntries.push({
        userId: users.find(u => u.name === 'Maria Santos')._id,
        jobId: vavJob._id,
        taskId: null,
        date: date,
        startTime: '07:00',
        endTime: '15:30',
        regularHours: 8,
        overtimeHours: 0.5,
        totalHours: 8.5,
        workerId: users.find(u => u.name === 'Maria Santos')._id,
        craft: 'insulation',
        costCode: 'VAV-INSUL-001',
        workDescription: 'Applied insulation to VAV unit connections and ductwork, ensured proper vapor barrier installation',
        status: 'submitted'
      });
    }
    
    const createdTimeEntries = await TimeEntry.create(additionalTimeEntries);
    log(`✅ Created ${createdTimeEntries.length} detailed time entries for VAV job`, colors.green);
    
    log('\n🎉 VAV Job comprehensive data creation completed!', colors.green);
    
    // Display summary
    log('\n📊 VAV TERMINAL INSTALLATION JOB SUMMARY:', colors.bright);
    log(`🔧 Job: ${vavJob.name} (${vavJob.jobNumber})`, colors.cyan);
    log(`💰 Contract Value: $${vavJob.contractValue.toLocaleString()}`, colors.cyan);
    log(`📋 SOV Line Items: ${sovEntries.length}`, colors.cyan);
    log(`📄 AP Register Entries: ${apEntries.length}`, colors.cyan);
    log(`⏰ Timelog Entries: ${createdTimelogs.length}`, colors.cyan);
    log(`📈 Progress Reports: ${progressReports.length}`, colors.cyan);
    log(`🕐 Additional Time Entries: ${createdTimeEntries.length}`, colors.cyan);
    
    log('\n💡 KEY FEATURES DEMONSTRATED:', colors.bright);
    log('• Detailed SOV breakdown with realistic costs and progress', colors.magenta);
    log('• Comprehensive AP Register with vendor management', colors.magenta);
    log('• Daily timelog tracking with cost code allocation', colors.magenta);
    log('• Monthly progress reports with variance tracking', colors.magenta);
    log('• Multi-craft workforce with realistic pay rates', colors.magenta);
    log('• 3-month project progression with realistic milestones', colors.magenta);
    
    log('\n🎯 READY FOR TESTING:', colors.bright);
    log('• SOV Setup and line item management', colors.yellow);
    log('• AP Register workflow and vendor tracking', colors.yellow);
    log('• Timelog Register with cost code reporting', colors.yellow);
    log('• Progress reporting and variance analysis', colors.yellow);
    log('• Financial controls and retention management', colors.yellow);
    
  } catch (error) {
    log(`❌ Error creating VAV job data: ${error.message}`, colors.red);
    throw error;
  } finally {
    await mongoose.connection.close();
    log('\n🔌 Database connection closed.', colors.blue);
  }
}

// Run the VAV job data creation
if (require.main === module) {
  createVAVJobData().catch(console.error);
}

module.exports = { createVAVJobData };
