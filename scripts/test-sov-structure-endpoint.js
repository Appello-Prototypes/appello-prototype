/**
 * Test the SOV structure endpoint to verify GL Categories and Accounts are returned
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Job = require('../src/server/models/Job');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const Module = require('../src/server/models/Module');
const Component = require('../src/server/models/Component');
const GLCategory = require('../src/server/models/GLCategory');
const GLAccount = require('../src/server/models/GLAccount');

// Import the controller function directly
const sovController = require('../src/server/controllers/sovController');

async function testSOVStructureEndpoint() {
  try {
    const dbUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    await mongoose.connect(dbUri);
    console.log('Connected to database\n');

    // Get first job
    const job = await Job.findOne({}).lean();
    if (!job) {
      throw new Error('No jobs found');
    }
    const jobId = job._id.toString();

    console.log(`Testing SOV structure endpoint for job: ${job.name} (${jobId})\n`);

    // Simulate the endpoint call
    const req = { params: { jobId } };
    const res = {
      json: (data) => {
        console.log('Endpoint Response:');
        console.log(JSON.stringify(data, null, 2));
        return data;
      },
      status: (code) => ({
        json: (data) => {
          console.error(`Error ${code}:`, JSON.stringify(data, null, 2));
          return data;
        }
      })
    };

    // Call the controller function
    await sovController.getSOVStructure(req, res);

    // Also verify data directly
    console.log('\n' + '='.repeat(60));
    console.log('Direct Database Verification:');
    
    const [systems, areas, phases, modules, components, glCategories, glAccounts] = await Promise.all([
      System.find({ jobId }).countDocuments(),
      Area.find({ jobId }).countDocuments(),
      Phase.find({ jobId }).countDocuments(),
      Module.find({ jobId }).countDocuments(),
      Component.find({ jobId }).countDocuments(),
      GLCategory.find({ jobId }).countDocuments(),
      GLAccount.find({ jobId }).countDocuments()
    ]);

    console.log(`  Systems: ${systems}`);
    console.log(`  Areas: ${areas}`);
    console.log(`  Phases: ${phases}`);
    console.log(`  Modules: ${modules}`);
    console.log(`  Components: ${components}`);
    console.log(`  GL Categories: ${glCategories}`);
    console.log(`  GL Accounts: ${glAccounts}`);

    // Test GL Account filtering by category
    if (glCategories > 0 && glAccounts > 0) {
      const firstCategory = await GLCategory.findOne({ jobId }).lean();
      const accountsInCategory = await GLAccount.find({ 
        jobId, 
        glCategoryId: firstCategory._id 
      }).countDocuments();
      console.log(`\n  Sample: Category "${firstCategory.name}" has ${accountsInCategory} accounts`);
    }

    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('Test error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testSOVStructureEndpoint();

