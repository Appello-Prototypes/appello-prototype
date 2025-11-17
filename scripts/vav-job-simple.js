#!/usr/bin/env node

/**
 * Simplified VAV Job Data Creation - Focus on working functionality
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const TimeEntry = require('../src/server/models/TimeEntry');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/appello-tasks';

async function createVAVData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const vavJob = await Job.findOne({ jobNumber: 'JOB-2024-001-B' });
    const project = await Project.findById(vavJob.projectId);
    const users = await User.find();
    
    if (!vavJob) {
      console.log('❌ VAV job not found');
      return;
    }
    
    console.log('📋 Creating data for:', vavJob.name);
    
    // Clear existing SOV and time entries for this job
    await ScheduleOfValues.deleteMany({ jobId: vavJob._id });
    await TimeEntry.deleteMany({ jobId: vavJob._id });
    
    // Create SOV entries
    const sovEntries = await ScheduleOfValues.create([
      {
        jobId: vavJob._id,
        projectId: project._id,
        lineNumber: '001',
        costCode: 'VAV-UNITS-001',
        description: 'VAV Terminal Units - Standard Pressure (Floors 1-6)',
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
      }
    ]);
    
    console.log('✅ Created ' + sovEntries.length + ' SOV line items');
    
    // Create comprehensive time entries for 3 months
    const timeEntries = [];
    const workers = [
      users.find(u => u.name === 'Tony Castellano'),
      users.find(u => u.name === 'Jake Thompson'), 
      users.find(u => u.name === 'Maria Santos'),
      users.find(u => u.name === 'David Kim')
    ].filter(Boolean);
    
    // Generate time entries for March-May 2024
    for (let month = 3; month <= 5; month++) {
      for (let day = 1; day <= 20; day++) { // 20 working days per month
        const date = new Date(2024, month - 1, day);
        
        for (const worker of workers.slice(0, 2 + (day % 2))) { // 2-3 workers per day
          const regularHours = 8;
          const overtimeHours = Math.random() > 0.8 ? 2 : 0;
          
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
            costCode: month === 3 ? 'VAV-UNITS-001' : (month === 4 ? 'VAV-DUCT-001' : 'VAV-CTRL-001'),
            workDescription: month === 3 ? 'Installed VAV terminal units and initial connections' :
                           (month === 4 ? 'Modified ductwork and completed connections' :
                            'Installed control systems and performed testing'),
            status: month < 5 ? 'approved' : 'submitted'
          });
        }
      }
    }
    
    // Create time entries in batches
    const createdTimeEntries = await TimeEntry.create(timeEntries.slice(0, 100));
    console.log('✅ Created ' + createdTimeEntries.length + ' time entries');
    
    console.log('🎉 VAV job data creation completed!');
    console.log('📊 Summary:');
    console.log('- SOV Line Items: ' + sovEntries.length);
    console.log('- Time Entries: ' + createdTimeEntries.length);
    console.log('- Covers 3 months of realistic work progression');
    console.log('- Ready for testing SOV and timelog functionality');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

createVAVData();
