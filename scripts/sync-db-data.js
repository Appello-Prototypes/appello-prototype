/**
 * Database Data Sync Script
 * 
 * Copies all data from production database to development database
 * This ensures both databases have the same data for consistent development
 * 
 * Usage: node scripts/sync-db-data.js [--clear-first]
 *   --clear-first: Clear dev database before copying (default: true)
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import all models to register their schemas
const User = require('../src/server/models/User');
const Task = require('../src/server/models/Task');
const Project = require('../src/server/models/Project');
const Job = require('../src/server/models/Job');
const TimeEntry = require('../src/server/models/TimeEntry');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const ProgressReport = require('../src/server/models/ProgressReport');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');
const Module = require('../src/server/models/Module');
const Component = require('../src/server/models/Component');

// Map collection names to models for proper handling
const modelMap = {
  users: User,
  tasks: Task,
  projects: Project,
  jobs: Job,
  timeentries: TimeEntry,
  scheduleofvalues: ScheduleOfValues,
  progressreports: ProgressReport,
  apregisters: APRegister,
  timelogregisters: TimelogRegister,
  systems: System,
  areas: Area,
  phases: Phase,
  modules: Module,
  components: Component,
};

async function copyCollection(sourceConn, targetConn, collectionName, clearFirst = true) {
  const sourceCollection = sourceConn.db.collection(collectionName);
  const targetCollection = targetConn.db.collection(collectionName);
  
  // Get document count
  const count = await sourceCollection.countDocuments();
  
  if (count === 0) {
    console.log(`   ⚠️  Collection is empty, skipping`);
    return { copied: 0, skipped: 0 };
  }
  
  console.log(`   📊 Found ${count} documents`);
  
  // Clear target collection if requested
  if (clearFirst) {
    const deletedCount = await targetCollection.deleteMany({});
    if (deletedCount.deletedCount > 0) {
      console.log(`   🗑️  Cleared ${deletedCount.deletedCount} existing documents`);
    }
  }
  
  // Copy documents in batches
  const batchSize = 1000;
  let copied = 0;
  let cursor = sourceCollection.find({}).batchSize(batchSize);
  
  while (await cursor.hasNext()) {
    const batch = [];
    let batchCount = 0;
    
    // Collect a batch
    while (batchCount < batchSize && await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc) {
        // Remove _id to let MongoDB generate new ones (or keep if you want exact copies)
        // For now, we'll keep _id to maintain relationships
        batch.push(doc);
        batchCount++;
      }
    }
    
    if (batch.length > 0) {
      await targetCollection.insertMany(batch, { ordered: false });
      copied += batch.length;
      process.stdout.write(`   ⏳ Copied ${copied}/${count} documents...\r`);
    }
  }
  
  console.log(`   ✅ Copied ${copied} documents`);
  
  return { copied, skipped: 0 };
}

async function syncData(sourceUri, targetUri, sourceName, targetName, clearFirst = true) {
  console.log(`\n🔄 Syncing data from ${sourceName} to ${targetName}...\n`);
  
  if (clearFirst) {
    console.log('⚠️  WARNING: This will clear all data in the development database!\n');
  }

  // Connect to source database
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  console.log(`✅ Connected to ${sourceName}`);

  // Connect to target database
  const targetConn = await mongoose.createConnection(targetUri).asPromise();
  console.log(`✅ Connected to ${targetName}`);

  try {
    // Get all collections from source
    const collections = await sourceConn.db.listCollections().toArray();
    console.log(`\n📋 Found ${collections.length} collections to sync\n`);

    const results = {
      total: 0,
      copied: 0,
      skipped: 0,
      errors: []
    };

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        continue;
      }

      console.log(`\n📦 Syncing collection: ${collectionName}`);
      
      try {
        const result = await copyCollection(sourceConn, targetConn, collectionName, clearFirst);
        results.copied += result.copied;
        results.skipped += result.skipped;
        results.total++;
      } catch (error) {
        console.error(`   ❌ Error copying collection: ${error.message}`);
        results.errors.push({ collection: collectionName, error: error.message });
      }
    }

    // Summary
    console.log(`\n\n📊 Sync Summary:`);
    console.log(`   ✅ Collections processed: ${results.total}`);
    console.log(`   📄 Documents copied: ${results.copied}`);
    console.log(`   ⏭️  Documents skipped: ${results.skipped}`);
    
    if (results.errors.length > 0) {
      console.log(`   ❌ Errors: ${results.errors.length}`);
      results.errors.forEach(err => {
        console.log(`      - ${err.collection}: ${err.error}`);
      });
    }

    console.log(`\n✅ Data sync complete!\n`);

  } finally {
    // Close connections
    await sourceConn.close();
    await targetConn.close();
    console.log('🔌 Connections closed');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const clearFirst = !args.includes('--keep-existing');

  const prodUri = process.env.MONGODB_URI;
  const devUri = process.env.MONGODB_DEV_URI;

  if (!prodUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  if (!devUri) {
    console.error('❌ MONGODB_DEV_URI not set');
    process.exit(1);
  }

  // Safety check - verify we're copying FROM prod TO dev
  if (!prodUri.includes('appello-tasks-prod')) {
    console.error('❌ MONGODB_URI does not point to production database (appello-tasks-prod)');
    process.exit(1);
  }

  if (!devUri.includes('appello-tasks-dev')) {
    console.error('❌ MONGODB_DEV_URI does not point to development database (appello-tasks-dev)');
    process.exit(1);
  }

  console.log('\n🔍 Database Verification:');
  console.log(`   Production: ${prodUri.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown'}`);
  console.log(`   Development: ${devUri.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown'}`);
  
  if (clearFirst) {
    console.log('\n⚠️  WARNING: This will DELETE all data in the development database!');
    console.log('   Use --keep-existing flag to merge instead of replace.\n');
  }

  await syncData(prodUri, devUri, 'Production', 'Development', clearFirst);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { syncData };

