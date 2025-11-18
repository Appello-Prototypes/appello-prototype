require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Task = require('../src/server/models/Task');
const Job = require('../src/server/models/Job');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const User = require('../src/server/models/User');
const { addDays, addMonths, startOfMonth, endOfMonth } = require('date-fns');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

// Task templates for each job type
const JOB1_TASKS = {
  '002': [ // PPA-LAB - Process Piping Labor
    { title: 'Site survey and measurements for process piping', priority: 'high', category: 'preparation', estimatedHours: 16 },
    { title: 'Surface preparation - Process piping lines 2" to 6"', priority: 'high', category: 'preparation', estimatedHours: 120 },
    { title: 'Install mineral wool insulation - Process piping (2" to 4")', priority: 'high', category: 'insulation', estimatedHours: 320 },
    { title: 'Install mineral wool insulation - Process piping (4" to 6")', priority: 'high', category: 'insulation', estimatedHours: 280 },
    { title: 'Install aluminum jacketing - Process piping', priority: 'medium', category: 'jacketing', estimatedHours: 180 },
    { title: 'Quality inspection - Process piping insulation', priority: 'high', category: 'quality_control', estimatedHours: 40 },
    { title: 'Rework - Process piping insulation quality issues', priority: 'critical', category: 'repair', estimatedHours: 80 },
    { title: 'Weather protection installation - Cold weather prep', priority: 'high', category: 'preparation', estimatedHours: 24 }
  ],
  '004': [ // VIA-LAB - Vessel Installation Labor
    { title: 'Vessel surface preparation and cleaning', priority: 'high', category: 'preparation', estimatedHours: 60 },
    { title: 'Install mineral wool insulation - Vessels (Process Unit 200A)', priority: 'high', category: 'insulation', estimatedHours: 280 },
    { title: 'Install mineral wool insulation - Vessels (Process Unit 200B)', priority: 'high', category: 'insulation', estimatedHours: 240 },
    { title: 'Install stainless steel jacketing - Vessels', priority: 'medium', category: 'jacketing', estimatedHours: 160 },
    { title: 'Vessel insulation quality inspection', priority: 'high', category: 'quality_control', estimatedHours: 30 },
    { title: 'Rework - Vessel insulation quality issues', priority: 'critical', category: 'repair', estimatedHours: 50 },
    { title: 'Vessel insulation completion documentation', priority: 'low', category: 'documentation', estimatedHours: 20 }
  ],
  '006': [ // EIA-LAB - Equipment Installation Labor
    { title: 'Equipment surface preparation', priority: 'high', category: 'preparation', estimatedHours: 40 },
    { title: 'Install mineral wool insulation - Pumps and compressors', priority: 'high', category: 'insulation', estimatedHours: 180 },
    { title: 'Install mineral wool insulation - Heat exchangers', priority: 'high', category: 'insulation', estimatedHours: 140 },
    { title: 'Install aluminum jacketing - Equipment', priority: 'medium', category: 'jacketing', estimatedHours: 100 },
    { title: 'Equipment insulation quality inspection', priority: 'high', category: 'quality_control', estimatedHours: 25 },
    { title: 'Rework - Equipment insulation quality issues', priority: 'critical', category: 'repair', estimatedHours: 40 }
  ]
};

