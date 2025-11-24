/**
 * Import Next Sheet - Interactive Workflow
 * 
 * Helps import the next unprocessed sheet from the pricebook.
 * Prompts for sheet data and processes it.
 * 
 * Usage:
 *   node scripts/import-next-sheet.js
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

async function main() {
  console.log('\n📋 Pricebook Import - Next Sheet\n');
  
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
  
  // Ask for data
  console.log('Please provide the sheet data:');
  console.log('1. Paste JSON array of rows (e.g., [[row1], [row2], ...])');
  console.log('2. Or press Enter to skip this sheet\n');
  
  const dataInput = await question('Sheet data (JSON or Enter to skip): ');
  
  if (!dataInput.trim()) {
    console.log('⏭️  Skipping this sheet');
    rl.close();
    return;
  }
  
  let sheetData;
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
    
    await importSheet(nextSheet.pageName, '', sheetInfo, sheetData);
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

