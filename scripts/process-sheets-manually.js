/**
 * Process Sheets Manually - One by One
 * 
 * This script helps you go through each sheet tab one by one.
 * It will attempt to fetch each sheet and import it.
 * 
 * Usage:
 *   node scripts/process-sheets-manually.js
 */

require('dotenv').config({ path: '.env.local', override: true });
const { DISCOUNT_SUMMARY } = require('./pricebook-import-helper');
const { importSheet, loadProgress } = require('./import-pricebook-sheet');

const spreadsheetId = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';

async function processNextSheet() {
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  const nextSheet = DISCOUNT_SUMMARY.find(sheet => !completedNames.has(sheet.pageName));
  
  if (!nextSheet) {
    console.log('✅ All sheets have been processed!');
    return null;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📄 Next Sheet: ${nextSheet.pageName}`);
  console.log('='.repeat(60));
  console.log(`Page Number: ${nextSheet.pageNumber || 'N/A'}`);
  console.log(`Group Code: ${nextSheet.groupCode}`);
  console.log(`Section: ${nextSheet.section}`);
  console.log(`Discount: ${nextSheet.discount}%`);
  console.log('\nTo fetch this sheet:');
  console.log(`1. Open: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log(`2. Navigate to the sheet tab: "${nextSheet.pageName}"`);
  console.log(`3. Copy the GID from the URL (the #gid=XXXXX part)`);
  console.log(`4. Or provide the sheet data as JSON`);
  console.log(`\nThen run:`);
  console.log(`   node scripts/import-next-sheet-with-gid.js [GID]`);
  console.log(`   OR`);
  console.log(`   node scripts/import-pricebook-sheet.js "${nextSheet.pageName}" "[GID]" "${nextSheet.groupCode}" "${nextSheet.section}" "${nextSheet.pageNumber || ''}" "${nextSheet.discount}" --data '[JSON_DATA]'`);
  
  return nextSheet;
}

if (require.main === module) {
  processNextSheet()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { processNextSheet };

