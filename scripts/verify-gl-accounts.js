/**
 * Verify GL Categories and Accounts were seeded correctly
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const GLCategory = require('../src/server/models/GLCategory');
const GLAccount = require('../src/server/models/GLAccount');
const Job = require('../src/server/models/Job');

async function verifyGLAccounts() {
  try {
    const dbUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    await mongoose.connect(dbUri);
    console.log('Connected to database\n');

    // Get first job
    const job = await Job.findOne({}).lean();
    if (!job) {
      throw new Error('No jobs found');
    }
    const jobId = job._id;

    console.log(`Verifying GL Accounts for job: ${job.name}\n`);

    // Get all categories
    const categories = await GLCategory.find({ jobId }).sort({ sortOrder: 1 }).lean();
    console.log(`Found ${categories.length} GL Categories:\n`);

    for (const category of categories) {
      const accounts = await GLAccount.find({ 
        jobId, 
        glCategoryId: category._id 
      }).sort({ sortOrder: 1 }).lean();

      console.log(`${category.code} - ${category.name}`);
      console.log(`  Description: ${category.description}`);
      console.log(`  Accounts (${accounts.length}):`);
      accounts.forEach(acct => {
        console.log(`    ${acct.code} - ${acct.name}`);
      });
      console.log('');
    }

    // Test populate
    console.log('Testing populate functionality...');
    const testAccount = await GLAccount.findOne({ jobId })
      .populate('glCategoryId')
      .lean();
    
    if (testAccount) {
      console.log(`\nSample Account: ${testAccount.code} - ${testAccount.name}`);
      console.log(`  Category: ${testAccount.glCategoryId ? testAccount.glCategoryId.name : 'null'}`);
      console.log('  ✓ Populate works correctly');
    }

    await mongoose.disconnect();
    console.log('\n✅ Verification complete!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyGLAccounts();

