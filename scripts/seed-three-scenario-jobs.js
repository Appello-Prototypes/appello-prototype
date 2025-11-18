#!/usr/bin/env node

/**
 * Three Scenario Jobs Seed Script
 * Creates comprehensive datasets for three different industrial construction jobs:
 * 1. Mechanical Insulation - Petrochemical Plant (6 months)
 * 2. Mechanical (Piping/HVAC) - Hospital HVAC (8 months)
 * 3. Electrical - Data Center (10 months)
 * 
 * Each job includes realistic scenarios with patterns visible in KPIs and charts.
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
const TimeEntry = require('../src/server/models/TimeEntry');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const CostToCompleteForecast = require('../src/server/models/CostToCompleteForecast');
const Task = require('../src/server/models/Task');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or MONGODB_DEV_URI not set');
  process.exit(1);
}

// Helper function to add days
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper function to get start of month
function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Helper function to get end of month
function getMonthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Helper function to get random number between min and max
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// Helper function to get random integer between min and max
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random date in range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to create TimelogRegister entries from TimeEntry entries
async function createTimelogRegisterEntries(timeEntries, jobId, projectId, sovItems, areas, fieldSupervisor) {
  const timelogEntries = [];
  
  // Convert to plain objects if needed
  const entries = timeEntries.map(te => te.toObject ? te.toObject() : te);
  
  for (const timeEntry of entries) {
    const workDate = new Date(timeEntry.date);
    const payPeriodStart = new Date(workDate.getFullYear(), workDate.getMonth(), 1);
    const payPeriodEnd = new Date(workDate.getFullYear(), workDate.getMonth() + 1, 0);
    
    // Find matching SOV item
    const sovItem = sovItems.find(s => s.costCodeNumber === timeEntry.costCode);
    
    // Determine trade level based on craft
    let tradeLevel = 'journeyman';
    if (timeEntry.craft === 'insulation') tradeLevel = 'journeyman';
    else if (timeEntry.craft === 'general') tradeLevel = 'journeyman';
    else if (timeEntry.craft === 'equipment') tradeLevel = 'journeyman';
    
    // Calculate costs
    const baseHourlyRate = timeEntry.hourlyRate || 35.00;
    const overtimeRate = timeEntry.overtimeRate || (baseHourlyRate * 1.5);
    const doubleTimeRate = timeEntry.doubleTimeRate || (baseHourlyRate * 2.0);
    const burdenRate = 0.35;
    
    const regularCost = (timeEntry.regularHours || 0) * baseHourlyRate;
    const overtimeCost = (timeEntry.overtimeHours || 0) * overtimeRate;
    const doubleTimeCost = (timeEntry.doubleTimeHours || 0) * doubleTimeRate;
    const totalLaborCost = regularCost + overtimeCost + doubleTimeCost;
    const totalBurdenCost = totalLaborCost * burdenRate;
    const totalCostWithBurden = totalLaborCost + totalBurdenCost;
    
    // Find area name
    const area = sovItem ? areas.find(a => a._id && sovItem.areaId && a._id.toString() === sovItem.areaId.toString()) : null;
    
    const timelogEntry = {
      workerId: timeEntry.workerId,
      jobId: jobId,
      projectId: projectId,
      workDate: workDate,
      payPeriodStart: payPeriodStart,
      payPeriodEnd: payPeriodEnd,
      regularHours: timeEntry.regularHours || 0,
      overtimeHours: timeEntry.overtimeHours || 0,
      doubleTimeHours: timeEntry.doubleTimeHours || 0,
      totalHours: timeEntry.totalHours || 0,
      costCode: timeEntry.costCode,
      costCodeDescription: timeEntry.costCodeDescription || sovItem?.costCodeName || 'Labor',
      scheduleOfValuesId: sovItem?._id,
      systemId: sovItem?.systemId,
      areaId: sovItem?.areaId,
      phaseId: sovItem?.phaseId,
      workDescription: timeEntry.workDescription || 'Work performed',
      craft: timeEntry.craft || 'general',
      tradeLevel: tradeLevel,
      baseHourlyRate: baseHourlyRate,
      overtimeRate: overtimeRate,
      doubleTimeRate: doubleTimeRate,
      regularCost: regularCost,
      overtimeCost: overtimeCost,
      doubleTimeCost: doubleTimeCost,
      totalLaborCost: totalLaborCost,
      burdenRate: burdenRate,
      totalBurdenCost: totalBurdenCost,
      totalCostWithBurden: totalCostWithBurden,
      location: area ? {
        area: area.name,
        zone: area.code || 'Main',
        building: 'Main Building'
      } : undefined,
      weatherConditions: timeEntry.weatherConditions,
      status: 'approved',
      submittedBy: timeEntry.workerId,
      submittedAt: timeEntry.date,
      approvedBy: fieldSupervisor,
      approvedAt: timeEntry.approvedAt || addDays(workDate, 1),
      originalTimeEntryId: timeEntry._id,
      entryMethod: 'bulk_import'
    };
    
    timelogEntries.push(timelogEntry);
  }
  
  if (timelogEntries.length > 0) {
    const saved = await TimelogRegister.insertMany(timelogEntries);
    return saved;
  }
  
  return [];
}

async function seedThreeScenarioJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if jobs already exist (don't overwrite existing data)
    const existingJobs = await Job.find({
      jobNumber: { $in: ['JOB-2025-INS-001', 'JOB-2025-MECH-001', 'JOB-2025-ELEC-001'] }
    });
    
    if (existingJobs.length > 0) {
      console.log('⚠️  Jobs already exist. Skipping seed to preserve existing data.');
      console.log('   To regenerate, delete these jobs first:');
      existingJobs.forEach(job => console.log(`   - ${job.jobNumber}: ${job.name}`));
      await mongoose.disconnect();
      return;
    }

    // Get or create users
    console.log('\n👤 Getting/Creating users...');
    let users = await User.find({});
    
    if (users.length === 0) {
      users = await User.create([
        {
          name: 'Sarah Mitchell',
          email: 'sarah.mitchell@appello.com',
          password: 'password123',
          role: 'project_manager',
          employeeId: 'EMP-001',
          department: 'Project Management',
          position: 'Senior Project Manager',
          phone: '555-0001'
        },
        {
          name: 'Marcus Rodriguez',
          email: 'marcus.rodriguez@appello.com',
          password: 'password123',
          role: 'field_supervisor',
          employeeId: 'EMP-002',
          department: 'Field Operations',
          position: 'Field Supervisor',
          phone: '555-0002'
        },
        {
          name: 'Tony Castellano',
          email: 'tony.castellano@appello.com',
          password: 'password123',
          role: 'field_supervisor',
          employeeId: 'EMP-003',
          department: 'Field Operations',
          position: 'Lead Foreman',
          phone: '555-0003'
        },
        {
          name: 'Jake Thompson',
          email: 'jake.thompson@appello.com',
          password: 'password123',
          role: 'field_worker',
          employeeId: 'EMP-004',
          department: 'Installation',
          position: 'Journeyman Insulator',
          phone: '555-0004'
        },
        {
          name: 'Maria Santos',
          email: 'maria.santos@appello.com',
          password: 'password123',
          role: 'field_worker',
          employeeId: 'EMP-005',
          department: 'Installation',
          position: 'HVAC Technician',
          phone: '555-0005'
        },
        {
          name: 'David Kim',
          email: 'david.kim@appello.com',
          password: 'password123',
          role: 'field_worker',
          employeeId: 'EMP-006',
          department: 'Installation',
          position: 'Electrician',
          phone: '555-0006'
        },
        {
          name: 'Robert Wilson',
          email: 'robert.wilson@appello.com',
          password: 'password123',
          role: 'field_worker',
          employeeId: 'EMP-007',
          department: 'Installation',
          position: 'Apprentice',
          phone: '555-0007'
        },
        {
          name: 'Lisa Chen',
          email: 'lisa.chen@appello.com',
          password: 'password123',
          role: 'field_worker',
          employeeId: 'EMP-008',
          department: 'Installation',
          position: 'Journeyman',
          phone: '555-0008'
        }
      ]);
      console.log(`✅ Created ${users.length} users`);
    } else {
      console.log(`✅ Found ${users.length} existing users`);
    }

    const projectManager = users.find(u => u.role === 'project_manager') || users[0];
    const fieldSupervisors = users.filter(u => u.role === 'field_supervisor');
    const workers = users.filter(u => u.role === 'field_worker');

    // ========================================================================
    // JOB 1: MECHANICAL INSULATION - Petrochemical Plant
    // ========================================================================
    console.log('\n🏗️  Creating JOB 1: Mechanical Insulation - Petrochemical Plant...');
    
    const project1 = await Project.create({
      name: 'Petrochemical Plant Expansion',
      projectNumber: 'PROJ-2025-PETRO-001',
      client: {
        name: 'Alberta Petrochemical Corp',
        contact: 'John Anderson',
        email: 'john.anderson@petrochem.com',
        phone: '403-555-0100'
      },
      description: 'Petrochemical plant expansion - Process Unit A',
      location: {
        address: 'Fort McMurray, Alberta'
      },
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-30'),
      totalContractValue: 2850000,
      status: 'active',
      projectManager: projectManager._id
    });

    const job1 = await Job.create({
      name: 'Process Unit A - Thermal Insulation',
      jobNumber: 'JOB-2025-INS-001',
      projectId: project1._id,
      client: project1.client,
      description: 'Complete thermal insulation installation for Process Unit A including process piping, vessels, and equipment',
      location: {
        address: 'Fort McMurray, Alberta',
        city: 'Fort McMurray',
        province: 'AB'
      },
      plannedStartDate: new Date('2025-01-15'),
      actualStartDate: new Date('2025-01-15'),
      plannedEndDate: new Date('2025-06-30'),
      contractValue: 2850000,
      status: 'in_progress',
      jobManager: projectManager._id,
      fieldSupervisor: fieldSupervisors[0]._id,
      foremen: [fieldSupervisors[0]._id]
    });

    // Create Systems, Areas, Phases for Job 1
    const job1Systems = await System.create([
      { name: 'Materials', code: 'MAT', jobId: job1._id, projectId: project1._id, sortOrder: 1 },
      { name: 'Labor', code: 'LAB', jobId: job1._id, projectId: project1._id, sortOrder: 2 }
    ]);

    const job1Areas = await Area.create([
      { name: 'Process Piping Area', code: 'PPA', jobId: job1._id, projectId: project1._id, sortOrder: 1 },
      { name: 'Vessel Insulation Area', code: 'VIA', jobId: job1._id, projectId: project1._id, sortOrder: 2 },
      { name: 'Equipment Insulation Area', code: 'EIA', jobId: job1._id, projectId: project1._id, sortOrder: 3 }
    ]);

    const job1Phases = await Phase.create([
      { name: 'Phase 1 - Site Prep', code: 'P1', jobId: job1._id, projectId: project1._id, sortOrder: 1, status: 'completed' },
      { name: 'Phase 2 - Material Install', code: 'P2', jobId: job1._id, projectId: project1._id, sortOrder: 2, status: 'in_progress' },
      { name: 'Phase 3 - Labor Install', code: 'P3', jobId: job1._id, projectId: project1._id, sortOrder: 3, status: 'in_progress' },
      { name: 'Phase 4 - Final Inspection', code: 'P4', jobId: job1._id, projectId: project1._id, sortOrder: 4, status: 'not_started' }
    ]);

    // Create GL Categories and Accounts
    const job1GLCat1 = await GLCategory.create({
      name: 'Materials',
      code: 'MAT',
      jobId: job1._id,
      projectId: project1._id,
      sortOrder: 1
    });

    const job1GLAcc1 = await GLAccount.create({
      name: 'Insulation Materials',
      code: '203',
      glCategoryId: job1GLCat1._id,
      jobId: job1._id,
      projectId: project1._id,
      sortOrder: 1
    });

    const job1GLCat2 = await GLCategory.create({
      name: 'Direct Labour',
      code: 'LAB',
      jobId: job1._id,
      projectId: project1._id,
      sortOrder: 2
    });

    const job1GLAcc2 = await GLAccount.create({
      name: 'Installation Labor',
      code: '103',
      glCategoryId: job1GLCat2._id,
      jobId: job1._id,
      projectId: project1._id,
      sortOrder: 1
    });

    // Create SOV Line Items for Job 1
    const job1SOVItems = await ScheduleOfValues.create([
      {
        jobId: job1._id,
        projectId: project1._id,
        lineNumber: '001',
        description: 'Process piping insulation - 2" to 6"',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[0]._id,
        phaseId: job1Phases[1]._id,
        quantity: 8500,
        unit: 'LF',
        unitCost: 12.50,
        totalCost: 106250,
        marginPercent: 25,
        totalValue: 132813,
        glCategoryId: job1GLCat1._id,
        glAccountItemId: job1GLAcc1._id,
        costCodeNumber: '001',
        costCodeName: 'PPA-MAT',
        sortOrder: 1
      },
      {
        jobId: job1._id,
        projectId: project1._id,
        lineNumber: '002',
        description: 'Process piping installation labor',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[0]._id,
        phaseId: job1Phases[2]._id,
        quantity: 1200,
        unit: 'HR',
        unitCost: 68.00,
        totalCost: 81600,
        marginPercent: 30,
        totalValue: 106080,
        glCategoryId: job1GLCat2._id,
        glAccountItemId: job1GLAcc2._id,
        costCodeNumber: '002',
        costCodeName: 'PPA-LAB',
        sortOrder: 2
      },
      {
        jobId: job1._id,
        projectId: project1._id,
        lineNumber: '003',
        description: 'Vessel insulation materials',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[1]._id,
        phaseId: job1Phases[1]._id,
        quantity: 12000,
        unit: 'SF',
        unitCost: 8.75,
        totalCost: 105000,
        marginPercent: 25,
        totalValue: 131250,
        glCategoryId: job1GLCat1._id,
        glAccountItemId: job1GLAcc1._id,
        costCodeNumber: '003',
        costCodeName: 'VIA-MAT',
        sortOrder: 3
      },
      {
        jobId: job1._id,
        projectId: project1._id,
        lineNumber: '004',
        description: 'Vessel installation labor',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[1]._id,
        phaseId: job1Phases[2]._id,
        quantity: 900,
        unit: 'HR',
        unitCost: 68.00,
        totalCost: 61200,
        marginPercent: 30,
        totalValue: 79560,
        glCategoryId: job1GLCat2._id,
        glAccountItemId: job1GLAcc2._id,
        costCodeNumber: '004',
        costCodeName: 'VIA-LAB',
        sortOrder: 4
      },
      {
        jobId: job1._id,
        projectId: project1._id,
        lineNumber: '005',
        description: 'Equipment insulation materials',
        systemId: job1Systems[0]._id,
        areaId: job1Areas[2]._id,
        phaseId: job1Phases[1]._id,
        quantity: 8000,
        unit: 'SF',
        unitCost: 9.25,
        totalCost: 74000,
        marginPercent: 25,
        totalValue: 92500,
        glCategoryId: job1GLCat1._id,
        glAccountItemId: job1GLAcc1._id,
        costCodeNumber: '005',
        costCodeName: 'EIA-MAT',
        sortOrder: 5
      },
      {
        jobId: job1._id,
        projectId: project1._id,
        lineNumber: '006',
        description: 'Equipment installation labor',
        systemId: job1Systems[1]._id,
        areaId: job1Areas[2]._id,
        phaseId: job1Phases[2]._id,
        quantity: 700,
        unit: 'HR',
        unitCost: 68.00,
        totalCost: 47600,
        marginPercent: 30,
        totalValue: 61880,
        glCategoryId: job1GLCat2._id,
        glAccountItemId: job1GLAcc2._id,
        costCodeNumber: '006',
        costCodeName: 'EIA-LAB',
        sortOrder: 6
      }
    ]);

    console.log(`✅ Created ${job1SOVItems.length} SOV line items for Job 1`);

    // Create Progress Reports for Job 1 (6 months - showing weather impact, material escalation, rework, recovery)
    console.log('\n📊 Creating progress reports for Job 1...');
    const job1Reports = [];
    const job1ProgressPattern = [
      { month: 0, progress: 8 },   // Jan - Slow start due to cold weather
      { month: 1, progress: 18 }, // Feb - Still slow, cold weather continues
      { month: 2, progress: 35 }, // Mar - Material escalation hits
      { month: 3, progress: 52 }, // Apr - Rework issues
      { month: 4, progress: 78 }, // May - Recovery acceleration
      { month: 5, progress: 100 } // Jun - Final push
    ];

    let previousReport1 = null;
    for (let i = 0; i < 6; i++) {
      const reportDate = new Date('2025-01-27');
      reportDate.setMonth(reportDate.getMonth() + i);
      
      const reportPeriodStart = getMonthStart(reportDate);
      const reportPeriodEnd = getMonthEnd(reportDate);
      const reportNumber = `PR-JOB-2025-INS-001-${String(reportDate.getFullYear())}${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      
      const targetProgress = job1ProgressPattern[i].progress;
      const previousProgress = i > 0 ? job1ProgressPattern[i - 1].progress : 0;
      const progressThisPeriod = targetProgress - previousProgress;

      const lineItems = job1SOVItems.map(sov => {
        const previousComplete = previousReport1 
          ? (previousReport1.lineItems.find(li => li.scheduleOfValuesId.equals(sov._id))?.approvedCTD?.percent || 0)
          : 0;
        
        const approvedPercent = Math.min(100, previousComplete + (progressThisPeriod * randomBetween(0.8, 1.2)));
        const approvedAmount = (sov.totalValue * approvedPercent) / 100;
        const previousAmount = (sov.totalValue * previousComplete) / 100;
        const amountThisPeriod = approvedAmount - previousAmount;
        const holdback = (amountThisPeriod * 10) / 100;
        const dueThisPeriod = amountThisPeriod - holdback;

        return {
          scheduleOfValuesId: sov._id,
          areaId: sov.areaId,
          areaName: job1Areas.find(a => a._id.equals(sov.areaId))?.name || 'Unknown',
          systemId: sov.systemId,
          systemName: job1Systems.find(s => s._id.equals(sov.systemId))?.name || 'Unknown',
          description: sov.description,
          assignedCost: sov.totalValue,
          submittedCTD: {
            amount: Math.min(sov.totalValue, approvedAmount * randomBetween(0.95, 1.05)), // Field sometimes over-reports
            percent: Math.min(100, ((approvedAmount * randomBetween(0.95, 1.05)) / sov.totalValue) * 100)
          },
          approvedCTD: {
            amount: approvedAmount,
            percent: approvedPercent
          },
          previousComplete: {
            amount: previousAmount,
            percent: previousComplete
          },
          holdbackThisPeriod: holdback,
          holdbackPercent: 10,
          dueThisPeriod: dueThisPeriod
        };
      });

      const report = await ProgressReport.create({
        reportNumber,
        reportDate,
        reportPeriodStart,
        reportPeriodEnd,
        jobId: job1._id,
        projectId: project1._id,
        completedBy: fieldSupervisors[0]._id,
        completedByName: fieldSupervisors[0].name,
        lineItems,
        status: 'approved',
        approvedBy: projectManager._id,
        approvedAt: addDays(reportDate, 2)
      });

      job1Reports.push(report);
      previousReport1 = report;
    }
    console.log(`✅ Created ${job1Reports.length} progress reports for Job 1`);

    // Create Time Entries for Job 1 (showing weather impact, overtime, rework)
    console.log('\n⏰ Creating time entries for Job 1...');
    const job1TimeEntries = [];
    const job1StartDate = new Date('2025-01-15');
    const job1EndDate = new Date('2025-06-30');
    
    // Generate weekly time entries
    for (let week = 0; week < 24; week++) {
      const weekStart = addDays(job1StartDate, week * 7);
      
      // Weather impact in first 8 weeks (Jan-Feb)
      const isColdWeather = week < 8;
      const productivityMultiplier = isColdWeather ? 0.7 : 1.0; // 30% productivity loss
      
      // Overtime increases in final 8 weeks (May-Jun)
      const isFinalPush = week >= 16;
      const overtimeMultiplier = isFinalPush ? 1.5 : 1.0;
      
      // Rework in weeks 12-14 (April)
      const isReworkPeriod = week >= 12 && week < 14;
      
      for (let day = 0; day < 5; day++) { // Monday to Friday
        const entryDate = addDays(weekStart, day);
        if (entryDate > job1EndDate) break;
        
        for (const worker of workers.slice(0, 4)) { // 4 workers on this job
          const baseHours = 8;
          const regularHours = baseHours * productivityMultiplier;
          const overtimeHours = isFinalPush ? baseHours * 0.3 * overtimeMultiplier : 0;
          const totalHours = regularHours + overtimeHours;
          
          // Assign to cost codes based on week
          let costCode = '002'; // Default labor
          if (week < 4) costCode = '002'; // PPA-LAB
          else if (week < 8) costCode = '004'; // VIA-LAB
          else if (week < 12) costCode = '006'; // EIA-LAB
          else costCode = '002'; // Back to PPA for rework
          
          const workDescription = isReworkPeriod 
            ? `Rework - Quality issues on previously completed insulation`
            : isColdWeather
            ? `Installation work - Cold weather conditions affecting productivity`
            : `Installation work - ${job1Areas[Math.floor(week / 4) % 3].name}`;

          const timeEntry = await TimeEntry.create({
            workerId: worker._id,
            jobId: job1._id,
            projectId: project1._id,
            date: entryDate,
            startTime: '07:00',
            endTime: isFinalPush ? '18:00' : '16:00',
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            doubleTimeHours: 0,
            totalHours: totalHours,
            costCode: costCode,
            costCodeDescription: job1SOVItems.find(s => s.costCodeNumber === costCode)?.costCodeName || 'Labor',
            workDescription: workDescription,
            craft: 'insulation',
            category: 'exposed_pipe',
            status: 'approved',
            approvedBy: fieldSupervisors[0]._id,
            approvedAt: addDays(entryDate, 1),
            hourlyRate: 35.00,
            overtimeRate: 52.50,
            weatherConditions: isColdWeather ? {
              temperature: -25,
              conditions: 'extreme_cold',
              windSpeed: 15
            } : undefined
          });
          
          job1TimeEntries.push(timeEntry);
        }
      }
    }
    console.log(`✅ Created ${job1TimeEntries.length} time entries for Job 1`);

    // Create TimelogRegister entries for Job 1
    console.log('\n📋 Creating TimelogRegister entries for Job 1...');
    const job1TimelogEntries = await createTimelogRegisterEntries(
      job1TimeEntries,
      job1._id,
      project1._id,
      job1SOVItems,
      job1Areas,
      fieldSupervisors[0]._id
    );
    console.log(`✅ Created ${job1TimelogEntries.length} TimelogRegister entries for Job 1`);

    // Create AP Register entries for Job 1 (showing material escalation)
    console.log('\n💰 Creating AP Register entries for Job 1...');
    const job1APEntries = [];
    const materialVendors = [
      { name: 'Insulation Supply Co', vendorNumber: 'VND-001' },
      { name: 'Thermal Materials Inc', vendorNumber: 'VND-002' },
      { name: 'Industrial Insulation Ltd', vendorNumber: 'VND-003' }
    ];
    
    // Material invoices - showing escalation in March
    for (let month = 0; month < 6; month++) {
      const invoiceDate = new Date('2025-01-15');
      invoiceDate.setMonth(invoiceDate.getMonth() + month);
      
      const vendor = materialVendors[month % materialVendors.length];
      const escalationFactor = month >= 2 ? 1.25 : 1.0; // 25% increase starting March
      
      // Material invoices
      const materialAmount = month < 2 ? 45000 : 56250; // Escalated
      const invoice = await APRegister.create({
        invoiceNumber: `INV-${vendor.vendorNumber}-${String(invoiceDate.getFullYear())}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(month + 1).padStart(3, '0')}`,
        invoiceDate: invoiceDate,
        dueDate: addDays(invoiceDate, 30),
        receivedDate: invoiceDate,
        vendor: {
          name: vendor.name,
          vendorNumber: vendor.vendorNumber
        },
        invoiceAmount: materialAmount,
        taxAmount: materialAmount * 0.05,
        totalAmount: materialAmount * 1.05,
        jobId: job1._id,
        projectId: project1._id,
        costCodeBreakdown: [{
          costCode: month < 2 ? '001' : month < 4 ? '003' : '005',
          description: 'Insulation materials',
          amount: materialAmount * 1.05
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        paymentStatus: month < 4 ? 'paid' : 'approved',
        paymentDate: month < 4 ? addDays(invoiceDate, 25) : null,
        enteredBy: projectManager._id
      });
      
      job1APEntries.push(invoice);
    }
    console.log(`✅ Created ${job1APEntries.length} AP Register entries for Job 1`);

    // ========================================================================
    // JOB 2: MECHANICAL (PIPING/HVAC) - Hospital HVAC
    // ========================================================================
    console.log('\n🏗️  Creating JOB 2: Mechanical (Piping/HVAC) - Hospital HVAC...');
    
    const project2 = await Project.create({
      name: 'Regional Hospital Expansion',
      projectNumber: 'PROJ-2025-HOSP-001',
      client: {
        name: 'Regional Health Authority',
        contact: 'Dr. Susan Williams',
        email: 'susan.williams@healthauthority.ca',
        phone: '780-555-0200'
      },
      description: 'New hospital wing - Complete HVAC system installation',
      location: {
        address: 'Edmonton, Alberta'
      },
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-09-30'),
      totalContractValue: 4200000,
      status: 'active',
      projectManager: projectManager._id
    });

    const job2 = await Job.create({
      name: 'Hospital Wing HVAC Installation',
      jobNumber: 'JOB-2025-MECH-001',
      projectId: project2._id,
      client: project2.client,
      description: 'Complete HVAC system installation including ductwork, piping, equipment, and controls',
      location: {
        address: 'Edmonton, Alberta',
        city: 'Edmonton',
        province: 'AB'
      },
      plannedStartDate: new Date('2025-02-15'),
      actualStartDate: new Date('2025-02-20'), // 5 day delay
      plannedEndDate: new Date('2025-09-30'),
      contractValue: 4200000,
      status: 'in_progress',
      jobManager: projectManager._id,
      fieldSupervisor: fieldSupervisors[1]?._id || fieldSupervisors[0]._id,
      foremen: [fieldSupervisors[1]?._id || fieldSupervisors[0]._id]
    });

    // Create Systems, Areas, Phases for Job 2
    const job2Systems = await System.create([
      { name: 'Ductwork', code: 'DUCT', jobId: job2._id, projectId: project2._id, sortOrder: 1 },
      { name: 'Piping', code: 'PIPE', jobId: job2._id, projectId: project2._id, sortOrder: 2 },
      { name: 'Equipment', code: 'EQP', jobId: job2._id, projectId: project2._id, sortOrder: 3 },
      { name: 'Labor', code: 'LAB', jobId: job2._id, projectId: project2._id, sortOrder: 4 }
    ]);

    const job2Areas = await Area.create([
      { name: 'Floor 1 - Emergency', code: 'F1-ER', jobId: job2._id, projectId: project2._id, sortOrder: 1 },
      { name: 'Floor 2 - Operating Rooms', code: 'F2-OR', jobId: job2._id, projectId: project2._id, sortOrder: 2 },
      { name: 'Floor 3 - Patient Rooms', code: 'F3-PR', jobId: job2._id, projectId: project2._id, sortOrder: 3 },
      { name: 'Floor 4 - Administration', code: 'F4-ADM', jobId: job2._id, projectId: project2._id, sortOrder: 4 }
    ]);

    const job2Phases = await Phase.create([
      { name: 'Phase 1 - Site Prep', code: 'P1', jobId: job2._id, projectId: project2._id, sortOrder: 1, status: 'completed' },
      { name: 'Phase 2 - Ductwork', code: 'P2', jobId: job2._id, projectId: project2._id, sortOrder: 2, status: 'in_progress' },
      { name: 'Phase 3 - Piping', code: 'P3', jobId: job2._id, projectId: project2._id, sortOrder: 3, status: 'in_progress' },
      { name: 'Phase 4 - Equipment', code: 'P4', jobId: job2._id, projectId: project2._id, sortOrder: 4, status: 'in_progress' },
      { name: 'Phase 5 - Testing', code: 'P5', jobId: job2._id, projectId: project2._id, sortOrder: 5, status: 'not_started' }
    ]);

    // Create GL Categories and Accounts for Job 2
    const job2GLCat1 = await GLCategory.create({
      name: 'Materials',
      code: 'MAT',
      jobId: job2._id,
      projectId: project2._id,
      sortOrder: 1
    });

    const job2GLAcc1 = await GLAccount.create({
      name: 'Ductwork Materials',
      code: '301',
      glCategoryId: job2GLCat1._id,
      jobId: job2._id,
      projectId: project2._id,
      sortOrder: 1
    });

    const job2GLCat2 = await GLCategory.create({
      name: 'Direct Labour',
      code: 'LAB',
      jobId: job2._id,
      projectId: project2._id,
      sortOrder: 2
    });

    const job2GLAcc2 = await GLAccount.create({
      name: 'Installation Labor',
      code: '201',
      glCategoryId: job2GLCat2._id,
      jobId: job2._id,
      projectId: project2._id,
      sortOrder: 1
    });

    // Create SOV Line Items for Job 2 (including change orders added in May)
    const job2SOVBase = [
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '001',
        description: 'Ductwork installation - Floor 1',
        systemId: job2Systems[0]._id,
        areaId: job2Areas[0]._id,
        phaseId: job2Phases[1]._id,
        quantity: 15000,
        unit: 'SF',
        unitCost: 18.50,
        totalCost: 277500,
        marginPercent: 28,
        totalValue: 347000,
        glCategoryId: job2GLCat1._id,
        glAccountItemId: job2GLAcc1._id,
        costCodeNumber: '001',
        costCodeName: 'F1-DUCT',
        sortOrder: 1
      },
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '002',
        description: 'Ductwork labor - Floor 1',
        systemId: job2Systems[3]._id,
        areaId: job2Areas[0]._id,
        phaseId: job2Phases[1]._id,
        quantity: 1200,
        unit: 'HR',
        unitCost: 72.00,
        totalCost: 86400,
        marginPercent: 32,
        totalValue: 114048,
        glCategoryId: job2GLCat2._id,
        glAccountItemId: job2GLAcc2._id,
        costCodeNumber: '002',
        costCodeName: 'F1-LAB',
        sortOrder: 2
      },
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '003',
        description: 'Piping installation - Floor 2',
        systemId: job2Systems[1]._id,
        areaId: job2Areas[1]._id,
        phaseId: job2Phases[2]._id,
        quantity: 8000,
        unit: 'LF',
        unitCost: 45.00,
        totalCost: 360000,
        marginPercent: 28,
        totalValue: 450000,
        glCategoryId: job2GLCat1._id,
        glAccountItemId: job2GLAcc1._id,
        costCodeNumber: '003',
        costCodeName: 'F2-PIPE',
        sortOrder: 3
      },
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '004',
        description: 'Piping labor - Floor 2',
        systemId: job2Systems[3]._id,
        areaId: job2Areas[1]._id,
        phaseId: job2Phases[2]._id,
        quantity: 1000,
        unit: 'HR',
        unitCost: 72.00,
        totalCost: 72000,
        marginPercent: 32,
        totalValue: 95040,
        glCategoryId: job2GLCat2._id,
        glAccountItemId: job2GLAcc2._id,
        costCodeNumber: '004',
        costCodeName: 'F2-LAB',
        sortOrder: 4
      },
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '005',
        description: 'HVAC Equipment - Floor 3',
        systemId: job2Systems[2]._id,
        areaId: job2Areas[2]._id,
        phaseId: job2Phases[3]._id,
        quantity: 12,
        unit: 'EA',
        unitCost: 85000,
        totalCost: 1020000,
        marginPercent: 25,
        totalValue: 1275000,
        glCategoryId: job2GLCat1._id,
        glAccountItemId: job2GLAcc1._id,
        costCodeNumber: '005',
        costCodeName: 'F3-EQP',
        sortOrder: 5
      },
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '006',
        description: 'Equipment installation labor - Floor 3',
        systemId: job2Systems[3]._id,
        areaId: job2Areas[2]._id,
        phaseId: job2Phases[3]._id,
        quantity: 800,
        unit: 'HR',
        unitCost: 72.00,
        totalCost: 57600,
        marginPercent: 32,
        totalValue: 76032,
        glCategoryId: job2GLCat2._id,
        glAccountItemId: job2GLAcc2._id,
        costCodeNumber: '006',
        costCodeName: 'F3-LAB',
        sortOrder: 6
      }
    ];

    const job2SOVItems = await ScheduleOfValues.create(job2SOVBase);
    
    // Add change orders in May (month 3)
    const job2ChangeOrders = await ScheduleOfValues.create([
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '007',
        description: 'Additional ductwork - Floor 4 (Change Order)',
        systemId: job2Systems[0]._id,
        areaId: job2Areas[3]._id,
        phaseId: job2Phases[1]._id,
        quantity: 5000,
        unit: 'SF',
        unitCost: 18.50,
        totalCost: 92500,
        marginPercent: 28,
        totalValue: 115625,
        glCategoryId: job2GLCat1._id,
        glAccountItemId: job2GLAcc1._id,
        costCodeNumber: '007',
        costCodeName: 'F4-DUCT-CO',
        sortOrder: 7,
        notes: 'Change Order - Added scope May 2025'
      },
      {
        jobId: job2._id,
        projectId: project2._id,
        lineNumber: '008',
        description: 'Additional labor - Floor 4 (Change Order)',
        systemId: job2Systems[3]._id,
        areaId: job2Areas[3]._id,
        phaseId: job2Phases[1]._id,
        quantity: 400,
        unit: 'HR',
        unitCost: 72.00,
        totalCost: 28800,
        marginPercent: 32,
        totalValue: 38016,
        glCategoryId: job2GLCat2._id,
        glAccountItemId: job2GLAcc2._id,
        costCodeNumber: '008',
        costCodeName: 'F4-LAB-CO',
        sortOrder: 8,
        notes: 'Change Order - Added scope May 2025'
      }
    ]);

    job2SOVItems.push(...job2ChangeOrders);
    console.log(`✅ Created ${job2SOVItems.length} SOV line items for Job 2 (including change orders)`);

    // Create Progress Reports for Job 2 (8 months - showing coordination delays, change orders, equipment delays, overtime)
    console.log('\n📊 Creating progress reports for Job 2...');
    const job2Reports = [];
    const job2ProgressPattern = [
      { month: 0, progress: 3 },   // Feb - Slow start, coordination delays
      { month: 1, progress: 8 },   // Mar - Still slow
      { month: 2, progress: 15 },  // Apr - Picking up
      { month: 3, progress: 28 },  // May - Change orders added
      { month: 4, progress: 42 },  // Jun - Steady progress
      { month: 5, progress: 55 },  // Jul - Equipment delay
      { month: 6, progress: 78 },  // Aug - Overtime push
      { month: 7, progress: 100 }  // Sep - Completion
    ];

    let previousReport2 = null;
    for (let i = 0; i < 8; i++) {
      const reportDate = new Date('2025-02-27');
      reportDate.setMonth(reportDate.getMonth() + i);
      
      const reportPeriodStart = getMonthStart(reportDate);
      const reportPeriodEnd = getMonthEnd(reportDate);
      const reportNumber = `PR-JOB-2025-MECH-001-${String(reportDate.getFullYear())}${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      
      const targetProgress = job2ProgressPattern[i].progress;
      const previousProgress = i > 0 ? job2ProgressPattern[i - 1].progress : 0;
      const progressThisPeriod = targetProgress - previousProgress;

      // Include change orders starting in May (month 3)
      const sovItemsForReport = i >= 3 ? job2SOVItems : job2SOVItems.slice(0, 6);

      const lineItems = sovItemsForReport.map(sov => {
        const previousComplete = previousReport2 
          ? (previousReport2.lineItems.find(li => li.scheduleOfValuesId.equals(sov._id))?.approvedCTD?.percent || 0)
          : 0;
        
        // Equipment delay in July (month 5) - no progress on equipment
        if (i === 5 && sov.costCodeNumber === '005') {
          const previousAmount = (sov.totalValue * previousComplete) / 100;
          return {
            scheduleOfValuesId: sov._id,
            areaId: sov.areaId,
            areaName: job2Areas.find(a => a._id.equals(sov.areaId))?.name || 'Unknown',
            systemId: sov.systemId,
            systemName: job2Systems.find(s => s._id.equals(sov.systemId))?.name || 'Unknown',
            description: sov.description,
            assignedCost: sov.totalValue,
            submittedCTD: { amount: previousAmount, percent: previousComplete },
            approvedCTD: { amount: previousAmount, percent: previousComplete },
            previousComplete: { amount: previousAmount, percent: previousComplete },
            holdbackThisPeriod: 0,
            holdbackPercent: 10,
            dueThisPeriod: 0
          };
        }
        
        const approvedPercent = Math.min(100, previousComplete + (progressThisPeriod * randomBetween(0.8, 1.2)));
        const approvedAmount = (sov.totalValue * approvedPercent) / 100;
        const previousAmount = (sov.totalValue * previousComplete) / 100;
        const amountThisPeriod = approvedAmount - previousAmount;
        const holdback = (amountThisPeriod * 10) / 100;
        const dueThisPeriod = amountThisPeriod - holdback;

        return {
          scheduleOfValuesId: sov._id,
          areaId: sov.areaId,
          areaName: job2Areas.find(a => a._id.equals(sov.areaId))?.name || 'Unknown',
          systemId: sov.systemId,
          systemName: job2Systems.find(s => s._id.equals(sov.systemId))?.name || 'Unknown',
          description: sov.description,
          assignedCost: sov.totalValue,
          submittedCTD: {
            amount: Math.min(sov.totalValue, approvedAmount * randomBetween(0.95, 1.05)),
            percent: Math.min(100, ((approvedAmount * randomBetween(0.95, 1.05)) / sov.totalValue) * 100)
          },
          approvedCTD: {
            amount: approvedAmount,
            percent: approvedPercent
          },
          previousComplete: {
            amount: previousAmount,
            percent: previousComplete
          },
          holdbackThisPeriod: holdback,
          holdbackPercent: 10,
          dueThisPeriod: dueThisPeriod
        };
      });

      const report = await ProgressReport.create({
        reportNumber,
        reportDate,
        reportPeriodStart,
        reportPeriodEnd,
        jobId: job2._id,
        projectId: project2._id,
        completedBy: fieldSupervisors[1]?._id || fieldSupervisors[0]._id,
        completedByName: (fieldSupervisors[1] || fieldSupervisors[0]).name,
        lineItems,
        status: 'approved',
        approvedBy: projectManager._id,
        approvedAt: addDays(reportDate, 2)
      });

      job2Reports.push(report);
      previousReport2 = report;
    }
    console.log(`✅ Created ${job2Reports.length} progress reports for Job 2`);

    // Create Time Entries for Job 2 (showing coordination delays, overtime push)
    console.log('\n⏰ Creating time entries for Job 2...');
    const job2TimeEntries = [];
    const job2StartDate = new Date('2025-02-20');
    const job2EndDate = new Date('2025-09-30');
    
    for (let week = 0; week < 32; week++) {
      const weekStart = addDays(job2StartDate, week * 7);
      
      // Coordination delays in first 8 weeks (Feb-Apr)
      const isCoordinationDelay = week < 8;
      const productivityMultiplier = isCoordinationDelay ? 0.6 : 1.0; // 40% productivity loss
      
      // Overtime push in final 8 weeks (Aug-Sep)
      const isOvertimePush = week >= 24;
      const overtimeMultiplier = isOvertimePush ? 2.0 : 1.0;
      
      for (let day = 0; day < 5; day++) {
        const entryDate = addDays(weekStart, day);
        if (entryDate > job2EndDate) break;
        
        for (const worker of workers.slice(2, 6)) { // Different workers
          const baseHours = 8;
          const regularHours = baseHours * productivityMultiplier;
          const overtimeHours = isOvertimePush ? baseHours * 0.5 * overtimeMultiplier : 0;
          const totalHours = regularHours + overtimeHours;
          
          let costCode = '002';
          if (week < 12) costCode = '002'; // F1-LAB
          else if (week < 20) costCode = '004'; // F2-LAB
          else if (week < 24) costCode = '006'; // F3-LAB
          else costCode = '008'; // F4-LAB (change order)
          
          const workDescription = isCoordinationDelay
            ? `Waiting for other trades - Coordination delay`
            : isOvertimePush
            ? `Overtime work - Final push to meet deadline`
            : `HVAC installation work - ${job2Areas[Math.floor(week / 8) % 4].name}`;

          const timeEntry = await TimeEntry.create({
            workerId: worker._id,
            jobId: job2._id,
            projectId: project2._id,
            date: entryDate,
            startTime: '07:00',
            endTime: isOvertimePush ? '19:00' : '16:00',
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            doubleTimeHours: 0,
            totalHours: totalHours,
            costCode: costCode,
            costCodeDescription: job2SOVItems.find(s => s.costCodeNumber === costCode)?.costCodeName || 'Labor',
            workDescription: workDescription,
            craft: 'general',
            category: 'ductwork',
            status: 'approved',
            approvedBy: fieldSupervisors[1]?._id || fieldSupervisors[0]._id,
            approvedAt: addDays(entryDate, 1),
            hourlyRate: 38.00,
            overtimeRate: 57.00
          });
          
          job2TimeEntries.push(timeEntry);
        }
      }
    }
    console.log(`✅ Created ${job2TimeEntries.length} time entries for Job 2`);

    // Create TimelogRegister entries for Job 2
    console.log('\n📋 Creating TimelogRegister entries for Job 2...');
    const job2TimelogEntries = await createTimelogRegisterEntries(
      job2TimeEntries,
      job2._id,
      project2._id,
      job2SOVItems,
      job2Areas,
      fieldSupervisors[1]?._id || fieldSupervisors[0]._id
    );
    console.log(`✅ Created ${job2TimelogEntries.length} TimelogRegister entries for Job 2`);

    // Create AP Register entries for Job 2
    console.log('\n💰 Creating AP Register entries for Job 2...');
    const job2APEntries = [];
    const hvacVendors = [
      { name: 'HVAC Supply Co', vendorNumber: 'VND-101' },
      { name: 'Mechanical Equipment Inc', vendorNumber: 'VND-102' },
      { name: 'Ductwork Manufacturing', vendorNumber: 'VND-103' }
    ];
    
    for (let month = 0; month < 8; month++) {
      const invoiceDate = new Date('2025-02-15');
      invoiceDate.setMonth(invoiceDate.getMonth() + month);
      
      const vendor = hvacVendors[month % hvacVendors.length];
      
      // Equipment invoice in June (month 4) - large amount
      const isEquipmentMonth = month === 4;
      const materialAmount = isEquipmentMonth ? 1020000 : (month < 4 ? 80000 : 95000);
      
      const invoice = await APRegister.create({
        invoiceNumber: `INV-${vendor.vendorNumber}-${String(invoiceDate.getFullYear())}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(month + 1).padStart(3, '0')}`,
        invoiceDate: invoiceDate,
        dueDate: addDays(invoiceDate, 30),
        receivedDate: invoiceDate,
        vendor: {
          name: vendor.name,
          vendorNumber: vendor.vendorNumber
        },
        invoiceAmount: materialAmount,
        taxAmount: materialAmount * 0.05,
        totalAmount: materialAmount * 1.05,
        jobId: job2._id,
        projectId: project2._id,
        costCodeBreakdown: [{
          costCode: isEquipmentMonth ? '005' : (month < 2 ? '001' : month < 4 ? '003' : '007'),
          description: isEquipmentMonth ? 'HVAC Equipment' : 'Materials',
          amount: materialAmount * 1.05
        }],
        invoiceType: isEquipmentMonth ? 'equipment' : 'material',
        category: isEquipmentMonth ? 'equipment_rental' : 'insulation_materials',
        paymentStatus: month < 6 ? 'paid' : 'approved',
        paymentDate: month < 6 ? addDays(invoiceDate, 25) : null,
        enteredBy: projectManager._id
      });
      
      job2APEntries.push(invoice);
    }
    console.log(`✅ Created ${job2APEntries.length} AP Register entries for Job 2`);

    // ========================================================================
    // JOB 3: ELECTRICAL - Data Center
    // ========================================================================
    console.log('\n🏗️  Creating JOB 3: Electrical - Data Center...');
    
    const project3 = await Project.create({
      name: 'TechCorp Data Center',
      projectNumber: 'PROJ-2025-DATA-001',
      client: {
        name: 'TechCorp Industries',
        contact: 'Michael Chen',
        email: 'michael.chen@techcorp.com',
        phone: '416-555-0300'
      },
      description: 'New data center facility - Complete electrical installation',
      location: {
        address: 'Toronto, Ontario'
      },
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-12-31'),
      totalContractValue: 5600000,
      status: 'active',
      projectManager: projectManager._id
    });

    const job3 = await Job.create({
      name: 'Data Center Electrical Installation',
      jobNumber: 'JOB-2025-ELEC-001',
      projectId: project3._id,
      client: project3.client,
      description: 'Complete electrical installation including power distribution, backup systems, lighting, fire alarm, and low-voltage systems',
      location: {
        address: 'Toronto, Ontario',
        city: 'Toronto',
        province: 'ON'
      },
      plannedStartDate: new Date('2025-03-15'),
      actualStartDate: new Date('2025-03-20'), // 5 day delay
      plannedEndDate: new Date('2025-12-31'),
      contractValue: 5600000,
      status: 'in_progress',
      jobManager: projectManager._id,
      fieldSupervisor: fieldSupervisors[0]._id,
      foremen: [fieldSupervisors[0]._id]
    });

    // Create Systems, Areas, Phases for Job 3
    const job3Systems = await System.create([
      { name: 'Power Distribution', code: 'PWR', jobId: job3._id, projectId: project3._id, sortOrder: 1 },
      { name: 'Backup Systems', code: 'BUP', jobId: job3._id, projectId: project3._id, sortOrder: 2 },
      { name: 'Lighting', code: 'LGT', jobId: job3._id, projectId: project3._id, sortOrder: 3 },
      { name: 'Fire Alarm', code: 'FAL', jobId: job3._id, projectId: project3._id, sortOrder: 4 },
      { name: 'Low Voltage', code: 'LV', jobId: job3._id, projectId: project3._id, sortOrder: 5 },
      { name: 'Labor', code: 'LAB', jobId: job3._id, projectId: project3._id, sortOrder: 6 }
    ]);

    const job3Areas = await Area.create([
      { name: 'Server Room A', code: 'SR-A', jobId: job3._id, projectId: project3._id, sortOrder: 1 },
      { name: 'Server Room B', code: 'SR-B', jobId: job3._id, projectId: project3._id, sortOrder: 2 },
      { name: 'Office Areas', code: 'OFF', jobId: job3._id, projectId: project3._id, sortOrder: 3 },
      { name: 'Common Areas', code: 'COM', jobId: job3._id, projectId: project3._id, sortOrder: 4 }
    ]);

    const job3Phases = await Phase.create([
      { name: 'Phase 1 - Site Prep', code: 'P1', jobId: job3._id, projectId: project3._id, sortOrder: 1, status: 'completed' },
      { name: 'Phase 2 - Power Distribution', code: 'P2', jobId: job3._id, projectId: project3._id, sortOrder: 2, status: 'in_progress' },
      { name: 'Phase 3 - Backup Systems', code: 'P3', jobId: job3._id, projectId: project3._id, sortOrder: 3, status: 'in_progress' },
      { name: 'Phase 4 - Lighting & Fire Alarm', code: 'P4', jobId: job3._id, projectId: project3._id, sortOrder: 4, status: 'in_progress' },
      { name: 'Phase 5 - Low Voltage', code: 'P5', jobId: job3._id, projectId: project3._id, sortOrder: 5, status: 'not_started' },
      { name: 'Phase 6 - Testing & Commissioning', code: 'P6', jobId: job3._id, projectId: project3._id, sortOrder: 6, status: 'not_started' }
    ]);

    // Create GL Categories and Accounts for Job 3
    const job3GLCat1 = await GLCategory.create({
      name: 'Materials',
      code: 'MAT',
      jobId: job3._id,
      projectId: project3._id,
      sortOrder: 1
    });

    const job3GLAcc1 = await GLAccount.create({
      name: 'Electrical Materials',
      code: '401',
      glCategoryId: job3GLCat1._id,
      jobId: job3._id,
      projectId: project3._id,
      sortOrder: 1
    });

    const job3GLCat2 = await GLCategory.create({
      name: 'Direct Labour',
      code: 'LAB',
      jobId: job3._id,
      projectId: project3._id,
      sortOrder: 2
    });

    const job3GLAcc2 = await GLAccount.create({
      name: 'Installation Labor',
      code: '301',
      glCategoryId: job3GLCat2._id,
      jobId: job3._id,
      projectId: project3._id,
      sortOrder: 1
    });

    // Create SOV Line Items for Job 3
    const job3SOVItems = await ScheduleOfValues.create([
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '001',
        description: 'Power distribution - Server Room A',
        systemId: job3Systems[0]._id,
        areaId: job3Areas[0]._id,
        phaseId: job3Phases[1]._id,
        quantity: 1,
        unit: 'LS',
        unitCost: 450000,
        totalCost: 450000,
        marginPercent: 22,
        totalValue: 550000,
        glCategoryId: job3GLCat1._id,
        glAccountItemId: job3GLAcc1._id,
        costCodeNumber: '001',
        costCodeName: 'SR-A-PWR',
        sortOrder: 1
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '002',
        description: 'Power distribution labor - Server Room A',
        systemId: job3Systems[5]._id,
        areaId: job3Areas[0]._id,
        phaseId: job3Phases[1]._id,
        quantity: 600,
        unit: 'HR',
        unitCost: 85.00,
        totalCost: 51000,
        marginPercent: 30,
        totalValue: 66300,
        glCategoryId: job3GLCat2._id,
        glAccountItemId: job3GLAcc2._id,
        costCodeNumber: '002',
        costCodeName: 'SR-A-LAB',
        sortOrder: 2
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '003',
        description: 'Backup generator system',
        systemId: job3Systems[1]._id,
        areaId: job3Areas[0]._id,
        phaseId: job3Phases[2]._id,
        quantity: 2,
        unit: 'EA',
        unitCost: 350000,
        totalCost: 700000,
        marginPercent: 20,
        totalValue: 840000,
        glCategoryId: job3GLCat1._id,
        glAccountItemId: job3GLAcc1._id,
        costCodeNumber: '003',
        costCodeName: 'SR-A-BUP',
        sortOrder: 3
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '004',
        description: 'Backup system installation labor',
        systemId: job3Systems[5]._id,
        areaId: job3Areas[0]._id,
        phaseId: job3Phases[2]._id,
        quantity: 500,
        unit: 'HR',
        unitCost: 85.00,
        totalCost: 42500,
        marginPercent: 30,
        totalValue: 55250,
        glCategoryId: job3GLCat2._id,
        glAccountItemId: job3GLAcc2._id,
        costCodeNumber: '004',
        costCodeName: 'SR-A-BUP-LAB',
        sortOrder: 4
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '005',
        description: 'Lighting installation - Office Areas',
        systemId: job3Systems[2]._id,
        areaId: job3Areas[2]._id,
        phaseId: job3Phases[3]._id,
        quantity: 800,
        unit: 'EA',
        unitCost: 125.00,
        totalCost: 100000,
        marginPercent: 25,
        totalValue: 125000,
        glCategoryId: job3GLCat1._id,
        glAccountItemId: job3GLAcc1._id,
        costCodeNumber: '005',
        costCodeName: 'OFF-LGT',
        sortOrder: 5
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '006',
        description: 'Lighting installation labor',
        systemId: job3Systems[5]._id,
        areaId: job3Areas[2]._id,
        phaseId: job3Phases[3]._id,
        quantity: 400,
        unit: 'HR',
        unitCost: 85.00,
        totalCost: 34000,
        marginPercent: 30,
        totalValue: 44200,
        glCategoryId: job3GLCat2._id,
        glAccountItemId: job3GLAcc2._id,
        costCodeNumber: '006',
        costCodeName: 'OFF-LGT-LAB',
        sortOrder: 6
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '007',
        description: 'Fire alarm system',
        systemId: job3Systems[3]._id,
        areaId: job3Areas[3]._id,
        phaseId: job3Phases[3]._id,
        quantity: 1,
        unit: 'LS',
        unitCost: 280000,
        totalCost: 280000,
        marginPercent: 22,
        totalValue: 342000,
        glCategoryId: job3GLCat1._id,
        glAccountItemId: job3GLAcc1._id,
        costCodeNumber: '007',
        costCodeName: 'COM-FAL',
        sortOrder: 7
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '008',
        description: 'Fire alarm installation labor',
        systemId: job3Systems[5]._id,
        areaId: job3Areas[3]._id,
        phaseId: job3Phases[3]._id,
        quantity: 350,
        unit: 'HR',
        unitCost: 85.00,
        totalCost: 29750,
        marginPercent: 30,
        totalValue: 38675,
        glCategoryId: job3GLCat2._id,
        glAccountItemId: job3GLAcc2._id,
        costCodeNumber: '008',
        costCodeName: 'COM-FAL-LAB',
        sortOrder: 8
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '009',
        description: 'Low voltage systems',
        systemId: job3Systems[4]._id,
        areaId: job3Areas[0]._id,
        phaseId: job3Phases[4]._id,
        quantity: 1,
        unit: 'LS',
        unitCost: 320000,
        totalCost: 320000,
        marginPercent: 22,
        totalValue: 390000,
        glCategoryId: job3GLCat1._id,
        glAccountItemId: job3GLAcc1._id,
        costCodeNumber: '009',
        costCodeName: 'SR-A-LV',
        sortOrder: 9
      },
      {
        jobId: job3._id,
        projectId: project3._id,
        lineNumber: '010',
        description: 'Low voltage installation labor',
        systemId: job3Systems[5]._id,
        areaId: job3Areas[0]._id,
        phaseId: job3Phases[4]._id,
        quantity: 450,
        unit: 'HR',
        unitCost: 85.00,
        totalCost: 38250,
        marginPercent: 30,
        totalValue: 49725,
        glCategoryId: job3GLCat2._id,
        glAccountItemId: job3GLAcc2._id,
        costCodeNumber: '010',
        costCodeName: 'SR-A-LV-LAB',
        sortOrder: 10
      }
    ]);

    console.log(`✅ Created ${job3SOVItems.length} SOV line items for Job 3`);

    // Create Progress Reports for Job 3 (10 months - showing slow start, material volatility, testing delays)
    console.log('\n📊 Creating progress reports for Job 3...');
    const job3Reports = [];
    const job3ProgressPattern = [
      { month: 0, progress: 2 },   // Mar - Very slow start
      { month: 1, progress: 5 },   // Apr - Still slow
      { month: 2, progress: 10 },  // May - Picking up
      { month: 3, progress: 18 },  // Jun - Material volatility
      { month: 4, progress: 28 },  // Jul - Material volatility continues
      { month: 5, progress: 40 },  // Aug - Steady progress
      { month: 6, progress: 55 },  // Sep - Testing phase starts
      { month: 7, progress: 70 },  // Oct - Testing delays
      { month: 8, progress: 85 },  // Nov - Testing continues
      { month: 9, progress: 100 }  // Dec - Completion
    ];

    let previousReport3 = null;
    for (let i = 0; i < 10; i++) {
      const reportDate = new Date('2025-03-27');
      reportDate.setMonth(reportDate.getMonth() + i);
      
      const reportPeriodStart = getMonthStart(reportDate);
      const reportPeriodEnd = getMonthEnd(reportDate);
      const reportNumber = `PR-JOB-2025-ELEC-001-${String(reportDate.getFullYear())}${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      
      const targetProgress = job3ProgressPattern[i].progress;
      const previousProgress = i > 0 ? job3ProgressPattern[i - 1].progress : 0;
      const progressThisPeriod = targetProgress - previousProgress;

      const lineItems = job3SOVItems.map(sov => {
        const previousComplete = previousReport3 
          ? (previousReport3.lineItems.find(li => li.scheduleOfValuesId.equals(sov._id))?.approvedCTD?.percent || 0)
          : 0;
        
        // Testing phase delays (Sep-Oct) - slower progress on all systems
        const isTestingPhase = i >= 6 && i < 8;
        const progressMultiplier = isTestingPhase ? 0.5 : 1.0;
        
        const approvedPercent = Math.min(100, previousComplete + (progressThisPeriod * progressMultiplier * randomBetween(0.8, 1.2)));
        const approvedAmount = (sov.totalValue * approvedPercent) / 100;
        const previousAmount = (sov.totalValue * previousComplete) / 100;
        const amountThisPeriod = approvedAmount - previousAmount;
        const holdback = (amountThisPeriod * 10) / 100;
        const dueThisPeriod = amountThisPeriod - holdback;

        return {
          scheduleOfValuesId: sov._id,
          areaId: sov.areaId,
          areaName: job3Areas.find(a => a._id.equals(sov.areaId))?.name || 'Unknown',
          systemId: sov.systemId,
          systemName: job3Systems.find(s => s._id.equals(sov.systemId))?.name || 'Unknown',
          description: sov.description,
          assignedCost: sov.totalValue,
          submittedCTD: {
            amount: Math.min(sov.totalValue, approvedAmount * randomBetween(0.95, 1.05)),
            percent: Math.min(100, ((approvedAmount * randomBetween(0.95, 1.05)) / sov.totalValue) * 100)
          },
          approvedCTD: {
            amount: approvedAmount,
            percent: approvedPercent
          },
          previousComplete: {
            amount: previousAmount,
            percent: previousComplete
          },
          holdbackThisPeriod: holdback,
          holdbackPercent: 10,
          dueThisPeriod: dueThisPeriod
        };
      });

      const report = await ProgressReport.create({
        reportNumber,
        reportDate,
        reportPeriodStart,
        reportPeriodEnd,
        jobId: job3._id,
        projectId: project3._id,
        completedBy: fieldSupervisors[0]._id,
        completedByName: fieldSupervisors[0].name,
        lineItems,
        status: 'approved',
        approvedBy: projectManager._id,
        approvedAt: addDays(reportDate, 2)
      });

      job3Reports.push(report);
      previousReport3 = report;
    }
    console.log(`✅ Created ${job3Reports.length} progress reports for Job 3`);

    // Create Time Entries for Job 3 (showing slow start, testing phase)
    console.log('\n⏰ Creating time entries for Job 3...');
    const job3TimeEntries = [];
    const job3StartDate = new Date('2025-03-20');
    const job3EndDate = new Date('2025-12-31');
    
    for (let week = 0; week < 40; week++) {
      const weekStart = addDays(job3StartDate, week * 7);
      
      // Slow start in first 10 weeks (Mar-May)
      const isSlowStart = week < 10;
      const productivityMultiplier = isSlowStart ? 0.5 : 1.0; // 50% productivity loss
      
      // Testing phase in weeks 24-32 (Sep-Oct)
      const isTestingPhase = week >= 24 && week < 32;
      
      for (let day = 0; day < 5; day++) {
        const entryDate = addDays(weekStart, day);
        if (entryDate > job3EndDate) break;
        
        // Fewer workers in slow start phase
        const workersForWeek = isSlowStart ? workers.slice(4, 6) : workers.slice(4, 8);
        
        for (const worker of workersForWeek) {
          const baseHours = 8;
          const regularHours = baseHours * productivityMultiplier;
          const overtimeHours = 0; // No overtime on this job
          const totalHours = regularHours + overtimeHours;
          
          let costCode = '002';
          if (week < 12) costCode = '002'; // SR-A-LAB
          else if (week < 20) costCode = '004'; // SR-A-BUP-LAB
          else if (week < 28) costCode = '006'; // OFF-LGT-LAB
          else if (week < 32) costCode = '008'; // COM-FAL-LAB
          else costCode = '010'; // SR-A-LV-LAB
          
          const workDescription = isSlowStart
            ? `Site preparation and permit coordination - Slow start phase`
            : isTestingPhase
            ? `Testing and commissioning - ${job3Systems[Math.floor((week - 24) / 2) % 6].name}`
            : `Electrical installation work - ${job3Areas[Math.floor(week / 10) % 4].name}`;

          const timeEntry = await TimeEntry.create({
            workerId: worker._id,
            jobId: job3._id,
            projectId: project3._id,
            date: entryDate,
            startTime: '07:00',
            endTime: '16:00',
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            doubleTimeHours: 0,
            totalHours: totalHours,
            costCode: costCode,
            costCodeDescription: job3SOVItems.find(s => s.costCodeNumber === costCode)?.costCodeName || 'Labor',
            workDescription: workDescription,
            craft: 'general',
            category: 'equipment',
            status: 'approved',
            approvedBy: fieldSupervisors[0]._id,
            approvedAt: addDays(entryDate, 1),
            hourlyRate: 42.00,
            overtimeRate: 63.00
          });
          
          job3TimeEntries.push(timeEntry);
        }
      }
    }
    console.log(`✅ Created ${job3TimeEntries.length} time entries for Job 3`);

    // Create TimelogRegister entries for Job 3
    console.log('\n📋 Creating TimelogRegister entries for Job 3...');
    const job3TimelogEntries = await createTimelogRegisterEntries(
      job3TimeEntries,
      job3._id,
      project3._id,
      job3SOVItems,
      job3Areas,
      fieldSupervisors[0]._id
    );
    console.log(`✅ Created ${job3TimelogEntries.length} TimelogRegister entries for Job 3`);

    // Create AP Register entries for Job 3 (showing material volatility)
    console.log('\n💰 Creating AP Register entries for Job 3...');
    const job3APEntries = [];
    const electricalVendors = [
      { name: 'Electrical Supply Co', vendorNumber: 'VND-201' },
      { name: 'Power Systems Inc', vendorNumber: 'VND-202' },
      { name: 'Tech Electrical Ltd', vendorNumber: 'VND-203' }
    ];
    
    for (let month = 0; month < 10; month++) {
      const invoiceDate = new Date('2025-03-15');
      invoiceDate.setMonth(invoiceDate.getMonth() + month);
      
      const vendor = electricalVendors[month % electricalVendors.length];
      
      // Material volatility in June-August (months 3-5)
      const isVolatilePeriod = month >= 3 && month < 6;
      const volatilityFactor = isVolatilePeriod ? randomBetween(0.85, 1.30) : 1.0;
      
      // Large equipment invoices in specific months
      let materialAmount;
      if (month === 2) materialAmount = 700000; // Backup generators
      else if (month === 4) materialAmount = 450000; // Power distribution
      else if (month === 6) materialAmount = 280000; // Fire alarm
      else if (month === 8) materialAmount = 320000; // Low voltage
      else materialAmount = 50000 * volatilityFactor; // Regular materials
      
      const invoice = await APRegister.create({
        invoiceNumber: `INV-${vendor.vendorNumber}-${String(invoiceDate.getFullYear())}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(month + 1).padStart(3, '0')}`,
        invoiceDate: invoiceDate,
        dueDate: addDays(invoiceDate, 30),
        receivedDate: invoiceDate,
        vendor: {
          name: vendor.name,
          vendorNumber: vendor.vendorNumber
        },
        invoiceAmount: materialAmount,
        taxAmount: materialAmount * 0.13, // HST in Ontario
        totalAmount: materialAmount * 1.13,
        jobId: job3._id,
        projectId: project3._id,
        costCodeBreakdown: [{
          costCode: month === 2 ? '003' : month === 4 ? '001' : month === 6 ? '007' : month === 8 ? '009' : '001',
          description: month === 2 ? 'Backup generators' : month === 4 ? 'Power distribution' : month === 6 ? 'Fire alarm system' : month === 8 ? 'Low voltage systems' : 'Electrical materials',
          amount: materialAmount * 1.13
        }],
        invoiceType: 'material',
        category: 'insulation_materials',
        paymentStatus: month < 8 ? 'paid' : 'approved',
        paymentDate: month < 8 ? addDays(invoiceDate, 25) : null,
        enteredBy: projectManager._id
      });
      
      job3APEntries.push(invoice);
    }
    console.log(`✅ Created ${job3APEntries.length} AP Register entries for Job 3`);

    // Summary
    console.log('\n✅ ========================================');
    console.log('✅ THREE SCENARIO JOBS SEED COMPLETE');
    console.log('✅ ========================================');
    console.log(`\n📊 Summary:`);
    console.log(`   Job 1 (Insulation): ${job1SOVItems.length} SOV items, ${job1Reports.length} reports, ${job1TimeEntries.length} time entries, ${job1TimelogEntries.length} timelog entries, ${job1APEntries.length} AP entries`);
    console.log(`   Job 2 (Mechanical): ${job2SOVItems.length} SOV items, ${job2Reports.length} reports, ${job2TimeEntries.length} time entries, ${job2TimelogEntries.length} timelog entries, ${job2APEntries.length} AP entries`);
    console.log(`   Job 3 (Electrical): ${job3SOVItems.length} SOV items, ${job3Reports.length} reports, ${job3TimeEntries.length} time entries, ${job3TimelogEntries.length} timelog entries, ${job3APEntries.length} AP entries`);
    console.log(`\n📄 See THREE_JOB_SCENARIOS.md for scenario details`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding three scenario jobs:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed
seedThreeScenarioJobs();

