#!/usr/bin/env node

/**
 * Cleanup Script: Remove All Product Data (Fresh Start)
 * 
 * Deletes all:
 * - Product records (all products)
 * - Discount records (all discounts)
 * - Inventory records (all inventory)
 * - InventoryTransaction records (all inventory transactions)
 * - MaterialRequest records (all material requests)
 * - PurchaseOrder records (all purchase orders)
 * - POReceipt records (all receiving records)
 * - Company records with companyType 'supplier' or 'distributor'
 * 
 * Preserves:
 * - ProductType records (product type configuration)
 * - PropertyDefinition records (property definitions)
 * - Company records with companyType 'customer', 'subcontractor', or 'other'
 * - All other data (jobs, users, etc.)
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Product = require('../src/server/models/Product');
const Discount = require('../src/server/models/Discount');
const Inventory = require('../src/server/models/Inventory');
const InventoryTransaction = require('../src/server/models/InventoryTransaction');
const MaterialRequest = require('../src/server/models/MaterialRequest');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const POReceipt = require('../src/server/models/POReceipt');
const Company = require('../src/server/models/Company');

async function cleanup() {
  try {
    console.log('🧹 Starting cleanup of all product data (fresh start)...\n');

    // Connect to MongoDB (uses dev database for local development)
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }

    // Verify we're using dev database
    const dbName = mongoUri.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown';
    const isProd = dbName.includes('prod');
    
    if (isProd && !process.env.FORCE_PRODUCTION_CLEANUP) {
      console.error('❌ ERROR: This script is attempting to run on PRODUCTION database!');
      console.error(`   Database: ${dbName}`);
      console.error('   To prevent accidental data loss, this script only runs on dev databases.');
      console.error('   If you really want to run this on production, set FORCE_PRODUCTION_CLEANUP=true');
      process.exit(1);
    }

    console.log(`🔌 Connecting to database: ${dbName}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Delete in order (respecting foreign key relationships)
    console.log('Deleting records...\n');

    // 1. Delete Inventory Transactions first (they reference POs, receipts, and products)
    const transactionResult = await InventoryTransaction.deleteMany({});
    console.log(`  ✅ Deleted ${transactionResult.deletedCount} InventoryTransaction records`);

    // 2. Delete PO Receipts (they reference POs and products)
    const receiptResult = await POReceipt.deleteMany({});
    console.log(`  ✅ Deleted ${receiptResult.deletedCount} POReceipt records`);

    // 3. Delete Purchase Orders (they reference products and material requests)
    const poResult = await PurchaseOrder.deleteMany({});
    console.log(`  ✅ Deleted ${poResult.deletedCount} PurchaseOrder records`);

    // 4. Delete Material Requests (they reference products)
    const mrResult = await MaterialRequest.deleteMany({});
    console.log(`  ✅ Deleted ${mrResult.deletedCount} MaterialRequest records`);

    // 5. Delete Inventory records (they reference products)
    const inventoryResult = await Inventory.deleteMany({});
    console.log(`  ✅ Deleted ${inventoryResult.deletedCount} Inventory records`);

    // 6. Delete Discounts (they reference products)
    const discountResult = await Discount.deleteMany({});
    console.log(`  ✅ Deleted ${discountResult.deletedCount} Discount records`);

    // 7. Delete Products (last, as other records reference them)
    const productResult = await Product.deleteMany({});
    console.log(`  ✅ Deleted ${productResult.deletedCount} Product records`);

    // 8. Delete Suppliers and Distributors (companies with companyType 'supplier' or 'distributor')
    const supplierResult = await Company.deleteMany({ companyType: 'supplier' });
    console.log(`  ✅ Deleted ${supplierResult.deletedCount} Supplier records`);
    
    const distributorResult = await Company.deleteMany({ companyType: 'distributor' });
    console.log(`  ✅ Deleted ${distributorResult.deletedCount} Distributor records`);

    console.log('\n✨ Cleanup complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Products: ${productResult.deletedCount}`);
    console.log(`   - Discounts: ${discountResult.deletedCount}`);
    console.log(`   - Inventory: ${inventoryResult.deletedCount}`);
    console.log(`   - InventoryTransactions: ${transactionResult.deletedCount}`);
    console.log(`   - MaterialRequests: ${mrResult.deletedCount}`);
    console.log(`   - PurchaseOrders: ${poResult.deletedCount}`);
    console.log(`   - POReceipts: ${receiptResult.deletedCount}`);
    console.log(`   - Suppliers: ${supplierResult.deletedCount}`);
    console.log(`   - Distributors: ${distributorResult.deletedCount}`);
    console.log('\n✅ All product data has been removed.');
    console.log('✅ ProductTypes and PropertyDefinitions are preserved.');
    console.log('✅ Customers, Subcontractors, and other company types are preserved.');
    console.log('✅ Ready for fresh import!\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run cleanup
cleanup();

