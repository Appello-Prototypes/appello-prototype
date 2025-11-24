/**
 * Sync Development Database to Production Database
 * 
 * ⚠️  WARNING: This script copies data FROM development TO production.
 * This will OVERWRITE production data with development data.
 * 
 * Usage: node scripts/sync-dev-to-prod.js [--dry-run]
 *   --dry-run: Show what would be copied without actually copying
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
const CostToCompleteForecast = require('../src/server/models/CostToCompleteForecast');

async function copyCollection(sourceConn, targetConn, collectionName, clearFirst = true, dryRun = false) {
  const sourceCollection = sourceConn.db.collection(collectionName);
  const targetCollection = targetConn.db.collection(collectionName);
  
  // Get document count
  const count = await sourceCollection.countDocuments();
  
  if (count === 0) {
    console.log(`   ⚠️  Collection is empty, skipping`);
    return { copied: 0, skipped: 0 };
  }
  
  console.log(`   📊 Found ${count} documents`);
  
  if (dryRun) {
    console.log(`   🔍 DRY RUN: Would copy ${count} documents`);
    return { copied: 0, skipped: 0 };
  }
  
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
        // Keep _id to maintain relationships
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

async function syncData(sourceUri, targetUri, sourceName, targetName, clearFirst = true, dryRun = false) {
  console.log(`\n🔄 Syncing data from ${sourceName} to ${targetName}...\n`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be modified\n');
  } else {
    if (clearFirst) {
      console.log('⚠️  WARNING: This will OVERWRITE all data in the PRODUCTION database!\n');
    }
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
        const result = await copyCollection(sourceConn, targetConn, collectionName, clearFirst, dryRun);
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
    if (dryRun) {
      console.log(`   🔍 DRY RUN: Would copy documents (not actually copied)`);
    } else {
      console.log(`   📄 Documents copied: ${results.copied}`);
    }
    console.log(`   ⏭️  Documents skipped: ${results.skipped}`);
    
    if (results.errors.length > 0) {
      console.log(`   ❌ Errors: ${results.errors.length}`);
      results.errors.forEach(err => {
        console.log(`      - ${err.collection}: ${err.error}`);
      });
    }

    if (dryRun) {
      console.log(`\n🔍 DRY RUN complete - No data was modified\n`);
    } else {
      console.log(`\n✅ Data sync complete!\n`);
    }

  } finally {
    // Close connections
    await sourceConn.close();
    await targetConn.close();
    console.log('🔌 Connections closed');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const clearFirst = !args.includes('--keep-existing');

  const devUri = process.env.MONGODB_DEV_URI;
  const prodUri = process.env.MONGODB_URI;

  if (!devUri) {
    console.error('❌ MONGODB_DEV_URI not set');
    process.exit(1);
  }

  if (!prodUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  // Safety check - verify we're copying FROM dev TO prod
  if (!devUri.includes('appello-tasks-dev')) {
    console.error('❌ MONGODB_DEV_URI does not point to development database (appello-tasks-dev)');
    process.exit(1);
  }

  if (!prodUri.includes('appello-tasks-prod')) {
    console.error('❌ MONGODB_URI does not point to production database (appello-tasks-prod)');
    process.exit(1);
  }

  console.log('\n🔍 Database Verification:');
  console.log(`   Development (source): ${devUri.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown'}`);
  console.log(`   Production (target): ${prodUri.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown'}`);
  
  if (!dryRun) {
    console.log('\n⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️');
    console.log('   This will OVERWRITE production data with development data!');
    console.log('   All existing production data will be LOST!');
    if (clearFirst) {
      console.log('   Production collections will be CLEARED before copying.\n');
    } else {
      console.log('   Existing production data will be MERGED (may cause duplicates).\n');
    }
    console.log('   Press Ctrl+C within 10 seconds to cancel...\n');
    
    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  await syncData(devUri, prodUri, 'Development', 'Production', clearFirst, dryRun);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { syncData };






