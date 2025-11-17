#!/usr/bin/env node

/**
 * Create missing TimelogRegister entries for VAV Terminal Installation job
 * This will populate the labor costs needed for Earned vs Burned analysis
 */

const mongoose = require('mongoose');
require('dotenv').config();

const TimelogRegister = require('../src/server/models/TimelogRegister');

const MONGODB_URI = process.env.MONGODB_URI;

// VAV Job and user IDs from the system
const VAV_JOB_ID = '691b6b8631b6fabe9155baad';
const PROJECT_ID = '691b6b8631b6fabe9155baa0';

// User IDs for workers (from the system)
const WORKERS = [
  { id: '691b6b8331b6fabe9155ba76', name: 'Tony Castellano', rate: 65.00, craft: 'supervision' }, // Field Supervisor
  { id: '691b6b8331b6fabe9155ba77', name: 'Jake Thompson', rate: 45.00, craft: 'general' }, // HVAC Technician
  { id: '691b6b8331b6fabe9155ba78', name: 'Maria Santos', rate: 42.00, craft: 'insulation' }, // Insulation Specialist
  { id: '691b6b8331b6fabe9155ba79', name: 'David Kim', rate: 44.00, craft: 'equipment' } // Mechanical Technician
];

// Cost codes from SOV
const COST_CODES = [
  'VAV-UNITS-001',
  'VAV-UNITS-002', 
  'VAV-DUCT-001',
  'VAV-CTRL-001'
];

async function createTimelogData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing timelog data for VAV job
    await TimelogRegister.deleteMany({ jobId: VAV_JOB_ID });
    console.log('🧹 Cleared existing timelog data');

    const timelogEntries = [];

    // Create entries for March, April, and May 2024 (3 months of work)
    for (let month = 3; month <= 5; month++) {
      const monthName = ['', '', '', 'March', 'April', 'May'][month];
      
      // Create 4 weeks per month, 5 days per week
      for (let week = 1; week <= 4; week++) {
        for (let day = 1; day <= 5; day++) { // Monday-Friday
          const workDate = new Date(2024, month - 1, (week - 1) * 7 + day);
          
          // Skip if date is beyond month end
          if (workDate.getMonth() !== month - 1) continue;
          
          // Each worker works on different cost codes throughout the project
          WORKERS.forEach((worker, workerIndex) => {
            // Rotate cost codes based on month and worker
            const costCodeIndex = (month + workerIndex + week) % COST_CODES.length;
            const costCode = COST_CODES[costCodeIndex];
            
            // Vary hours realistically
            const regularHours = 7 + Math.random() * 2; // 7-9 hours
            const overtimeHours = Math.random() < 0.3 ? Math.random() * 2 : 0; // 30% chance of OT
            const totalHours = regularHours + overtimeHours;
            
            const baseRate = worker.rate;
            const overtimeRate = baseRate * 1.5;
            const burdenRate = 0.35; // 35% burden
            
            const regularCost = regularHours * baseRate;
            const overtimeCost = overtimeHours * overtimeRate;
            const totalLaborCost = regularCost + overtimeCost;
            const totalBurdenCost = totalLaborCost * burdenRate;
            const totalCostWithBurden = totalLaborCost + totalBurdenCost;
            
            // Work descriptions based on cost code
            let workDescription = '';
            switch (costCode) {
              case 'VAV-UNITS-001':
                workDescription = `Install standard pressure VAV units - Floor ${((day + week) % 6) + 1}`;
                break;
              case 'VAV-UNITS-002':
                workDescription = `Install high pressure VAV units - Floor ${((day + week) % 6) + 7}`;
                break;
              case 'VAV-DUCT-001':
                workDescription = `Ductwork modifications and connections - ${monthName}`;
                break;
              case 'VAV-CTRL-001':
                workDescription = `VAV control system installation and wiring - ${monthName}`;
                break;
            }
            
            timelogEntries.push({
              workerId: worker.id,
              jobId: VAV_JOB_ID,
              projectId: PROJECT_ID,
              workDate: workDate,
              payPeriodStart: new Date(2024, month - 1, 1),
              payPeriodEnd: new Date(2024, month, 0),
              regularHours: Math.round(regularHours * 100) / 100,
              overtimeHours: Math.round(overtimeHours * 100) / 100,
              doubleTimeHours: 0,
              totalHours: Math.round(totalHours * 100) / 100,
              costCode: costCode,
              costCodeDescription: workDescription,
              workDescription: workDescription,
              craft: worker.craft,
              tradeLevel: worker.name.includes('Tony') ? 'supervisor' : 'journeyman',
              baseHourlyRate: baseRate,
              overtimeRate: overtimeRate,
              doubleTimeRate: baseRate * 2.0,
              regularCost: Math.round(regularCost * 100) / 100,
              overtimeCost: Math.round(overtimeCost * 100) / 100,
              doubleTimeCost: 0,
              totalLaborCost: Math.round(totalLaborCost * 100) / 100,
              burdenRate: burdenRate,
              totalBurdenCost: Math.round(totalBurdenCost * 100) / 100,
              totalCostWithBurden: Math.round(totalCostWithBurden * 100) / 100,
              location: {
                area: costCode.includes('001') ? 'Lower Floors' : 'Upper Floors',
                zone: 'Office Areas',
                building: 'Metropolitan Tower'
              },
              status: month <= 4 ? 'approved' : 'submitted', // April and earlier approved
              submittedBy: worker.id,
              approvedBy: month <= 4 ? '691b6b8331b6fabe9155ba75' : null, // Marcus Rodriguez
              approvedAt: month <= 4 ? new Date(workDate.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
              entryMethod: 'web_portal'
            });
          });
        }
      }
    }

    // Create entries in batches to avoid memory issues
    const batchSize = 50;
    let createdCount = 0;
    
    for (let i = 0; i < timelogEntries.length; i += batchSize) {
      const batch = timelogEntries.slice(i, i + batchSize);
      try {
        const created = await TimelogRegister.create(batch);
        createdCount += created.length;
        console.log(`✅ Created batch ${Math.floor(i/batchSize) + 1}: ${created.length} entries`);
      } catch (error) {
        console.log('⚠️ Batch error:', error.message);
        break;
      }
    }

    console.log(`\n🎉 Successfully created ${createdCount} timelog entries for VAV job!`);
    
    // Show summary by cost code
    const summary = await TimelogRegister.aggregate([
      { $match: { jobId: new mongoose.Types.ObjectId(VAV_JOB_ID) } },
      {
        $group: {
          _id: '$costCode',
          totalHours: { $sum: '$totalHours' },
          totalCost: { $sum: '$totalCostWithBurden' },
          entries: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 TIMELOG SUMMARY BY COST CODE:');
    summary.forEach(item => {
      console.log(`${item._id}: ${item.entries} entries, ${Math.round(item.totalHours)} hours, $${Math.round(item.totalCost).toLocaleString()}`);
    });
    
    const totals = summary.reduce((acc, item) => ({
      entries: acc.entries + item.entries,
      hours: acc.hours + item.totalHours,
      cost: acc.cost + item.totalCost
    }), { entries: 0, hours: 0, cost: 0 });
    
    console.log(`\n📈 TOTALS: ${totals.entries} entries, ${Math.round(totals.hours)} hours, $${Math.round(totals.cost).toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error creating timelog data:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
}

createTimelogData();
