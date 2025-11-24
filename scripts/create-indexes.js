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
// New models for PO/Material Inventory features
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const ProductType = require('../src/server/models/ProductType');
const MaterialRequest = require('../src/server/models/MaterialRequest');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const POReceipt = require('../src/server/models/POReceipt');
const Inventory = require('../src/server/models/Inventory');
const InventoryTransaction = require('../src/server/models/InventoryTransaction');
const Discount = require('../src/server/models/Discount');
const Specification = require('../src/server/models/Specification');
const SpecificationTemplate = require('../src/server/models/SpecificationTemplate');
const PropertyDefinition = require('../src/server/models/PropertyDefinition');
const UnitOfMeasure = require('../src/server/models/UnitOfMeasure');
const ProductPricing = require('../src/server/models/ProductPricing');

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

    // Company indexes
    console.log('🏢 Companies...');
    try {
      await Company.createIndexes();
      console.log('   ✅ Company indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Company indexes already exist');
      } else {
        throw error;
      }
    }

    // Product indexes
    console.log('📦 Products...');
    try {
      await Product.createIndexes();
      console.log('   ✅ Product indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Product indexes already exist');
      } else {
        throw error;
      }
    }

    // ProductType indexes
    console.log('🏷️  Product Types...');
    try {
      await ProductType.createIndexes();
      console.log('   ✅ ProductType indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ ProductType indexes already exist');
      } else {
        throw error;
      }
    }

    // MaterialRequest indexes
    console.log('📋 Material Requests...');
    try {
      await MaterialRequest.createIndexes();
      console.log('   ✅ MaterialRequest indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ MaterialRequest indexes already exist');
      } else {
        throw error;
      }
    }

    // PurchaseOrder indexes
    console.log('🛒 Purchase Orders...');
    try {
      await PurchaseOrder.createIndexes();
      console.log('   ✅ PurchaseOrder indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ PurchaseOrder indexes already exist');
      } else {
        throw error;
      }
    }

    // POReceipt indexes
    console.log('📥 PO Receipts...');
    try {
      await POReceipt.createIndexes();
      console.log('   ✅ POReceipt indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ POReceipt indexes already exist');
      } else {
        throw error;
      }
    }

    // Inventory indexes
    console.log('📊 Inventory...');
    try {
      await Inventory.createIndexes();
      console.log('   ✅ Inventory indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Inventory indexes already exist');
      } else {
        throw error;
      }
    }

    // InventoryTransaction indexes
    console.log('🔄 Inventory Transactions...');
    try {
      await InventoryTransaction.createIndexes();
      console.log('   ✅ InventoryTransaction indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ InventoryTransaction indexes already exist');
      } else {
        throw error;
      }
    }

    // Discount indexes
    console.log('💰 Discounts...');
    try {
      await Discount.createIndexes();
      console.log('   ✅ Discount indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Discount indexes already exist');
      } else {
        throw error;
      }
    }

    // Specification indexes
    console.log('📋 Specifications...');
    try {
      await Specification.createIndexes();
      console.log('   ✅ Specification indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ Specification indexes already exist');
      } else {
        throw error;
      }
    }

    // SpecificationTemplate indexes
    console.log('📄 Specification Templates...');
    try {
      await SpecificationTemplate.createIndexes();
      console.log('   ✅ SpecificationTemplate indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ SpecificationTemplate indexes already exist');
      } else {
        throw error;
      }
    }

    // PropertyDefinition indexes
    console.log('🔧 Property Definitions...');
    try {
      await PropertyDefinition.createIndexes();
      console.log('   ✅ PropertyDefinition indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ PropertyDefinition indexes already exist');
      } else {
        throw error;
      }
    }

    // UnitOfMeasure indexes
    console.log('📏 Units of Measure...');
    try {
      await UnitOfMeasure.createIndexes();
      console.log('   ✅ UnitOfMeasure indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ UnitOfMeasure indexes already exist');
      } else {
        throw error;
      }
    }

    // ProductPricing indexes
    console.log('💵 Product Pricing...');
    try {
      await ProductPricing.createIndexes();
      console.log('   ✅ ProductPricing indexes created');
    } catch (error) {
      if (error.code === 86 || error.message.includes('existing index')) {
        console.log('   ✓ ProductPricing indexes already exist');
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
