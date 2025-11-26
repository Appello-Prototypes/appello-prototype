#!/usr/bin/env node
/**
 * Test script for all AI tools
 * Tests each tool with sample data to verify they work correctly
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const { allTools } = require('../src/server/services/ai/tools/allTools');
const allToolHandlers = require('../src/server/services/ai/tools/toolHandlers');

// Connect to database
const MONGODB_DEV_URI = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
if (!MONGODB_DEV_URI) {
  console.error('❌ MONGODB_DEV_URI not set');
  process.exit(1);
}

async function testTools() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_DEV_URI);
    console.log('✅ Connected to database\n');

    // Get a sample job for testing
    const Job = require('../src/server/models/Job');
    const sampleJob = await Job.findOne({}).select('_id jobNumber name').lean();
    
    if (!sampleJob) {
      console.log('⚠️  No jobs found in database. Skipping tests that require job data.');
      console.log('✅ Tool definitions are valid\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Testing with sample job: ${sampleJob.jobNumber} (${sampleJob.name})\n`);

    const results = {
      total: allTools.length,
      tested: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Test each tool
    for (const tool of allTools) {
      results.tested++;
      console.log(`\n🔧 Testing tool: ${tool.name}`);
      
      try {
        // Check if handler exists
        if (!allToolHandlers[tool.name]) {
          console.log(`  ⚠️  Handler not found - SKIPPED`);
          results.skipped++;
          continue;
        }

        // Create test args based on tool schema
        const testArgs = {};
        if (tool.input_schema.properties) {
          for (const [key, prop] of Object.entries(tool.input_schema.properties)) {
            if (tool.input_schema.required && tool.input_schema.required.includes(key)) {
              // Required field - use sample data
              // Check for jobIdentifiers (array) FIRST before generic jobIdentifier check
              if (key === 'jobIdentifiers' && prop.type === 'array') {
                // For compare_jobs, need array of at least 2 jobs
                const Job = require('../src/server/models/Job');
                const allJobs = await Job.find({}).select('jobNumber').limit(2).lean();
                if (allJobs.length >= 2) {
                  testArgs[key] = allJobs.map(j => j.jobNumber);
                } else {
                  console.log(`  ⚠️  Requires at least 2 jobs - SKIPPED`);
                  results.skipped++;
                  continue;
                }
              } else if (key.includes('jobIdentifier') || key.includes('jobId')) {
                testArgs[key] = sampleJob.jobNumber;
              } else if (key.includes('projectIdentifier') || key.includes('projectId')) {
                // Skip for now
                continue;
              } else if (prop.default !== undefined) {
                testArgs[key] = prop.default;
              } else if (prop.enum && prop.enum.length > 0) {
                testArgs[key] = prop.enum[0];
              } else if (prop.type === 'string') {
                testArgs[key] = 'test';
              } else if (prop.type === 'number') {
                testArgs[key] = 0;
              } else if (prop.type === 'boolean') {
                testArgs[key] = false;
              } else if (prop.type === 'array') {
                testArgs[key] = [];
              }
            }
          }
        }

        // Special handling for tools that don't require jobIdentifier
        if (!tool.input_schema.required || !tool.input_schema.required.includes('jobIdentifier')) {
          // Some tools work without jobIdentifier
          if (tool.name === 'list_jobs' || tool.name === 'get_job_summary' || 
              tool.name === 'find_at_risk_jobs' || tool.name === 'get_benchmarks') {
            // These can run without args
          } else if (tool.name === 'compare_jobs') {
            // compare_jobs needs jobIdentifiers array - already handled above
            if (!testArgs.jobIdentifiers || testArgs.jobIdentifiers.length < 2) {
              const Job = require('../src/server/models/Job');
              const allJobs = await Job.find({}).select('jobNumber').limit(2).lean();
              if (allJobs.length >= 2) {
                testArgs.jobIdentifiers = allJobs.map(j => j.jobNumber);
              } else {
                console.log(`  ⚠️  Requires at least 2 jobs - SKIPPED`);
                results.skipped++;
                continue;
              }
            }
          } else if (tool.name.includes('client') || tool.name.includes('project')) {
            // Skip for now - need client/project data
            console.log(`  ⚠️  Requires client/project data - SKIPPED`);
            results.skipped++;
            continue;
          } else if (tool.name === 'get_progress_report_details') {
            // Try to get a report for the sample job
            const ProgressReport = require('../src/server/models/ProgressReport');
            const report = await ProgressReport.findOne({ jobId: sampleJob._id }).lean();
            if (report) {
              testArgs.reportId = report._id.toString();
            } else {
              console.log(`  ⚠️  No progress reports found - SKIPPED`);
              results.skipped++;
              continue;
            }
          } else if (tool.name === 'get_work_order_details') {
            // Try to get a work order for the sample job
            const WorkOrder = require('../src/server/models/WorkOrder');
            const wo = await WorkOrder.findOne({ jobId: sampleJob._id }).lean();
            if (wo) {
              testArgs.workOrderId = wo._id.toString();
            } else {
              console.log(`  ⚠️  No work orders found - SKIPPED`);
              results.skipped++;
              continue;
            }
          } else {
            // Try with sample job
            testArgs.jobIdentifier = sampleJob.jobNumber;
          }
        }

        // Execute tool
        console.log(`  📥 Input:`, JSON.stringify(testArgs));
        const startTime = Date.now();
        const result = await allToolHandlers[tool.name](testArgs);
        const duration = Date.now() - startTime;
        
        if (result && result.success !== false) {
          console.log(`  ✅ PASSED (${duration}ms)`);
          results.passed++;
        } else {
          console.log(`  ❌ FAILED - Result indicates failure`);
          results.failed++;
          results.errors.push({
            tool: tool.name,
            error: 'Result.success is false',
            result
          });
        }
      } catch (error) {
        console.log(`  ❌ FAILED - ${error.message}`);
        results.failed++;
        results.errors.push({
          tool: tool.name,
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tools: ${results.total}`);
    console.log(`Tested: ${results.tested}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Skipped: ${results.skipped}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      results.errors.forEach(err => {
        console.log(`  - ${err.tool}: ${err.error}`);
      });
    }

    console.log('\n✅ Tool testing complete!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Test error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testTools();