const JOB2_TASKS = {
  '002': [ // F1-LAB - Floor 1 Ductwork Labor
    { title: 'Coordinate with structural trades - Floor 1', priority: 'high', category: 'administrative', estimatedHours: 16 },
    { title: 'Layout and marking - Ductwork Floor 1', priority: 'high', category: 'preparation', estimatedHours: 40 },
    { title: 'Install supply ductwork - Floor 1 (Main corridors)', priority: 'high', category: 'installation', estimatedHours: 280 },
    { title: 'Install return ductwork - Floor 1', priority: 'high', category: 'installation', estimatedHours: 240 },
    { title: 'Install exhaust ductwork - Floor 1', priority: 'medium', category: 'installation', estimatedHours: 180 },
    { title: 'Ductwork connections and sealing - Floor 1', priority: 'high', category: 'installation', estimatedHours: 160 },
    { title: 'Ductwork testing and balancing - Floor 1', priority: 'high', category: 'inspection', estimatedHours: 40 },
    { title: 'Waiting for other trades - Floor 1 coordination delay', priority: 'medium', category: 'administrative', estimatedHours: 32 }
  ],
  '004': [ // F2-LAB - Floor 2 Piping Labor
    { title: 'Coordinate with plumbing trades - Floor 2', priority: 'high', category: 'administrative', estimatedHours: 16 },
    { title: 'Layout and marking - Hydronic piping Floor 2', priority: 'high', category: 'preparation', estimatedHours: 32 },
    { title: 'Install supply piping - Floor 2', priority: 'high', category: 'installation', estimatedHours: 240 },
    { title: 'Install return piping - Floor 2', priority: 'high', category: 'installation', estimatedHours: 200 },
    { title: 'Install condensate piping - Floor 2', priority: 'medium', category: 'installation', estimatedHours: 120 },
    { title: 'Piping pressure testing - Floor 2', priority: 'high', category: 'inspection', estimatedHours: 24 },
    { title: 'Piping insulation - Floor 2', priority: 'medium', category: 'insulation', estimatedHours: 160 },
    { title: 'Waiting for equipment delivery - Floor 2', priority: 'high', category: 'administrative', estimatedHours: 48 }
  ],
  '006': [ // F3-LAB - Floor 3 Equipment Labor
    { title: 'Equipment pad preparation - Floor 3', priority: 'high', category: 'preparation', estimatedHours: 24 },
    { title: 'Coordinate equipment delivery - Floor 3', priority: 'critical', category: 'administrative', estimatedHours: 16 },
    { title: 'Install AHU units - Floor 3 (Units 1-6)', priority: 'critical', category: 'installation', estimatedHours: 180 },
    { title: 'Install AHU units - Floor 3 (Units 7-12)', priority: 'critical', category: 'installation', estimatedHours: 180 },
    { title: 'Equipment electrical connections - Floor 3', priority: 'high', category: 'installation', estimatedHours: 80 },
    { title: 'Equipment startup and commissioning - Floor 3', priority: 'high', category: 'equipment_check', estimatedHours: 60 },
    { title: 'Equipment testing and balancing - Floor 3', priority: 'high', category: 'inspection', estimatedHours: 40 },
    { title: 'Equipment delivery delay - On hold', priority: 'critical', category: 'administrative', estimatedHours: 0 }
  ],
  '008': [ // F4-LAB-CO - Floor 4 Change Order Labor
    { title: 'Change order review and planning - Floor 4', priority: 'high', category: 'administrative', estimatedHours: 8 },
    { title: 'Layout and marking - Additional ductwork Floor 4', priority: 'high', category: 'preparation', estimatedHours: 24 },
    { title: 'Install additional supply ductwork - Floor 4', priority: 'high', category: 'installation', estimatedHours: 120 },
    { title: 'Install additional return ductwork - Floor 4', priority: 'high', category: 'installation', estimatedHours: 100 },
    { title: 'Ductwork connections - Floor 4 change order', priority: 'high', category: 'installation', estimatedHours: 80 },
    { title: 'Overtime work - Floor 4 change order completion', priority: 'critical', category: 'installation', estimatedHours: 72 }
  ]
};

