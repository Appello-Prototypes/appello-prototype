#!/usr/bin/env node

/**
 * Complete Fresh Seed Script
 * Creates a comprehensive dataset with 2 complete jobs
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

async function seedCompleteFresh() {
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

    // Create users (including workers for timesheets)
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
    console.log('\n🏗️  Creating Job 1: Building A - HVAC Insulation...');
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
      startDate: new Date('2024-01-14'),
      endDate: new Date('2024-05-14'),
      contractValue: 1200000,
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
      { name: 'Phase 3 - Labor Installation', code: 'P3', jobId: job1._id, projectId: project._id, sortOrder: 3, status: 'in_progress' },
      { name: 'Phase 4 - Final Inspection', code: 'P4', jobId: job1._id, projectId: project._id, sortOrder: 4, status: 'not_started' }
    ]);

    // Create Modules for Job 1
    const job1Modules = await Module.create([
      { name: 'Ductwork Module', code: 'DWM', jobId: job1._id, projectId: project._id, systemId: job1Systems[0]._id, moduleType: 'hvac', sortOrder: 1 },
      { name: 'Pipe Module', code: 'PPM', jobId: job1._id, projectId: project._id, systemId: job1Systems[0]._id, moduleType: 'piping', sortOrder: 2 },
      { name: 'Installation Module', code: 'INS', jobId: job1._id, projectId: project._id, systemId: job1Systems[1]._id, moduleType: 'hvac', sortOrder: 3 }
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

    // Create SOV Line Items for Job 1 (with phase/module/component references)
    const job1SOVItems = await ScheduleOfValues.create([
      {
        jobId: job1._id,
        projectId: project._id,
        lineNumber: '1',
        description: 'Fiberglass duct insulation - Floor 1',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[0]._id,
        phaseId: job1Phases[1]._id,
        moduleId: job1Modules[0]._id,
        componentId: job1Components[0]._id,
        quantity: 5000,
        unit: 'SF',
        unitCost: 3.50,
        totalCost: 17500,
        marginPercent: 25,
        totalValue: 21875,
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
        description: 'Installation labor - Floor 1',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[0]._id,
        phaseId: job1Phases[2]._id,
        moduleId: job1Modules[2]._id,
        quantity: 320,
        unit: 'HR',
        unitCost: 65.00,
        totalCost: 20800,
        marginPercent: 30,
        totalValue: 27040,
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
        description: 'Pipe insulation - Canal Structure',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[1]._id,
        phaseId: job1Phases[1]._id,
        moduleId: job1Modules[1]._id,
        componentId: job1Components[1]._id,
        quantity: 3000,
        unit: 'LF',
        unitCost: 8.00,
        totalCost: 24000,
        marginPercent: 25,
        totalValue: 30000,
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
        description: 'Installation labor - Canal Structure',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[1]._id,
        phaseId: job1Phases[2]._id,
        moduleId: job1Modules[2]._id,
        quantity: 280,
        unit: 'HR',
        unitCost: 65.00,
        totalCost: 18200,
        marginPercent: 30,
        totalValue: 23660,
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
        unitCost: 4.25,
        totalCost: 17000,
        marginPercent: 25,
        totalValue: 21250,
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
        unitCost: 65.00,
        totalCost: 15600,
        marginPercent: 30,
        totalValue: 20280,
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
        unitCost: 5.50,
        totalCost: 5500,
        marginPercent: 25,
        totalValue: 6875,
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
        unitCost: 65.00,
        totalCost: 3900,
        marginPercent: 30,
        totalValue: 5070,
        glCategoryId: glCategory2._id,
        glAccountItemId: glAccount2._id,
        costCodeNumber: '008',
        costCodeName: 'PIT-LAB',
        sortOrder: 8
      }
    ]);
    console.log(`✅ Created ${job1SOVItems.length} SOV line items for Job 1`);

    // Create Progress Reports for Job 1 (5 months)
    console.log('\n📊 Creating progress reports for Job 1...');
    const job1Reports = [];
    let previousReport1 = null;
    
    for (let month = 0; month < 5; month++) {
      const reportDate = new Date('2024-01-27');
      reportDate.setMonth(reportDate.getMonth() + month);
      
      const reportPeriodStart = new Date(reportDate);
      reportPeriodStart.setDate(1);
      const reportPeriodEnd = new Date(reportPeriodStart);
      reportPeriodEnd.setMonth(reportPeriodEnd.getMonth() + 1);
      reportPeriodEnd.setDate(0);

      const reportNumber = `PR-JOB-2024-001-${String(reportDate.getFullYear())}${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Progressive completion: 0-20%, 20-50%, 50-75%, 75-95%, 95-100%
      const progressRanges = [
        { min: 0, max: 20 },
        { min: 20, max: 50 },
        { min: 50, max: 75 },
        { min: 75, max: 95 },
        { min: 95, max: 100 }
      ];
      
      const range = progressRanges[month];
      const baseProgress = range.min + (range.max - range.min) * 0.7; // Use 70% of range for consistency

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

      // Calculate progress for each line item
      const lineItems = Array.from(lineItemsMap.values()).map((item, index) => {
        const itemProgress = Math.min(100, Math.max(0, baseProgress + (index % 3 - 1) * 5));
        const approvedCTDAmount = (item.assignedCost * itemProgress) / 100;
        const amountThisPeriod = approvedCTDAmount - item.previousComplete.amount;
        const holdbackThisPeriod = Math.max(0, (amountThisPeriod * 10) / 100);
        const dueThisPeriod = Math.max(0, amountThisPeriod - holdbackThisPeriod);

        return {
          ...item,
          submittedCTD: {
            amount: approvedCTDAmount * 0.95,
            percent: itemProgress * 0.95
          },
          approvedCTD: {
            amount: approvedCTDAmount,
            percent: itemProgress
          },
          holdbackThisPeriod,
          dueThisPeriod
        };
      });

      let status = 'draft';
      let invoiceId = null;
      if (month < 3) {
        status = 'invoiced';
        invoiceId = `24-0444-03-INV-${String(month + 1).padStart(2, '0')}`;
      } else if (month === 3) {
        status = 'approved';
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
        invoiceGenerated: month < 3
      });

      await report.save();
      job1Reports.push(report);
      previousReport1 = report;
      console.log(`  ✅ Created ${reportNumber} - ${report.summary.calculatedPercentCTD.toFixed(2)}% complete`);
    }

    // JOB 2: Building B - VAV Terminal Installation
    console.log('\n🏗️  Creating Job 2: Building B - VAV Terminal Installation...');
    const job2 = await Job.create({
      name: 'Building B - VAV Terminal Installation',
      jobNumber: 'JOB-2024-002',
      projectId: project._id,
      client: {
        name: 'ABC Development Corp',
        contact: 'John Smith',
        email: 'john.smith@abcdev.com',
        phone: '555-0100'
      },
      description: 'VAV terminal unit installation for Building B',
      location: {
        address: '123 Main Street, Building B'
      },
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-08-01'),
      contractValue: 1200000,
      status: 'active',
      jobManager: users[1]._id,
      fieldSupervisor: users[0]._id
    });

    // Create Systems for Job 2
    const job2Systems = await System.create([
      { name: 'Material', code: 'MAT', jobId: job2._id, projectId: project._id, sortOrder: 1 },
      { name: 'Labour', code: 'LAB', jobId: job2._id, projectId: project._id, sortOrder: 2 }
    ]);

    // Create Areas for Job 2
    const job2Areas = await Area.create([
      { name: 'Floors 1-6', code: 'F1-6', jobId: job2._id, projectId: project._id, sortOrder: 1 },
      { name: 'Floors 7-12', code: 'F7-12', jobId: job2._id, projectId: project._id, sortOrder: 2 }
    ]);

    // Create Phases for Job 2
    const job2Phases = await Phase.create([
      { name: 'Phase 1 - Site Preparation', code: 'P1', jobId: job2._id, projectId: project._id, sortOrder: 1, status: 'completed' },
      { name: 'Phase 2 - Unit Installation', code: 'P2', jobId: job2._id, projectId: project._id, sortOrder: 2, status: 'in_progress' },
      { name: 'Phase 3 - Testing & Commissioning', code: 'P3', jobId: job2._id, projectId: project._id, sortOrder: 3, status: 'not_started' }
    ]);

    // Create Modules for Job 2
    const job2Modules = await Module.create([
      { name: 'VAV Unit Module', code: 'VAV', jobId: job2._id, projectId: project._id, systemId: job2Systems[0]._id, moduleType: 'hvac', sortOrder: 1 },
      { name: 'Installation Module', code: 'INS', jobId: job2._id, projectId: project._id, systemId: job2Systems[1]._id, moduleType: 'hvac', sortOrder: 2 }
    ]);

    // Create Components for Job 2
    const job2Components = await Component.create([
      { name: 'Standard VAV Unit', code: 'STD', jobId: job2._id, projectId: project._id, moduleId: job2Modules[0]._id, componentType: 'equipment', size: 'Standard', material: 'Steel', sortOrder: 1 },
      { name: 'High Pressure VAV Unit', code: 'HP', jobId: job2._id, projectId: project._id, moduleId: job2Modules[0]._id, componentType: 'equipment', size: 'High Pressure', material: 'Steel', sortOrder: 2 }
    ]);

    // Create GL Categories and Accounts for Job 2
    const glCategory3 = await GLCategory.create({
      name: 'Materials',
      code: 'MAT',
      jobId: job2._id,
      projectId: project._id,
      sortOrder: 1
    });

    const glAccount3 = await GLAccount.create({
      name: 'VAV Units',
      code: '204',
      glCategoryId: glCategory3._id,
      jobId: job2._id,
      projectId: project._id,
      sortOrder: 1
    });

    const glCategory4 = await GLCategory.create({
      name: 'Direct Labour',
      code: 'LAB',
      jobId: job2._id,
      projectId: project._id,
      sortOrder: 2
    });

    const glAccount4 = await GLAccount.create({
      name: 'Installation Labor',
      code: '104',
      glCategoryId: glCategory4._id,
      jobId: job2._id,
      projectId: project._id,
      sortOrder: 1
    });

    // Create SOV Line Items for Job 2 (with phase/module/component references)
    const job2SOVItems = await ScheduleOfValues.create([
      {
        jobId: job2._id,
        projectId: project._id,
        lineNumber: '1',
        description: 'VAV Terminal Units - Standard Pressure',
        systemId: job2Systems[0]._id,
        areaId: job2Areas[0]._id,
        phaseId: job2Phases[1]._id,
        moduleId: job2Modules[0]._id,
        componentId: job2Components[0]._id,
        quantity: 48,
        unit: 'EA',
        unitCost: 2850,
        totalCost: 136800,
        marginPercent: 25,
        totalValue: 171000,
        glCategoryId: glCategory3._id,
        glAccountItemId: glAccount3._id,
        costCodeNumber: '001',
        costCodeName: 'F1-6-MAT',
        sortOrder: 1
      },
      {
        jobId: job2._id,
        projectId: project._id,
        lineNumber: '2',
        description: 'Installation labor - Floors 1-6',
        systemId: job2Systems[1]._id,
        areaId: job2Areas[0]._id,
        phaseId: job2Phases[1]._id,
        moduleId: job2Modules[1]._id,
        quantity: 480,
        unit: 'HR',
        unitCost: 65.00,
        totalCost: 31200,
        marginPercent: 30,
        totalValue: 40560,
        glCategoryId: glCategory4._id,
        glAccountItemId: glAccount4._id,
        costCodeNumber: '002',
        costCodeName: 'F1-6-LAB',
        sortOrder: 2
      },
      {
        jobId: job2._id,
        projectId: project._id,
        lineNumber: '3',
        description: 'VAV Terminal Units - High Pressure',
        systemId: job2Systems[0]._id,
        areaId: job2Areas[1]._id,
        phaseId: job2Phases[1]._id,
        moduleId: job2Modules[0]._id,
        componentId: job2Components[1]._id,
        quantity: 36,
        unit: 'EA',
        unitCost: 3200,
        totalCost: 115200,
        marginPercent: 25,
        totalValue: 144000,
        glCategoryId: glCategory3._id,
        glAccountItemId: glAccount3._id,
        costCodeNumber: '003',
        costCodeName: 'F7-12-MAT',
        sortOrder: 3
      },
      {
        jobId: job2._id,
        projectId: project._id,
        lineNumber: '4',
        description: 'Installation labor - Floors 7-12',
        systemId: job2Systems[1]._id,
        areaId: job2Areas[1]._id,
        phaseId: job2Phases[1]._id,
        moduleId: job2Modules[1]._id,
        quantity: 360,
        unit: 'HR',
        unitCost: 65.00,
        totalCost: 23400,
        marginPercent: 30,
        totalValue: 30420,
        glCategoryId: glCategory4._id,
        glAccountItemId: glAccount4._id,
        costCodeNumber: '004',
        costCodeName: 'F7-12-LAB',
        sortOrder: 4
      }
    ]);
    console.log(`✅ Created ${job2SOVItems.length} SOV line items for Job 2`);

    // Create Progress Reports for Job 2 (5 months)
    console.log('\n📊 Creating progress reports for Job 2...');
    const job2Reports = [];
    let previousReport2 = null;
    
    for (let month = 0; month < 5; month++) {
      const reportDate = new Date('2024-02-15');
      reportDate.setMonth(reportDate.getMonth() + month);
      
      const reportPeriodStart = new Date(reportDate);
      reportPeriodStart.setDate(1);
      const reportPeriodEnd = new Date(reportPeriodStart);
      reportPeriodEnd.setMonth(reportPeriodEnd.getMonth() + 1);
      reportPeriodEnd.setDate(0);

      const reportNumber = `PR-JOB-2024-002-${String(reportDate.getFullYear())}${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      
      const progressRanges = [
        { min: 0, max: 15 },
        { min: 15, max: 45 },
        { min: 45, max: 70 },
        { min: 70, max: 90 },
        { min: 90, max: 100 }
      ];
      
      const range = progressRanges[month];
      const baseProgress = range.min + (range.max - range.min) * 0.75;

      // Group SOV items by Area and System
      const lineItemsMap = new Map();
      job2SOVItems.forEach(sov => {
        const areaName = job2Areas.find(a => a._id.equals(sov.areaId))?.name || 'Unknown';
        const systemName = job2Systems.find(s => s._id.equals(sov.systemId))?.name || 'Unknown';
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

      if (previousReport2) {
        previousReport2.lineItems.forEach(prevItem => {
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

      const lineItems = Array.from(lineItemsMap.values()).map((item, index) => {
        const itemProgress = Math.min(100, Math.max(0, baseProgress + (index % 2 - 0.5) * 8));
        const approvedCTDAmount = (item.assignedCost * itemProgress) / 100;
        const amountThisPeriod = approvedCTDAmount - item.previousComplete.amount;
        const holdbackThisPeriod = Math.max(0, (amountThisPeriod * 10) / 100);
        const dueThisPeriod = Math.max(0, amountThisPeriod - holdbackThisPeriod);

        return {
          ...item,
          submittedCTD: {
            amount: approvedCTDAmount * 0.95,
            percent: itemProgress * 0.95
          },
          approvedCTD: {
            amount: approvedCTDAmount,
            percent: itemProgress
          },
          holdbackThisPeriod,
          dueThisPeriod
        };
      });

      let status = 'draft';
      let invoiceId = null;
      if (month < 2) {
        status = 'invoiced';
        invoiceId = `24-0444-02-INV-${String(month + 1).padStart(2, '0')}`;
      } else if (month === 2) {
        status = 'approved';
      }

      const report = new ProgressReport({
        reportNumber,
        reportDate,
        reportPeriodStart,
        reportPeriodEnd,
        jobId: job2._id,
        projectId: project._id,
        completedByName: 'Andrew Martin',
        lineItems,
        status,
        invoiceId,
        invoiceGenerated: month < 2
      });

      await report.save();
      job2Reports.push(report);
      previousReport2 = report;
      console.log(`  ✅ Created ${reportNumber} - ${report.summary.calculatedPercentCTD.toFixed(2)}% complete`);
    }

    // Create AP Register entries for both jobs (5 months)
    console.log('\n💳 Creating AP Register entries...');
    const vendors = [
      { name: 'ABC Insulation Supply', vendorNumber: 'VND-001', phone: '555-2001', email: 'sales@abcinsulation.com', type: 'material', category: 'insulation_materials' },
      { name: 'Metro HVAC Equipment', vendorNumber: 'VND-002', phone: '555-2002', email: 'orders@metrohvac.com', type: 'material', category: 'equipment_rental' },
      { name: 'Premier Installation Services', vendorNumber: 'VND-003', phone: '555-2003', email: 'info@premierinstall.com', type: 'subcontractor', category: 'labor_subcontract' },
      { name: 'Industrial Materials Co', vendorNumber: 'VND-004', phone: '555-2004', email: 'sales@indmaterials.com', type: 'material', category: 'jacketing_materials' },
      { name: 'Safety Equipment Supply', vendorNumber: 'VND-005', phone: '555-2005', email: 'orders@safetyequip.com', type: 'other', category: 'safety' }
    ];

    const apEntries = [];
    let invoiceCounter = 1;

    // Helper function to get work days in a month
    function getWorkDays(year, month) {
      const days = [];
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
          days.push(new Date(d));
        }
      }
      return days;
    }

    // Create AP entries for Job 1 (5 months: Jan-May)
    for (let month = 0; month < 5; month++) {
      const monthDate = new Date(2024, 0 + month, 1);
      const invoicesThisMonth = Math.floor(Math.random() * 3) + 2; // 2-4 invoices per month

      for (let i = 0; i < invoicesThisMonth; i++) {
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];
        const sovItem = job1SOVItems[Math.floor(Math.random() * job1SOVItems.length)];
        
        const invoiceDate = new Date(monthDate);
        invoiceDate.setDate(Math.floor(Math.random() * 15) + 1); // Random day in first half of month
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const receivedDate = new Date(invoiceDate);
        receivedDate.setDate(receivedDate.getDate() - Math.floor(Math.random() * 5)); // Received 0-5 days before invoice date

        const baseAmount = (sovItem.totalValue * (0.15 + Math.random() * 0.25)); // 15-40% of SOV item value
        const taxAmount = Math.round(baseAmount * 0.13 * 100) / 100; // 13% tax
        const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

        const paymentStatus = month < 3 ? (Math.random() < 0.7 ? 'paid' : 'approved') : (Math.random() < 0.5 ? 'approved' : 'pending');
        const paymentDate = paymentStatus === 'paid' ? new Date(invoiceDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null;

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
          invoiceAmount: Math.round(baseAmount * 100) / 100,
          taxAmount,
          totalAmount,
          jobId: job1._id,
          projectId: project._id,
          costCodeBreakdown: [{
            costCode: sovItem.costCodeNumber,
            description: sovItem.description,
            amount: totalAmount, // Must equal totalAmount including tax
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

    // Create AP entries for Job 2 (5 months: Feb-Jun)
    for (let month = 0; month < 5; month++) {
      const monthDate = new Date(2024, 1 + month, 1);
      const invoicesThisMonth = Math.floor(Math.random() * 3) + 2; // 2-4 invoices per month

      for (let i = 0; i < invoicesThisMonth; i++) {
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];
        const sovItem = job2SOVItems[Math.floor(Math.random() * job2SOVItems.length)];
        
        const invoiceDate = new Date(monthDate);
        invoiceDate.setDate(Math.floor(Math.random() * 15) + 1);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const receivedDate = new Date(invoiceDate);
        receivedDate.setDate(receivedDate.getDate() - Math.floor(Math.random() * 5));

        const baseAmount = (sovItem.totalValue * (0.15 + Math.random() * 0.25));
        const taxAmount = Math.round(baseAmount * 0.13 * 100) / 100;
        const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

        const paymentStatus = month < 2 ? (Math.random() < 0.7 ? 'paid' : 'approved') : (Math.random() < 0.5 ? 'approved' : 'pending');
        const paymentDate = paymentStatus === 'paid' ? new Date(invoiceDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null;

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
          invoiceAmount: Math.round(baseAmount * 100) / 100,
          taxAmount,
          totalAmount,
          jobId: job2._id,
          projectId: project._id,
          costCodeBreakdown: [{
            costCode: sovItem.costCodeNumber,
            description: sovItem.description,
            amount: totalAmount,
            scheduleOfValuesId: sovItem._id,
            systemId: sovItem.systemId,
            areaId: sovItem.areaId
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

    // Create TimelogRegister entries for both jobs (5 months)
    console.log('\n⏰ Creating TimelogRegister entries...');
    
    // Worker rates based on position
    const workerRates = {
      'Apprentice Insulator': { base: 28, overtime: 1.5, doubleTime: 2.0, craft: 'insulation', tradeLevel: 'apprentice' },
      'Journeyman Insulator': { base: 42, overtime: 1.5, doubleTime: 2.0, craft: 'insulation', tradeLevel: 'journeyman' },
      'Foreman': { base: 55, overtime: 1.5, doubleTime: 2.0, craft: 'insulation', tradeLevel: 'foreman' }
    };

    const timelogEntries = [];

    // Create timelog entries for Job 1 (5 months: Jan-May)
    for (let month = 0; month < 5; month++) {
      const workDays = getWorkDays(2024, 0 + month);
      const workersThisMonth = workers.slice(0, Math.min(5, workers.length)); // Use up to 5 workers

      for (const workDay of workDays) {
        for (const worker of workersThisMonth) {
          // Skip some days randomly (not everyone works every day)
          if (Math.random() < 0.15) continue;

          const position = worker.position || 'Journeyman Insulator';
          const rates = workerRates[position] || workerRates['Journeyman Insulator'];
          const sovItem = job1SOVItems[Math.floor(Math.random() * job1SOVItems.length)];
          
          // Regular hours: 6-10 hours per day
          const regularHours = Math.floor(Math.random() * 5) + 6;
          const overtimeHours = Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : 0; // 30% chance of OT
          const doubleTimeHours = 0; // Rare
          const totalHours = regularHours + overtimeHours + doubleTimeHours;

          const baseRate = rates.base;
          const overtimeRate = baseRate * rates.overtime;
          const doubleTimeRate = baseRate * rates.doubleTime;

          const regularCost = regularHours * baseRate;
          const overtimeCost = overtimeHours * overtimeRate;
          const doubleTimeCost = doubleTimeHours * doubleTimeRate;
          const totalLaborCost = regularCost + overtimeCost + doubleTimeCost;
          const burdenRate = 0.35;
          const totalBurdenCost = totalLaborCost * burdenRate;
          const totalCostWithBurden = totalLaborCost + totalBurdenCost;

          const payPeriodStart = new Date(workDay.getFullYear(), workDay.getMonth(), 1);
          const payPeriodEnd = new Date(workDay.getFullYear(), workDay.getMonth() + 1, 0);

          const timelogEntry = await TimelogRegister.create({
            workerId: worker._id,
            jobId: job1._id,
            projectId: project._id,
            workDate: workDay,
            payPeriodStart,
            payPeriodEnd,
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
            moduleId: sovItem.moduleId,
            componentId: sovItem.componentId,
            workDescription: `${rates.craft} work on ${sovItem.description} - ${workDay.toLocaleDateString()}`,
            craft: rates.craft,
            tradeLevel: rates.tradeLevel,
            baseHourlyRate: baseRate,
            overtimeRate,
            doubleTimeRate,
            regularCost,
            overtimeCost,
            doubleTimeCost,
            totalLaborCost,
            burdenRate,
            totalBurdenCost,
            totalCostWithBurden,
            unitsCompleted: {
              quantity: Math.floor(Math.random() * 50) + 10,
              unit: sovItem.unit,
              description: sovItem.description
            },
            location: {
              area: job1Areas.find(a => a._id.equals(sovItem.areaId))?.name || 'Unknown',
              zone: 'North',
              building: 'Building A'
            },
            status: month < 3 ? 'approved' : (Math.random() < 0.8 ? 'approved' : 'submitted'),
            submittedBy: worker._id,
            approvedBy: month < 3 ? fieldSupervisor._id : (Math.random() < 0.8 ? fieldSupervisor._id : null),
            approvedAt: month < 3 ? new Date(workDay.getTime() + 24 * 60 * 60 * 1000) : (Math.random() < 0.8 ? new Date(workDay.getTime() + 24 * 60 * 60 * 1000) : null)
          });
          timelogEntries.push(timelogEntry);
        }
      }
    }

    // Create timelog entries for Job 2 (5 months: Feb-Jun)
    for (let month = 0; month < 5; month++) {
      const workDays = getWorkDays(2024, 1 + month);
      const workersThisMonth = workers.slice(0, Math.min(4, workers.length));

      for (const workDay of workDays) {
        for (const worker of workersThisMonth) {
          if (Math.random() < 0.15) continue;

          const position = worker.position || 'Journeyman Insulator';
          const rates = workerRates[position] || workerRates['Journeyman Insulator'];
          const sovItem = job2SOVItems[Math.floor(Math.random() * job2SOVItems.length)];
          
          const regularHours = Math.floor(Math.random() * 5) + 6;
          const overtimeHours = Math.random() < 0.25 ? Math.floor(Math.random() * 2) + 1 : 0;
          const doubleTimeHours = 0;
          const totalHours = regularHours + overtimeHours + doubleTimeHours;

          const baseRate = rates.base;
          const overtimeRate = baseRate * rates.overtime;
          const doubleTimeRate = baseRate * rates.doubleTime;

          const regularCost = regularHours * baseRate;
          const overtimeCost = overtimeHours * overtimeRate;
          const doubleTimeCost = doubleTimeHours * doubleTimeRate;
          const totalLaborCost = regularCost + overtimeCost + doubleTimeCost;
          const burdenRate = 0.35;
          const totalBurdenCost = totalLaborCost * burdenRate;
          const totalCostWithBurden = totalLaborCost + totalBurdenCost;

          const payPeriodStart = new Date(workDay.getFullYear(), workDay.getMonth(), 1);
          const payPeriodEnd = new Date(workDay.getFullYear(), workDay.getMonth() + 1, 0);

          const timelogEntry = await TimelogRegister.create({
            workerId: worker._id,
            jobId: job2._id,
            projectId: project._id,
            workDate: workDay,
            payPeriodStart,
            payPeriodEnd,
            regularHours,
            overtimeHours,
            doubleTimeHours,
            totalHours,
            costCode: sovItem.costCodeNumber,
            costCodeDescription: sovItem.description,
            scheduleOfValuesId: sovItem._id,
            systemId: sovItem.systemId,
            areaId: sovItem.areaId,
            workDescription: `${rates.craft} work on ${sovItem.description} - ${workDay.toLocaleDateString()}`,
            craft: rates.craft,
            tradeLevel: rates.tradeLevel,
            baseHourlyRate: baseRate,
            overtimeRate,
            doubleTimeRate,
            regularCost,
            overtimeCost,
            doubleTimeCost,
            totalLaborCost,
            burdenRate,
            totalBurdenCost,
            totalCostWithBurden,
            unitsCompleted: {
              quantity: Math.floor(Math.random() * 30) + 5,
              unit: sovItem.unit,
              description: sovItem.description
            },
            location: {
              area: job2Areas.find(a => a._id.equals(sovItem.areaId))?.name || 'Unknown',
              zone: 'South',
              building: 'Building B'
            },
            status: month < 2 ? 'approved' : (Math.random() < 0.8 ? 'approved' : 'submitted'),
            submittedBy: worker._id,
            approvedBy: month < 2 ? fieldSupervisor._id : (Math.random() < 0.8 ? fieldSupervisor._id : null),
            approvedAt: month < 2 ? new Date(workDay.getTime() + 24 * 60 * 60 * 1000) : (Math.random() < 0.8 ? new Date(workDay.getTime() + 24 * 60 * 60 * 1000) : null)
          });
          timelogEntries.push(timelogEntry);
        }
      }
    }
    console.log(`✅ Created ${timelogEntries.length} TimelogRegister entries`);

    console.log('\n✅ Complete fresh seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`  - Projects: 1`);
    console.log(`  - Jobs: 2`);
    console.log(`  - Systems: ${job1Systems.length + job2Systems.length}`);
    console.log(`  - Areas: ${job1Areas.length + job2Areas.length}`);
    console.log(`  - Phases: ${job1Phases.length + job2Phases.length}`);
    console.log(`  - Modules: ${job1Modules.length + job2Modules.length}`);
    console.log(`  - Components: ${job1Components.length + job2Components.length}`);
    console.log(`  - SOV Line Items: ${job1SOVItems.length + job2SOVItems.length}`);
    console.log(`  - Progress Reports: ${job1Reports.length + job2Reports.length}`);
    console.log(`  - AP Register Entries: ${apEntries.length}`);
    console.log(`  - TimelogRegister Entries: ${timelogEntries.length}`);
    console.log(`  - Users: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

seedCompleteFresh();

