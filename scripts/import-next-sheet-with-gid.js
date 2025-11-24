/**
 * Import Next Sheet with GID
 * 
 * Since we can't auto-detect sheet names, this script helps import
 * the next sheet when you provide the GID from the hyperlink.
 * 
 * Usage:
 *   node scripts/import-next-sheet-with-gid.js [gid]
 * 
 * Or run interactively:
 *   node scripts/import-next-sheet-with-gid.js
 */

require('dotenv').config({ path: '.env.local', override: true });
const { importSheet, loadProgress } = require('./import-pricebook-sheet');
const { DISCOUNT_SUMMARY } = require('./pricebook-import-helper');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getNextSheet() {
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  // Find first uncompleted sheet
  for (const sheet of DISCOUNT_SUMMARY) {
    if (!completedNames.has(sheet.pageName)) {
      return sheet;
    }
  }
  
  return null;
}

async function fetchSheetByGid(gid) {
  // This would use the Google Workspace API
  // For now, returns null to indicate manual fetch needed
  console.log(`\n📊 Attempting to fetch sheet with GID: ${gid}`);
  console.log(`   Note: This requires Google Workspace API access`);
  return null;
}

async function main() {
  console.log('\n📋 Import Next Sheet - With GID\n');
  
  // Find next sheet
  const nextSheet = await getNextSheet();
  
  if (!nextSheet) {
    console.log('✅ All sheets have been imported!');
    rl.close();
    return;
  }
  
  console.log(`Next sheet to import:`);
  console.log(`  Name: ${nextSheet.pageName}`);
  console.log(`  Page: ${nextSheet.pageNumber || 'N/A'}`);
  console.log(`  Section: ${nextSheet.section}`);
  console.log(`  Group Code: ${nextSheet.groupCode}`);
  console.log(`  Discount: ${nextSheet.discount}%\n`);
  
  // Get GID
  let gid = process.argv[2];
  if (!gid) {
    console.log('To find the GID:');
    console.log('1. Open the Google Sheet');
    console.log('2. Click on the hyperlink for this sheet in the first page');
    console.log('3. Look at the URL - it will have #gid=XXXXX');
    console.log('4. Copy that number\n');
    gid = await question('Enter GID (or press Enter to skip): ');
  }
  
  if (!gid || !gid.trim()) {
    console.log('⏭️  Skipping this sheet');
    rl.close();
    return;
  }
  
  // Try to fetch sheet data
  console.log(`\n🔍 Fetching sheet data...`);
  let sheetData = await fetchSheetByGid(gid.trim());
  
  if (!sheetData) {
    console.log(`\n⚠️  Could not auto-fetch sheet data.`);
    console.log(`\n📋 Please provide the sheet data:`);
    console.log(`   Paste JSON array of rows (e.g., [[row1], [row2], ...])\n`);
    
    const dataInput = await question('Sheet data (JSON or Enter to skip): ');
    
    if (!dataInput.trim()) {
      console.log('⏭️  Skipping this sheet');
      rl.close();
      return;
    }
    
    try {
      sheetData = JSON.parse(dataInput);
    } catch (error) {
      console.error('❌ Invalid JSON. Please provide valid JSON array.');
      rl.close();
      return;
    }
    
    if (!Array.isArray(sheetData)) {
      console.error('❌ Data must be an array of rows.');
      rl.close();
      return;
    }
  }
  
  console.log(`\n✅ Parsed ${sheetData.length} rows`);
  console.log('🚀 Starting import...\n');
  
  // Import
  try {
    const sheetInfo = {
      groupCode: nextSheet.groupCode,
      section: nextSheet.section,
      pageNumber: nextSheet.pageNumber,
      pageName: nextSheet.pageName,
      discountPercent: nextSheet.discount
    };
    
    await importSheet(nextSheet.pageName, gid.trim(), sheetInfo, sheetData);
    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});