const JOB3_TASKS = {
  '002': [ // SR-A-LAB - Server Room A Power Labor
    { title: 'Site access and permit coordination', priority: 'high', category: 'administrative', estimatedHours: 16 },
    { title: 'Electrical room layout and marking', priority: 'high', category: 'preparation', estimatedHours: 24 },
    { title: 'Install main distribution panel - Server Room A', priority: 'critical', category: 'installation', estimatedHours: 120 },
    { title: 'Install sub-panels - Server Room A', priority: 'high', category: 'installation', estimatedHours: 80 },
    { title: 'Install branch circuits - Server Room A', priority: 'high', category: 'installation', estimatedHours: 160 },
    { title: 'Install conduit and wire - Server Room A', priority: 'high', category: 'installation', estimatedHours: 140 },
    { title: 'Power distribution testing - Server Room A', priority: 'critical', category: 'inspection', estimatedHours: 40 },
    { title: 'Commissioning and load testing - Server Room A', priority: 'critical', category: 'equipment_check', estimatedHours: 20 }
  ],
  '004': [ // SR-A-BUP-LAB - Backup System Labor
    { title: 'Generator pad preparation', priority: 'high', category: 'preparation', estimatedHours: 16 },
    { title: 'Coordinate generator delivery', priority: 'critical', category: 'administrative', estimatedHours: 8 },
    { title: 'Install backup generator #1', priority: 'critical', category: 'installation', estimatedHours: 120 },
    { title: 'Install backup generator #2', priority: 'critical', category: 'installation', estimatedHours: 120 },
    { title: 'Install automatic transfer switches', priority: 'critical', category: 'installation', estimatedHours: 80 },
    { title: 'Generator fuel system installation', priority: 'high', category: 'installation', estimatedHours: 60 },
    { title: 'Backup system testing and commissioning', priority: 'critical', category: 'equipment_check', estimatedHours: 40 },
    { title: 'Load bank testing - Backup generators', priority: 'critical', category: 'inspection', estimatedHours: 36 }
  ],
  '006': [ // OFF-LGT-LAB - Office Lighting Labor
    { title: 'Lighting layout and coordination', priority: 'medium', category: 'preparation', estimatedHours: 16 },
    { title: 'Install LED fixtures - Office areas (Phase 1)', priority: 'medium', category: 'installation', estimatedHours: 120 },
    { title: 'Install LED fixtures - Office areas (Phase 2)', priority: 'medium', category: 'installation', estimatedHours: 120 },
    { title: 'Install LED fixtures - Common areas', priority: 'medium', category: 'installation', estimatedHours: 80 },
    { title: 'Install lighting controls and dimmers', priority: 'medium', category: 'installation', estimatedHours: 40 },
    { title: 'Lighting testing and adjustment', priority: 'medium', category: 'inspection', estimatedHours: 24 }
  ],
  '008': [ // COM-FAL-LAB - Fire Alarm Labor
    { title: 'Fire alarm system layout and design review', priority: 'high', category: 'preparation', estimatedHours: 24 },
    { title: 'Install fire alarm control panel', priority: 'high', category: 'installation', estimatedHours: 40 },
    { title: 'Install smoke detectors - Common areas', priority: 'high', category: 'installation', estimatedHours: 80 },
    { title: 'Install heat detectors - Server rooms', priority: 'high', category: 'installation', estimatedHours: 60 },
    { title: 'Install pull stations and notification devices', priority: 'high', category: 'installation', estimatedHours: 80 },
    { title: 'Fire alarm system testing', priority: 'critical', category: 'inspection', estimatedHours: 40 },
    { title: 'Fire alarm system commissioning', priority: 'critical', category: 'equipment_check', estimatedHours: 24 },
    { title: 'Fire department inspection coordination', priority: 'high', category: 'administrative', estimatedHours: 16 }
  ],
  '010': [ // SR-A-LV-LAB - Low Voltage Labor
    { title: 'Low voltage system design review', priority: 'medium', category: 'preparation', estimatedHours: 16 },
    { title: 'Install data cabling infrastructure', priority: 'high', category: 'installation', estimatedHours: 120 },
    { title: 'Install security system wiring', priority: 'medium', category: 'installation', estimatedHours: 80 },
    { title: 'Install access control system', priority: 'medium', category: 'installation', estimatedHours: 60 },
    { title: 'Install CCTV system wiring', priority: 'medium', category: 'installation', estimatedHours: 60 },
    { title: 'Low voltage system testing', priority: 'high', category: 'inspection', estimatedHours: 40 },
    { title: 'Subcontractor oversight - Low voltage work', priority: 'medium', category: 'administrative', estimatedHours: 48 },
    { title: 'Low voltage system commissioning', priority: 'high', category: 'equipment_check', estimatedHours: 24 }
  ]
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getStatusForDate(taskDate, jobStart, jobEnd, monthIndex, jobNumber) {
  const now = new Date();
  const daysFromStart = (taskDate - jobStart) / (1000 * 60 * 60 * 24);
  const totalDays = (jobEnd - jobStart) / (1000 * 60 * 60 * 24);
  const progress = daysFromStart / totalDays;

  // Job-specific status logic based on scenarios
  if (jobNumber === 'JOB-2025-INS-001') {
    // Insulation job: rework in April (month 3), recovery in May-June
    if (monthIndex === 3) {
      // April - some tasks on hold or in progress due to rework
      return Math.random() > 0.7 ? 'on_hold' : 'in_progress';
    }
    if (monthIndex >= 4) {
      // May-June - recovery phase
      return progress > 0.9 ? 'completed' : 'in_progress';
    }
  } else if (jobNumber === 'JOB-2025-MECH-001') {
    // HVAC job: delays early on, equipment delay in July (month 5), overtime push
    if (monthIndex < 2) {
      // Feb-April - coordination delays
      return Math.random() > 0.6 ? 'on_hold' : 'in_progress';
    }
    if (monthIndex === 5) {
      // July - equipment delay
      return Math.random() > 0.5 ? 'on_hold' : 'in_progress';
    }
    if (monthIndex >= 6) {
      // Aug-Sep - overtime push
      return progress > 0.85 ? 'completed' : 'in_progress';
    }
  } else if (jobNumber === 'JOB-2025-ELEC-001') {
    // Electrical job: slow start, testing delays in Sep-Oct
    if (monthIndex < 2) {
      // March-May - slow ramp up
      return Math.random() > 0.7 ? 'not_started' : 'in_progress';
    }
    if (monthIndex >= 6 && monthIndex < 8) {
      // Sep-Oct - testing delays
      return Math.random() > 0.4 ? 'in_progress' : 'on_hold';
    }
  }

  // Default logic
  if (taskDate > now) return 'not_started';
  if (progress > 0.9) return 'completed';
  if (progress > 0.1) return 'in_progress';
  return 'not_started';
}

async function seedTasksForThreeJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the three jobs
    const job1 = await Job.findOne({ jobNumber: 'JOB-2025-INS-001' });
    const job2 = await Job.findOne({ jobNumber: 'JOB-2025-MECH-001' });
    const job3 = await Job.findOne({ jobNumber: 'JOB-2025-ELEC-001' });

    if (!job1 || !job2 || !job3) {
      console.error('❌ Could not find all three jobs. Please run seed-three-scenario-jobs.js first.');
      process.exit(1);
    }

    // Get users for assignment
    const users = await User.find().limit(10);
    if (users.length < 3) {
      console.error('❌ Need at least 3 users. Please seed users first.');
      process.exit(1);
    }

    const projectManagers = users.filter(u => u.role === 'project_manager' || u.role === 'admin').slice(0, 3);
    const fieldSupervisors = users.filter(u => u.role === 'supervisor' || u.role === 'foreman').slice(0, 3);
    const workers = users.filter(u => u.role === 'worker' || u.role === 'field_worker').slice(0, 6);

    // Get SOV items for each job
    const job1SOV = await ScheduleOfValues.find({ jobId: job1._id });
    const job2SOV = await ScheduleOfValues.find({ jobId: job2._id });
    const job3SOV = await ScheduleOfValues.find({ jobId: job3._id });

    console.log(`\n📋 Found ${job1SOV.length} SOV items for Job 1`);
    console.log(`📋 Found ${job2SOV.length} SOV items for Job 2`);
    console.log(`📋 Found ${job3SOV.length} SOV items for Job 3`);

    // Job dates
    const job1Start = new Date('2025-01-01');
    const job1End = new Date('2025-06-30');
    const job2Start = new Date('2025-02-01');
    const job2End = new Date('2025-09-30');
    const job3Start = new Date('2025-03-01');
    const job3End = new Date('2025-12-31');

    const allTasks = [];

    // ===== JOB 1: Mechanical Insulation =====
    console.log('\n🔨 Creating tasks for Job 1: Mechanical Insulation...');
    const job1Tasks = [];
    
    for (const [costCode, taskTemplates] of Object.entries(JOB1_TASKS)) {
      const sovItem = job1SOV.find(s => s.costCodeNumber === costCode);
      if (!sovItem) continue;

      taskTemplates.forEach((template, index) => {
        const monthIndex = Math.floor((index / taskTemplates.length) * 6); // Distribute across 6 months
        const monthStart = addMonths(job1Start, monthIndex);
        const monthEnd = endOfMonth(monthStart);
        const startDate = randomDate(monthStart, monthEnd);
        const dueDate = addDays(startDate, template.estimatedHours / 8 + randomBetween(2, 7)); // Add buffer days

        const status = getStatusForDate(startDate, job1Start, job1End, monthIndex, job1.jobNumber);
        const completionPercentage = status === 'completed' ? 100 : status === 'in_progress' ? randomBetween(20, 80) : 0;
        const actualHours = status === 'completed' ? template.estimatedHours * randomBetween(0.9, 1.3) : 
                            status === 'in_progress' ? template.estimatedHours * completionPercentage / 100 : 0;

        job1Tasks.push({
          title: template.title,
          description: `Task for ${sovItem.description} - ${sovItem.costCodeName}`,
          jobId: job1._id,
          projectId: job1.projectId,
          assignedTo: workers[Math.floor(Math.random() * workers.length)]._id,
          createdBy: projectManagers[0]._id,
          costCode: costCode,
          status: status,
          priority: template.priority,
          category: template.category,
          craft: 'insulation',
          startDate: startDate,
          dueDate: dueDate,
          estimatedHours: template.estimatedHours,
          actualHours: actualHours,
          completionPercentage: completionPercentage,
          scheduleOfValuesId: sovItem._id,
          systemId: sovItem.systemId,
          areaId: sovItem.areaId,
          phaseId: sovItem.phaseId
        });
      });
    }

    // ===== JOB 2: Mechanical HVAC =====
    console.log('🔨 Creating tasks for Job 2: Mechanical HVAC...');
    const job2Tasks = [];
    
    for (const [costCode, taskTemplates] of Object.entries(JOB2_TASKS)) {
      const sovItem = job2SOV.find(s => s.costCodeNumber === costCode);
      if (!sovItem) continue;

      taskTemplates.forEach((template, index) => {
        const monthIndex = Math.floor((index / taskTemplates.length) * 8); // Distribute across 8 months
        const monthStart = addMonths(job2Start, monthIndex);
        const monthEnd = endOfMonth(monthStart);
        const startDate = randomDate(monthStart, monthEnd);
        const dueDate = addDays(startDate, template.estimatedHours / 8 + randomBetween(2, 10));

        const status = getStatusForDate(startDate, job2Start, job2End, monthIndex, job2.jobNumber);
        const completionPercentage = status === 'completed' ? 100 : status === 'in_progress' ? randomBetween(15, 75) : 0;
        const actualHours = status === 'completed' ? template.estimatedHours * randomBetween(0.95, 1.4) : 
                            status === 'in_progress' ? template.estimatedHours * completionPercentage / 100 : 0;

        job2Tasks.push({
          title: template.title,
          description: `Task for ${sovItem.description} - ${sovItem.costCodeName}`,
          jobId: job2._id,
          projectId: job2.projectId,
          assignedTo: workers[Math.floor(Math.random() * workers.length)]._id,
          createdBy: projectManagers[1]?._id || projectManagers[0]._id,
          costCode: costCode,
          status: status,
          priority: template.priority,
          category: template.category,
          craft: template.category === 'equipment_check' ? 'equipment' : 'general',
          startDate: startDate,
          dueDate: dueDate,
          estimatedHours: template.estimatedHours,
          actualHours: actualHours,
          completionPercentage: completionPercentage,
          scheduleOfValuesId: sovItem._id,
          systemId: sovItem.systemId,
          areaId: sovItem.areaId,
          phaseId: sovItem.phaseId
        });
      });
    }

    // ===== JOB 3: Electrical =====
    console.log('🔨 Creating tasks for Job 3: Electrical...');
    const job3Tasks = [];
    
    for (const [costCode, taskTemplates] of Object.entries(JOB3_TASKS)) {
      const sovItem = job3SOV.find(s => s.costCodeNumber === costCode);
      if (!sovItem) continue;

      taskTemplates.forEach((template, index) => {
        const monthIndex = Math.floor((index / taskTemplates.length) * 10); // Distribute across 10 months
        const monthStart = addMonths(job3Start, monthIndex);
        const monthEnd = endOfMonth(monthStart);
        const startDate = randomDate(monthStart, monthEnd);
        const dueDate = addDays(startDate, template.estimatedHours / 8 + randomBetween(3, 14));

        const status = getStatusForDate(startDate, job3Start, job3End, monthIndex, job3.jobNumber);
        const completionPercentage = status === 'completed' ? 100 : status === 'in_progress' ? randomBetween(10, 70) : 0;
        const actualHours = status === 'completed' ? template.estimatedHours * randomBetween(0.9, 1.2) : 
                            status === 'in_progress' ? template.estimatedHours * completionPercentage / 100 : 0;

        job3Tasks.push({
          title: template.title,
          description: `Task for ${sovItem.description} - ${sovItem.costCodeName}`,
          jobId: job3._id,
          projectId: job3.projectId,
          assignedTo: workers[Math.floor(Math.random() * workers.length)]._id,
          createdBy: projectManagers[2]?._id || projectManagers[0]._id,
          costCode: costCode,
          status: status,
          priority: template.priority,
          category: template.category,
          craft: 'general',
          startDate: startDate,
          dueDate: dueDate,
          estimatedHours: template.estimatedHours,
          actualHours: actualHours,
          completionPercentage: completionPercentage,
          scheduleOfValuesId: sovItem._id,
          systemId: sovItem.systemId,
          areaId: sovItem.areaId,
          phaseId: sovItem.phaseId
        });
      });
    }

    // Create all tasks
    allTasks.push(...job1Tasks, ...job2Tasks, ...job3Tasks);

    console.log(`\n📝 Creating ${allTasks.length} tasks...`);
    const createdTasks = await Task.insertMany(allTasks);

    console.log(`\n✅ Successfully created ${createdTasks.length} tasks:`);
    console.log(`   - Job 1 (Insulation): ${job1Tasks.length} tasks`);
    console.log(`   - Job 2 (HVAC): ${job2Tasks.length} tasks`);
    console.log(`   - Job 3 (Electrical): ${job3Tasks.length} tasks`);

    // Summary by status
    const statusCounts = {};
    createdTasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });
    console.log('\n📊 Task Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error seeding tasks:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedTasksForThreeJobs();

