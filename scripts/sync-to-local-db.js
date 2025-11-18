/**
 * Sync Data to Local MongoDB
 * 
 * Copies all data from Atlas dev database to local MongoDB instance
 * This enables fast local development without network latency
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import all models
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

const LOCAL_URI = process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/appello-tasks-dev';
const ATLAS_URI = process.env.MONGODB_DEV_URI;

if (!ATLAS_URI) {
  console.error('❌ MONGODB_DEV_URI not set');
  process.exit(1);
}

async function copyCollection(sourceConn, targetConn, collectionName) {
  const sourceCollection = sourceConn.db.collection(collectionName);
  const targetCollection = targetConn.db.collection(collectionName);
  
  const count = await sourceCollection.countDocuments();
  if (count === 0) {
    console.log(`   ⚠️  Collection is empty, skipping`);
    return { copied: 0 };
  }
  
  console.log(`   📊 Found ${count} documents`);
  
  // Clear target collection
  const deletedCount = await targetCollection.deleteMany({});
  if (deletedCount.deletedCount > 0) {
    console.log(`   🗑️  Cleared ${deletedCount.deletedCount} existing documents`);
  }
  
  // Copy documents
  const batchSize = 1000;
  let copied = 0;
  const cursor = sourceCollection.find({}).batchSize(batchSize);
  
  while (await cursor.hasNext()) {
    const batch = [];
    let batchCount = 0;
    
    while (batchCount < batchSize && await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc) {
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
  return { copied };
}

async function syncToLocal() {
  console.log('\n🔄 Syncing data from Atlas to Local MongoDB...\n');
  console.log(`   Source: ${ATLAS_URI.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown'}`);
  console.log(`   Target: ${LOCAL_URI.match(/\/\/([^/]+)\/([^?]+)/)?.[2] || LOCAL_URI}\n`);

  const sourceConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Connected to Atlas');

  const targetConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Connected to Local MongoDB\n');

  try {
    const collections = await sourceConn.db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections to sync\n`);

    let totalCopied = 0;
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      if (collectionName.startsWith('system.')) continue;

      console.log(`📦 Syncing collection: ${collectionName}`);
      try {
        const result = await copyCollection(sourceConn, targetConn, collectionName);
        totalCopied += result.copied;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n✅ Sync complete! Copied ${totalCopied} total documents\n`);

  } finally {
    await sourceConn.close();
    await targetConn.close();
    console.log('🔌 Connections closed');
  }
}

if (require.main === module) {
  syncToLocal().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { syncToLocal };

