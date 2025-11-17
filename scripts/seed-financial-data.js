require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');

async function seedFinancialData() {
  try {
    console.log('💰 Starting Financial Data Seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing data
    const job = await Job.findOne();
    const project = await Project.findOne();
    const sovLineItems = await ScheduleOfValues.find({ jobId: job._id });
    const systems = await System.find({ jobId: job._id });
    const areas = await Area.find({ jobId: job._id });
    const phases = await Phase.find({ jobId: job._id });

    console.log(`📋 Using Job: ${job.name}`);
    console.log(`🏗️ Found ${sovLineItems.length} SOV Line Items`);

    // Clear existing financial data
    await Promise.all([
      APRegister.deleteMany({ jobId: job._id }),
      TimelogRegister.deleteMany({ jobId: job._id })
    ]);

    // 1. CREATE 8 REALISTIC WORKERS WITH DIFFERENT TRADE LEVELS
    const workersData = [
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@contractor.com',
        role: 'field_worker',
        craft: 'insulation',
        tradeLevel: 'journeyman',
        baseRate: 38.50,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'Insulation Journeyman'
      },
      {
        name: 'Sarah Martinez',
        email: 'sarah.martinez@contractor.com', 
        role: 'field_supervisor',
        craft: 'insulation',
        tradeLevel: 'foreman',
        baseRate: 45.75,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'Insulation Foreman'
      },
      {
        name: 'David Chen',
        email: 'david.chen@contractor.com',
        role: 'field_worker',
        craft: 'painting',
        tradeLevel: 'journeyman',
        baseRate: 36.25,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'Painter Journeyman'
      },
      {
        name: 'Lisa Thompson',
        email: 'lisa.thompson@contractor.com',
        role: 'field_worker',
        craft: 'heat_tracing',
        tradeLevel: 'journeyman',
        baseRate: 42.00,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'Heat Trace Technician'
      },
      {
        name: 'Robert Wilson',
        email: 'robert.wilson@contractor.com',
        role: 'field_worker',
        craft: 'insulation',
        tradeLevel: 'apprentice',
        baseRate: 28.75,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'Insulation Apprentice'
      },
      {
        name: 'Jennifer Adams',
        email: 'jennifer.adams@contractor.com',
        role: 'field_supervisor',
        craft: 'general',
        tradeLevel: 'general_foreman',
        baseRate: 52.50,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'General Foreman'
      },
      {
        name: 'Carlos Rodriguez',
        email: 'carlos.rodriguez@contractor.com',
        role: 'field_worker',
        craft: 'fireproofing',
        tradeLevel: 'journeyman',
        baseRate: 39.75,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'Fireproofing Specialist'
      },
      {
        name: 'Amanda Foster',
        email: 'amanda.foster@contractor.com',
        role: 'field_worker',
        craft: 'equipment',
        tradeLevel: 'journeyman',
        baseRate: 44.25,
        overtimeMultiplier: 1.5,
        doubleTimeMultiplier: 2.0,
        department: 'Field Operations',
        position: 'Equipment Specialist'
      }
    ];

    const workers = [];
    for (const workerData of workersData) {
      let worker = await User.findOne({ email: workerData.email });
      if (!worker) {
        worker = new User({
          name: workerData.name,
          email: workerData.email,
          role: workerData.role,
          department: workerData.department,
          position: workerData.position,
          password: 'hashedpassword123', // Would be properly hashed
          isActive: true,
          timezone: 'America/Toronto',
          language: 'en',
          workSchedule: {
            monday: { available: true },
            tuesday: { available: true },
            wednesday: { available: true },
            thursday: { available: true },
            friday: { available: true },
            saturday: { available: false },
            sunday: { available: false }
          }
        });
        await worker.save();
      }
      
      // Store additional worker data for timelog creation
      worker.craft = workerData.craft;
      worker.tradeLevel = workerData.tradeLevel;
      worker.baseRate = workerData.baseRate;
      worker.overtimeMultiplier = workerData.overtimeMultiplier;
      worker.doubleTimeMultiplier = workerData.doubleTimeMultiplier;
      
      workers.push(worker);
      console.log(`✅ Created/Found Worker: ${worker.name} (${worker.craft} ${worker.tradeLevel})`);
    }

    // 2. GENERATE 5 MONTHS OF REALISTIC TIMELOG DATA
    const startDate = new Date('2024-07-01');
    const endDate = new Date('2024-11-30');
    const timelogEntries = [];

    // Helper function to get work days in a month
    const getWorkDays = (year, month) => {
      const date = new Date(year, month, 1);
      const workDays = [];
      
      while (date.getMonth() === month) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
          workDays.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
      }
      return workDays;
    };

    // Generate realistic work patterns for each worker
    for (let month = 6; month <= 10; month++) { // July to November (months 6-10)
      const workDays = getWorkDays(2024, month);
      
      for (const worker of workers) {
        for (const workDay of workDays) {
          // Skip some days randomly (vacation, sick days, etc.)
          if (Math.random() < 0.05) continue; // 5% absence rate
          
          // Determine work pattern based on trade level
          let regularHours, overtimeHours = 0, doubleTimeHours = 0;
          
          if (worker.tradeLevel === 'general_foreman' || worker.tradeLevel === 'foreman') {
            regularHours = 8; // Supervisors work standard hours
            if (Math.random() < 0.2) overtimeHours = 2; // 20% chance of overtime
          } else {
            regularHours = 8;
            if (Math.random() < 0.4) overtimeHours = Math.floor(Math.random() * 4) + 1; // 40% chance of 1-4 OT hours
            if (Math.random() < 0.05) doubleTimeHours = Math.floor(Math.random() * 2) + 1; // 5% chance of double time
          }

          // Select appropriate cost code based on worker's craft and project phase
          let costCode, sovLineItem, systemId, areaId, phaseId;
          const currentPhase = phases.find(p => 
            new Date(p.startDate) <= workDay && new Date(p.endDate) >= workDay
          );

          switch (worker.craft) {
            case 'insulation':
              if (currentPhase?.code === 'PREP') {
                costCode = 'PREP-CLEAN';
                sovLineItem = sovLineItems.find(s => s.costCode === 'PREP-CLEAN');
              } else if (currentPhase?.code === 'EQUIP') {
                costCode = Math.random() < 0.5 ? 'INS-EQUIP-HX' : 'INS-PIPE-CON-10';
                sovLineItem = sovLineItems.find(s => s.costCode === costCode);
              } else {
                costCode = Math.random() < 0.6 ? 'INS-PIPE-CON-12' : 'INS-PIPE-CON-10';
                sovLineItem = sovLineItems.find(s => s.costCode === costCode);
              }
              break;
            case 'painting':
              costCode = 'JACK-ALUM-PIPE';
              sovLineItem = sovLineItems.find(s => s.costCode === 'JACK-ALUM-PIPE');
              break;
            case 'heat_tracing':
              costCode = 'INS-PIPE-CON-10'; // Heat tracing work on return headers
              sovLineItem = sovLineItems.find(s => s.costCode === 'INS-PIPE-CON-10');
              break;
            case 'fireproofing':
              costCode = 'JACK-SS-EQUIP';
              sovLineItem = sovLineItems.find(s => s.costCode === 'JACK-SS-EQUIP');
              break;
            case 'equipment':
              costCode = 'INS-EQUIP-HX';
              sovLineItem = sovLineItems.find(s => s.costCode === 'INS-EQUIP-HX');
              break;
            default:
              costCode = 'SAFETY-PROGRAM';
              sovLineItem = sovLineItems.find(s => s.costCode === 'SAFETY-PROGRAM');
          }

          // Generate realistic productivity data
          let unitsCompleted = {};
          if (worker.craft === 'insulation' && costCode.includes('PIPE')) {
            const productivity = worker.tradeLevel === 'journeyman' ? 12 : 
                               worker.tradeLevel === 'apprentice' ? 8 : 15;
            unitsCompleted = {
              quantity: regularHours * productivity + (overtimeHours * productivity * 0.8), // Reduced efficiency on OT
              unit: 'LF',
              description: costCode.includes('12') ? '12" pipe insulation' : '10" pipe insulation'
            };
          } else if (worker.craft === 'equipment') {
            unitsCompleted = {
              quantity: regularHours * 0.1, // Equipment work measured differently
              unit: 'EA',
              description: 'Equipment insulation components'
            };
          }

          // Calculate costs manually
          const totalHours = regularHours + overtimeHours + doubleTimeHours;
          const regularCost = regularHours * worker.baseRate;
          const overtimeCost = overtimeHours * (worker.baseRate * worker.overtimeMultiplier);
          const doubleTimeCost = doubleTimeHours * (worker.baseRate * worker.doubleTimeMultiplier);
          const totalLaborCost = regularCost + overtimeCost + doubleTimeCost;
          const burdenRate = 0.35;
          const totalBurdenCost = totalLaborCost * burdenRate;
          const totalCostWithBurden = totalLaborCost + totalBurdenCost;

          // Create timelog entry
          const timelogEntry = new TimelogRegister({
            workerId: worker._id,
            jobId: job._id,
            projectId: project._id,
            workDate: workDay,
            payPeriodStart: new Date(workDay.getFullYear(), workDay.getMonth(), 1),
            payPeriodEnd: new Date(workDay.getFullYear(), workDay.getMonth() + 1, 0),
            regularHours,
            overtimeHours,
            doubleTimeHours,
            totalHours,
            costCode,
            costCodeDescription: sovLineItem?.description || `${costCode} work`,
            scheduleOfValuesId: sovLineItem?._id,
            systemId: sovLineItem?.systemId,
            areaId: sovLineItem?.areaId,
            phaseId: sovLineItem?.phaseId,
            workDescription: `${worker.craft} work on ${costCode} - ${new Date(workDay).toLocaleDateString()}`,
            craft: worker.craft,
            tradeLevel: worker.tradeLevel,
            baseHourlyRate: worker.baseRate,
            overtimeRate: worker.baseRate * worker.overtimeMultiplier,
            doubleTimeRate: worker.baseRate * worker.doubleTimeMultiplier,
            regularCost,
            overtimeCost,
            doubleTimeCost,
            totalLaborCost,
            burdenRate,
            totalBurdenCost,
            totalCostWithBurden,
            unitsCompleted,
            location: {
              area: sovLineItem?.areaId ? areas.find(a => a._id.equals(sovLineItem.areaId))?.name : 'Process Unit 200A',
              zone: 'North',
              building: 'Process Building'
            },
            status: 'approved',
            submittedBy: worker._id,
            approvedBy: workers.find(w => w.tradeLevel === 'general_foreman')?._id,
            approvedAt: new Date(workDay.getTime() + 24 * 60 * 60 * 1000) // Approved next day
          });

          timelogEntries.push(timelogEntry);
        }
      }
    }

    // Batch save timelog entries
    console.log(`📊 Creating ${timelogEntries.length} timelog entries...`);
    const savedTimelogs = await TimelogRegister.insertMany(timelogEntries);
    console.log(`✅ Created ${savedTimelogs.length} timelog entries`);

    // 3. GENERATE REALISTIC AP REGISTER DATA
    const vendors = [
      {
        name: 'Owens Corning Insulation',
        type: 'material',
        category: 'insulation_materials',
        vendorNumber: 'VEN-001'
      },
      {
        name: 'Johns Manville Corporation',
        type: 'material', 
        category: 'insulation_materials',
        vendorNumber: 'VEN-002'
      },
      {
        name: 'Industrial Aluminum Supply',
        type: 'material',
        category: 'jacketing_materials', 
        vendorNumber: 'VEN-003'
      },
      {
        name: 'Specialty Contracting Services',
        type: 'subcontractor',
        category: 'labor_subcontract',
        vendorNumber: 'VEN-004'
      },
      {
        name: 'United Rentals Equipment',
        type: 'equipment',
        category: 'equipment_rental',
        vendorNumber: 'VEN-005'
      },
      {
        name: 'Safety Supply Co.',
        type: 'material',
        category: 'safety',
        vendorNumber: 'VEN-006'
      },
      {
        name: 'Industrial Tools & Hardware',
        type: 'material',
        category: 'tools',
        vendorNumber: 'VEN-007'
      },
      {
        name: 'Regional Scaffolding Services',
        type: 'subcontractor',
        category: 'equipment_rental',
        vendorNumber: 'VEN-008'
      }
    ];

    const apEntries = [];
    let invoiceCounter = 1000;

    // Generate AP entries for each month
    for (let month = 6; month <= 10; month++) {
      const monthStart = new Date(2024, month, 1);
      const monthEnd = new Date(2024, month + 1, 0);
      
      // Generate 15-25 invoices per month
      const invoicesThisMonth = Math.floor(Math.random() * 11) + 15;
      
      for (let i = 0; i < invoicesThisMonth; i++) {
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];
        const invoiceDate = new Date(monthStart.getTime() + Math.random() * (monthEnd.getTime() - monthStart.getTime()));
        
        // Generate realistic invoice amounts based on vendor type
        let baseAmount;
        switch (vendor.category) {
          case 'insulation_materials':
            baseAmount = Math.floor(Math.random() * 15000) + 5000; // $5k-$20k
            break;
          case 'jacketing_materials':
            baseAmount = Math.floor(Math.random() * 8000) + 2000; // $2k-$10k
            break;
          case 'labor_subcontract':
            baseAmount = Math.floor(Math.random() * 25000) + 10000; // $10k-$35k
            break;
          case 'equipment_rental':
            baseAmount = Math.floor(Math.random() * 5000) + 1000; // $1k-$6k
            break;
          case 'safety':
            baseAmount = Math.floor(Math.random() * 2000) + 500; // $500-$2.5k
            break;
          case 'tools':
            baseAmount = Math.floor(Math.random() * 3000) + 500; // $500-$3.5k
            break;
          default:
            baseAmount = Math.floor(Math.random() * 5000) + 1000;
        }

        const taxAmount = baseAmount * 0.13; // 13% HST
        const totalAmount = baseAmount + taxAmount;

        // Assign to appropriate cost codes based on vendor type
        let costCodeBreakdown = [];
        
        if (vendor.category === 'insulation_materials') {
          // Split between different insulation cost codes
          const codes = ['INS-PIPE-CON-12', 'INS-PIPE-CON-10', 'INS-EQUIP-HX'];
          const numCodes = Math.floor(Math.random() * 2) + 1; // 1-2 cost codes
          
          for (let j = 0; j < numCodes; j++) {
            const costCode = codes[j % codes.length];
            const sovItem = sovLineItems.find(s => s.costCode === costCode);
            const amount = j === numCodes - 1 ? baseAmount : Math.floor(baseAmount / numCodes);
            
            costCodeBreakdown.push({
              costCode,
              description: sovItem?.description || `${costCode} materials`,
              amount,
              scheduleOfValuesId: sovItem?._id,
              systemId: sovItem?.systemId,
              areaId: sovItem?.areaId,
              phaseId: sovItem?.phaseId
            });
            
            if (j < numCodes - 1) baseAmount -= amount;
          }
        } else if (vendor.category === 'jacketing_materials') {
          const costCode = Math.random() < 0.7 ? 'JACK-ALUM-PIPE' : 'JACK-SS-EQUIP';
          const sovItem = sovLineItems.find(s => s.costCode === costCode);
          
          costCodeBreakdown.push({
            costCode,
            description: sovItem?.description || `${costCode} materials`,
            amount: baseAmount,
            scheduleOfValuesId: sovItem?._id,
            systemId: sovItem?.systemId,
            areaId: sovItem?.areaId,
            phaseId: sovItem?.phaseId
          });
        } else if (vendor.category === 'equipment_rental') {
          const costCode = 'PREP-SCAFFOLD';
          const sovItem = sovLineItems.find(s => s.costCode === costCode);
          
          costCodeBreakdown.push({
            costCode,
            description: 'Equipment rental and scaffolding',
            amount: baseAmount,
            scheduleOfValuesId: sovItem?._id,
            areaId: sovItem?.areaId,
            phaseId: sovItem?.phaseId
          });
        } else {
          // Default to safety program or general overhead
          const costCode = 'SAFETY-PROGRAM';
          const sovItem = sovLineItems.find(s => s.costCode === costCode);
          
          costCodeBreakdown.push({
            costCode,
            description: sovItem?.description || `${vendor.category} costs`,
            amount: baseAmount,
            scheduleOfValuesId: sovItem?._id
          });
        }

        const apEntry = new APRegister({
          invoiceNumber: `INV-${String(invoiceCounter++).padStart(4, '0')}`,
          invoiceDate,
          dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          receivedDate: new Date(invoiceDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Received within 7 days
          vendor: {
            name: vendor.name,
            vendorNumber: vendor.vendorNumber
          },
          invoiceAmount: baseAmount,
          taxAmount,
          totalAmount,
          jobId: job._id,
          projectId: project._id,
          costCodeBreakdown,
          invoiceType: vendor.type,
          category: vendor.category,
          paymentStatus: Math.random() < 0.8 ? 'paid' : Math.random() < 0.9 ? 'approved' : 'pending',
          paymentDate: Math.random() < 0.8 ? new Date(invoiceDate.getTime() + Math.random() * 45 * 24 * 60 * 60 * 1000) : null,
          enteredBy: workers.find(w => w.tradeLevel === 'general_foreman')?._id,
          approvedBy: workers.find(w => w.tradeLevel === 'general_foreman')?._id,
          approvedDate: new Date(invoiceDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
        });

        apEntries.push(apEntry);
      }
    }

    // Batch save AP entries
    console.log(`💳 Creating ${apEntries.length} AP register entries...`);
    const savedAPs = await APRegister.insertMany(apEntries);
    console.log(`✅ Created ${savedAPs.length} AP register entries`);

    // 4. CALCULATE SUMMARY STATISTICS
    const timelogStats = await TimelogRegister.aggregate([
      { $match: { jobId: job._id } },
      {
        $group: {
          _id: '$costCode',
          totalHours: { $sum: '$totalHours' },
          totalCost: { $sum: '$totalCostWithBurden' },
          entries: { $sum: 1 }
        }
      }
    ]);

    const apStats = await APRegister.aggregate([
      { $match: { jobId: job._id } },
      { $unwind: '$costCodeBreakdown' },
      {
        $group: {
          _id: '$costCodeBreakdown.costCode',
          totalAmount: { $sum: '$costCodeBreakdown.amount' },
          invoices: { $sum: 1 }
        }
      }
    ]);

    console.log('\n🎯 FINANCIAL DATA SEEDING COMPLETE!');
    console.log('=====================================');
    console.log(`👥 Created/Found ${workers.length} Workers`);
    console.log(`⏰ Created ${savedTimelogs.length} Timelog Entries`);
    console.log(`💳 Created ${savedAPs.length} AP Register Entries`);
    console.log('=====================================');
    
    console.log('\n📊 TIMELOG SUMMARY BY COST CODE:');
    timelogStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.totalHours.toFixed(1)} hrs, $${stat.totalCost.toLocaleString()}, ${stat.entries} entries`);
    });
    
    console.log('\n💰 AP SUMMARY BY COST CODE:');
    apStats.forEach(stat => {
      console.log(`${stat._id}: $${stat.totalAmount.toLocaleString()}, ${stat.invoices} invoices`);
    });

    const totalLaborCost = timelogStats.reduce((sum, stat) => sum + stat.totalCost, 0);
    const totalAPCost = apStats.reduce((sum, stat) => sum + stat.totalAmount, 0);
    const totalProjectCost = totalLaborCost + totalAPCost;
    const totalContractValue = sovLineItems.reduce((sum, item) => sum + item.totalValue, 0);

    console.log('\n📈 PROJECT FINANCIAL SUMMARY:');
    console.log(`Total Labor Cost: $${totalLaborCost.toLocaleString()}`);
    console.log(`Total AP Cost: $${totalAPCost.toLocaleString()}`);
    console.log(`Total Project Cost: $${totalProjectCost.toLocaleString()}`);
    console.log(`Contract Value: $${totalContractValue.toLocaleString()}`);
    console.log(`Projected Margin: $${(totalContractValue - totalProjectCost).toLocaleString()}`);
    console.log(`Margin %: ${(((totalContractValue - totalProjectCost) / totalContractValue) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Error seeding financial data:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedFinancialData();
