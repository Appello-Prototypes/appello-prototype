#!/usr/bin/env node

/**
 * Seed Projects, Jobs, Tasks, and related data
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/server/models/User');
const Project = require('../src/server/models/Project');
const Job = require('../src/server/models/Job');
const Task = require('../src/server/models/Task');
const TimeEntry = require('../src/server/models/TimeEntry');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/appello-tasks';

async function seedProjects() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get existing users
    const users = await User.find();
    if (users.length === 0) {
      console.log('❌ No users found. Run init-production-db.js first.');
      process.exit(1);
    }
    
    console.log(`📋 Found ${users.length} users`);
    
    // Clear existing projects, jobs, tasks, time entries, and SOV
    await Promise.all([
      Project.deleteMany({}),
      Job.deleteMany({}),
      Task.deleteMany({}),
      TimeEntry.deleteMany({}),
      ScheduleOfValues.deleteMany({})
    ]);
    
    console.log('🧹 Cleared existing project data');
    
    // Create projects
    const projects = await Project.create([
      {
        projectNumber: 'PRJ-2024-001',
        name: 'Downtown Office Complex HVAC',
        description: 'Complete HVAC installation for 15-story office building',
        client: {
          name: 'Metropolitan Properties',
          contact: 'John Smith',
          email: 'john.smith@metroproperties.com',
          phone: '555-1001'
        },
        status: 'active',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-30'),
        totalContractValue: 850000,
        location: {
          address: '123 Business District, Downtown',
          coordinates: [-74.006, 40.7128]
        },
        projectManager: users.find(u => u.role === 'project_manager')?._id || users[0]._id
      },
      {
        projectNumber: 'PRJ-2024-002',
        name: 'Hospital Renovation - East Wing',
        description: 'HVAC system upgrade and installation in hospital east wing',
        client: {
          name: 'City General Hospital',
          contact: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@cityhospital.com',
          phone: '555-1002'
        },
        status: 'active',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-15'),
        totalContractValue: 1200000,
        location: {
          address: '456 Medical Center Drive',
          coordinates: [-74.016, 40.7228]
        },
        projectManager: users.find(u => u.role === 'project_manager')?._id || users[0]._id
      }
    ]);
    
    console.log(`✅ Created ${projects.length} projects`);
    
    // Create jobs
    const jobs = await Job.create([
      {
        name: 'Main Floor HVAC Installation',
        jobNumber: 'JOB-2024-001-A',
        description: 'Install main HVAC units for floors 1-5',
        projectId: projects[0]._id,
        client: {
          name: 'Metropolitan Properties',
          contact: 'John Smith',
          email: 'john.smith@metroproperties.com',
          phone: '555-1001'
        },
        status: 'active',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-03-15'),
        contractValue: 400000,
        jobManager: users.find(u => u.role === 'field_supervisor')?._id || users[1]._id,
        assignedTeam: [users[1]._id, users[2]._id],
        location: {
          address: '123 Business District, Downtown',
          coordinates: [-74.006, 40.7128]
        }
      },
      {
        name: 'Hospital OR Suite HVAC',
        jobNumber: 'JOB-2024-002-A',
        description: 'Specialized HVAC installation for operating room suites',
        projectId: projects[1]._id,
        client: {
          name: 'City General Hospital',
          contact: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@cityhospital.com',
          phone: '555-1002'
        },
        status: 'active',
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-04-30'),
        contractValue: 500000,
        jobManager: users.find(u => u.role === 'field_supervisor')?._id || users[1]._id,
        assignedTeam: [users[1]._id, users[2]._id],
        location: {
          address: '456 Medical Center Drive',
          coordinates: [-74.016, 40.7228]
        }
      }
    ]);
    
    console.log(`✅ Created ${jobs.length} jobs`);
    
    // Create tasks
    const tasks = await Task.create([
      {
        title: 'Site Survey and Measurements',
        description: 'Complete detailed measurements of installation areas',
        jobId: jobs[0]._id,
        assignedTo: users[2]._id,
        createdBy: users[1]._id,
        costCode: 'HVAC-SURVEY',
        status: 'completed',
        priority: 'high',
        estimatedHours: 8,
        actualHours: 7.5,
        dueDate: new Date('2024-01-25'),
        completedAt: new Date('2024-01-24')
      },
      {
        title: 'Equipment Delivery Coordination',
        description: 'Coordinate delivery of HVAC units and materials',
        jobId: jobs[0]._id,
        assignedTo: users[1]._id,
        createdBy: users[1]._id,
        costCode: 'HVAC-DELIVERY',
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 4,
        dueDate: new Date('2024-02-01')
      },
      {
        title: 'OR Suite Environmental Controls',
        description: 'Install specialized environmental controls for operating rooms',
        jobId: jobs[1]._id,
        assignedTo: users[1]._id,
        createdBy: users[1]._id,
        costCode: 'HVAC-CONTROLS',
        status: 'in_progress',
        priority: 'critical',
        estimatedHours: 32,
        dueDate: new Date('2024-03-15')
      }
    ]);
    
    console.log(`✅ Created ${tasks.length} tasks`);
    
    // Create time entries
    const timeEntries = await TimeEntry.create([
      {
        userId: users[2]._id,
        jobId: jobs[0]._id,
        taskId: tasks[0]._id,
        date: new Date('2024-01-24'),
        startTime: '08:00',
        endTime: '16:30',
        hours: 7.5,
        description: 'Completed site survey and detailed measurements',
        status: 'approved'
      },
      {
        userId: users[1]._id,
        jobId: jobs[0]._id,
        taskId: tasks[1]._id,
        date: new Date('2024-01-25'),
        startTime: '09:00',
        endTime: '13:00',
        hours: 4,
        description: 'Coordinated equipment delivery with suppliers',
        status: 'submitted'
      }
    ]);
    
    console.log(`✅ Created ${timeEntries.length} time entries`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Projects: ${projects.length}`);
    console.log(`- Jobs: ${jobs.length}`);
    console.log(`- Tasks: ${tasks.length}`);
    console.log(`- Time Entries: ${timeEntries.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seedProjects();
