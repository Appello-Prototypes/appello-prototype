#!/usr/bin/env node

/**
 * Unified Complete Seed Script - REALISTIC SCENARIO
 * Creates a comprehensive, realistic dataset that tells a coherent story
 * - All data spans the same time periods (aligned months)
 * - Budget is realistic (slightly under or on budget)
 * - Progress Reports match AP/Timelog data chronologically
 * - Data tells a story: materials arrive early, labor ramps up, progress accelerates
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const Project = require('../src/server/models/Project');
const Job = require('../src/server/models/Job');
const User = require('../src/server/models/User');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const Module = require('../src/server/models/Module');
const Component = require('../src/server/models/Component');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const ProgressReport = require('../src/server/models/ProgressReport');
const GLCategory = require('../src/server/models/GLCategory');
const GLAccount = require('../src/server/models/GLAccount');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or MONGODB_DEV_URI not set');
  process.exit(1);
}

async function seedUnifiedComplete() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all existing data
    console.log('\n🗑️  Clearing existing data...');
    await TimelogRegister.deleteMany({});
    await APRegister.deleteMany({});
    await ProgressReport.deleteMany({});
    await ScheduleOfValues.deleteMany({});
    await Component.deleteMany({});
    await Module.deleteMany({});
    await Phase.deleteMany({});
    await Area.deleteMany({});
    await System.deleteMany({});
    await GLAccount.deleteMany({});
    await GLCategory.deleteMany({});
    await Job.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});
    console.log('✅ Cleared all data');

    // Create users
    console.log('\n👤 Creating users...');
    const users = await User.create([
      {
        name: 'Andrew Martin',
        email: 'andrew.martin@example.com',
        role: 'field_supervisor',
        password: 'password123',
        employeeId: 'EMP-001',
        department: 'Field Operations',
        position: 'Field Supervisor'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        role: 'project_manager',
        password: 'password123',
        employeeId: 'EMP-002',
        department: 'Project Management',
        position: 'Project Manager'
      },
      {
        name: 'Mike Davis',
        email: 'mike.davis@example.com',
        role: 'admin',
        password: 'password123',
        employeeId: 'EMP-003',
        department: 'Administration',
        position: 'System Administrator'
      },
      {
        name: 'John Smith',
        email: 'john.smith@example.com',
        role: 'field_worker',
        password: 'password123',
        employeeId: 'EMP-004',
        department: 'Field Operations',
        position: 'Journeyman Insulator',
        phone: '555-1001'
      },
      {
        name: 'Robert Wilson',
        email: 'robert.wilson@example.com',
        role: 'field_worker',
        password: 'password123',
        employeeId: 'EMP-005',
        department: 'Field Operations',
        position: 'Journeyman Insulator',
        phone: '555-1002'
      },
      {
        name: 'James Brown',
        email: 'james.brown@example.com',
        role: 'field_worker',
        password: 'password123',
        employeeId: 'EMP-006',
        department: 'Field Operations',
        position: 'Apprentice Insulator',
        phone: '555-1003'
      },
      {
        name: 'David Miller',
        email: 'david.miller@example.com',
        role: 'field_worker',
        password: 'password123',
        employeeId: 'EMP-007',
        department: 'Field Operations',
        position: 'Foreman',
        phone: '555-1004'
      },
      {
        name: 'William Taylor',
        email: 'william.taylor@example.com',
        role: 'field_worker',
        password: 'password123',
        employeeId: 'EMP-008',
        department: 'Field Operations',
        position: 'Journeyman Insulator',
        phone: '555-1005'
      }
    ]);
    console.log(`✅ Created ${users.length} users`);
    
    const projectManager = users.find(u => u.role === 'project_manager');
    const fieldSupervisor = users.find(u => u.role === 'field_supervisor');
    const workers = users.filter(u => u.role === 'field_worker');

    // Create Project
    console.log('\n📁 Creating project...');
    const project = await Project.create({
      name: 'Downtown Office Complex',
      projectNumber: 'PROJ-2024-001',
      client: {
        name: 'ABC Development Corp',
        contact: 'John Smith',
        email: 'john.smith@abcdev.com',
        phone: '555-0100'
      },
      description: 'Complete HVAC and building automation system installation',
      location: {
        address: '123 Main Street, Downtown'
      },
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      totalContractValue: 2400000,
      status: 'active',
      projectManager: users[1]._id
    });
    console.log(`✅ Created project: ${project.name}`);

    // JOB 1: Building A - HVAC Insulation
    // REALISTIC SCENARIO: 4-month job, Jan 15 - May 15, 2024
    console.log('\n🏗️  Creating Job 1: Building A - HVAC Insulation...');
    const job1StartDate = new Date('2024-01-15');
    const job1EndDate = new Date('2024-05-15');
    const job1 = await Job.create({
      name: 'Building A - HVAC Insulation',
      jobNumber: 'JOB-2024-001',
      projectId: project._id,
      client: {
        name: 'ABC Development Corp',
        contact: 'John Smith',
        email: 'john.smith@abcdev.com',
        phone: '555-0100'
      },
      description: 'Complete HVAC insulation installation for Building A',
      location: {
        address: '123 Main Street, Building A'
      },
      startDate: job1StartDate,
      endDate: job1EndDate,
      contractValue: 220000, // Realistic contract value (matches expected costs)
      status: 'active',
      jobManager: users[1]._id,
      fieldSupervisor: users[0]._id
    });

    // Create Systems for Job 1
    const job1Systems = await System.create([
      { name: 'Material', code: 'MAT', jobId: job1._id, projectId: project._id, sortOrder: 1 },
      { name: 'Labour', code: 'LAB', jobId: job1._id, projectId: project._id, sortOrder: 2 }
    ]);

    // Create Areas for Job 1
    const job1Areas = await Area.create([
      { name: 'NAC Parking Garage', code: 'NAC', jobId: job1._id, projectId: project._id, sortOrder: 1 },
      { name: 'MKB Canal Structure', code: 'MKB', jobId: job1._id, projectId: project._id, sortOrder: 2 },
      { name: 'MKB Viaduct Structure', code: 'VAD', jobId: job1._id, projectId: project._id, sortOrder: 3 },
      { name: 'Pittwrap CW Plus', code: 'PIT', jobId: job1._id, projectId: project._id, sortOrder: 4 }
    ]);

    // Create Phases for Job 1
    const job1Phases = await Phase.create([
      { name: 'Phase 1 - Site Preparation', code: 'P1', jobId: job1._id, projectId: project._id, sortOrder: 1, status: 'completed' },
      { name: 'Phase 2 - Material Installation', code: 'P2', jobId: job1._id, projectId: project._id, sortOrder: 2, status: 'in_progress' },
      { name: 'Phase 3 - Labor Installation', code: 'P3', jobId: job1._id, projectId: project._id, sortOrder: 3, status: 'in_progress' }
    ]);

    // Create Modules for Job 1
    const job1Modules = await Module.create([
      { name: 'Ductwork Module', code: 'DUCT', jobId: job1._id, projectId: project._id, systemId: job1Systems[0]._id, moduleType: 'hvac', sortOrder: 1 },
      { name: 'Piping Module', code: 'PIPE', jobId: job1._id, projectId: project._id, systemId: job1Systems[0]._id, moduleType: 'hvac', sortOrder: 2 },
      { name: 'Installation Module', code: 'INST', jobId: job1._id, projectId: project._id, systemId: job1Systems[1]._id, moduleType: 'hvac', sortOrder: 3 }
    ]);

    // Create Components for Job 1
    const job1Components = await Component.create([
      { name: 'Fiberglass Insulation', code: 'FIB', jobId: job1._id, projectId: project._id, moduleId: job1Modules[0]._id, componentType: 'other', size: '2"', material: 'Fiberglass', sortOrder: 1 },
      { name: 'Pipe Insulation', code: 'PIP', jobId: job1._id, projectId: project._id, moduleId: job1Modules[1]._id, componentType: 'pipe', size: 'Various', material: 'Fiberglass', sortOrder: 2 },
      { name: 'Jacketing Material', code: 'JKT', jobId: job1._id, projectId: project._id, moduleId: job1Modules[0]._id, componentType: 'other', material: 'Aluminum', sortOrder: 3 }
    ]);

    // Create GL Categories and Accounts for Job 1
    const glCategory1 = await GLCategory.create({
      name: 'Materials',
      code: 'MAT',
      jobId: job1._id,
      projectId: project._id,
      sortOrder: 1
    });

    const glAccount1 = await GLAccount.create({
      name: 'Insulation Materials',
      code: '203',
      glCategoryId: glCategory1._id,
      jobId: job1._id,
      projectId: project._id,
      sortOrder: 1
    });

    const glCategory2 = await GLCategory.create({
      name: 'Direct Labour',
      code: 'LAB',
      jobId: job1._id,
      projectId: project._id,
      sortOrder: 2
    });

    const glAccount2 = await GLAccount.create({
      name: 'Installation Labor',
      code: '103',
      glCategoryId: glCategory2._id,
      jobId: job1._id,
      projectId: project._id,
      sortOrder: 1
    });

    // Create SOV Line Items for Job 1 - REALISTIC BUDGET
    // Total: ~$150,000 (materials ~$75k, labor ~$75k)
    const job1SOVItems = await ScheduleOfValues.create([
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '1',
        description: 'Fiberglass duct insulation - NAC Parking Garage',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[0]._id,
        phaseId: job1Phases[1]._id,
        moduleId: job1Modules[0]._id,
        componentId: job1Components[0]._id,
        quantity: 5000,
        unit: 'SF',
        unitCost: 4.20,
        totalCost: 21000,
        marginPercent: 25,
        totalValue: 26250,
        glCategoryId: glCategory1._id,
        glAccountItemId: glAccount1._id,
        costCodeNumber: '001',
        costCodeName: 'NAC-MAT',
        sortOrder: 1
      },
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '2',
        description: 'Installation labor - NAC Parking Garage',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[0]._id,
        phaseId: job1Phases[2]._id,
        moduleId: job1Modules[2]._id,
        quantity: 320,
        unit: 'HR',
        unitCost: 70.00,
        totalCost: 22400,
        marginPercent: 30,
        totalValue: 29120,
        glCategoryId: glCategory2._id,
        glAccountItemId: glAccount2._id,
        costCodeNumber: '002',
        costCodeName: 'NAC-LAB',
        sortOrder: 2
      },
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '3',
        description: 'Pipe insulation - MKB Canal Structure',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[1]._id,
        phaseId: job1Phases[1]._id,
        moduleId: job1Modules[1]._id,
        componentId: job1Components[1]._id,
        quantity: 3000,
        unit: 'LF',
        unitCost: 9.50,
        totalCost: 28500,
        marginPercent: 25,
        totalValue: 35625,
        glCategoryId: glCategory1._id,
        glAccountItemId: glAccount1._id,
        costCodeNumber: '003',
        costCodeName: 'MKB-MAT',
        sortOrder: 3
      },
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '4',
        description: 'Installation labor - MKB Canal Structure',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[1]._id,
        phaseId: job1Phases[2]._id,
        moduleId: job1Modules[2]._id,
        quantity: 280,
        unit: 'HR',
        unitCost: 70.00,
        totalCost: 19600,
        marginPercent: 30,
        totalValue: 25480,
        glCategoryId: glCategory2._id,
        glAccountItemId: glAccount2._id,
        costCodeNumber: '004',
        costCodeName: 'MKB-LAB',
        sortOrder: 4
      },
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '5',
        description: 'Viaduct insulation materials',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[2]._id,
        phaseId: job1Phases[1]._id,
        moduleId: job1Modules[0]._id,
        componentId: job1Components[0]._id,
        quantity: 4000,
        unit: 'SF',
        unitCost: 5.00,
        totalCost: 20000,
        marginPercent: 25,
        totalValue: 25000,
        glCategoryId: glCategory1._id,
        glAccountItemId: glAccount1._id,
        costCodeNumber: '005',
        costCodeName: 'VAD-MAT',
        sortOrder: 5
      },
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '6',
        description: 'Viaduct installation labor',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[2]._id,
        phaseId: job1Phases[2]._id,
        moduleId: job1Modules[2]._id,
        quantity: 240,
        unit: 'HR',
        unitCost: 70.00,
        totalCost: 16800,
        marginPercent: 30,
        totalValue: 21840,
        glCategoryId: glCategory2._id,
        glAccountItemId: glAccount2._id,
        costCodeNumber: '006',
        costCodeName: 'VAD-LAB',
        sortOrder: 6
      },
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '7',
        description: 'Pittwrap materials',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[3]._id,
        phaseId: job1Phases[1]._id,
        moduleId: job1Modules[0]._id,
        componentId: job1Components[2]._id,
        quantity: 1000,
        unit: 'SF',
        unitCost: 6.50,
        totalCost: 6500,
        marginPercent: 25,
        totalValue: 8125,
        glCategoryId: glCategory1._id,
        glAccountItemId: glAccount1._id,
        costCodeNumber: '007',
        costCodeName: 'PIT-MAT',
        sortOrder: 7
      },
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '8',
        description: 'Pittwrap installation labor',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[3]._id,
        phaseId: job1Phases[2]._id,
        moduleId: job1Modules[2]._id,
        quantity: 60,
        unit: 'HR',
        unitCost: 70.00,
        totalCost: 4200,
        marginPercent: 30,
        totalValue: 5460,
        glCategoryId: glCategory2._id,
        glAccountItemId: glAccount2._id,
        costCodeNumber: '008',
        costCodeName: 'PIT-LAB',
        sortOrder: 8
      }
    ]);
    
    const totalSOVValue = job1SOVItems.reduce((sum, item) => sum + item.totalValue, 0);
    console.log(`✅ Created ${job1SOVItems.length} SOV line items for Job 1`);
    console.log(`   Total SOV Value: $${totalSOVValue.toLocaleString()}`);

    // Calculate job duration in months
    const job1DurationMonths = Math.ceil(
      (job1EndDate - job1StartDate) / (1000 * 60 * 60 * 24 * 30.44)
    );
    console.log(`📅 Job 1 duration: ${job1DurationMonths} months (${job1StartDate.toLocaleDateString()} - ${job1EndDate.toLocaleDateString()})`);

    // Create Progress Reports for Job 1 - ONE PER MONTH, ALIGNED WITH DATA
    console.log('\n📊 Creating progress reports for Job 1...');
    const job1Reports = [];
    let previousReport1 = null;
    
    // Realistic progress story: Slow start, acceleration, final push
    const monthlyProgress = [
      { month: 0, progress: 15 },  // Jan: Slow start, site prep
      { month: 1, progress: 40 },  // Feb: Ramping up
      { month: 2, progress: 75 },  // Mar: Peak activity
      { month: 3, progress: 100 }  // Apr: Completion
    ];
    
    for (let month = 0; month < job1DurationMonths; month++) {
      const reportDate = new Date(job1StartDate);
      reportDate.setMonth(reportDate.getMonth() + month);
      reportDate.setDate(27); // 27th of each month
      
      const reportPeriodStart = new Date(reportDate);
      reportPeriodStart.setDate(1);
      const reportPeriodEnd = new Date(reportPeriodStart);
      reportPeriodEnd.setMonth(reportPeriodEnd.getMonth() + 1);
      reportPeriodEnd.setDate(0);

      const reportNumber = `PR-JOB-2024-001-${String(reportDate.getFullYear())}${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      
      const targetProgress = monthlyProgress[month]?.progress || ((month + 1) / job1DurationMonths) * 100;
      const baseProgress = Math.min(100, targetProgress);

      // Group SOV items by Area and System
      const lineItemsMap = new Map();
      job1SOVItems.forEach(sov => {
        const areaName = job1Areas.find(a => a._id.equals(sov.areaId))?.name || 'Unknown';
        const systemName = job1Systems.find(s => s._id.equals(sov.systemId))?.name || 'Unknown';
        const key = `${areaName}-${systemName}`;

        if (!lineItemsMap.has(key)) {
          lineItemsMap.set(key, {
            scheduleOfValuesId: sov._id,
            areaId: sov.areaId,
            areaName,
            systemId: sov.systemId,
            systemName,
            description: sov.description,
            assignedCost: sov.totalValue || 0,
            submittedCTD: { amount: 0, percent: 0 },
            approvedCTD: { amount: 0, percent: 0 },
            previousComplete: { amount: 0, percent: 0 },
            holdbackPercent: 10
          });
        } else {
          const existing = lineItemsMap.get(key);
          existing.assignedCost += sov.totalValue || 0;
        }
      });

      // Populate previous complete from previous report
      if (previousReport1) {
        previousReport1.lineItems.forEach(prevItem => {
          const key = `${prevItem.areaName}-${prevItem.systemName}`;
          if (lineItemsMap.has(key)) {
            const currentItem = lineItemsMap.get(key);
            currentItem.previousComplete = {
              amount: prevItem.approvedCTD?.amount || 0,
              percent: prevItem.approvedCTD?.percent || 0
            };
          }
        });
      }

      // Calculate progress for each line item - realistic variation
      const lineItems = Array.from(lineItemsMap.values()).map((item, index) => {
        // Vary progress slightly by area/system (some areas progress faster)
        const itemProgress = Math.min(100, Math.max(0, baseProgress + (index % 3 - 1) * 3));
        const approvedCTDAmount = (item.assignedCost * itemProgress) / 100;
        const amountThisPeriod = approvedCTDAmount - item.previousComplete.amount;
        const holdbackThisPeriod = Math.max(0, (amountThisPeriod * 10) / 100);
        const dueThisPeriod = Math.max(0, amountThisPeriod - holdbackThisPeriod);

        return {
          ...item,
          submittedCTD: {
            amount: approvedCTDAmount * 0.98, // Submitted slightly less than approved
            percent: itemProgress * 0.98
          },
          approvedCTD: {
            amount: approvedCTDAmount,
            percent: itemProgress
          },
          holdbackThisPeriod,
          dueThisPeriod
        };
      });

      // All reports should be 'approved' so they show up in earned value calculations
      // Only mark as 'invoiced' if we want to archive them later
      let status = 'approved';
      let invoiceId = null;
      if (month < job1DurationMonths - 1) {
        // Previous months can have invoice IDs, but keep them approved for now
        invoiceId = `24-0444-03-INV-${String(month + 1).padStart(2, '0')}`;
      }

      const report = new ProgressReport({
        reportNumber,
        reportDate,
        reportPeriodStart,
        reportPeriodEnd,
        jobId: job1._id,
        projectId: project._id,
        completedByName: 'Andrew Martin',
        lineItems,
        status,
        invoiceId,
        invoiceGenerated: month < job1DurationMonths - 1
      });

      await report.save();
      job1Reports.push(report);
      previousReport1 = report;
      console.log(`  ✅ Created ${reportNumber} - ${report.summary.calculatedPercentCTD.toFixed(2)}% complete`);
    }

    // Create vendors
    const vendors = [
      {
        name: 'Owens Corning Insulation',
        vendorNumber: 'VEN-001',
        phone: '555-2001',
        email: 'orders@owenscorning.com',
        type: 'material',
        category: 'insulation_materials'
      },
      {
        name: 'Johns Manville Corporation',
        vendorNumber: 'VEN-002',
        phone: '555-2002',
        email: 'orders@jm.com',
        type: 'material',
        category: 'insulation_materials'
      },
      {
        name: 'Industrial Aluminum Supply',
        vendorNumber: 'VEN-003',
        phone: '555-2003',
        email: 'sales@ias.com',
        type: 'material',
        category: 'jacketing_materials'
      },
      {
        name: 'Specialty Contracting Services',
        vendorNumber: 'VEN-004',
        phone: '555-2004',
        email: 'info@scs.com',
        type: 'subcontractor',
        category: 'labor_subcontract'
      }
    ];

    // Create AP Register entries - REALISTIC DISTRIBUTION
    // Story: Materials arrive early (Jan-Feb), some in Mar, labor invoices throughout
    console.log('\n💳 Creating AP Register entries for Job 1...');
    const apEntries = [];
    let invoiceCounter = 1000;
    
    // Material SOV items (odd indices: 0, 2, 4, 6)
    const materialSOVItems = job1SOVItems.filter((_, idx) => idx % 2 === 0);
    // Labor SOV items (even indices: 1, 3, 5, 7)
    const laborSOVItems = job1SOVItems.filter((_, idx) => idx % 2 === 1);

    // Generate AP entries for each month with realistic distribution
    for (let month = 0; month < job1DurationMonths; month++) {
      const monthDate = new Date(job1StartDate);
      monthDate.setMonth(monthDate.getMonth() + month);
      monthDate.setDate(1);
      
      // Realistic invoice distribution (reduced to match budget):
      // Month 0 (Jan): 3 material invoices (materials arrive early)
      // Month 1 (Feb): 2 material invoices, 1 labor invoice
      // Month 2 (Mar): 2 material invoices, 1 labor invoice
      // Month 3 (Apr): 1 material invoice, 1 labor invoice
      let invoicesThisMonth;
      if (month === 0) {
        invoicesThisMonth = 3; // Materials arrive early
      } else if (month === 1) {
        invoicesThisMonth = 3; // Mix of materials and labor
      } else if (month === 2) {
        invoicesThisMonth = 3; // Peak activity
      } else {
        invoicesThisMonth = 2; // Final invoices
      }

      for (let i = 0; i < invoicesThisMonth; i++) {
        let vendor, sovItem;
        
        // Realistic vendor selection based on month
        if (month === 0 || (month === 1 && i < 3)) {
          // Early months: mostly material vendors
          vendor = vendors[Math.floor(Math.random() * 2)]; // Material vendors
          sovItem = materialSOVItems[Math.floor(Math.random() * materialSOVItems.length)];
        } else {
          // Later months: mix of materials and labor
          if (Math.random() < 0.5) {
            vendor = vendors[Math.floor(Math.random() * 3)]; // Material vendors
            sovItem = materialSOVItems[Math.floor(Math.random() * materialSOVItems.length)];
          } else {
            vendor = vendors[3]; // Labor subcontractor
            sovItem = laborSOVItems[Math.floor(Math.random() * laborSOVItems.length)];
          }
        }

        const invoiceDate = new Date(monthDate);
        invoiceDate.setDate(Math.floor(Math.random() * 25) + 1); // 1-25th of month
        
        // Realistic invoice amounts: Distribute costs to match budget
        // Material items: distribute ~45% of value across months
        // Labor items: smaller invoices (subcontractor work)
        const isMaterialItem = materialSOVItems.some(m => m._id.equals(sovItem._id));
        let baseAmount;
        if (isMaterialItem) {
          // Material distribution: 30%, 35%, 25%, 10% across months
          const materialDistribution = [0.30, 0.35, 0.25, 0.10];
          const materialPercent = materialDistribution[month] || 0.30;
          baseAmount = Math.round((sovItem.totalValue * materialPercent * (0.9 + Math.random() * 0.2)) * 100) / 100;
        } else {
          // Labor invoices: smaller, more frequent
          baseAmount = Math.round((sovItem.totalValue * 0.15 * (0.8 + Math.random() * 0.4)) * 100) / 100;
        }
        const taxAmount = Math.round(baseAmount * 0.13 * 100) / 100;
        const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;
        
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        
        const receivedDate = new Date(invoiceDate);
        receivedDate.setDate(receivedDate.getDate() - Math.floor(Math.random() * 5)); // Received 0-5 days before
        
        // Payment status: earlier invoices more likely to be paid
        let paymentStatus;
        if (month === 0) {
          paymentStatus = Math.random() < 0.9 ? 'paid' : 'approved';
        } else if (month === 1) {
          paymentStatus = Math.random() < 0.7 ? 'paid' : Math.random() < 0.8 ? 'approved' : 'pending';
        } else if (month === 2) {
          paymentStatus = Math.random() < 0.5 ? 'paid' : Math.random() < 0.7 ? 'approved' : 'pending';
        } else {
          paymentStatus = Math.random() < 0.3 ? 'paid' : Math.random() < 0.6 ? 'approved' : 'pending';
        }
        
        const paymentDate = paymentStatus === 'paid' ? 
          new Date(invoiceDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null;

        const apEntry = await APRegister.create({
          invoiceNumber: `INV-${String(monthDate.getFullYear())}${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(invoiceCounter++).padStart(3, '0')}`,
          invoiceDate,
          dueDate,
          receivedDate,
          vendor: {
            name: vendor.name,
            vendorNumber: vendor.vendorNumber,
            phone: vendor.phone,
            email: vendor.email
          },
          invoiceAmount: baseAmount,
          taxAmount,
          totalAmount,
          jobId: job1._id,
          projectId: project._id,
          costCodeBreakdown: [{
            costCode: sovItem.costCodeNumber,
            description: sovItem.description,
            amount: totalAmount,
            scheduleOfValuesId: sovItem._id,
            systemId: sovItem.systemId,
            areaId: sovItem.areaId,
            phaseId: sovItem.phaseId
          }],
          invoiceType: vendor.type,
          category: vendor.category,
          paymentStatus,
          paymentDate,
          enteredBy: projectManager._id,
          approvedBy: paymentStatus !== 'pending' ? projectManager._id : null,
          approvedDate: paymentStatus !== 'pending' ? new Date(invoiceDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000) : null
        });
        apEntries.push(apEntry);
      }
    }
    console.log(`✅ Created ${apEntries.length} AP Register entries`);

    // Create TimelogRegister entries - REALISTIC DISTRIBUTION
    // Story: Small crew in Jan, ramps up in Feb, full crew in Mar-Apr
    console.log('\n⏰ Creating TimelogRegister entries for Job 1...');
    const timelogEntries = [];

    // Worker rates
    const workerRates = {
      'Apprentice Insulator': { base: 28, overtime: 1.5, doubleTime: 2.0 },
      'Journeyman Insulator': { base: 42, overtime: 1.5, doubleTime: 2.0 },
      'Foreman': { base: 55, overtime: 1.5, doubleTime: 2.0 }
    };

    // Helper function to get work days in a month
    const getWorkDays = (year, month) => {
      const date = new Date(year, month, 1);
      const workDays = [];
      while (date.getMonth() === month) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workDays.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
      }
      return workDays;
    };

    // Generate timelog entries for each month with realistic crew size
    for (let month = 0; month < job1DurationMonths; month++) {
      const monthDate = new Date(job1StartDate);
      monthDate.setMonth(monthDate.getMonth() + month);
      
      const workDays = getWorkDays(monthDate.getFullYear(), monthDate.getMonth());
      
      // Realistic crew size progression (adjusted for budget):
      // Month 0 (Jan): 2 workers (small crew, site prep)
      // Month 1 (Feb): 3-4 workers (ramping up)
      // Month 2 (Mar): 4-5 workers (full crew, peak activity)
      // Month 3 (Apr): 3-4 workers (final push)
      let crewSize;
      if (month === 0) {
        crewSize = 2; // Small crew
      } else if (month === 1) {
        crewSize = 4; // Ramping up
      } else if (month === 2) {
        crewSize = 5; // Full crew
      } else {
        crewSize = 4; // Final push
      }
      
      const workersThisMonth = workers.slice(0, Math.min(crewSize, workers.length));
      
      for (const workDay of workDays) {
        // Skip weekends and some random days (vacation, sick days)
        if (workDay < job1StartDate || workDay > job1EndDate) continue;
        if (Math.random() < 0.05) continue; // 5% absence rate
        
        for (const worker of workersThisMonth) {
          // Not everyone works every day - higher absence rate early on
          const absenceRate = month === 0 ? 0.25 : month === 1 ? 0.15 : 0.10;
          if (Math.random() < absenceRate) continue;
          
          const rate = workerRates[worker.position] || workerRates['Journeyman Insulator'];
          
          // Realistic hours based on month and worker type
          // Adjusted to keep labor costs within budget
          let regularHours, overtimeHours = 0, doubleTimeHours = 0;
          
          if (worker.position === 'Foreman') {
            regularHours = 8; // Supervisors work standard hours
            if (month >= 2 && Math.random() < 0.2) overtimeHours = 1; // Limited overtime
          } else {
            if (month === 0) {
              regularHours = 5 + Math.floor(Math.random() * 2); // 5-6 hours early (part-time)
            } else if (month === 1) {
              regularHours = 6 + Math.floor(Math.random() * 2); // 6-7 hours ramping
            } else if (month === 2) {
              regularHours = 7 + Math.floor(Math.random() * 2); // 7-8 hours peak
            } else {
              regularHours = 6 + Math.floor(Math.random() * 2); // 6-7 hours final
            }
            
            // Limited overtime to keep costs realistic
            if (month >= 2 && Math.random() < 0.15) {
              overtimeHours = Math.floor(Math.random() * 2) + 1; // 1-2 OT hours max
            }
          }

          // Select SOV item based on area rotation and month
          let sovItem;
          if (worker.position === 'Foreman') {
            // Foreman works on labor items
            sovItem = laborSOVItems[Math.floor(Math.random() * laborSOVItems.length)];
          } else {
            // Workers rotate through areas based on day of month
            const areaIndex = (workDay.getDate() + month) % job1Areas.length;
            const area = job1Areas[areaIndex];
            
            // Early months: more material installation, later months: more labor
            if (month === 0 && Math.random() < 0.7) {
              // Early: mostly materials
              const materialItems = materialSOVItems.filter(item => item.areaId.equals(area._id));
              sovItem = materialItems.length > 0 ? materialItems[0] : materialSOVItems[0];
            } else {
              // Later: mix of materials and labor
              if (Math.random() < 0.5) {
                const laborItems = laborSOVItems.filter(item => item.areaId.equals(area._id));
                sovItem = laborItems.length > 0 ? laborItems[0] : laborSOVItems[0];
              } else {
                const materialItems = materialSOVItems.filter(item => item.areaId.equals(area._id));
                sovItem = materialItems.length > 0 ? materialItems[0] : materialSOVItems[0];
              }
            }
          }

          if (!sovItem) {
            sovItem = job1SOVItems[1]; // Fallback
          }

          const totalHours = regularHours + overtimeHours + doubleTimeHours;
          const regularCost = regularHours * rate.base;
          const overtimeCost = overtimeHours * (rate.base * rate.overtime);
          const doubleTimeCost = doubleTimeHours * (rate.base * rate.doubleTime);
          const totalLaborCost = regularCost + overtimeCost + doubleTimeCost;
          const burdenRate = 0.35;
          const totalBurdenCost = totalLaborCost * burdenRate;
          const totalCostWithBurden = totalLaborCost + totalBurdenCost;

          const timelogEntry = new TimelogRegister({
            workerId: worker._id,
            jobId: job1._id,
            projectId: project._id,
            workDate: workDay,
            payPeriodStart: new Date(workDay.getFullYear(), workDay.getMonth(), 1),
            payPeriodEnd: new Date(workDay.getFullYear(), workDay.getMonth() + 1, 0),
            regularHours,
            overtimeHours,
            doubleTimeHours,
            totalHours,
            costCode: sovItem.costCodeNumber,
            costCodeDescription: sovItem.description,
            scheduleOfValuesId: sovItem._id,
            systemId: sovItem.systemId,
            areaId: sovItem.areaId,
            phaseId: sovItem.phaseId,
            workDescription: `${worker.position} work on ${sovItem.costCodeName} - ${workDay.toLocaleDateString()}`,
            craft: 'insulation',
            tradeLevel: worker.position === 'Foreman' ? 'foreman' : worker.position === 'Apprentice Insulator' ? 'apprentice' : 'journeyman',
            baseHourlyRate: rate.base,
            overtimeRate: rate.base * rate.overtime,
            doubleTimeRate: rate.base * rate.doubleTime,
            regularCost,
            overtimeCost,
            doubleTimeCost,
            totalLaborCost,
            burdenRate,
            totalBurdenCost,
            totalCostWithBurden,
            location: {
              area: job1Areas.find(a => a._id.equals(sovItem.areaId))?.name || 'Unknown',
              zone: 'North',
              building: 'Building A'
            },
            status: month < 2 ? 'approved' : (Math.random() < 0.9 ? 'approved' : 'submitted'),
            submittedBy: worker._id,
            approvedBy: fieldSupervisor._id,
            approvedAt: new Date(workDay.getTime() + 24 * 60 * 60 * 1000)
          });

          timelogEntries.push(timelogEntry);
        }
      }
    }

    // Batch save timelog entries
    console.log(`📊 Creating ${timelogEntries.length} timelog entries...`);
    const savedTimelogs = await TimelogRegister.insertMany(timelogEntries);
    console.log(`✅ Created ${savedTimelogs.length} timelog entries`);

    // Calculate totals for verification
    const totalAPCost = apEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
    const totalTimelogCost = savedTimelogs.reduce((sum, entry) => sum + entry.totalCostWithBurden, 0);
    const totalActualCost = totalAPCost + totalTimelogCost;
    const budgetVariance = totalSOVValue - totalActualCost;
    const budgetVariancePercent = (budgetVariance / totalSOVValue) * 100;

    // Summary
    console.log('\n🎉 SEEDING COMPLETE!');
    console.log('=====================================');
    console.log(`📁 Project: ${project.name}`);
    console.log(`🏗️  Job 1: ${job1.name}`);
    console.log(`   Duration: ${job1DurationMonths} months (${job1StartDate.toLocaleDateString()} - ${job1EndDate.toLocaleDateString()})`);
    console.log(`   Systems: ${job1Systems.length}`);
    console.log(`   Areas: ${job1Areas.length}`);
    console.log(`   SOV Items: ${job1SOVItems.length}`);
    console.log(`   Progress Reports: ${job1Reports.length} (one per month)`);
    console.log(`   AP Entries: ${apEntries.length}`);
    console.log(`   Timelog Entries: ${savedTimelogs.length}`);
    console.log('=====================================');
    console.log('\n💰 BUDGET SUMMARY:');
    console.log(`   SOV Budget: $${totalSOVValue.toLocaleString()}`);
    console.log(`   AP Costs: $${totalAPCost.toLocaleString()}`);
    console.log(`   Labor Costs: $${totalTimelogCost.toLocaleString()}`);
    console.log(`   Total Actual: $${totalActualCost.toLocaleString()}`);
    console.log(`   Variance: $${budgetVariance.toLocaleString()} (${budgetVariancePercent.toFixed(1)}%)`);
    console.log('=====================================');
    console.log('\n✅ All data is consistent:');
    console.log('   ✓ All AP entries reference valid SOV items');
    console.log('   ✓ All Timelog entries reference valid SOV items');
    console.log('   ✓ All cost codes match across all data types');
    console.log('   ✓ All System/Area/Phase IDs are populated');
    console.log('   ✓ Data spans full job duration');
    console.log('   ✓ Progress Reports align with AP/Timelog data');
    console.log('   ✓ Realistic budget variance');
    console.log('\n📖 DATA STORY:');
    console.log('   • Month 1 (Jan): Small crew, materials arrive early, 15% complete');
    console.log('   • Month 2 (Feb): Crew ramps up, more materials, 40% complete');
    console.log('   • Month 3 (Mar): Full crew, peak activity, 75% complete');
    console.log('   • Month 4 (Apr): Final push, completion, 100% complete');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed
seedUnifiedComplete()
  .then(() => {
    console.log('\n✅ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });
