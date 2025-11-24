/**
 * Fetch and Import Next Sheet
 * 
 * Uses the CSV file to get GID and fetches the next unprocessed sheet.
 */

require('dotenv').config({ path: '.env.local', override: true });
const { parseCSV, findMatchingDiscountEntry } = require('./import-all-sheets-from-csv');
const { importSheet, loadProgress } = require('./import-pricebook-sheet');

const spreadsheetId = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';

async function fetchAndImportNext() {
  console.log('\n🚀 Fetch and Import Next Sheet\n');
  
  // Parse CSV
  const csvSheets = parseCSV();
  console.log(`📊 Found ${csvSheets.length} sheets in CSV\n`);
  
  // Get progress
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  // Filter to LIST sheets and find next unprocessed
  const listSheets = csvSheets.filter(s => s.name.includes('LIST'));
  
  // Find next sheet to process
  let nextSheet = null;
  let nextDiscountEntry = null;
  
  for (const csvSheet of listSheets) {
    const discountEntry = findMatchingDiscountEntry(csvSheet.name);
    if (discountEntry && !completedNames.has(discountEntry.pageName)) {
      nextSheet = csvSheet;
      nextDiscountEntry = discountEntry;
      break;
    }
  }
  
  if (!nextSheet) {
    console.log('✅ All sheets have been processed!');
    return;
  }
  
  console.log(`Next sheet to import:`);
  console.log(`  CSV Name: ${nextSheet.name}`);
  console.log(`  Matched to: ${nextDiscountEntry.pageName}`);
  console.log(`  GID: ${nextSheet.gid}`);
  console.log(`  Page: ${nextDiscountEntry.pageNumber || 'N/A'}`);
  console.log(`  Group Code: ${nextDiscountEntry.groupCode}`);
  console.log(`  Discount: ${nextDiscountEntry.discount}%\n`);
  
  // Try to fetch using Google Workspace API
  console.log('🔍 Fetching sheet data...');
  
  // Try different name variations
  const nameVariations = [
    nextSheet.name,
    `'${nextSheet.name}'`,
    nextSheet.name.replace(/ /g, '_'),
    nextSheet.name.replace(/ /g, '-')
  ];
  
  let sheetData = null;
  let fetchError = null;
  
  // This will be done via MCP tool calls
  // For now, return info for manual fetch
  console.log(`\n⚠️  Need to fetch via Google Workspace API`);
  console.log(`   Spreadsheet ID: ${spreadsheetId}`);
  console.log(`   GID: ${nextSheet.gid}`);
  console.log(`   Try sheet names: ${nameVariations.join(', ')}\n`);
  
  return {
    nextSheet,
    nextDiscountEntry,
    nameVariations,
    spreadsheetId
  };
}

if (require.main === module) {
  fetchAndImportNext()
    .then((result) => {
      if (result) {
        console.log('📋 To import this sheet:');
        console.log(`   Use Google Workspace API to fetch with GID: ${result.nextSheet.gid}`);
        console.log(`   Or run: node scripts/import-pricebook-sheet.js "${result.nextDiscountEntry.pageName}" "${result.nextSheet.gid}" "${result.nextDiscountEntry.groupCode}" "${result.nextDiscountEntry.section}" "${result.nextDiscountEntry.pageNumber || ''}" "${result.nextDiscountEntry.discount}"`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { fetchAndImportNext };

