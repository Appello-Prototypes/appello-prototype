/**
 * Create Database Indexes
 * 
 * Creates all necessary indexes for optimal performance
 * Run this after schema changes or when setting up a new database
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

async function createIndexes() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_DEV_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI or MONGODB_DEV_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  await mongoose.connect(uri);
  console.log('✅ Connected\n');

  try {
    console.log('📦 Creating indexes...\n');

    // User indexes
    console.log('👤 Users...');
    try {
      await User.createIndexes();
      console.log('   ✅ User indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ User indexes already exist');
      } else {
        throw error;
      }
    }

    // Task indexes
    console.log('📋 Tasks...');
    try {
      await Task.createIndexes();
      console.log('   ✅ Task indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Task indexes already exist');
      } else {
        throw error;
      }
    }

    // Project indexes
    console.log('🏗️  Projects...');
    try {
      await Project.createIndexes();
      console.log('   ✅ Project indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Project indexes already exist');
      } else {
        throw error;
      }
    }

    // Job indexes
    console.log('💼 Jobs...');
    try {
      await Job.createIndexes();
      console.log('   ✅ Job indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Job indexes already exist');
      } else {
        throw error;
      }
    }

    // TimeEntry indexes
    console.log('⏰ Time Entries...');
    try {
      await TimeEntry.createIndexes();
      console.log('   ✅ TimeEntry indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ TimeEntry indexes already exist');
      } else {
        throw error;
      }
    }

    // ScheduleOfValues indexes
    console.log('💰 Schedule of Values...');
    try {
      await ScheduleOfValues.createIndexes();
      console.log('   ✅ SOV indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ SOV indexes already exist');
      } else {
        throw error;
      }
    }

    // ProgressReport indexes
    console.log('📊 Progress Reports...');
    try {
      await ProgressReport.createIndexes();
      console.log('   ✅ ProgressReport indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ ProgressReport indexes already exist');
      } else {
        throw error;
      }
    }

    // APRegister indexes
    console.log('📄 AP Register...');
    try {
      await APRegister.createIndexes();
      console.log('   ✅ APRegister indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ APRegister indexes already exist');
      } else {
        throw error;
      }
    }

    // TimelogRegister indexes
    console.log('📝 Timelog Register...');
    try {
      await TimelogRegister.createIndexes();
      console.log('   ✅ TimelogRegister indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ TimelogRegister indexes already exist');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All indexes created successfully!\n');

  } catch (error) {
    console.error('\n❌ Error creating indexes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected\n');
  }
}

if (require.main === module) {
  createIndexes().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createIndexes };
