require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Import all models
const Project = require('../src/server/models/Project');
const Job = require('../src/server/models/Job');
const User = require('../src/server/models/User');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const Module = require('../src/server/models/Module');
const Component = require('../src/server/models/Component');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const GLCategory = require('../src/server/models/GLCategory');
const GLAccount = require('../src/server/models/GLAccount');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const ProgressReport = require('../src/server/models/ProgressReport');

// Connect to local MongoDB
const MONGODB_URI = process.env.MONGODB_LOCAL_URI || process.env.MONGODB_DEV_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_LOCAL_URI or MONGODB_DEV_URI not set in .env.local');
  process.exit(1);
}

async function seedCompleteData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\n🧹 Clearing existing data...');
    await Promise.all([
      ProgressReport.deleteMany({}),
      TimelogRegister.deleteMany({}),
      APRegister.deleteMany({}),
      ScheduleOfValues.deleteMany({}),
      Component.deleteMany({}),
      Module.deleteMany({}),
      Phase.deleteMany({}),
      Area.deleteMany({}),
      System.deleteMany({}),
      Job.deleteMany({}),
      Project.deleteMany({}),
      GLAccount.deleteMany({}),
      GLCategory.deleteMany({})
    ]);
    console.log('✅ Existing data cleared');

    // Create or get users
    console.log('\n👥 Creating users...');
    let projectManager = await User.findOne({ email: 'pm@insulation.com' });
    if (!projectManager) {
      projectManager = await User.create({
        name: 'John Smith',
        email: 'pm@insulation.com',
        password: 'hashedpassword', // In real app, this would be hashed
        role: 'project_manager'
      });
    }

    let worker1 = await User.findOne({ email: 'worker1@insulation.com' });
    if (!worker1) {
      worker1 = await User.create({
        name: 'Mike Johnson',
        email: 'worker1@insulation.com',
        password: 'hashedpassword',
        role: 'field_worker'
      });
    }

    let worker2 = await User.findOne({ email: 'worker2@insulation.com' });
    if (!worker2) {
      worker2 = await User.create({
        name: 'Tom Williams',
        email: 'worker2@insulation.com',
        password: 'hashedpassword',
        role: 'field_worker'
      });
    }
    console.log('✅ Users created');

    // Create Project
    console.log('\n📁 Creating project...');
    const projectStartDate = new Date('2024-01-01');
    const projectEndDate = new Date('2024-06-30');
    
    const project = await Project.create({
      name: 'Downtown Office Complex - Mechanical Insulation',
      projectNumber: 'PROJ-2024-001',
      client: {
        name: 'ABC Development Corp',
        contact: 'Jane Doe',
        email: 'jane@abcdev.com',
        phone: '555-0100'
      },
      description: 'Complete mechanical insulation installation for new office complex',
      location: {
        address: '123 Main St, Downtown, City, State 12345'
      },
      startDate: projectStartDate,
      endDate: projectEndDate,
      totalContractValue: 2500000,
      status: 'active',
      projectManager: projectManager._id,
      projectType: 'commercial'
    });
    console.log('✅ Project created:', project.name);

    // Create Jobs
    console.log('\n💼 Creating jobs...');
    const job1Start = new Date('2024-01-15');
    const job1End = new Date('2024-05-15');
    const job1 = await Job.create({
      name: 'Building A - HVAC Insulation',
      jobNumber: 'JOB-2024-001',
      projectId: project._id,
      client: {
        name: 'ABC Development Corp',
        contact: 'Jane Doe',
        email: 'jane@abcdev.com',
        phone: '555-0100'
      },
      description: 'HVAC ductwork and piping insulation for Building A',
      location: {
        address: '123 Main St, Building A, Downtown, City, State 12345'
      },
      startDate: job1Start,
      endDate: job1End,
      contractValue: 1200000,
      status: 'active',
      jobManager: projectManager._id
    });

    const job2Start = new Date('2024-02-01');
    const job2End = new Date('2024-06-01');
    const job2 = await Job.create({
      name: 'Building B - Process Piping Insulation',
      jobNumber: 'JOB-2024-002',
      projectId: project._id,
      client: {
        name: 'ABC Development Corp',
        contact: 'Jane Doe',
        email: 'jane@abcdev.com',
        phone: '555-0100'
      },
      description: 'Process piping and equipment insulation for Building B',
      location: {
        address: '123 Main St, Building B, Downtown, City, State 12345'
      },
      startDate: job2Start,
      endDate: job2End,
      contractValue: 1300000,
      status: 'active',
      jobManager: projectManager._id
    });
    console.log('✅ Jobs created');

    // Seed GL Categories and Accounts for both jobs
    console.log('\n💰 Seeding GL Categories and Accounts...');
    const glStructure = {
      'Materials': {
        code: '200',
        accounts: [
          { code: '201', name: 'Pipe Insulation Materials' },
          { code: '202', name: 'Duct Insulation Materials' },
          { code: '203', name: 'Sheet Metal (Jacketing)' },
          { code: '204', name: 'PVC Cladding Material' },
          { code: '205', name: 'Adhesives, Mastics, Sealants' },
          { code: '206', name: 'Fasteners, Bands, Tapes' },
          { code: '299', name: 'Miscellaneous Materials' }
        ]
      },
      'Subcontractors': {
        code: '300',
        accounts: [
          { code: '301', name: 'Insulation Blanket Subcontractors' },
          { code: '302', name: 'General Labour Subcontractors' },
          { code: '303', name: 'Specialty Insulation Subcontractors' },
          { code: '304', name: 'Consultant Subcontractors' }
        ]
      },
      'Equipment & Rentals': {
        code: '400',
        accounts: [
          { code: '401', name: 'Scaffolding' },
          { code: '402', name: 'Lifts & Hoists' },
          { code: '403', name: 'Tools & Small Equipment' },
          { code: '499', name: 'Misc. Rentals' }
        ]
      },
      'Direct Labour': {
        code: '100',
        accounts: [
          { code: '101', name: 'Concealed Pipe Insulation Labour' },
          { code: '102', name: 'Exposed Pipe Insulation Labour' },
          { code: '103', name: 'Duct Insulation Labour' },
          { code: '104', name: 'Equipment/Boiler Insulation Labour' }
        ]
      },
      'Indirect/Overhead': {
        code: '600',
        accounts: [
          { code: '601', name: 'Executive Salaries' },
          { code: '602', name: 'Project Management Salaries' },
          { code: '603', name: 'Estimating / Precon Salaries' },
          { code: '604', name: 'Administrative & Finance Wages' },
          { code: '605', name: 'Payroll Taxes & Benefits (Overhead Staff)' },
          { code: '699', name: 'Miscellaneous Overhead Wages' }
        ]
      }
    };

    const glCategoriesMap = {};
    const glAccountsMap = {};

    for (const [job, jobData] of [[job1, 'Job 1'], [job2, 'Job 2']]) {
      for (const [categoryName, categoryData] of Object.entries(glStructure)) {
        const glCategory = await GLCategory.create({
          name: categoryName,
          code: categoryData.code,
          description: `${categoryName} for ${jobData}`,
          jobId: job._id,
          projectId: project._id,
          isActive: true,
          sortOrder: parseInt(categoryData.code)
        });
        glCategoriesMap[`${job._id}-${categoryName}`] = glCategory;

        for (const accountData of categoryData.accounts) {
          const glAccount = await GLAccount.create({
            name: accountData.name,
            code: accountData.code,
            description: `${accountData.name} for ${jobData}`,
            glCategoryId: glCategory._id,
            jobId: job._id,
            projectId: project._id,
            isActive: true,
            sortOrder: parseInt(accountData.code)
          });
          glAccountsMap[`${job._id}-${accountData.code}`] = glAccount;
        }
      }
    }
    console.log('✅ GL Categories and Accounts seeded');

    // Create SOV Setup for Job 1
    console.log('\n🔧 Creating SOV Setup for Job 1...');
    const job1Systems = await System.insertMany([
      { jobId: job1._id, projectId: project._id, code: 'HVAC', name: 'HVAC Systems', description: 'Heating, Ventilation, Air Conditioning', sortOrder: 1 },
      { jobId: job1._id, projectId: project._id, code: 'CHW', name: 'Chilled Water', description: 'Chilled water piping systems', sortOrder: 2 },
      { jobId: job1._id, projectId: project._id, code: 'HW', name: 'Hot Water', description: 'Hot water heating systems', sortOrder: 3 }
    ]);

    const job1Areas = await Area.insertMany([
      { jobId: job1._id, projectId: project._id, code: 'FL1', name: 'Floor 1', description: 'First floor', sortOrder: 1 },
      { jobId: job1._id, projectId: project._id, code: 'FL2', name: 'Floor 2', description: 'Second floor', sortOrder: 2 },
      { jobId: job1._id, projectId: project._id, code: 'FL3', name: 'Floor 3', description: 'Third floor', sortOrder: 3 },
      { jobId: job1._id, projectId: project._id, code: 'MECH', name: 'Mechanical Room', description: 'Main mechanical room', sortOrder: 4 }
    ]);

    const job1Phases = await Phase.insertMany([
      { jobId: job1._id, projectId: project._id, code: 'RGH', name: 'Rough-In', description: 'Rough-in phase', sortOrder: 1 },
      { jobId: job1._id, projectId: project._id, code: 'FIN', name: 'Finish', description: 'Finish phase', sortOrder: 2 }
    ]);

    const job1Modules = await Module.insertMany([
      { jobId: job1._id, projectId: project._id, code: 'DUCT', name: 'Ductwork', description: 'Ductwork insulation', sortOrder: 1 },
      { jobId: job1._id, projectId: project._id, code: 'PIPE', name: 'Piping', description: 'Pipe insulation', sortOrder: 2 }
    ]);

    const job1Components = await Component.insertMany([
      { jobId: job1._id, projectId: project._id, code: 'FIB', name: 'Fiberglass', description: 'Fiberglass insulation', sortOrder: 1 },
      { jobId: job1._id, projectId: project._id, code: 'FOAM', name: 'Foam', description: 'Foam insulation', sortOrder: 2 },
      { jobId: job1._id, projectId: project._id, code: 'JACK', name: 'Jacketing', description: 'Protective jacketing', sortOrder: 3 }
    ]);

    // Create SOV Setup for Job 2
    console.log('\n🔧 Creating SOV Setup for Job 2...');
    const job2Systems = await System.insertMany([
      { jobId: job2._id, projectId: project._id, code: 'PROC', name: 'Process', description: 'Process piping systems', sortOrder: 1 },
      { jobId: job2._id, projectId: project._id, code: 'STEAM', name: 'Steam', description: 'Steam distribution systems', sortOrder: 2 },
      { jobId: job2._id, projectId: project._id, code: 'COND', name: 'Condensate', description: 'Condensate return systems', sortOrder: 3 }
    ]);

    const job2Areas = await Area.insertMany([
      { jobId: job2._id, projectId: project._id, code: 'PROD', name: 'Production', description: 'Production area', sortOrder: 1 },
      { jobId: job2._id, projectId: project._id, code: 'UTIL', name: 'Utilities', description: 'Utilities area', sortOrder: 2 },
      { jobId: job2._id, projectId: project._id, code: 'BOIL', name: 'Boiler Room', description: 'Boiler room', sortOrder: 3 }
    ]);

    const job2Phases = await Phase.insertMany([
      { jobId: job2._id, projectId: project._id, code: 'RGH', name: 'Rough-In', description: 'Rough-in phase', sortOrder: 1 },
      { jobId: job2._id, projectId: project._id, code: 'FIN', name: 'Finish', description: 'Finish phase', sortOrder: 2 }
    ]);

    const job2Modules = await Module.insertMany([
      { jobId: job2._id, projectId: project._id, code: 'PIPE', name: 'Piping', description: 'Pipe insulation', sortOrder: 1 },
      { jobId: job2._id, projectId: project._id, code: 'EQ', name: 'Equipment', description: 'Equipment insulation', sortOrder: 2 }
    ]);

    const job2Components = await Component.insertMany([
      { jobId: job2._id, projectId: project._id, code: 'FIB', name: 'Fiberglass', description: 'Fiberglass insulation', sortOrder: 1 },
      { jobId: job2._id, projectId: project._id, code: 'MIN', name: 'Mineral Wool', description: 'Mineral wool insulation', sortOrder: 2 },
      { jobId: job2._id, projectId: project._id, code: 'JACK', name: 'Jacketing', description: 'Protective jacketing', sortOrder: 3 }
    ]);
    console.log('✅ SOV Setup created');

    // Create Schedule of Values Line Items
    console.log('\n📋 Creating Schedule of Values line items...');
    
    // Helper function to generate cost code name
    const generateCostCodeName = (system, area) => {
      return `${system.code}${area.code}`;
    };

    // Job 1 SOV Line Items
    const job1SOVItems = [];
    let costCodeCounter = 1;

    const job1SOVData = [
      { system: job1Systems[0], area: job1Areas[0], phase: job1Phases[0], module: job1Modules[0], component: job1Components[0], 
        description: 'Fiberglass duct insulation - Floor 1', quantity: 2500, unit: 'SF', unitCost: 8.50, marginPercent: 25,
        glCategory: 'Materials', glAccount: '202' },
      { system: job1Systems[0], area: job1Areas[1], phase: job1Phases[0], module: job1Modules[0], component: job1Components[0],
        description: 'Fiberglass duct insulation - Floor 2', quantity: 2800, unit: 'SF', unitCost: 8.50, marginPercent: 25,
        glCategory: 'Materials', glAccount: '202' },
      { system: job1Systems[0], area: job1Areas[2], phase: job1Phases[0], module: job1Modules[0], component: job1Components[0],
        description: 'Fiberglass duct insulation - Floor 3', quantity: 2700, unit: 'SF', unitCost: 8.50, marginPercent: 25,
        glCategory: 'Materials', glAccount: '202' },
      { system: job1Systems[1], area: job1Areas[3], phase: job1Phases[0], module: job1Modules[1], component: job1Components[0],
        description: 'Chilled water pipe insulation - Mechanical Room', quantity: 1200, unit: 'LF', unitCost: 45.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '201' },
      { system: job1Systems[2], area: job1Areas[3], phase: job1Phases[0], module: job1Modules[1], component: job1Components[0],
        description: 'Hot water pipe insulation - Mechanical Room', quantity: 800, unit: 'LF', unitCost: 42.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '201' },
      { system: job1Systems[0], area: job1Areas[0], phase: job1Phases[1], module: job1Modules[0], component: job1Components[2],
        description: 'Duct jacketing - Floor 1', quantity: 2500, unit: 'SF', unitCost: 3.50, marginPercent: 25,
        glCategory: 'Materials', glAccount: '203' },
      { system: job1Systems[1], area: job1Areas[3], phase: job1Phases[1], module: job1Modules[1], component: job1Components[2],
        description: 'Pipe jacketing - Mechanical Room', quantity: 2000, unit: 'LF', unitCost: 8.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '203' },
      { system: job1Systems[0], area: job1Areas[0], phase: job1Phases[0], module: job1Modules[0], component: job1Components[0],
        description: 'Installation labor - Floor 1 Ductwork', quantity: 320, unit: 'HR', unitCost: 65.00, marginPercent: 30,
        glCategory: 'Direct Labour', glAccount: '103' }
    ];

    for (const item of job1SOVData) {
      const costCodeNumber = String(costCodeCounter++).padStart(3, '0');
      const costCodeName = generateCostCodeName(item.system, item.area);
      const totalCost = item.quantity * item.unitCost;
      const totalValue = totalCost / (1 - item.marginPercent / 100);
      const marginAmount = totalValue - totalCost;

      const glCategory = glCategoriesMap[`${job1._id}-${item.glCategory}`];
      const glAccount = glAccountsMap[`${job1._id}-${item.glAccount}`];

      const sovItem = await ScheduleOfValues.create({
        jobId: job1._id,
        projectId: project._id,
        lineNumber: String(job1SOVItems.length + 1),
        description: item.description,
        systemId: item.system._id,
        areaId: item.area._id,
        phaseId: item.phase._id,
        moduleId: item.module._id,
        componentId: item.component._id,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        totalCost: totalCost,
        marginPercent: item.marginPercent,
        marginAmount: marginAmount,
        totalValue: totalValue,
        glCategoryId: glCategory._id,
        glAccountItemId: glAccount._id,
        costCodeNumber: costCodeNumber,
        costCodeName: costCodeName,
        notes: '',
        status: 'in_progress'
      });
      job1SOVItems.push(sovItem);
    }

    // Job 2 SOV Line Items
    const job2SOVItems = [];
    costCodeCounter = 1;

    const job2SOVData = [
      { system: job2Systems[0], area: job2Areas[0], phase: job2Phases[0], module: job2Modules[0], component: job2Components[0],
        description: 'Process pipe insulation - Production Area', quantity: 1800, unit: 'LF', unitCost: 52.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '201' },
      { system: job2Systems[1], area: job2Areas[2], phase: job2Phases[0], module: job2Modules[0], component: job2Components[1],
        description: 'Steam pipe insulation - Boiler Room', quantity: 950, unit: 'LF', unitCost: 68.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '201' },
      { system: job2Systems[2], area: job2Areas[2], phase: job2Phases[0], module: job2Modules[0], component: job2Components[0],
        description: 'Condensate return pipe insulation - Boiler Room', quantity: 750, unit: 'LF', unitCost: 38.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '201' },
      { system: job2Systems[1], area: job2Areas[2], phase: job2Phases[1], module: job2Modules[1], component: job2Components[1],
        description: 'Boiler insulation - Boiler Room', quantity: 1, unit: 'EA', unitCost: 12500.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '201' },
      { system: job2Systems[0], area: job2Areas[0], phase: job2Phases[1], module: job2Modules[0], component: job2Components[2],
        description: 'Process pipe jacketing - Production Area', quantity: 1800, unit: 'LF', unitCost: 12.00, marginPercent: 25,
        glCategory: 'Materials', glAccount: '203' },
      { system: job2Systems[0], area: job2Areas[0], phase: job2Phases[0], module: job2Modules[0], component: job2Components[0],
        description: 'Installation labor - Production Piping', quantity: 450, unit: 'HR', unitCost: 65.00, marginPercent: 30,
        glCategory: 'Direct Labour', glAccount: '101' },
      { system: job2Systems[1], area: job2Areas[2], phase: job2Phases[0], module: job2Modules[0], component: job2Components[1],
        description: 'Installation labor - Steam Piping', quantity: 280, unit: 'HR', unitCost: 68.00, marginPercent: 30,
        glCategory: 'Direct Labour', glAccount: '102' }
    ];

    for (const item of job2SOVData) {
      const costCodeNumber = String(costCodeCounter++).padStart(3, '0');
      const costCodeName = generateCostCodeName(item.system, item.area);
      const totalCost = item.quantity * item.unitCost;
      const totalValue = totalCost / (1 - item.marginPercent / 100);
      const marginAmount = totalValue - totalCost;

      const glCategory = glCategoriesMap[`${job2._id}-${item.glCategory}`];
      const glAccount = glAccountsMap[`${job2._id}-${item.glAccount}`];

      const sovItem = await ScheduleOfValues.create({
        jobId: job2._id,
        projectId: project._id,
        lineNumber: String(job2SOVItems.length + 1),
        description: item.description,
        systemId: item.system._id,
        areaId: item.area._id,
        phaseId: item.phase._id,
        moduleId: item.module._id,
        componentId: item.component._id,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        totalCost: totalCost,
        marginPercent: item.marginPercent,
        marginAmount: marginAmount,
        totalValue: totalValue,
        glCategoryId: glCategory._id,
        glAccountItemId: glAccount._id,
        costCodeNumber: costCodeNumber,
        costCodeName: costCodeName,
        notes: '',
        status: 'in_progress'
      });
      job2SOVItems.push(sovItem);
    }
    console.log('✅ Schedule of Values line items created');

    // Create AP Register entries (invoices) spanning 5 months
    console.log('\n📄 Creating AP Register entries...');
    const vendors = [
      { name: 'Insulation Supply Co', vendorNumber: 'V001', phone: '555-1001', email: 'sales@insulation.com' },
      { name: 'Metal Fabricators Inc', vendorNumber: 'V002', phone: '555-1002', email: 'orders@metalfab.com' },
      { name: 'Equipment Rentals LLC', vendorNumber: 'V003', phone: '555-1003', email: 'rentals@equip.com' }
    ];

    const apEntries = [];
    const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05'];
    
    for (let monthIdx = 0; monthIdx < months.length; monthIdx++) {
      const month = months[monthIdx];
      const invoiceDate = new Date(`${month}-15`);
      const dueDate = new Date(`${month}-30`);
      const receivedDate = new Date(`${month}-10`);

      // Job 1 invoices
      for (let i = 0; i < 2; i++) {
        const vendor = vendors[i % vendors.length];
        const sovItem = job1SOVItems[i % job1SOVItems.length];
        const invoiceAmount = sovItem.totalCost * (0.3 + Math.random() * 0.2); // 30-50% of SOV item cost
        const taxAmount = invoiceAmount * 0.13; // 13% tax
        const totalAmount = invoiceAmount + taxAmount;

        const invoiceType = i === 0 ? 'material' : 'subcontractor';
        const category = i === 0 ? 'insulation_materials' : 'labor_subcontract';
        const finalInvoiceAmount = Math.round(invoiceAmount * 100) / 100;
        const finalTaxAmount = Math.round(taxAmount * 100) / 100;
        const finalTotalAmount = Math.round(totalAmount * 100) / 100;
        
        const apEntry = await APRegister.create({
          invoiceNumber: `INV-${month.replace('-', '')}-${String(i + 1).padStart(3, '0')}`,
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          receivedDate: receivedDate,
          vendor: {
            name: vendor.name,
            vendorNumber: vendor.vendorNumber,
            phone: vendor.phone,
            email: vendor.email
          },
          invoiceAmount: finalInvoiceAmount,
          taxAmount: finalTaxAmount,
          totalAmount: finalTotalAmount,
          jobId: job1._id,
          projectId: project._id,
          costCodeBreakdown: [{
            costCode: sovItem.costCodeNumber,
            description: sovItem.description,
            amount: finalTotalAmount, // Cost code breakdown must equal totalAmount (including tax)
            scheduleOfValuesId: sovItem._id,
            systemId: sovItem.systemId,
            areaId: sovItem.areaId,
            phaseId: sovItem.phaseId
          }],
          invoiceType: invoiceType,
          category: category,
          enteredBy: projectManager._id,
          paymentStatus: monthIdx < 3 ? 'paid' : 'pending',
          paymentDate: monthIdx < 3 ? new Date(`${month}-25`) : null
        });
        apEntries.push(apEntry);
      }

      // Job 2 invoices
      for (let i = 0; i < 2; i++) {
        const vendor = vendors[(i + 1) % vendors.length];
        const sovItem = job2SOVItems[i % job2SOVItems.length];
        const invoiceAmount = sovItem.totalCost * (0.3 + Math.random() * 0.2);
        const taxAmount = invoiceAmount * 0.13;
        const totalAmount = invoiceAmount + taxAmount;

        const invoiceType = i === 0 ? 'material' : 'subcontractor';
        const category = i === 0 ? 'insulation_materials' : 'labor_subcontract';
        const finalInvoiceAmount = Math.round(invoiceAmount * 100) / 100;
        const finalTaxAmount = Math.round(taxAmount * 100) / 100;
        const finalTotalAmount = Math.round(totalAmount * 100) / 100;
        
        const apEntry = await APRegister.create({
          invoiceNumber: `INV-${month.replace('-', '')}-${String(i + 3).padStart(3, '0')}`,
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          receivedDate: receivedDate,
          vendor: {
            name: vendor.name,
            vendorNumber: vendor.vendorNumber,
            phone: vendor.phone,
            email: vendor.email
          },
          invoiceAmount: finalInvoiceAmount,
          taxAmount: finalTaxAmount,
          totalAmount: finalTotalAmount,
          jobId: job2._id,
          projectId: project._id,
          costCodeBreakdown: [{
            costCode: sovItem.costCodeNumber,
            description: sovItem.description,
            amount: finalTotalAmount, // Cost code breakdown must equal totalAmount (including tax)
            scheduleOfValuesId: sovItem._id,
            systemId: sovItem.systemId,
            areaId: sovItem.areaId,
            phaseId: sovItem.phaseId
          }],
          invoiceType: invoiceType,
          category: category,
          enteredBy: projectManager._id,
          paymentStatus: monthIdx < 3 ? 'paid' : 'pending',
          paymentDate: monthIdx < 3 ? new Date(`${month}-25`) : null
        });
        apEntries.push(apEntry);
      }
    }
    console.log('✅ AP Register entries created');

    // Create Timelog Register entries spanning 5 months
    console.log('\n⏰ Creating Timelog Register entries...');
    const workers = [worker1, worker2];
    const workDaysPerMonth = 20; // Approximate working days per month

    for (let monthIdx = 0; monthIdx < months.length; monthIdx++) {
      const month = months[monthIdx];
      const monthStart = new Date(`${month}-01`);
      const monthEnd = new Date(`${month}-28`);
      const payPeriodStart = new Date(`${month}-01`);
      const payPeriodEnd = new Date(`${month}-15`);

      // Job 1 time entries
      for (let day = 1; day <= workDaysPerMonth; day += Math.floor(Math.random() * 3) + 1) {
        const workDate = new Date(`${month}-${String(day).padStart(2, '0')}`);
        if (workDate > monthEnd) break;

        const worker = workers[day % workers.length];
        const sovItem = job1SOVItems[day % job1SOVItems.length];
        const regularHours = 7 + Math.random() * 1; // 7-8 hours
        const overtimeHours = Math.random() > 0.7 ? Math.random() * 2 : 0; // 30% chance of OT
        const totalHours = regularHours + overtimeHours;

        await TimelogRegister.create({
          workerId: worker._id,
          jobId: job1._id,
          projectId: project._id,
          workDate: workDate,
          payPeriodStart: payPeriodStart,
          payPeriodEnd: payPeriodEnd,
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          doubleTimeHours: 0,
          totalHours: Math.round(totalHours * 100) / 100,
          costCode: sovItem.costCodeNumber,
          costCodeDescription: sovItem.description,
          scheduleOfValuesId: sovItem._id,
          systemId: sovItem.systemId,
          areaId: sovItem.areaId,
          phaseId: sovItem.phaseId,
          moduleId: sovItem.moduleId,
          componentId: sovItem.componentId,
          workDescription: `Installation work on ${sovItem.description}`,
          craft: 'insulation',
          tradeLevel: 'journeyman',
          baseHourlyRate: 35.00,
          overtimeRate: 52.50,
          doubleTimeRate: 70.00
        });
      }

      // Job 2 time entries
      for (let day = 1; day <= workDaysPerMonth; day += Math.floor(Math.random() * 3) + 1) {
        const workDate = new Date(`${month}-${String(day).padStart(2, '0')}`);
        if (workDate > monthEnd) break;

        const worker = workers[(day + 1) % workers.length];
        const sovItem = job2SOVItems[day % job2SOVItems.length];
        const regularHours = 7 + Math.random() * 1;
        const overtimeHours = Math.random() > 0.7 ? Math.random() * 2 : 0;
        const totalHours = regularHours + overtimeHours;

        await TimelogRegister.create({
          workerId: worker._id,
          jobId: job2._id,
          projectId: project._id,
          workDate: workDate,
          payPeriodStart: payPeriodStart,
          payPeriodEnd: payPeriodEnd,
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          doubleTimeHours: 0,
          totalHours: Math.round(totalHours * 100) / 100,
          costCode: sovItem.costCodeNumber,
          costCodeDescription: sovItem.description,
          scheduleOfValuesId: sovItem._id,
          systemId: sovItem.systemId,
          areaId: sovItem.areaId,
          phaseId: sovItem.phaseId,
          moduleId: sovItem.moduleId,
          componentId: sovItem.componentId,
          workDescription: `Installation work on ${sovItem.description}`,
          craft: 'insulation',
          tradeLevel: 'journeyman',
          baseHourlyRate: 35.00,
          overtimeRate: 52.50,
          doubleTimeRate: 70.00
        });
      }
    }
    console.log('✅ Timelog Register entries created');

    // Create Progress Reports (one per month for 5 months)
    console.log('\n📊 Creating Progress Reports...');
    const progressPercentages = [
      [10, 15, 12, 8, 5, 10, 8, 5], // Month 1 - Job 1
      [25, 30, 28, 20, 15, 25, 20, 15], // Month 2 - Job 1
      [45, 50, 48, 35, 30, 45, 35, 30], // Month 3 - Job 1
      [70, 75, 72, 55, 50, 70, 55, 50], // Month 4 - Job 1
      [95, 100, 98, 80, 75, 95, 80, 75], // Month 5 - Job 1
    ];

    const progressPercentages2 = [
      [0, 0, 0, 0, 0, 0, 0], // Month 1 - Job 2 (starts month 2)
      [8, 12, 10, 5, 8, 10, 8], // Month 2 - Job 2
      [20, 28, 25, 15, 20, 25, 20], // Month 3 - Job 2
      [40, 55, 50, 35, 40, 50, 40], // Month 4 - Job 2
      [65, 85, 80, 60, 65, 80, 65], // Month 5 - Job 2
    ];

    for (let monthIdx = 0; monthIdx < months.length; monthIdx++) {
      const month = months[monthIdx];
      const reportDate = new Date(`${month}-28`);
      const reportPeriodStart = new Date(`${month}-01`);
      const reportPeriodEnd = new Date(`${month}-28`);

      // Job 1 Progress Report
      const reportNumber1 = `PR-${job1.jobNumber}-${month.replace('-', '')}`;
      const lineItems1 = job1SOVItems.map((sovItem, idx) => {
        const currentProgress = progressPercentages[monthIdx][idx] || 0;
        const previousProgress = monthIdx > 0 ? progressPercentages[monthIdx - 1][idx] || 0 : 0;
        const progressThisPeriod = Math.max(0, currentProgress - previousProgress);
        const valueEarned = (sovItem.totalValue * currentProgress) / 100;
        const valueThisPeriod = (sovItem.totalValue * progressThisPeriod) / 100;

        return {
          scheduleOfValuesId: sovItem._id,
          lineNumber: sovItem.lineNumber,
          costCode: sovItem.costCodeNumber,
          description: sovItem.description,
          totalContractValue: sovItem.totalValue,
          previousProgress: previousProgress,
          currentProgress: currentProgress,
          progressThisPeriod: progressThisPeriod,
          valueEarned: Math.round(valueEarned * 100) / 100,
          valueThisPeriod: Math.round(valueThisPeriod * 100) / 100,
          quantityComplete: (sovItem.quantity * currentProgress) / 100,
          quantityThisPeriod: (sovItem.quantity * progressThisPeriod) / 100
        };
      });

      const totalValueEarned1 = lineItems1.reduce((sum, item) => sum + item.valueEarned, 0);
      const totalValueThisPeriod1 = lineItems1.reduce((sum, item) => sum + item.valueThisPeriod, 0);
      const overallProgress1 = (totalValueEarned1 / job1.contractValue) * 100;

      await ProgressReport.create({
        reportNumber: reportNumber1,
        reportDate: reportDate,
        reportPeriodStart: reportPeriodStart,
        reportPeriodEnd: reportPeriodEnd,
        jobId: job1._id,
        projectId: project._id,
        lineItems: lineItems1,
        totalContractValue: job1.contractValue,
        totalValueEarned: Math.round(totalValueEarned1 * 100) / 100,
        totalValueThisPeriod: Math.round(totalValueThisPeriod1 * 100) / 100,
        overallProgress: Math.round(overallProgress1 * 100) / 100,
        status: 'submitted',
        preparedBy: projectManager._id
      });

      // Job 2 Progress Report
      if (monthIdx > 0) { // Job 2 starts in month 2
        const reportNumber2 = `PR-${job2.jobNumber}-${month.replace('-', '')}`;
        const lineItems2 = job2SOVItems.map((sovItem, idx) => {
          const currentProgress = progressPercentages2[monthIdx][idx] || 0;
          const previousProgress = monthIdx > 1 ? progressPercentages2[monthIdx - 1][idx] || 0 : 0;
          const progressThisPeriod = Math.max(0, currentProgress - previousProgress);
          const valueEarned = (sovItem.totalValue * currentProgress) / 100;
          const valueThisPeriod = (sovItem.totalValue * progressThisPeriod) / 100;

          return {
            scheduleOfValuesId: sovItem._id,
            lineNumber: sovItem.lineNumber,
            costCode: sovItem.costCodeNumber,
            description: sovItem.description,
            totalContractValue: sovItem.totalValue,
            previousProgress: previousProgress,
            currentProgress: currentProgress,
            progressThisPeriod: progressThisPeriod,
            valueEarned: Math.round(valueEarned * 100) / 100,
            valueThisPeriod: Math.round(valueThisPeriod * 100) / 100,
            quantityComplete: (sovItem.quantity * currentProgress) / 100,
            quantityThisPeriod: (sovItem.quantity * progressThisPeriod) / 100
          };
        });

        const totalValueEarned2 = lineItems2.reduce((sum, item) => sum + item.valueEarned, 0);
        const totalValueThisPeriod2 = lineItems2.reduce((sum, item) => sum + item.valueThisPeriod, 0);
        const overallProgress2 = (totalValueEarned2 / job2.contractValue) * 100;

        await ProgressReport.create({
          reportNumber: reportNumber2,
          reportDate: reportDate,
          reportPeriodStart: reportPeriodStart,
          reportPeriodEnd: reportPeriodEnd,
          jobId: job2._id,
          projectId: project._id,
          lineItems: lineItems2,
          totalContractValue: job2.contractValue,
          totalValueEarned: Math.round(totalValueEarned2 * 100) / 100,
          totalValueThisPeriod: Math.round(totalValueThisPeriod2 * 100) / 100,
          overallProgress: Math.round(overallProgress2 * 100) / 100,
          status: 'submitted',
          preparedBy: projectManager._id
        });
      }
    }
    console.log('✅ Progress Reports created');

    console.log('\n✅ Data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - 1 Project: ${project.name}`);
    console.log(`   - 2 Jobs: ${job1.name}, ${job2.name}`);
    console.log(`   - ${job1SOVItems.length + job2SOVItems.length} SOV Line Items`);
    console.log(`   - ${apEntries.length} AP Register entries`);
    console.log(`   - Progress Reports: 5 for Job 1, 4 for Job 2`);
    console.log(`   - Time entries spanning 5 months`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the seeding script
seedCompleteData()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });

