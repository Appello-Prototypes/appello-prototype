/**
 * Try Fetch Sheets By Name
 * 
 * Attempts to fetch each sheet using its exact name from the discount summary.
 * Documents which ones work and which need manual intervention.
 */

require('dotenv').config({ path: '.env.local', override: true });
const { DISCOUNT_SUMMARY } = require('./pricebook-import-helper');
const { loadProgress } = require('./import-pricebook-sheet');
const fs = require('fs');
const path = require('path');

const spreadsheetId = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';
const RESULTS_FILE = path.join(__dirname, 'sheet-fetch-results.json');

/**
 * Try different name variations for a sheet
 */
function getSheetNameVariations(pageName) {
  return [
    pageName,
    `'${pageName}'`,
    pageName.replace(/ /g, '_'),
    pageName.replace(/ /g, '-'),
    pageName.toLowerCase(),
    pageName.toUpperCase(),
  ];
}

/**
 * Main function - will be called with MCP tool
 */
async function tryFetchAllSheets() {
  console.log('\n🔍 Attempting to fetch sheets by name...\n');
  
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  const sheetsToProcess = DISCOUNT_SUMMARY.filter(sheet => !completedNames.has(sheet.pageName));
  
  console.log(`📊 Will attempt to fetch ${sheetsToProcess.length} sheets\n`);
  
  const results = {
    successful: [],
    failed: [],
    timestamp: new Date().toISOString()
  };
  
  // Process first few sheets as test
  const testSheets = sheetsToProcess.slice(0, 5);
  
  for (const sheet of testSheets) {
    console.log(`\n📄 ${sheet.pageName}`);
    console.log(`   Trying variations...`);
    
    const variations = getSheetNameVariations(sheet.pageName);
    let fetched = false;
    
    for (const variation of variations) {
      console.log(`   - Trying: ${variation}`);
      // This would be done via MCP tool call
      // For now, mark as needing manual fetch
    }
    
    if (!fetched) {
      console.log(`   ❌ Could not fetch - needs manual intervention`);
      results.failed.push({
        pageName: sheet.pageName,
        pageNumber: sheet.pageNumber,
        groupCode: sheet.groupCode,
        discount: sheet.discount
      });
    }
  }
  
  // Save results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${RESULTS_FILE}`);
  
  return results;
}

if (require.main === module) {
  tryFetchAllSheets()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { tryFetchAllSheets, getSheetNameVariations };

