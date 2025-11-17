#!/usr/bin/env node

/**
 * Robust Sample Dataset Creation for Appello Task Management
 * Creates comprehensive, realistic data for ICI contractors
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

async function createRobustDataset() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('✅ Connected to MongoDB', colors.green);
    
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Job.deleteMany({}),
      Task.deleteMany({}),
      TimeEntry.deleteMany({}),
      ScheduleOfValues.deleteMany({})
    ]);
    log('🧹 Cleared existing data', colors.yellow);
    
    // Create comprehensive user base
    const users = await User.create([
      {
        name: 'Sarah Mitchell',
        email: 'sarah.mitchell@appello.com',
        password: 'password123',
        role: 'admin',
        employeeId: 'EMP001',
        department: 'Management',
        phone: '555-0001',
        position: 'Operations Director'
      },
      {
        name: 'Marcus Rodriguez',
        email: 'marcus.rodriguez@appello.com',
        password: 'password123',
        role: 'project_manager',
        employeeId: 'EMP002',
        department: 'Project Management',
        phone: '555-0002',
        position: 'Senior Project Manager'
      },
      {
        name: 'Tony Castellano',
        email: 'tony.castellano@appello.com',
        password: 'password123',
        role: 'field_supervisor',
        employeeId: 'EMP003',
        department: 'Field Operations',
        phone: '555-0003',
        position: 'Lead Foreman'
      },
      {
        name: 'Jake Thompson',
        email: 'jake.thompson@appello.com',
        password: 'password123',
        role: 'field_worker',
        employeeId: 'EMP004',
        department: 'Installation',
        phone: '555-0004',
        position: 'HVAC Technician Level 3'
      },
      {
        name: 'Maria Santos',
        email: 'maria.santos@appello.com',
        password: 'password123',
        role: 'field_worker',
        employeeId: 'EMP005',
        department: 'Installation',
        phone: '555-0005',
        position: 'Insulation Specialist'
      },
      {
        name: 'David Kim',
        email: 'david.kim@appello.com',
        password: 'password123',
        role: 'field_worker',
        employeeId: 'EMP006',
        department: 'Installation',
        phone: '555-0006',
        position: 'Mechanical Technician'
      },
      {
        name: 'Lisa Chen',
        email: 'lisa.chen@appello.com',
        password: 'password123',
        role: 'office_staff',
        employeeId: 'EMP007',
        department: 'Administration',
        phone: '555-0007',
        position: 'Project Coordinator'
      },
      {
        name: 'Roberto Silva',
        email: 'roberto.silva@appello.com',
        password: 'password123',
        role: 'field_supervisor',
        employeeId: 'EMP008',
        department: 'Field Operations',
        phone: '555-0008',
        position: 'Site Supervisor'
      }
    ]);
    
    log(`✅ Created ${users.length} comprehensive user profiles`, colors.green);
    
    // Create diverse projects
    const projects = await Project.create([
      {
        projectNumber: 'PRJ-2024-001',
        name: 'Metropolitan Tower HVAC Retrofit',
        description: 'Complete HVAC system replacement for 25-story downtown office tower including VAV systems, chillers, and building automation',
        client: {
          name: 'Metropolitan Properties LLC',
          contact: 'James Patterson',
          email: 'james.patterson@metroprop.com',
          phone: '555-1001'
        },
        status: 'active',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-08-30'),
        totalContractValue: 2850000,
        location: {
          address: '1500 Corporate Plaza, Downtown Financial District',
          coordinates: [-74.006, 40.7128]
        },
        projectManager: users.find(u => u.role === 'project_manager')._id
      },
      {
        projectNumber: 'PRJ-2024-002',
        name: 'Regional Medical Center - OR Suite Expansion',
        description: 'New construction of 8 operating room suites with specialized HVAC, medical gas systems, and environmental controls',
        client: {
          name: 'Regional Medical Center',
          contact: 'Dr. Amanda Foster',
          email: 'amanda.foster@regionalmed.org',
          phone: '555-1002'
        },
        status: 'active',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-09-15'),
        totalContractValue: 3200000,
        location: {
          address: '2200 Healthcare Boulevard, Medical District',
          coordinates: [-74.016, 40.7228]
        },
        projectManager: users.find(u => u.role === 'project_manager')._id
      },
      {
        projectNumber: 'PRJ-2024-003',
        name: 'University Research Facility - Clean Room Installation',
        description: 'Design and installation of ISO Class 5 clean rooms with precision HVAC, HEPA filtration, and contamination control systems',
        client: {
          name: 'State University Research Foundation',
          contact: 'Dr. Michael Chang',
          email: 'michael.chang@stateuni.edu',
          phone: '555-1003'
        },
        status: 'active',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-10-30'),
        totalContractValue: 1950000,
        location: {
          address: '800 Research Drive, University Campus',
          coordinates: [-74.026, 40.7328]
        },
        projectManager: users.find(u => u.role === 'project_manager')._id
      },
      {
        projectNumber: 'PRJ-2024-004',
        name: 'Industrial Manufacturing Plant - Process HVAC',
        description: 'Industrial HVAC systems for pharmaceutical manufacturing including process air handling, exhaust systems, and temperature control',
        client: {
          name: 'BioTech Manufacturing Inc.',
          contact: 'Jennifer Walsh',
          email: 'jennifer.walsh@biotechmanuf.com',
          phone: '555-1004'
        },
        status: 'awarded',
        startDate: new Date('2024-04-15'),
        endDate: new Date('2024-12-15'),
        totalContractValue: 4100000,
        location: {
          address: '5000 Industrial Parkway, Manufacturing Zone',
          coordinates: [-74.036, 40.7428]
        },
        projectManager: users.find(u => u.role === 'project_manager')._id
      },
      {
        projectNumber: 'PRJ-2023-005',
        name: 'Luxury Hotel Renovation - Guest Room HVAC',
        description: 'HVAC renovation for 200-room luxury hotel including individual room controls, energy recovery, and noise reduction systems',
        client: {
          name: 'Grandview Hotels Group',
          contact: 'Richard Steinberg',
          email: 'richard.steinberg@grandviewhotels.com',
          phone: '555-1005'
        },
        status: 'completed',
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-12-20'),
        totalContractValue: 1650000,
        location: {
          address: '750 Hospitality Avenue, Tourism District',
          coordinates: [-74.046, 40.7528]
        },
        projectManager: users.find(u => u.role === 'project_manager')._id
      }
    ]);
    
    log(`✅ Created ${projects.length} diverse projects`, colors.green);
    
    // Create comprehensive jobs
    const jobs = await Job.create([
      // Metropolitan Tower Jobs
      {
        name: 'Chiller Plant Replacement',
        jobNumber: 'JOB-2024-001-A',
        description: 'Replace existing chiller plant with high-efficiency centrifugal chillers, cooling towers, and associated piping',
        projectId: projects[0]._id,
        client: projects[0].client,
        status: 'active',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-04-15'),
        contractValue: 950000,
        jobManager: users.find(u => u.role === 'field_supervisor')._id,
        assignedTeam: [users[2]._id, users[3]._id, users[4]._id],
        location: projects[0].location
      },
      {
        name: 'VAV Terminal Installation - Floors 1-12',
        jobNumber: 'JOB-2024-001-B',
        description: 'Install Variable Air Volume terminal units and controls for floors 1-12 including ductwork modifications',
        projectId: projects[0]._id,
        client: projects[0].client,
        status: 'active',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30'),
        contractValue: 680000,
        jobManager: users.find(u => u.role === 'field_supervisor')._id,
        assignedTeam: [users[3]._id, users[4]._id],
        location: projects[0].location
      },
      {
        name: 'Building Automation System',
        jobNumber: 'JOB-2024-001-C',
        description: 'Install and commission building automation system with energy management and remote monitoring capabilities',
        projectId: projects[0]._id,
        client: projects[0].client,
        status: 'awarded',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-08-30'),
        contractValue: 420000,
        jobManager: users[7]._id,
        assignedTeam: [users[5]._id],
        location: projects[0].location
      },
      
      // Medical Center Jobs
      {
        name: 'OR Suite HVAC - Rooms 1-4',
        jobNumber: 'JOB-2024-002-A',
        description: 'Specialized HVAC installation for operating rooms 1-4 including HEPA filtration, pressure control, and redundant systems',
        projectId: projects[1]._id,
        client: projects[1].client,
        status: 'active',
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-05-30'),
        contractValue: 850000,
        jobManager: users[2]._id,
        assignedTeam: [users[3]._id, users[5]._id],
        location: projects[1].location
      },
      {
        name: 'OR Suite HVAC - Rooms 5-8',
        jobNumber: 'JOB-2024-002-B',
        description: 'Specialized HVAC installation for operating rooms 5-8 including HEPA filtration, pressure control, and redundant systems',
        projectId: projects[1]._id,
        client: projects[1].client,
        status: 'awarded',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-08-15'),
        contractValue: 850000,
        jobManager: users[2]._id,
        assignedTeam: [users[3]._id, users[5]._id],
        location: projects[1].location
      },
      {
        name: 'Medical Gas Systems Integration',
        jobNumber: 'JOB-2024-002-C',
        description: 'Install medical gas distribution systems coordinated with HVAC for all OR suites',
        projectId: projects[1]._id,
        client: projects[1].client,
        status: 'active',
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-07-30'),
        contractValue: 380000,
        jobManager: users[7]._id,
        assignedTeam: [users[5]._id, users[4]._id],
        location: projects[1].location
      },
      
      // University Research Facility Jobs
      {
        name: 'Clean Room HVAC - Laboratory Wing',
        jobNumber: 'JOB-2024-003-A',
        description: 'Precision HVAC systems for ISO Class 5 clean rooms including laminar flow, HEPA filtration, and environmental monitoring',
        projectId: projects[2]._id,
        client: projects[2].client,
        status: 'active',
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-08-30'),
        contractValue: 1200000,
        jobManager: users[2]._id,
        assignedTeam: [users[3]._id, users[5]._id, users[4]._id],
        location: projects[2].location
      },
      {
        name: 'Contamination Control Systems',
        jobNumber: 'JOB-2024-003-B',
        description: 'Install contamination control vestibules, air locks, and personnel decontamination systems',
        projectId: projects[2]._id,
        client: projects[2].client,
        status: 'awarded',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-10-30'),
        contractValue: 450000,
        jobManager: users[7]._id,
        assignedTeam: [users[4]._id, users[5]._id],
        location: projects[2].location
      }
    ]);
    
    log(`✅ Created ${jobs.length} comprehensive jobs`, colors.green);
    
    // Create detailed tasks with realistic progression
    const tasks = await Task.create([
      // Chiller Plant Replacement Tasks
      {
        title: 'Site Survey and Engineering Assessment',
        description: 'Complete dimensional survey of existing chiller plant, structural analysis, and utility connections assessment',
        jobId: jobs[0]._id,
        assignedTo: users[3]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-SURVEY-001',
        status: 'completed',
        priority: 'high',
        estimatedHours: 16,
        actualHours: 14,
        dueDate: new Date('2024-01-30'),
        completedAt: new Date('2024-01-28'),
        startDate: new Date('2024-01-22')
      },
      {
        title: 'Equipment Procurement and Delivery',
        description: 'Order and coordinate delivery of centrifugal chillers, cooling towers, pumps, and associated equipment',
        jobId: jobs[0]._id,
        assignedTo: users[6]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-PROCURE-001',
        status: 'completed',
        priority: 'critical',
        estimatedHours: 8,
        actualHours: 12,
        dueDate: new Date('2024-02-15'),
        completedAt: new Date('2024-02-10'),
        startDate: new Date('2024-01-25')
      },
      {
        title: 'Existing Equipment Removal',
        description: 'Safe removal and disposal of existing chiller equipment, piping, and electrical connections',
        jobId: jobs[0]._id,
        assignedTo: users[3]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-DEMO-001',
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 32,
        actualHours: 24,
        dueDate: new Date('2024-03-01'),
        startDate: new Date('2024-02-20')
      },
      {
        title: 'New Chiller Installation',
        description: 'Install new centrifugal chillers including rigging, positioning, and initial connections',
        jobId: jobs[0]._id,
        assignedTo: users[3]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-INSTALL-001',
        status: 'not_started',
        priority: 'critical',
        estimatedHours: 48,
        dueDate: new Date('2024-03-15'),
        startDate: new Date('2024-03-05')
      },
      
      // VAV Terminal Installation Tasks
      {
        title: 'VAV Box Installation - Floors 1-6',
        description: 'Install VAV terminal units for floors 1-6 including mounting, ductwork connections, and control wiring',
        jobId: jobs[1]._id,
        assignedTo: users[4]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-VAV-001',
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 80,
        actualHours: 45,
        dueDate: new Date('2024-04-15'),
        startDate: new Date('2024-03-10')
      },
      {
        title: 'VAV Box Installation - Floors 7-12',
        description: 'Install VAV terminal units for floors 7-12 including mounting, ductwork connections, and control wiring',
        jobId: jobs[1]._id,
        assignedTo: users[4]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-VAV-002',
        status: 'not_started',
        priority: 'medium',
        estimatedHours: 80,
        dueDate: new Date('2024-05-30'),
        startDate: new Date('2024-04-20')
      },
      
      // OR Suite HVAC Tasks
      {
        title: 'HEPA Filter Housing Installation',
        description: 'Install HEPA filter housings and terminal filter units for operating rooms 1-4',
        jobId: jobs[3]._id,
        assignedTo: users[5]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-HEPA-001',
        status: 'in_progress',
        priority: 'critical',
        estimatedHours: 40,
        actualHours: 28,
        dueDate: new Date('2024-03-30'),
        startDate: new Date('2024-03-01')
      },
      {
        title: 'Pressure Control System Setup',
        description: 'Install and calibrate pressure monitoring and control systems for positive/negative pressure rooms',
        jobId: jobs[3]._id,
        assignedTo: users[5]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-PRESSURE-001',
        status: 'not_started',
        priority: 'critical',
        estimatedHours: 24,
        dueDate: new Date('2024-04-15'),
        startDate: new Date('2024-04-01')
      },
      
      // Clean Room HVAC Tasks
      {
        title: 'Laminar Flow System Installation',
        description: 'Install laminar flow ceiling systems for ISO Class 5 clean rooms with HEPA filtration',
        jobId: jobs[6]._id,
        assignedTo: users[3]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-LAMINAR-001',
        status: 'in_progress',
        priority: 'critical',
        estimatedHours: 60,
        actualHours: 35,
        dueDate: new Date('2024-06-15'),
        startDate: new Date('2024-05-01')
      },
      {
        title: 'Environmental Monitoring Integration',
        description: 'Install particle counters, pressure monitors, and environmental data logging systems',
        jobId: jobs[6]._id,
        assignedTo: users[5]._id,
        createdBy: users[2]._id,
        costCode: 'HVAC-MONITOR-001',
        status: 'not_started',
        priority: 'high',
        estimatedHours: 32,
        dueDate: new Date('2024-07-30'),
        startDate: new Date('2024-07-01')
      },
      
      // Medical Gas Systems Tasks
      {
        title: 'Medical Gas Piping Installation',
        description: 'Install medical gas distribution piping for oxygen, nitrous oxide, and medical air systems',
        jobId: jobs[5]._id,
        assignedTo: users[4]._id,
        createdBy: users[7]._id,
        costCode: 'MEDGAS-PIPE-001',
        status: 'in_progress',
        priority: 'critical',
        estimatedHours: 56,
        actualHours: 32,
        dueDate: new Date('2024-04-30'),
        startDate: new Date('2024-03-15')
      },
      {
        title: 'Medical Gas Outlet Installation',
        description: 'Install medical gas outlets and alarm systems in all OR suites',
        jobId: jobs[5]._id,
        assignedTo: users[5]._id,
        createdBy: users[7]._id,
        costCode: 'MEDGAS-OUTLET-001',
        status: 'not_started',
        priority: 'critical',
        estimatedHours: 40,
        dueDate: new Date('2024-06-15'),
        startDate: new Date('2024-05-15')
      },
      
      // Additional high-priority tasks
      {
        title: 'System Commissioning - Phase 1',
        description: 'Commission and test chiller plant systems including performance verification and energy optimization',
        jobId: jobs[0]._id,
        assignedTo: users[5]._id,
        createdBy: users[1]._id,
        costCode: 'HVAC-COMMISSION-001',
        status: 'not_started',
        priority: 'critical',
        estimatedHours: 24,
        dueDate: new Date('2024-04-20'),
        startDate: new Date('2024-04-16')
      },
      {
        title: 'Fire Safety System Integration',
        description: 'Integrate HVAC systems with fire safety controls including smoke evacuation and pressurization',
        jobId: jobs[1]._id,
        assignedTo: users[3]._id,
        createdBy: users[1]._id,
        costCode: 'HVAC-FIRE-001',
        status: 'not_started',
        priority: 'critical',
        estimatedHours: 20,
        dueDate: new Date('2024-05-15'),
        startDate: new Date('2024-05-01')
      }
    ]);
    
    log(`✅ Created ${tasks.length} detailed tasks`, colors.green);
    
    // Create comprehensive time entries
    const timeEntries = await TimeEntry.create([
      // Jake Thompson's time entries
      {
        userId: users[3]._id,
        jobId: jobs[0]._id,
        taskId: tasks[0]._id,
        date: new Date('2024-01-22'),
        startTime: '07:00',
        endTime: '15:30',
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8,
        workerId: users[3]._id,
        craft: 'general',
        costCode: 'HVAC-SURVEY-001',
        workDescription: 'Conducted comprehensive site survey of existing chiller plant and mechanical rooms',
        status: 'approved'
      },
      {
        userId: users[3]._id,
        jobId: jobs[0]._id,
        taskId: tasks[0]._id,
        date: new Date('2024-01-23'),
        startTime: '07:00',
        endTime: '15:00',
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8,
        workerId: users[3]._id,
        craft: 'general',
        costCode: 'HVAC-SURVEY-001',
        workDescription: 'Completed dimensional measurements and created as-built drawings',
        status: 'approved'
      },
      
      // Maria Santos's time entries
      {
        userId: users[4]._id,
        jobId: jobs[0]._id,
        taskId: tasks[1]._id,
        date: new Date('2024-01-25'),
        startTime: '08:00',
        endTime: '16:30',
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8,
        workerId: users[4]._id,
        craft: 'insulation',
        costCode: 'HVAC-PROCURE-001',
        workDescription: 'Coordinated equipment delivery schedules with suppliers and crane operators',
        status: 'approved'
      },
      {
        userId: users[4]._id,
        jobId: jobs[0]._id,
        taskId: tasks[2]._id,
        date: new Date('2024-02-20'),
        startTime: '07:00',
        endTime: '17:00',
        regularHours: 8,
        overtimeHours: 1,
        totalHours: 9,
        workerId: users[4]._id,
        craft: 'insulation',
        costCode: 'HVAC-DEMO-001',
        workDescription: 'Removed existing chiller unit #1 and associated piping',
        status: 'submitted'
      },
      {
        userId: users[4]._id,
        jobId: jobs[0]._id,
        taskId: tasks[2]._id,
        date: new Date('2024-02-21'),
        startTime: '07:00',
        endTime: '16:00',
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8,
        workerId: users[4]._id,
        craft: 'insulation',
        costCode: 'HVAC-DEMO-001',
        workDescription: 'Continued equipment removal and site preparation',
        status: 'submitted'
      },
      
      // David Kim's time entries
      {
        userId: users[5]._id,
        jobId: jobs[3]._id,
        taskId: tasks[6]._id,
        date: new Date('2024-03-01'),
        startTime: '08:00',
        endTime: '16:00',
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8,
        workerId: users[5]._id,
        craft: 'equipment',
        costCode: 'HVAC-HEPA-001',
        workDescription: 'Installed HEPA filter housings in OR rooms 1-2',
        status: 'approved'
      },
      {
        userId: users[5]._id,
        jobId: jobs[3]._id,
        taskId: tasks[6]._id,
        date: new Date('2024-03-02'),
        startTime: '08:00',
        endTime: '17:30',
        regularHours: 8,
        overtimeHours: 1,
        totalHours: 9,
        workerId: users[5]._id,
        craft: 'equipment',
        costCode: 'HVAC-HEPA-001',
        workDescription: 'Installed HEPA filter housings in OR rooms 3-4, completed pressure testing',
        status: 'approved'
      },
      
      // Recent time entries for current work
      {
        userId: users[3]._id,
        jobId: jobs[6]._id,
        taskId: tasks[8]._id,
        date: new Date('2024-11-15'),
        startTime: '07:30',
        endTime: '16:30',
        regularHours: 8,
        overtimeHours: 0.5,
        totalHours: 8.5,
        workerId: users[3]._id,
        craft: 'general',
        costCode: 'HVAC-LAMINAR-001',
        workDescription: 'Installed laminar flow ceiling grid in clean room lab 1',
        status: 'submitted'
      },
      {
        userId: users[3]._id,
        jobId: jobs[6]._id,
        taskId: tasks[8]._id,
        date: new Date('2024-11-16'),
        startTime: '07:30',
        endTime: '16:00',
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8,
        workerId: users[3]._id,
        craft: 'general',
        costCode: 'HVAC-LAMINAR-001',
        workDescription: 'Continued laminar flow installation in clean room lab 2',
        status: 'submitted'
      }
    ]);
    
    log(`✅ Created ${tasks.length} detailed tasks with realistic progression`, colors.green);
    
    // Create Schedule of Values entries
    const sovEntries = await ScheduleOfValues.create([
      // Metropolitan Tower SOV
      {
        projectId: projects[0]._id,
        lineItemNumber: 1,
        description: 'Chiller Plant Equipment and Installation',
        scheduledValue: 950000,
        previouslyCompleted: 0,
        completedThisPeriod: 285000,
        totalCompleted: 285000,
        percentComplete: 30,
        balanceToFinish: 665000,
        retainage: 28500,
        status: 'in_progress'
      },
      {
        projectId: projects[0]._id,
        lineItemNumber: 2,
        description: 'VAV Terminal Units and Controls',
        scheduledValue: 680000,
        previouslyCompleted: 0,
        completedThisPeriod: 136000,
        totalCompleted: 136000,
        percentComplete: 20,
        balanceToFinish: 544000,
        retainage: 13600,
        status: 'in_progress'
      },
      {
        projectId: projects[0]._id,
        lineItemNumber: 3,
        description: 'Building Automation System',
        scheduledValue: 420000,
        previouslyCompleted: 0,
        completedThisPeriod: 0,
        totalCompleted: 0,
        percentComplete: 0,
        balanceToFinish: 420000,
        retainage: 0,
        status: 'not_started'
      },
      
      // Medical Center SOV
      {
        projectId: projects[1]._id,
        lineItemNumber: 1,
        description: 'OR Suite HVAC Systems - Rooms 1-4',
        scheduledValue: 850000,
        previouslyCompleted: 0,
        completedThisPeriod: 340000,
        totalCompleted: 340000,
        percentComplete: 40,
        balanceToFinish: 510000,
        retainage: 34000,
        status: 'in_progress'
      },
      {
        projectId: projects[1]._id,
        lineItemNumber: 2,
        description: 'Medical Gas Systems Integration',
        scheduledValue: 380000,
        previouslyCompleted: 0,
        completedThisPeriod: 114000,
        totalCompleted: 114000,
        percentComplete: 30,
        balanceToFinish: 266000,
        retainage: 11400,
        status: 'in_progress'
      },
      
      // University Research Facility SOV
      {
        projectId: projects[2]._id,
        lineItemNumber: 1,
        description: 'Clean Room HVAC Systems',
        scheduledValue: 1200000,
        previouslyCompleted: 0,
        completedThisPeriod: 240000,
        totalCompleted: 240000,
        percentComplete: 20,
        balanceToFinish: 960000,
        retainage: 24000,
        status: 'in_progress'
      }
    ]);
    
    log(`✅ Created ${sovEntries.length} comprehensive SOV entries`, colors.green);
    
    log('\n🎉 Robust dataset creation completed successfully!', colors.green);
    
    // Display comprehensive summary
    log('\n📊 COMPREHENSIVE DATASET SUMMARY:', colors.bright);
    log(`👥 Users: ${users.length} (Admin, PM, Supervisors, Technicians)`, colors.cyan);
    log(`📁 Projects: ${projects.length} (Office, Medical, Research, Industrial, Hotel)`, colors.cyan);
    log(`🔧 Jobs: ${jobs.length} (HVAC, Medical Gas, Clean Room, Automation)`, colors.cyan);
    log(`✅ Tasks: ${tasks.length} (Survey, Install, Commission, Test)`, colors.cyan);
    log(`⏰ Time Entries: ${timeEntries.length} (Multiple workers, dates, cost codes)`, colors.cyan);
    log(`💰 SOV Entries: ${sovEntries.length} (Financial tracking across projects)`, colors.cyan);
    
    log('\n🎯 DATASET FEATURES:', colors.bright);
    log('• Multiple project types and complexities', colors.magenta);
    log('• Realistic ICI contractor scenarios', colors.magenta);
    log('• Various task statuses and priorities', colors.magenta);
    log('• Comprehensive time tracking data', colors.magenta);
    log('• Financial SOV progression', colors.magenta);
    log('• Team assignments and roles', colors.magenta);
    
  } catch (error) {
    log(`❌ Error creating dataset: ${error.message}`, colors.red);
    throw error;
  } finally {
    await mongoose.connection.close();
    log('\n🔌 Database connection closed.', colors.blue);
  }
}

// Run the dataset creation
if (require.main === module) {
  createRobustDataset().catch(console.error);
}

module.exports = { createRobustDataset };
