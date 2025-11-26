#!/usr/bin/env node

/**
 * Cleanup Script: Remove Inventory, PO, and Material Request Data
 * 
 * Deletes all:
 * - Inventory records
 * - InventoryTransaction records
 * - PurchaseOrder records
 * - POReceipt records
 * - MaterialRequest records
 * 
 * Preserves:
 * - Jobs
 * - ProductTypes
 * - PropertyDefinitions
 * - Products (product catalogue)
 * - All other data
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Inventory = require('../src/server/models/Inventory');
const InventoryTransaction = require('../src/server/models/InventoryTransaction');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const POReceipt = require('../src/server/models/POReceipt');
const MaterialRequest = require('../src/server/models/MaterialRequest');

async function cleanup() {
  try {
    console.log('🧹 Starting cleanup of Inventory, PO, and Material Request data...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Delete in order (respecting foreign key relationships)
    console.log('Deleting records...\n');

    // 1. Delete Inventory Transactions first (they reference POs and receipts)
    const transactionResult = await InventoryTransaction.deleteMany({});
    console.log(`  ✅ Deleted ${transactionResult.deletedCount} InventoryTransaction records`);

    // 2. Delete PO Receipts (they reference POs)
    const receiptResult = await POReceipt.deleteMany({});
    console.log(`  ✅ Deleted ${receiptResult.deletedCount} POReceipt records`);

    // 3. Delete Purchase Orders
    const poResult = await PurchaseOrder.deleteMany({});
    console.log(`  ✅ Deleted ${poResult.deletedCount} PurchaseOrder records`);

    // 4. Delete Material Requests
    const mrResult = await MaterialRequest.deleteMany({});
    console.log(`  ✅ Deleted ${mrResult.deletedCount} MaterialRequest records`);

    // 5. Delete Inventory records (last, as they might reference products)
    const inventoryResult = await Inventory.deleteMany({});
    console.log(`  ✅ Deleted ${inventoryResult.deletedCount} Inventory records`);

    console.log('\n✨ Cleanup complete!');
    console.log('\n📊 Summary:');
    console.log(`   - InventoryTransactions: ${transactionResult.deletedCount}`);
    console.log(`   - POReceipts: ${receiptResult.deletedCount}`);
    console.log(`   - PurchaseOrders: ${poResult.deletedCount}`);
    console.log(`   - MaterialRequests: ${mrResult.deletedCount}`);
    console.log(`   - Inventory: ${inventoryResult.deletedCount}`);
    console.log('\n✅ All inventory, PO, and material request data has been removed.');
    console.log('✅ Jobs, ProductTypes, PropertyDefinitions, and Products are preserved.\n');

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

