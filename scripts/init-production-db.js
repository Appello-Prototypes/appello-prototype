#!/usr/bin/env node

/**
 * Production Database Initialization Script
 * This script sets up the MongoDB database with collections, indexes, and sample data
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models to ensure schemas are registered
const User = require('../src/server/models/User');
const Project = require('../src/server/models/Project');
const Job = require('../src/server/models/Job');
const Task = require('../src/server/models/Task');
const TimeEntry = require('../src/server/models/TimeEntry');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');

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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/appello-tasks';

async function connectToDatabase() {
  try {
    log('🔌 Connecting to MongoDB...', colors.blue);
    await mongoose.connect(MONGODB_URI);
    log('✅ Connected to MongoDB successfully!', colors.green);
  } catch (error) {
    log(`❌ Failed to connect to MongoDB: ${error.message}`, colors.red);
    process.exit(1);
  }
}

async function createIndexes() {
  log('📊 Creating database indexes...', colors.blue);
  
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ employeeId: 1 }, { unique: true, sparse: true });
    
    // Project indexes
    await Project.collection.createIndex({ projectNumber: 1 }, { unique: true });
    await Project.collection.createIndex({ status: 1 });
    
    // Job indexes
    await Job.collection.createIndex({ jobNumber: 1 }, { unique: true });
    await Job.collection.createIndex({ projectId: 1 });
    await Job.collection.createIndex({ status: 1 });
    
    // Task indexes
    await Task.collection.createIndex({ jobId: 1 });
    await Task.collection.createIndex({ assignedTo: 1 });
    await Task.collection.createIndex({ status: 1 });
    await Task.collection.createIndex({ dueDate: 1 });
    
    // TimeEntry indexes
    await TimeEntry.collection.createIndex({ userId: 1 });
    await TimeEntry.collection.createIndex({ jobId: 1 });
    await TimeEntry.collection.createIndex({ taskId: 1 });
    await TimeEntry.collection.createIndex({ date: 1 });
    
    log('✅ Database indexes created successfully!', colors.green);
  } catch (error) {
    log(`⚠️  Index creation warning: ${error.message}`, colors.yellow);
  }
}

async function seedSampleData() {
  log('🌱 Seeding sample data...', colors.blue);
  
  try {
    // Check if data already exists
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      log('ℹ️  Sample data already exists, skipping seed...', colors.yellow);
      return;
    }
    
    // Create sample users
    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@appello.com',
        password: 'password123', // Will be hashed by the model
        role: 'admin',
        employeeId: 'EMP001',
        department: 'Management',
        phone: '555-0001'
      },
      {
        name: 'John Foreman',
        email: 'john.foreman@appello.com',
        password: 'password123',
        role: 'field_supervisor',
        employeeId: 'EMP002',
        department: 'Field Operations',
        phone: '555-0002'
      },
      {
        name: 'Sarah Technician',
        email: 'sarah.tech@appello.com',
        password: 'password123',
        role: 'field_worker',
        employeeId: 'EMP003',
        department: 'Installation',
        phone: '555-0003'
      },
      {
        name: 'Mike Manager',
        email: 'mike.manager@appello.com',
        password: 'password123',
        role: 'project_manager',
        employeeId: 'EMP004',
        department: 'Project Management',
        phone: '555-0004'
      }
    ]);
    
    log(`✅ Created ${users.length} sample users`, colors.green);
    
    // Create sample projects
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
        projectManager: users[3]._id
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
        projectManager: users[3]._id
      }
    ]);
    
    log(`✅ Created ${projects.length} sample projects`, colors.green);
    
    // Create sample jobs
    const jobs = await Job.create([
      {
        jobNumber: 'JOB-2024-001-A',
        title: 'Main Floor HVAC Installation',
        description: 'Install main HVAC units for floors 1-5',
        projectId: projects[0]._id,
        status: 'in_progress',
        priority: 'high',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-03-15'),
        estimatedHours: 320,
        assignedTeam: [users[1]._id, users[2]._id],
        location: {
          address: '123 Business District, Downtown',
          city: 'Metropolitan City',
          state: 'NY',
          zipCode: '10001',
          coordinates: [-74.006, 40.7128]
        }
      },
      {
        jobNumber: 'JOB-2024-001-B',
        title: 'Upper Floors HVAC Installation',
        description: 'Install HVAC units for floors 6-15',
        projectId: projects[0]._id,
        status: 'planned',
        priority: 'medium',
        startDate: new Date('2024-03-16'),
        endDate: new Date('2024-05-30'),
        estimatedHours: 480,
        assignedTeam: [users[1]._id],
        location: {
          address: '123 Business District, Downtown',
          city: 'Metropolitan City',
          state: 'NY',
          zipCode: '10001',
          coordinates: [-74.006, 40.7128]
        }
      },
      {
        jobNumber: 'JOB-2024-002-A',
        title: 'Hospital OR Suite HVAC',
        description: 'Specialized HVAC installation for operating room suites',
        projectId: projects[1]._id,
        status: 'in_progress',
        priority: 'critical',
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-04-30'),
        estimatedHours: 280,
        assignedTeam: [users[1]._id, users[2]._id],
        location: {
          address: '456 Medical Center Drive',
          city: 'Healthcare City',
          state: 'NY',
          zipCode: '10002',
          coordinates: [-74.016, 40.7228]
        }
      }
    ]);
    
    log(`✅ Created ${jobs.length} sample jobs`, colors.green);
    
    // Create sample tasks
    const tasks = await Task.create([
      {
        title: 'Site Survey and Measurements',
        description: 'Complete detailed measurements of installation areas',
        jobId: jobs[0]._id,
        assignedTo: users[2]._id,
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
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 4,
        dueDate: new Date('2024-02-01')
      },
      {
        title: 'Main Unit Installation - Floor 1',
        description: 'Install primary HVAC unit on first floor',
        jobId: jobs[0]._id,
        assignedTo: users[1]._id,
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 16,
        dueDate: new Date('2024-02-15')
      },
      {
        title: 'Ductwork Installation - Floors 1-3',
        description: 'Install and connect ductwork for floors 1-3',
        jobId: jobs[0]._id,
        assignedTo: users[2]._id,
        status: 'planned',
        priority: 'medium',
        estimatedHours: 24,
        dueDate: new Date('2024-02-28')
      },
      {
        title: 'OR Suite Environmental Controls',
        description: 'Install specialized environmental controls for operating rooms',
        jobId: jobs[2]._id,
        assignedTo: users[1]._id,
        status: 'in_progress',
        priority: 'critical',
        estimatedHours: 32,
        dueDate: new Date('2024-03-15')
      }
    ]);
    
    log(`✅ Created ${tasks.length} sample tasks`, colors.green);
    
    // Create sample time entries
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
      },
      {
        userId: users[1]._id,
        jobId: jobs[0]._id,
        taskId: tasks[2]._id,
        date: new Date('2024-01-26'),
        startTime: '08:00',
        endTime: '16:00',
        hours: 8,
        description: 'Started main unit installation on first floor',
        status: 'submitted'
      },
      {
        userId: users[1]._id,
        jobId: jobs[2]._id,
        taskId: tasks[4]._id,
        date: new Date('2024-02-05'),
        startTime: '08:00',
        endTime: '16:00',
        hours: 8,
        description: 'Began environmental controls installation in OR suite',
        status: 'submitted'
      }
    ]);
    
    log(`✅ Created ${timeEntries.length} sample time entries`, colors.green);
    
    // Create sample SOV entries
    const sovEntries = await ScheduleOfValues.create([
      {
        projectId: projects[0]._id,
        lineItemNumber: 1,
        description: 'HVAC Equipment - Main Units',
        scheduledValue: 250000,
        previouslyCompleted: 0,
        completedThisPeriod: 125000,
        totalCompleted: 125000,
        percentComplete: 50,
        balanceToFinish: 125000,
        retainage: 12500,
        status: 'in_progress'
      },
      {
        projectId: projects[0]._id,
        lineItemNumber: 2,
        description: 'Ductwork Installation',
        scheduledValue: 180000,
        previouslyCompleted: 0,
        completedThisPeriod: 45000,
        totalCompleted: 45000,
        percentComplete: 25,
        balanceToFinish: 135000,
        retainage: 4500,
        status: 'in_progress'
      },
      {
        projectId: projects[1]._id,
        lineItemNumber: 1,
        description: 'Specialized OR Environmental Systems',
        scheduledValue: 400000,
        previouslyCompleted: 0,
        completedThisPeriod: 80000,
        totalCompleted: 80000,
        percentComplete: 20,
        balanceToFinish: 320000,
        retainage: 8000,
        status: 'in_progress'
      }
    ]);
    
    log(`✅ Created ${sovEntries.length} sample SOV entries`, colors.green);
    
    log('🎉 Sample data seeding completed successfully!', colors.green);
    
    // Display summary
    log('\n📊 Database Summary:', colors.bright);
    log(`👥 Users: ${users.length}`, colors.cyan);
    log(`📁 Projects: ${projects.length}`, colors.cyan);
    log(`🔧 Jobs: ${jobs.length}`, colors.cyan);
    log(`✅ Tasks: ${tasks.length}`, colors.cyan);
    log(`⏰ Time Entries: ${timeEntries.length}`, colors.cyan);
    log(`💰 SOV Entries: ${sovEntries.length}`, colors.cyan);
    
  } catch (error) {
    log(`❌ Error seeding sample data: ${error.message}`, colors.red);
    throw error;
  }
}

async function main() {
  try {
    log('🚀 Starting Production Database Initialization...', colors.bright);
    
    await connectToDatabase();
    await createIndexes();
    await seedSampleData();
    
    log('\n✅ Production database initialization completed successfully!', colors.green);
    log('🎯 Your team can now test the application with sample data.', colors.blue);
    
    log('\n🔑 Test Login Credentials:', colors.bright);
    log('Admin: admin@appello.com / password123', colors.cyan);
    log('Foreman: john.foreman@appello.com / password123', colors.cyan);
    log('Technician: sarah.tech@appello.com / password123', colors.cyan);
    log('Project Manager: mike.manager@appello.com / password123', colors.cyan);
    
  } catch (error) {
    log(`❌ Database initialization failed: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('\n🔌 Database connection closed.', colors.blue);
  }
}

// Run the initialization
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
