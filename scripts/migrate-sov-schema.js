/**
 * Migration script for SOV schema changes
 * 
 * This script migrates existing ScheduleOfValues documents to the new schema:
 * - Adds unitCost (calculated from totalCost / quantity)
 * - Adds marginAmount (calculated from totalValue - totalCost)
 * - Adds marginPercent (calculated from marginAmount / totalValue)
 * - Splits costCode into costCodeNumber and costCodeName
 * - Adds glCategoryId and glAccountItemId (null initially)
 * 
 * Run this locally first: node scripts/migrate-sov-schema.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');

async function migrateSOVSchema() {
  try {
    // Connect to database
    const dbUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!dbUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }

    console.log('Connecting to database...');
    await mongoose.connect(dbUri);
    console.log('Connected to database');

    // Find all SOV line items
    const sovItems = await ScheduleOfValues.find({});
    console.log(`Found ${sovItems.length} SOV line items to migrate`);

    let updated = 0;
    let skipped = 0;

    for (const item of sovItems) {
      const updates = {};
      let needsUpdate = false;

      // Calculate unitCost if missing
      if (!item.unitCost && item.quantity && item.quantity > 0 && item.totalCost) {
        updates.unitCost = item.totalCost / item.quantity;
        needsUpdate = true;
      }

      // Calculate marginAmount and marginPercent if missing
      if (item.totalValue && item.totalCost !== undefined) {
        if (!item.marginAmount) {
          updates.marginAmount = item.totalValue - item.totalCost;
          needsUpdate = true;
        }
        if (!item.marginPercent && item.totalValue > 0) {
          const marginAmt = updates.marginAmount || item.marginAmount || (item.totalValue - item.totalCost);
          updates.marginPercent = (marginAmt / item.totalValue) * 100;
          needsUpdate = true;
        }
      } else if (item.margin && item.totalCost !== undefined) {
        // Legacy: calculate from old margin field
        if (!item.marginPercent) {
          updates.marginPercent = item.margin;
          needsUpdate = true;
        }
        if (!item.marginAmount) {
          const totalVal = item.totalValue || (item.totalCost * (1 + item.margin / 100));
          updates.marginAmount = totalVal - item.totalCost;
          if (!item.totalValue) {
            updates.totalValue = totalVal;
          }
          needsUpdate = true;
        }
      }

      // Split costCode into costCodeNumber and costCodeName
      if (item.costCode && (!item.costCodeNumber || !item.costCodeName)) {
        // Try to split by common delimiters
        const parts = item.costCode.split(/[-_\s]/);
        if (parts.length >= 2) {
          updates.costCodeNumber = parts[0].trim();
          updates.costCodeName = parts.slice(1).join(' ').trim();
        } else {
          // If no delimiter, use entire code as number
          updates.costCodeNumber = item.costCode;
          updates.costCodeName = item.description ? item.description.substring(0, 50) : '';
        }
        needsUpdate = true;
      }

      // Initialize GL fields as null if not set
      if (item.glCategoryId === undefined) {
        updates.glCategoryId = null;
        needsUpdate = true;
      }
      if (item.glAccountItemId === undefined) {
        updates.glAccountItemId = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Use save() to trigger pre-save middleware for calculations
        Object.assign(item, updates);
        await item.save();
        updated++;
        console.log(`Updated SOV item ${item.lineNumber} (${item._id})`);
      } else {
        skipped++;
      }
    }

    console.log('\nMigration complete!');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already up to date): ${skipped}`);
    console.log(`Total: ${sovItems.length}`);

    await mongoose.disconnect();
    console.log('Disconnected from database');
  } catch (error) {
    console.error('Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateSOVSchema();

