/**
 * Test script for SOV refactor
 * Tests the new schema, endpoints, and data structure
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
// Require all models to register schemas
require('../src/server/models/System');
require('../src/server/models/Area');
require('../src/server/models/Phase');
require('../src/server/models/Module');
require('../src/server/models/Component');
require('../src/server/models/GLCategory');
require('../src/server/models/GLAccount');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const GLCategory = require('../src/server/models/GLCategory');
const GLAccount = require('../src/server/models/GLAccount');

async function testSOVRefactor() {
  try {
    // Connect to database
    const dbUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!dbUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }

    console.log('Connecting to database...');
    await mongoose.connect(dbUri);
    console.log('Connected to database\n');

    // Test 1: Verify migrated SOV items have new fields
    console.log('Test 1: Checking migrated SOV items...');
    const sovItems = await ScheduleOfValues.find({}).limit(5);
    console.log(`Found ${sovItems.length} SOV items to check\n`);

    let allFieldsPresent = true;
    for (const item of sovItems) {
      const fields = {
        unitCost: item.unitCost !== undefined && item.unitCost !== null,
        marginAmount: item.marginAmount !== undefined && item.marginAmount !== null,
        marginPercent: item.marginPercent !== undefined && item.marginPercent !== null,
        costCodeNumber: item.costCodeNumber !== undefined,
        costCodeName: item.costCodeName !== undefined,
        glCategoryId: item.glCategoryId !== undefined,
        glAccountItemId: item.glAccountItemId !== undefined
      };

      console.log(`  Item ${item.lineNumber}:`);
      console.log(`    unitCost: ${fields.unitCost ? '✓' : '✗'} (${item.unitCost})`);
      console.log(`    marginAmount: ${fields.marginAmount ? '✓' : '✗'} (${item.marginAmount})`);
      console.log(`    marginPercent: ${fields.marginPercent ? '✓' : '✗'} (${item.marginPercent})`);
      console.log(`    costCodeNumber: ${fields.costCodeNumber ? '✓' : '✗'} (${item.costCodeNumber || 'null'})`);
      console.log(`    costCodeName: ${fields.costCodeName ? '✓' : '✗'} (${item.costCodeName || 'null'})`);
      console.log(`    glCategoryId: ${fields.glCategoryId ? '✓' : '✗'} (${item.glCategoryId || 'null'})`);
      console.log(`    glAccountItemId: ${fields.glAccountItemId ? '✓' : '✗'} (${item.glAccountItemId || 'null'})`);

      // Verify calculations
      if (item.quantity && item.quantity > 0 && item.totalCost) {
        const expectedUnitCost = item.totalCost / item.quantity;
        const unitCostMatch = Math.abs(item.unitCost - expectedUnitCost) < 0.01;
        console.log(`    Unit cost calculation: ${unitCostMatch ? '✓' : '✗'} (expected: ${expectedUnitCost.toFixed(2)}, got: ${item.unitCost?.toFixed(2)})`);
      }

      if (item.totalValue && item.totalCost !== undefined) {
        const expectedMarginAmount = item.totalValue - item.totalCost;
        const marginAmountMatch = Math.abs((item.marginAmount || 0) - expectedMarginAmount) < 0.01;
        console.log(`    Margin amount calculation: ${marginAmountMatch ? '✓' : '✗'} (expected: ${expectedMarginAmount.toFixed(2)}, got: ${item.marginAmount?.toFixed(2)})`);
      }

      console.log('');

      if (!Object.values(fields).every(v => v)) {
        allFieldsPresent = false;
      }
    }

    // Test 2: Verify GL models exist
    console.log('\nTest 2: Checking GL models...');
    try {
      const glCategories = await GLCategory.find({}).limit(1);
      console.log(`  GLCategory model: ✓ (found ${glCategories.length} categories)`);
    } catch (error) {
      console.log(`  GLCategory model: ✗ (${error.message})`);
    }

    try {
      const glAccounts = await GLAccount.find({}).limit(1);
      console.log(`  GLAccount model: ✓ (found ${glAccounts.length} accounts)`);
    } catch (error) {
      console.log(`  GLAccount model: ✗ (${error.message})`);
    }

    // Test 3: Test populate functionality
    console.log('\nTest 3: Testing populate functionality...');
    const populatedItem = await ScheduleOfValues.findOne({})
      .populate(['systemId', 'areaId', 'phaseId', 'moduleId', 'componentId', 'glCategoryId', 'glAccountItemId'])
      .lean();

    if (populatedItem) {
      console.log('  Populate test: ✓');
      console.log(`    System: ${populatedItem.systemId ? populatedItem.systemId.name : 'null'}`);
      console.log(`    Area: ${populatedItem.areaId ? populatedItem.areaId.name : 'null'}`);
      console.log(`    Phase: ${populatedItem.phaseId ? populatedItem.phaseId.name : 'null'}`);
      console.log(`    Module: ${populatedItem.moduleId ? populatedItem.moduleId.name : 'null'}`);
      console.log(`    Component: ${populatedItem.componentId ? populatedItem.componentId.name : 'null'}`);
      console.log(`    GL Category: ${populatedItem.glCategoryId ? populatedItem.glCategoryId.name : 'null'}`);
      console.log(`    GL Account: ${populatedItem.glAccountItemId ? populatedItem.glAccountItemId.name : 'null'}`);
    } else {
      console.log('  Populate test: ✗ (no items found)');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Test Summary:');
    console.log(`  SOV Items Checked: ${sovItems.length}`);
    console.log(`  All Fields Present: ${allFieldsPresent ? '✓' : '✗'}`);
    console.log('='.repeat(50));

    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  } catch (error) {
    console.error('Test error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run tests
testSOVRefactor();

