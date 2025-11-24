/**
 * Fetch All Sheets Sequentially
 * 
 * Goes through each sheet tab one by one, fetches the data,
 * and builds a mapping of sheet names to GIDs.
 * 
 * Usage:
 *   node scripts/fetch-all-sheets-sequentially.js
 */

require('dotenv').config({ path: '.env.local', override: true });
const { DISCOUNT_SUMMARY } = require('./pricebook-import-helper');
const { importSheet, loadProgress } = require('./import-pricebook-sheet');
const fs = require('fs');
const path = require('path');

const spreadsheetId = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';
const SHEET_MAPPING_FILE = path.join(__dirname, 'sheet-gid-mapping.json');

/**
 * Load existing sheet mapping
 */
function loadSheetMapping() {
  if (fs.existsSync(SHEET_MAPPING_FILE)) {
    return JSON.parse(fs.readFileSync(SHEET_MAPPING_FILE, 'utf8'));
  }
  return {};
}

/**
 * Save sheet mapping
 */
function saveSheetMapping(mapping) {
  fs.writeFileSync(SHEET_MAPPING_FILE, JSON.stringify(mapping, null, 2));
  console.log(`\n💾 Saved sheet mapping to: ${SHEET_MAPPING_FILE}`);
}

/**
 * Try to fetch sheet by name using Google Workspace API
 * This will be called via MCP tool
 */
async function tryFetchSheetByName(sheetName) {
  // This function will be called with the MCP tool
  // For now, returns null to indicate manual fetch needed
  return null;
}

/**
 * Process one sheet
 */
async function processSheet(sheetInfo, sheetMapping) {
  const { pageName, groupCode, section, pageNumber, discount } = sheetInfo;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 Processing: ${pageName}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Page: ${pageNumber || 'N/A'}`);
  console.log(`   Group Code: ${groupCode}`);
  console.log(`   Discount: ${discount}%`);
  
  // Check if already completed
  const progress = loadProgress();
  if (progress.completed.find(s => s.name === pageName)) {
    console.log(`   ⏭️  Already completed, skipping...`);
    return { skipped: true };
  }
  
  // Try to fetch sheet data
  // We'll use the Google Workspace MCP tool to fetch by trying different methods
  console.log(`\n   🔍 Attempting to fetch sheet data...`);
  
  // Try fetching with the sheet name directly
  // This will be done via MCP tool calls
  return { 
    sheetName: pageName,
    needsManualFetch: true,
    info: sheetInfo
  };
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Fetching All Sheets Sequentially\n');
  console.log(`Spreadsheet ID: ${spreadsheetId}`);
  console.log(`Total sheets in discount summary: ${DISCOUNT_SUMMARY.length}\n`);
  
  const sheetMapping = loadSheetMapping();
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  // Filter to only uncompleted sheets
  const sheetsToProcess = DISCOUNT_SUMMARY.filter(sheet => !completedNames.has(sheet.pageName));
  
  console.log(`📊 Sheets to process: ${sheetsToProcess.length}`);
  console.log(`   Already completed: ${completedNames.size}`);
  console.log(`   Total: ${DISCOUNT_SUMMARY.length}\n`);
  
  // Process each sheet
  for (let i = 0; i < sheetsToProcess.length; i++) {
    const sheet = sheetsToProcess[i];
    console.log(`\n[${i + 1}/${sheetsToProcess.length}]`);
    
    try {
      const result = await processSheet(sheet, sheetMapping);
      
      if (result.skipped) {
        continue;
      }
      
      if (result.needsManualFetch) {
        console.log(`\n   ⚠️  Could not auto-fetch. Manual intervention needed.`);
        console.log(`   Sheet: ${result.sheetName}`);
        console.log(`   Use Google Workspace MCP tool to fetch this sheet's data.`);
        break; // Stop here, wait for manual fetch
      }
      
    } catch (error) {
      console.error(`\n   ❌ Error processing ${sheet.pageName}:`, error.message);
      // Continue with next sheet
    }
  }
  
  saveSheetMapping(sheetMapping);
  console.log('\n✅ Sequential fetch process completed!');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { processSheet, loadSheetMapping, saveSheetMapping };

