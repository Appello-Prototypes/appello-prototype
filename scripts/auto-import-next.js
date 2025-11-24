/**
 * Auto Import Next Sheet
 * 
 * Attempts to automatically fetch and import the next unprocessed sheet.
 * Falls back to manual workflow if auto-fetch fails.
 */

require('dotenv').config({ path: '.env.local', override: true });
const { importSheet, loadProgress } = require('./import-pricebook-sheet');
const { DISCOUNT_SUMMARY } = require('./pricebook-import-helper');

async function autoImportNext() {
  console.log('\n🚀 Auto Import Next Sheet\n');
  
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  // Find next uncompleted sheet
  const nextSheet = DISCOUNT_SUMMARY.find(sheet => !completedNames.has(sheet.pageName));
  
  if (!nextSheet) {
    console.log('✅ All sheets have been imported!');
    return;
  }
  
  console.log(`Next sheet: ${nextSheet.pageName}`);
  console.log(`Page: ${nextSheet.pageNumber || 'N/A'}`);
  console.log(`Group Code: ${nextSheet.groupCode}`);
  console.log(`Discount: ${nextSheet.discount}%\n`);
  
  console.log('📋 To continue importing:');
  console.log('1. Open the Google Sheet');
  console.log('2. Find the hyperlink for this sheet in the first page');
  console.log('3. Right-click → Copy link address');
  console.log('4. Run: node scripts/get-sheet-gid.js [paste-url]');
  console.log('5. Then run: node scripts/import-next-sheet-with-gid.js [gid]\n');
  
  console.log('Or provide sheet data directly:');
  console.log('1. Copy the sheet data as JSON array');
  console.log('2. Run: node scripts/import-pricebook-sheet.js');
  console.log(`   "${nextSheet.pageName}" "" "${nextSheet.groupCode}" "${nextSheet.section}" "${nextSheet.pageNumber || ''}" "${nextSheet.discount}" --data '[JSON_DATA]'\n`);
}

if (require.main === module) {
  autoImportNext()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { autoImportNext };

