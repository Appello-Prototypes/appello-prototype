#!/usr/bin/env node

/**
 * Stress Test Script for Inventory, PO, and Material Request System
 * 
 * Tests performance and identifies optimization opportunities:
 * - Large dataset queries
 * - Complex joins and aggregations
 * - Concurrent operations
 * - Index effectiveness
 * - Query performance metrics
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const Product = require('../src/server/models/Product');
const Company = require('../src/server/models/Company');
const User = require('../src/server/models/User');
const MaterialRequest = require('../src/server/models/MaterialRequest');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const Inventory = require('../src/server/models/Inventory');

async function stressTest() {
  try {
    console.log('🧪 Starting Stress Test for Inventory, PO & Material Request System...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const results = {
      queries: [],
      aggregations: [],
      issues: [],
      recommendations: []
    };

    // Test 1: Count all records
    console.log('📊 Test 1: Record Counts');
    const startTime = Date.now();
    const counts = {
      jobs: await Job.countDocuments(),
      products: await Product.countDocuments(),
      suppliers: await Company.countDocuments({ companyType: 'supplier' }),
      materialRequests: await MaterialRequest.countDocuments(),
      purchaseOrders: await PurchaseOrder.countDocuments(),
      inventory: await Inventory.countDocuments()
    };
    const countTime = Date.now() - startTime;
    console.log(`   Jobs: ${counts.jobs}`);
    console.log(`   Products: ${counts.products}`);
    console.log(`   Suppliers: ${counts.suppliers}`);
    console.log(`   Material Requests: ${counts.materialRequests}`);
    console.log(`   Purchase Orders: ${counts.purchaseOrders}`);
    console.log(`   Inventory Records: ${counts.inventory}`);
    console.log(`   ⏱️  Time: ${countTime}ms\n`);
    results.queries.push({ test: 'Count Documents', time: countTime, records: Object.values(counts).reduce((a, b) => a + b, 0) });

    // Test 2: Get Material Requests with populated job and project
    console.log('📋 Test 2: Material Requests with Populated Relations');
    const startTime2 = Date.now();
    const materialRequests = await MaterialRequest.find()
      .populate('jobId', 'name jobNumber')
      .populate('projectId', 'name projectNumber')
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('purchaseOrderId', 'poNumber status')
      .limit(100)
      .lean();
    const populateTime = Date.now() - startTime2;
    console.log(`   Retrieved ${materialRequests.length} material requests`);
    console.log(`   ⏱️  Time: ${populateTime}ms`);
    if (populateTime > 500) {
      results.issues.push('Material Request population is slow (>500ms)');
      results.recommendations.push('Consider adding compound indexes on jobId+status, projectId+status');
    }
    console.log('');

    // Test 3: Get Purchase Orders with populated relations
    console.log('📄 Test 3: Purchase Orders with Populated Relations');
    const startTime3 = Date.now();
    const purchaseOrders = await PurchaseOrder.find()
      .populate('supplierId', 'name')
      .populate('jobId', 'name jobNumber')
      .populate('projectId', 'name projectNumber')
      .populate('buyerId', 'name email')
      .populate('approvedBy', 'name email')
      .populate('materialRequestId', 'requestNumber status')
      .limit(100)
      .lean();
    const poPopulateTime = Date.now() - startTime3;
    console.log(`   Retrieved ${purchaseOrders.length} purchase orders`);
    console.log(`   ⏱️  Time: ${poPopulateTime}ms`);
    if (poPopulateTime > 500) {
      results.issues.push('Purchase Order population is slow (>500ms)');
      results.recommendations.push('Consider adding compound indexes on supplierId+status, jobId+status');
    }
    console.log('');

    // Test 4: Get Inventory with product details
    console.log('📦 Test 4: Inventory Records with Product Details');
    const startTime4 = Date.now();
    const inventoryRecords = await Inventory.find()
      .populate('productId', 'name unitOfMeasure')
      .limit(100)
      .lean();
    const invPopulateTime = Date.now() - startTime4;
    console.log(`   Retrieved ${inventoryRecords.length} inventory records`);
    console.log(`   ⏱️  Time: ${invPopulateTime}ms`);
    if (invPopulateTime > 500) {
      results.issues.push('Inventory population is slow (>500ms)');
      results.recommendations.push('Consider adding index on productId+variantId');
    }
    console.log('');

    // Test 5: Complex aggregation - Material Requests by Status
    console.log('📊 Test 5: Material Requests Aggregation by Status');
    const startTime5 = Date.now();
    const mrByStatus = await MaterialRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalLineItems: { $sum: { $size: '$lineItems' } },
          avgLineItems: { $avg: { $size: '$lineItems' } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    const aggTime = Date.now() - startTime5;
    console.log(`   Status Breakdown:`);
    mrByStatus.forEach(item => {
      console.log(`     ${item._id}: ${item.count} requests, ${item.totalLineItems} total line items, ${item.avgLineItems.toFixed(1)} avg per request`);
    });
    console.log(`   ⏱️  Time: ${aggTime}ms\n`);
    results.aggregations.push({ test: 'MR by Status', time: aggTime });

    // Test 6: Complex aggregation - Purchase Orders by Status with totals
    console.log('📊 Test 6: Purchase Orders Aggregation by Status');
    const startTime6 = Date.now();
    const poByStatus = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' },
          avgValue: { $avg: '$total' },
          totalLineItems: { $sum: { $size: '$lineItems' } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    const poAggTime = Date.now() - startTime6;
    console.log(`   Status Breakdown:`);
    poByStatus.forEach(item => {
      console.log(`     ${item._id}: ${item.count} POs, $${item.totalValue.toFixed(2)} total, $${item.avgValue.toFixed(2)} avg`);
    });
    console.log(`   ⏱️  Time: ${poAggTime}ms\n`);
    results.aggregations.push({ test: 'PO by Status', time: poAggTime });

    // Test 7: Inventory by Type with quantities
    console.log('📊 Test 7: Inventory Aggregation by Type');
    const startTime7 = Date.now();
    const invByType = await Inventory.aggregate([
      {
        $group: {
          _id: '$inventoryType',
          count: { $sum: 1 },
          totalOnHand: { $sum: '$quantityOnHand' },
          totalAvailable: { $sum: '$quantityAvailable' },
          totalReserved: { $sum: '$quantityReserved' },
          avgOnHand: { $avg: '$quantityOnHand' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    const invAggTime = Date.now() - startTime7;
    console.log(`   Type Breakdown:`);
    invByType.forEach(item => {
      console.log(`     ${item._id}: ${item.count} records, ${item.totalOnHand} total on hand, ${item.totalAvailable} available`);
    });
    console.log(`   ⏱️  Time: ${invAggTime}ms\n`);
    results.aggregations.push({ test: 'Inventory by Type', time: invAggTime });

    // Test 8: Material Requests by Job
    console.log('📊 Test 8: Material Requests Grouped by Job');
    const startTime8 = Date.now();
    const mrByJob = await MaterialRequest.aggregate([
      {
        $group: {
          _id: '$jobId',
          count: { $sum: 1 },
          totalLineItems: { $sum: { $size: '$lineItems' } },
          statuses: { $push: '$status' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const mrJobTime = Date.now() - startTime8;
    console.log(`   Top 10 Jobs by Material Request Count:`);
    for (const item of mrByJob) {
      const job = await Job.findById(item._id).select('name jobNumber').lean();
      const statusCounts = item.statuses.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      console.log(`     ${job?.name || 'Unknown'}: ${item.count} requests, ${item.totalLineItems} line items`);
      console.log(`       Statuses: ${Object.entries(statusCounts).map(([s, c]) => `${s}(${c})`).join(', ')}`);
    }
    console.log(`   ⏱️  Time: ${mrJobTime}ms\n`);
    results.aggregations.push({ test: 'MR by Job', time: mrJobTime });
    if (mrJobTime > 1000) {
      results.issues.push('Material Request by Job aggregation is slow (>1000ms)');
      results.recommendations.push('Add index on jobId+status for better performance');
    }

    // Test 9: Purchase Orders by Supplier
    console.log('📊 Test 9: Purchase Orders Grouped by Supplier');
    const startTime9 = Date.now();
    const poBySupplier = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$supplierId',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' },
          avgValue: { $avg: '$total' }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 }
    ]);
    const poSupplierTime = Date.now() - startTime9;
    console.log(`   Top 10 Suppliers by PO Value:`);
    for (const item of poBySupplier) {
      const supplier = await Company.findById(item._id).select('name').lean();
      console.log(`     ${supplier?.name || 'Unknown'}: ${item.count} POs, $${item.totalValue.toFixed(2)} total`);
    }
    console.log(`   ⏱️  Time: ${poSupplierTime}ms\n`);
    results.aggregations.push({ test: 'PO by Supplier', time: poSupplierTime });

    // Test 10: Inventory transactions count
    console.log('📊 Test 10: Inventory Transaction Analysis');
    const startTime10 = Date.now();
    const invWithTransactions = await Inventory.aggregate([
      {
        $project: {
          productId: 1,
          inventoryType: 1,
          transactionCount: { $size: '$transactions' },
          lastTransaction: { $arrayElemAt: ['$transactions', -1] }
        }
      },
      { $match: { transactionCount: { $gt: 0 } } },
      { $sort: { transactionCount: -1 } },
      { $limit: 10 }
    ]);
    const invTransTime = Date.now() - startTime10;
    console.log(`   Top 10 Inventory Items by Transaction Count:`);
    for (const item of invWithTransactions) {
      const product = await Product.findById(item.productId).select('name').lean();
      console.log(`     ${product?.name || 'Unknown'}: ${item.transactionCount} transactions`);
    }
    console.log(`   ⏱️  Time: ${invTransTime}ms\n`);
    results.aggregations.push({ test: 'Inventory Transactions', time: invTransTime });

    // Test 11: Check for missing indexes
    console.log('🔍 Test 11: Index Analysis');
    const indexes = {
      materialRequests: await MaterialRequest.collection.getIndexes(),
      purchaseOrders: await PurchaseOrder.collection.getIndexes(),
      inventory: await Inventory.collection.getIndexes()
    };
    
    console.log(`   Material Request Indexes: ${Object.keys(indexes.materialRequests).length}`);
    Object.keys(indexes.materialRequests).forEach(idx => {
      console.log(`     - ${idx}`);
    });
    
    console.log(`   Purchase Order Indexes: ${Object.keys(indexes.purchaseOrders).length}`);
    Object.keys(indexes.purchaseOrders).forEach(idx => {
      console.log(`     - ${idx}`);
    });
    
    console.log(`   Inventory Indexes: ${Object.keys(indexes.inventory).length}`);
    Object.keys(indexes.inventory).forEach(idx => {
      console.log(`     - ${idx}`);
    });
    console.log('');

    // Check for recommended indexes
    if (!indexes.materialRequests['jobId_1_status_1']) {
      results.recommendations.push('Add compound index on MaterialRequest: {jobId: 1, status: 1}');
    }
    if (!indexes.purchaseOrders['supplierId_1_status_1']) {
      results.recommendations.push('Add compound index on PurchaseOrder: {supplierId: 1, status: 1}');
    }
    if (!indexes.inventory['productId_1_variantId_1']) {
      results.recommendations.push('Add compound index on Inventory: {productId: 1, variantId: 1}');
    }

    // Test 12: Query performance with filters
    console.log('🔍 Test 12: Filtered Queries');
    
    // Material Requests by status
    const startTime12a = Date.now();
    const submittedMRs = await MaterialRequest.find({ status: 'submitted' })
      .populate('jobId', 'name')
      .limit(50)
      .lean();
    const filterTime1 = Date.now() - startTime12a;
    console.log(`   Material Requests (status=submitted): ${submittedMRs.length} found in ${filterTime1}ms`);
    
    // Purchase Orders by status
    const startTime12b = Date.now();
    const sentPOs = await PurchaseOrder.find({ status: 'sent' })
      .populate('supplierId', 'name')
      .limit(50)
      .lean();
    const filterTime2 = Date.now() - startTime12b;
    console.log(`   Purchase Orders (status=sent): ${sentPOs.length} found in ${filterTime2}ms`);
    
    // Inventory by type
    const startTime12c = Date.now();
    const bulkInventory = await Inventory.find({ inventoryType: 'bulk' })
      .populate('productId', 'name')
      .limit(50)
      .lean();
    const filterTime3 = Date.now() - startTime12c;
    console.log(`   Inventory (type=bulk): ${bulkInventory.length} found in ${filterTime3}ms\n`);

    // Summary Report
    console.log('📊 Stress Test Summary');
    console.log('='.repeat(60));
    console.log(`\n⏱️  Performance Metrics:`);
    const avgQueryTime = results.queries.reduce((sum, q) => sum + q.time, 0) / results.queries.length;
    const avgAggTime = results.aggregations.reduce((sum, a) => sum + a.time, 0) / results.aggregations.length;
    console.log(`   Average Query Time: ${avgQueryTime.toFixed(2)}ms`);
    console.log(`   Average Aggregation Time: ${avgAggTime.toFixed(2)}ms`);
    
    const slowQueries = results.queries.filter(q => q.time > 500);
    const slowAggs = results.aggregations.filter(a => a.time > 1000);
    
    if (slowQueries.length > 0) {
      console.log(`\n⚠️  Slow Queries (>500ms): ${slowQueries.length}`);
      slowQueries.forEach(q => {
        console.log(`     - ${q.test}: ${q.time}ms`);
      });
    }
    
    if (slowAggs.length > 0) {
      console.log(`\n⚠️  Slow Aggregations (>1000ms): ${slowAggs.length}`);
      slowAggs.forEach(a => {
        console.log(`     - ${a.test}: ${a.time}ms`);
      });
    }
    
    if (results.issues.length > 0) {
      console.log(`\n⚠️  Issues Found: ${results.issues.length}`);
      results.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
    
    if (results.recommendations.length > 0) {
      console.log(`\n💡 Recommendations: ${results.recommendations.length}`);
      results.recommendations.forEach(rec => {
        console.log(`     - ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Stress test completed!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('\n❌ Error during stress test:', error);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the stress test
if (require.main === module) {
  stressTest();
}

module.exports = stressTest;

