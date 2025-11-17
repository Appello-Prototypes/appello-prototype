#!/usr/bin/env node

/**
 * VAV Progress Reports Creation
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const ProgressReport = require('../src/server/models/ProgressReport');

const MONGODB_URI = process.env.MONGODB_URI;

async function createProgressReports() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const vavJob = await Job.findOne({ jobNumber: 'JOB-2024-001-B' });
    const project = await Project.findById(vavJob.projectId);
    const users = await User.find();
    const existingSOV = await ScheduleOfValues.find({ jobId: vavJob._id });
    
    // Clear existing progress reports
    await ProgressReport.deleteMany({ jobId: vavJob._id });
    
    // Create simplified progress reports
    const progressReports = await ProgressReport.create([
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
            balanceToFinish: 85500,
            currentProgress: 50
          }
        ],
        totalScheduledValue: 171000,
        totalPreviouslyCompleted: 0,
        totalCompletedThisPeriod: 85500,
        totalCompleted: 85500,
        overallPercentComplete: 50,
        totalBalanceToFinish: 85500,
        totalRetainage: 8550,
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
        status: 'approved'
      },
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
            balanceToFinish: 42750,
            currentProgress: 75
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-DUCT-001')._id,
            lineNumber: '003',
            costCode: 'VAV-DUCT-001',
            description: 'Ductwork Modifications',
            totalContractValue: 140400,
            previouslyCompleted: 0,
            completedThisPeriod: 65772,
            totalCompleted: 65772,
            percentComplete: 47,
            balanceToFinish: 74628,
            currentProgress: 47
          }
        ],
        totalScheduledValue: 311400,
        totalPreviouslyCompleted: 85500,
        totalCompletedThisPeriod: 108522,
        totalCompleted: 194022,
        overallPercentComplete: 62,
        totalBalanceToFinish: 117378,
        totalRetainage: 19402,
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
        status: 'approved'
      },
      {
        reportNumber: 'PR-VAV-2024-05',
        reportDate: new Date('2024-05-31'),
        reportPeriodStart: new Date('2024-05-01'),
        reportPeriodEnd: new Date('2024-05-31'),
        jobId: vavJob._id,
        projectId: project._id,
        lineItems: [
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
            balanceToFinish: 81792,
            currentProgress: 43
          },
          {
            scheduleOfValuesId: existingSOV.find(s => s.costCode === 'VAV-CTRL-001')._id,
            lineNumber: '004',
            costCode: 'VAV-CTRL-001',
            description: 'VAV Control Systems',
            totalContractValue: 96390,
            previouslyCompleted: 0,
            completedThisPeriod: 45684,
            totalCompleted: 45684,
            percentComplete: 47,
            balanceToFinish: 50706,
            currentProgress: 47
          }
        ],
        totalScheduledValue: 240390,
        totalPreviouslyCompleted: 0,
        totalCompletedThisPeriod: 107892,
        totalCompleted: 107892,
        overallPercentComplete: 45,
        totalBalanceToFinish: 132498,
        totalRetainage: 10789,
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
        status: 'submitted'
      }
    ]);
    
    console.log('✅ Created', progressReports.length, 'progress reports');
    console.log('🎉 Progress reports completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

createProgressReports();
