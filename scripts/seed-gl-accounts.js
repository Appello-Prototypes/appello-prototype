/**
 * Seed script for GL Categories and GL Accounts
 * Creates the standard chart of accounts structure for ICI contractors
 * 
 * Usage: node scripts/seed-gl-accounts.js [jobId]
 * If jobId is not provided, will prompt or use first available job
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const GLCategory = require('../src/server/models/GLCategory');
const GLAccount = require('../src/server/models/GLAccount');
const Job = require('../src/server/models/Job');

const glStructure = {
  categories: [
    {
      code: 'MAT',
      name: 'Materials',
      description: 'Material costs for insulation, jacketing, and related supplies',
      sortOrder: 100
    },
    {
      code: 'SUB',
      name: 'Subcontractors',
      description: 'Subcontractor services and labor',
      sortOrder: 200
    },
    {
      code: 'EQUIP',
      name: 'Equipment & Rentals',
      description: 'Equipment rental and tool costs',
      sortOrder: 300
    },
    {
      code: 'LAB',
      name: 'Direct Labour',
      description: 'Direct field labor costs',
      sortOrder: 400
    },
    {
      code: 'OH-SAL',
      name: 'Overhead Salaries & Wages',
      description: 'Overhead staff salaries and wages',
      sortOrder: 500
    },
    {
      code: 'OH-OFF',
      name: 'Office Rent & Utilities',
      description: 'Office facility costs',
      sortOrder: 510
    },
    {
      code: 'OH-INS',
      name: 'Insurance',
      description: 'Company insurance costs',
      sortOrder: 520
    },
    {
      code: 'OH-IT',
      name: 'IT & Software Subscriptions',
      description: 'Technology and software costs',
      sortOrder: 530
    },
    {
      code: 'OH-MKT',
      name: 'Marketing & Business Development',
      description: 'Marketing and business development costs',
      sortOrder: 540
    },
    {
      code: 'OH-VEH',
      name: 'Company Vehicles & Fuel (General Use)',
      description: 'Fleet and vehicle costs',
      sortOrder: 550
    }
  ],
  accounts: [
    // Materials (MAT)
    { code: '201', name: 'Pipe Insulation Materials', categoryCode: 'MAT', sortOrder: 201 },
    { code: '202', name: 'Duct Insulation Materials', categoryCode: 'MAT', sortOrder: 202 },
    { code: '203', name: 'Sheet Metal (Jacketing)', categoryCode: 'MAT', sortOrder: 203 },
    { code: '204', name: 'PVC Cladding Material', categoryCode: 'MAT', sortOrder: 204 },
    { code: '205', name: 'Adhesives, Mastics, Sealants', categoryCode: 'MAT', sortOrder: 205 },
    { code: '206', name: 'Fasteners, Bands, Tapes', categoryCode: 'MAT', sortOrder: 206 },
    { code: '299', name: 'Miscellaneous Materials', categoryCode: 'MAT', sortOrder: 299 },
    
    // Subcontractors (SUB)
    { code: '301', name: 'Insulation Blanket Subcontractors', categoryCode: 'SUB', sortOrder: 301 },
    { code: '302', name: 'General Labour Subcontractors', categoryCode: 'SUB', sortOrder: 302 },
    { code: '303', name: 'Specialty Insulation Subcontractors', categoryCode: 'SUB', sortOrder: 303 },
    { code: '304', name: 'Consultant Subcontractors', categoryCode: 'SUB', sortOrder: 304 },
    
    // Equipment & Rentals (EQUIP)
    { code: '401', name: 'Scaffolding', categoryCode: 'EQUIP', sortOrder: 401 },
    { code: '402', name: 'Lifts & Hoists', categoryCode: 'EQUIP', sortOrder: 402 },
    { code: '403', name: 'Tools & Small Equipment', categoryCode: 'EQUIP', sortOrder: 403 },
    { code: '499', name: 'Misc. Rentals', categoryCode: 'EQUIP', sortOrder: 499 },
    
    // Direct Labour (LAB)
    { code: '101', name: 'Concealed Pipe Insulation Labour', categoryCode: 'LAB', sortOrder: 101 },
    { code: '102', name: 'Exposed Pipe Insulation Labour', categoryCode: 'LAB', sortOrder: 102 },
    { code: '103', name: 'Duct Insulation Labour', categoryCode: 'LAB', sortOrder: 103 },
    { code: '104', name: 'Equipment/Boiler Insulation Labour', categoryCode: 'LAB', sortOrder: 104 },
    
    // Overhead Salaries & Wages (OH-SAL)
    { code: '601', name: 'Executive Salaries', categoryCode: 'OH-SAL', sortOrder: 601 },
    { code: '602', name: 'Project Management Salaries', categoryCode: 'OH-SAL', sortOrder: 602 },
    { code: '603', name: 'Estimating / Precon Salaries', categoryCode: 'OH-SAL', sortOrder: 603 },
    { code: '604', name: 'Administrative & Finance Wages', categoryCode: 'OH-SAL', sortOrder: 604 },
    { code: '605', name: 'Payroll Taxes & Benefits (Overhead Staff)', categoryCode: 'OH-SAL', sortOrder: 605 },
    { code: '699', name: 'Miscellaneous Overhead Wages', categoryCode: 'OH-SAL', sortOrder: 699 },
    
    // Office Rent & Utilities (OH-OFF)
    { code: '611', name: 'Office Rent / Lease', categoryCode: 'OH-OFF', sortOrder: 611 },
    { code: '612', name: 'Office Utilities (Hydro, Gas, Water)', categoryCode: 'OH-OFF', sortOrder: 612 },
    { code: '613', name: 'Internet & Telecom (Office)', categoryCode: 'OH-OFF', sortOrder: 613 },
    { code: '614', name: 'Office Supplies & Consumables', categoryCode: 'OH-OFF', sortOrder: 614 },
    { code: '699-OFF', name: 'Miscellaneous Office Expense', categoryCode: 'OH-OFF', sortOrder: 699 },
    
    // Insurance (OH-INS)
    { code: '621', name: 'General Liability Insurance', categoryCode: 'OH-INS', sortOrder: 621 },
    { code: '622', name: 'Workers Compensation / WSIB', categoryCode: 'OH-INS', sortOrder: 622 },
    { code: '623', name: 'Vehicle & Fleet Insurance', categoryCode: 'OH-INS', sortOrder: 623 },
    { code: '624', name: 'Property / Equipment Insurance', categoryCode: 'OH-INS', sortOrder: 624 },
    { code: '699-INS', name: 'Miscellaneous Insurance', categoryCode: 'OH-INS', sortOrder: 699 },
    
    // IT & Software Subscriptions (OH-IT)
    { code: '631', name: 'ERP / Accounting Software Subscriptions', categoryCode: 'OH-IT', sortOrder: 631 },
    { code: '632', name: 'Estimating & Takeoff Software', categoryCode: 'OH-IT', sortOrder: 632 },
    { code: '633', name: 'Project Management Software', categoryCode: 'OH-IT', sortOrder: 633 },
    { code: '634', name: 'Productivity Tools (Email, Office365, Slack, etc.)', categoryCode: 'OH-IT', sortOrder: 634 },
    { code: '635', name: 'Cloud Hosting & Data Storage', categoryCode: 'OH-IT', sortOrder: 635 },
    { code: '699-IT', name: 'Miscellaneous IT Expenses', categoryCode: 'OH-IT', sortOrder: 699 },
    
    // Marketing & Business Development (OH-MKT)
    { code: '641', name: 'Advertising & Sponsorships', categoryCode: 'OH-MKT', sortOrder: 641 },
    { code: '642', name: 'Website Hosting & Maintenance', categoryCode: 'OH-MKT', sortOrder: 642 },
    { code: '643', name: 'Travel & Entertainment (BD)', categoryCode: 'OH-MKT', sortOrder: 643 },
    { code: '644', name: 'Client Gifts & Events', categoryCode: 'OH-MKT', sortOrder: 644 },
    { code: '645', name: 'Proposal / RFP Costs', categoryCode: 'OH-MKT', sortOrder: 645 },
    { code: '699-MKT', name: 'Miscellaneous Marketing & BD', categoryCode: 'OH-MKT', sortOrder: 699 },
    
    // Company Vehicles & Fuel (OH-VEH)
    { code: '651', name: 'Vehicle Lease Payments', categoryCode: 'OH-VEH', sortOrder: 651 },
    { code: '652', name: 'Fuel & Oil', categoryCode: 'OH-VEH', sortOrder: 652 },
    { code: '653', name: 'Repairs & Maintenance (Fleet)', categoryCode: 'OH-VEH', sortOrder: 653 },
    { code: '654', name: 'Vehicle Licensing & Registration', categoryCode: 'OH-VEH', sortOrder: 654 },
    { code: '655', name: 'GPS / Telematics Subscriptions', categoryCode: 'OH-VEH', sortOrder: 655 },
    { code: '699-VEH', name: 'Miscellaneous Vehicle Costs', categoryCode: 'OH-VEH', sortOrder: 699 }
  ]
};

async function seedGLAccounts() {
  try {
    // Connect to database
    const dbUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!dbUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }

    console.log('Connecting to database...');
    await mongoose.connect(dbUri);
    console.log('Connected to database\n');

    // Get jobId from command line or use first available job
    let jobId = process.argv[2];
    let projectId = null;

    if (!jobId) {
      console.log('No jobId provided, finding first available job...');
      const firstJob = await Job.findOne({}).lean();
      if (!firstJob) {
        throw new Error('No jobs found in database. Please create a job first or provide a jobId.');
      }
      jobId = firstJob._id.toString();
      projectId = firstJob.projectId?.toString() || firstJob.projectId;
      console.log(`Using job: ${firstJob.name} (${jobId})\n`);
    } else {
      const job = await Job.findById(jobId).lean();
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }
      projectId = job.projectId?.toString() || job.projectId;
      console.log(`Using job: ${job.name} (${jobId})\n`);
    }

    // Check if GL Categories already exist for this job
    const existingCategories = await GLCategory.find({ jobId }).countDocuments();
    if (existingCategories > 0) {
      console.log(`Found ${existingCategories} existing GL Categories for this job.`);
      console.log('Deleting existing GL Categories and Accounts to recreate...\n');
      await GLAccount.deleteMany({ jobId });
      await GLCategory.deleteMany({ jobId });
    }

    // Create GL Categories
    console.log('Creating GL Categories...');
    const categoryMap = {};
    const categoriesToCreate = glStructure.categories.map(cat => ({
      ...cat,
      jobId: new mongoose.Types.ObjectId(jobId),
      projectId: projectId ? new mongoose.Types.ObjectId(projectId) : null
    }));

    const createdCategories = await GLCategory.insertMany(categoriesToCreate);
    console.log(`Created ${createdCategories.length} GL Categories\n`);

    // Create a map of category code to category ID
    createdCategories.forEach(cat => {
      categoryMap[cat.code] = cat._id;
    });

    // Create GL Accounts
    console.log('Creating GL Accounts...');
    const accountsToCreate = glStructure.accounts.map(acct => ({
      code: acct.code,
      name: acct.name,
      description: `GL Account ${acct.code}: ${acct.name}`,
      glCategoryId: categoryMap[acct.categoryCode],
      jobId: new mongoose.Types.ObjectId(jobId),
      projectId: projectId ? new mongoose.Types.ObjectId(projectId) : null,
      sortOrder: acct.sortOrder
    }));

    const createdAccounts = await GLAccount.insertMany(accountsToCreate);
    console.log(`Created ${createdAccounts.length} GL Accounts\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('Seed Summary:');
    console.log(`  Job ID: ${jobId}`);
    console.log(`  GL Categories Created: ${createdCategories.length}`);
    console.log(`  GL Accounts Created: ${createdAccounts.length}`);
    console.log('\nCategories:');
    createdCategories.forEach(cat => {
      const accountCount = glStructure.accounts.filter(a => a.categoryCode === cat.code).length;
      console.log(`  ${cat.code} - ${cat.name} (${accountCount} accounts)`);
    });
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\nDisconnected from database');
    console.log('\n✅ GL Accounts seeded successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run seed
seedGLAccounts();

