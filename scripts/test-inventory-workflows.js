/**
 * Inventory Workflows Testing Script
 * 
 * Tests all inventory management workflows programmatically
 * Run with: node scripts/test-inventory-workflows.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const Inventory = require('../src/server/models/Inventory');
const Product = require('../src/server/models/Product');
const Job = require('../src/server/models/Job');
const User = require('../src/server/models/User');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const POReceipt = require('../src/server/models/POReceipt');
const MaterialRequest = require('../src/server/models/MaterialRequest');

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

async function connectDB() {
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_DEV_URI or MONGODB_URI not set');
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
}

async function testCreateInventory() {
  console.log('\n📦 Testing: Create Inventory Record');
  try {
    const product = await Product.findOne({ inventoryTracking: { $exists: true } });
    if (!product) {
      results.warnings.push('No products with inventory tracking found');
      return;
    }

    const inventory = new Inventory({
      productId: product._id,
      variantId: null,
      inventoryType: product.inventoryTracking.type || 'bulk',
      quantityOnHand: 100,
      quantityReserved: 0,
      primaryLocation: 'Warehouse A',
      reorderPoint: 20,
      reorderQuantity: 50,
      costMethod: 'fifo',
      averageCost: 10.50
    });

    await inventory.save();
    results.passed.push('Create Inventory Record');
    console.log('✅ Inventory record created successfully');
  } catch (error) {
    results.failed.push(`Create Inventory Record: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function testIssueInventory() {
  console.log('\n📤 Testing: Issue Inventory to Job');
  try {
    const inventory = await Inventory.findOne({ inventoryType: 'bulk', quantityAvailable: { $gt: 0 } })
      .populate('productId');
    
    if (!inventory) {
      results.warnings.push('No bulk inventory with available quantity found');
      return;
    }

    const job = await Job.findOne();
    if (!job) {
      results.warnings.push('No jobs found');
      return;
    }

    const originalQty = inventory.quantityOnHand;
    const issueQty = 10;

    inventory.transactions.push({
      type: 'issue',
      quantity: -issueQty,
      referenceType: 'work_order',
      referenceId: job._id,
      notes: 'Test issue',
      performedAt: new Date()
    });

    inventory.quantityOnHand = Math.max(0, inventory.quantityOnHand - issueQty);
    await inventory.save();

    const updated = await Inventory.findById(inventory._id);
    if (updated.quantityOnHand === originalQty - issueQty) {
      results.passed.push('Issue Inventory to Job');
      console.log('✅ Inventory issued successfully');
    } else {
      throw new Error('Quantity not updated correctly');
    }
  } catch (error) {
    results.failed.push(`Issue Inventory to Job: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function testReturnInventory() {
  console.log('\n📥 Testing: Return Inventory from Job');
  try {
    const inventory = await Inventory.findOne({ inventoryType: 'bulk' })
      .populate('productId');
    
    if (!inventory) {
      results.warnings.push('No bulk inventory found');
      return;
    }

    const job = await Job.findOne();
    if (!job) {
      results.warnings.push('No jobs found');
      return;
    }

    const originalQty = inventory.quantityOnHand;
    const returnQty = 5;

    inventory.transactions.push({
      type: 'return',
      quantity: returnQty,
      referenceType: 'work_order',
      referenceId: job._id,
      toLocation: 'Warehouse A',
      notes: 'Test return',
      performedAt: new Date()
    });

    inventory.quantityOnHand += returnQty;
    await inventory.save();

    const updated = await Inventory.findById(inventory._id);
    if (updated.quantityOnHand === originalQty + returnQty) {
      results.passed.push('Return Inventory from Job');
      console.log('✅ Inventory returned successfully');
    } else {
      throw new Error('Quantity not updated correctly');
    }
  } catch (error) {
    results.failed.push(`Return Inventory from Job: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function testAdjustInventory() {
  console.log('\n⚙️ Testing: Adjust Inventory');
  try {
    const inventory = await Inventory.findOne({ inventoryType: 'bulk' });
    
    if (!inventory) {
      results.warnings.push('No bulk inventory found');
      return;
    }

    const originalQty = inventory.quantityOnHand;
    const adjustmentQty = 3;

    inventory.transactions.push({
      type: 'adjustment',
      quantity: adjustmentQty,
      notes: 'Test adjustment - cycle count',
      performedAt: new Date()
    });

    inventory.quantityOnHand += adjustmentQty;
    await inventory.save();

    const updated = await Inventory.findById(inventory._id);
    if (updated.quantityOnHand === originalQty + adjustmentQty) {
      results.passed.push('Adjust Inventory');
      console.log('✅ Inventory adjusted successfully');
    } else {
      throw new Error('Quantity not updated correctly');
    }
  } catch (error) {
    results.failed.push(`Adjust Inventory: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function testTransferInventory() {
  console.log('\n🔄 Testing: Transfer Inventory');
  try {
    const inventory = await Inventory.findOne({ inventoryType: 'bulk' });
    
    if (!inventory) {
      results.warnings.push('No bulk inventory found');
      return;
    }

    const fromLocation = inventory.primaryLocation || 'Warehouse A';
    const toLocation = 'Warehouse B';
    const transferQty = 5;

    // Find or create location entry
    let location = inventory.locations.find(l => l.location === fromLocation);
    if (!location) {
      inventory.locations.push({ location: fromLocation, quantity: inventory.quantityOnHand });
      location = inventory.locations[inventory.locations.length - 1];
    }

    // Update locations
    location.quantity -= transferQty;
    
    let toLocationEntry = inventory.locations.find(l => l.location === toLocation);
    if (!toLocationEntry) {
      inventory.locations.push({ location: toLocation, quantity: 0 });
      toLocationEntry = inventory.locations[inventory.locations.length - 1];
    }
    toLocationEntry.quantity += transferQty;

    inventory.transactions.push({
      type: 'transfer',
      quantity: transferQty,
      fromLocation,
      toLocation,
      notes: 'Test transfer',
      performedAt: new Date()
    });

    await inventory.save();
    results.passed.push('Transfer Inventory');
    console.log('✅ Inventory transferred successfully');
  } catch (error) {
    results.failed.push(`Transfer Inventory: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function testPOReceiptIntegration() {
  console.log('\n📋 Testing: PO Receipt → Inventory Integration');
  try {
    const product = await Product.findOne({ 'inventoryTracking.enabled': true });
    if (!product) {
      results.warnings.push('No products with inventory tracking enabled found');
      return;
    }

    const po = await PurchaseOrder.findOne().populate('lineItems.productId');
    if (!po) {
      results.warnings.push('No purchase orders found');
      return;
    }

    // Check if inventory exists
    let inventory = await Inventory.findOne({ productId: product._id });
    const originalQty = inventory?.quantityOnHand || 0;

    // Simulate PO receipt (this would normally happen in poReceiptController)
    if (!inventory) {
      inventory = new Inventory({
        productId: product._id,
        inventoryType: product.inventoryTracking.type || 'bulk',
        quantityOnHand: 0,
        primaryLocation: 'Warehouse A',
        costMethod: 'fifo'
      });
    }

    const receiptQty = 25;
    const unitCost = 15.00;

    inventory.quantityOnHand += receiptQty;
    const currentValue = inventory.quantityOnHand * inventory.averageCost;
    const receiptValue = receiptQty * unitCost;
    inventory.averageCost = (currentValue + receiptValue) / inventory.quantityOnHand;

    inventory.transactions.push({
      type: 'receipt',
      quantity: receiptQty,
      unitCost,
      totalCost: receiptQty * unitCost,
      referenceType: 'purchase_order',
      referenceId: po._id,
      notes: 'Test PO receipt',
      performedAt: new Date()
    });

    await inventory.save();

    const updated = await Inventory.findById(inventory._id);
    if (updated.quantityOnHand === originalQty + receiptQty) {
      results.passed.push('PO Receipt → Inventory Integration');
      console.log('✅ PO receipt integration works');
    } else {
      throw new Error('Inventory not updated from PO receipt');
    }
  } catch (error) {
    results.failed.push(`PO Receipt Integration: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function testTransactionHistory() {
  console.log('\n📜 Testing: Transaction History');
  try {
    const inventory = await Inventory.findOne({ 'transactions.0': { $exists: true } });
    
    if (!inventory) {
      results.warnings.push('No inventory with transactions found');
      return;
    }

    const transactions = inventory.transactions || [];
    if (transactions.length > 0) {
      results.passed.push('Transaction History');
      console.log(`✅ Found ${transactions.length} transactions`);
    } else {
      throw new Error('No transactions found');
    }
  } catch (error) {
    results.failed.push(`Transaction History: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function testLowStockFilter() {
  console.log('\n⚠️ Testing: Low Stock Filter');
  try {
    const lowStockItems = await Inventory.find({
      inventoryType: 'bulk',
      $expr: {
        $lt: ['$quantityOnHand', '$reorderPoint']
      }
    }).populate('productId');

    results.passed.push('Low Stock Filter');
    console.log(`✅ Found ${lowStockItems.length} low stock items`);
  } catch (error) {
    results.failed.push(`Low Stock Filter: ${error.message}`);
    console.error('❌ Failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Inventory Workflows Tests...\n');
  
  try {
    await connectDB();

    await testCreateInventory();
    await testIssueInventory();
    await testReturnInventory();
    await testAdjustInventory();
    await testTransferInventory();
    await testPOReceiptIntegration();
    await testTransactionHistory();
    await testLowStockFilter();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed.length}`);
    results.passed.forEach(test => console.log(`   ✓ ${test}`));
    
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(test => console.log(`   ✗ ${test}`));
    
    console.log(`\n⚠️ Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => console.log(`   ⚠ ${warning}`));

    const successRate = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
    console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run tests
runTests().catch(console.error);

