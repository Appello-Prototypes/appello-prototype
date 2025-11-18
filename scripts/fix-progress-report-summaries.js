#!/usr/bin/env node

/**
 * Fix Progress Report Summaries
 * Recalculates summary values for all existing progress reports
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ProgressReport = require('../src/server/models/ProgressReport');

const MONGODB_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or MONGODB_DEV_URI not set');
  process.exit(1);
}

async function fixProgressReportSummaries() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const reports = await ProgressReport.find({});
    console.log(`📋 Found ${reports.length} progress reports`);

    let fixed = 0;
    for (const report of reports) {
      // Trigger the pre-save hook by marking the document as modified and saving
      report.markModified('lineItems');
      report.markModified('summary');
      await report.save();
      fixed++;
      console.log(`  ✅ Fixed ${report.reportNumber} - ${report.summary.calculatedPercentCTD.toFixed(2)}% complete`);
    }

    console.log(`\n✅ Fixed ${fixed} progress reports`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

fixProgressReportSummaries();

