/**
 * Import Vanos Pricebook from CSV
 * 
 * Processes the CSV file with sheet URLs and imports each sheet one by one.
 * First imports discount information, then processes product sheets.
 * 
 * Usage:
 *   node scripts/import-vanos-pricebook-from-csv.js [--start-from=N] [--limit=N] [--skip-discounts]
 */

require('dotenv').config({ path: '.env.local', override: true });
const fs = require('fs');
const path = require('path');
const { importSheet, loadProgress, markCompleted, markFailed } = require('./import-pricebook-sheet');

const CSV_FILE = path.join(__dirname, 'Import 2025 Vanos Price Book - Sheet URLs.csv');
const SPREADSHEET_ID = '1VkQmOFmyJq1fZKnfkI-Tdfv_KvgVl1XcnQmJ1dCRbe4';

// Sheets to skip (metadata/config sheets)
const SKIP_SHEETS = [
  'CATALOG DISCOUNTS CHANGE SHEET',
  'sales line discount group',
  'Template Work',
  'Logos',
  'SELECTION',
  'Product List',
  'APX (old)',
  'MENU',
  'CALC MARG'
];

/**
 * Parse CSV file and extract sheet info
 */
function parseCSV() {
  const content = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const sheets = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const firstComma = line.indexOf(',');
    if (firstComma === -1) continue;
    
    const sheetName = line.substring(0, firstComma).trim();
    const url = line.substring(firstComma + 1).trim();
    
    // Extract GID from URL
    const gidMatch = url.match(/gid=(\d+)/);
    if (gidMatch) {
      sheets.push({
        name: sheetName,
        url: url,
        gid: gidMatch[1]
      });
    }
  }
  
  return sheets;
}

/**
 * Fetch sheet data using Google Sheets API via MCP tool
 * This function will be called with actual sheet data fetched externally
 */
async function fetchSheetDataByGid(gid, sheetName) {
  // This will be called with data from MCP tool
  // For now, return metadata needed for fetching
  return {
    spreadsheetId: SPREADSHEET_ID,
    gid: gid,
    sheetName: sheetName
  };
}

/**
 * Determine discount information for a sheet
 * For now, we'll need to extract from discount sheet or use defaults
 */
function getDiscountInfo(sheetName) {
  // TODO: Parse discount sheet to get actual discounts
  // For now, return null - discounts will need to be imported separately
  // or extracted from the discount sheet
  
  // Some sheets might have discount info in their names or we can match to discount entries
  return {
    discountPercent: null, // Will be set after discount sheet is processed
    groupCode: null,
    section: null,
    pageNumber: null
  };
}

/**
 * Process a single sheet
 */
async function processSheet(csvSheet, index, total, providedData = null) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[${index + 1}/${total}] Processing: ${csvSheet.name}`);
  console.log(`   GID: ${csvSheet.gid}`);
  console.log(`${'='.repeat(70)}`);
  
  // Check if already completed
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  if (completedNames.has(csvSheet.name)) {
    console.log(`   ⏭️  Already completed, skipping...`);
    return { skipped: true };
  }
  
  // Check if should skip
  if (SKIP_SHEETS.includes(csvSheet.name)) {
    console.log(`   ⏭️  Skipping metadata/config sheet`);
    return { skipped: true, reason: 'metadata' };
  }
  
  // Get discount info
  const discountInfo = getDiscountInfo(csvSheet.name);
  
  // Prepare sheet info
  const sheetInfo = {
    groupCode: discountInfo.groupCode,
    section: discountInfo.section,
    pageNumber: discountInfo.pageNumber,
    pageName: csvSheet.name,
    discountPercent: discountInfo.discountPercent
  };
  
  try {
    // Import the sheet
    const result = await importSheet(
      csvSheet.name,
      csvSheet.gid,
      sheetInfo,
      providedData
    );
    
    console.log(`   ✅ Successfully imported!`);
    return { success: true, result };
    
  } catch (error) {
    console.error(`   ❌ Import failed:`, error.message);
    return { error: error.message, failed: true };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const startFrom = parseInt(args.find(arg => arg.startsWith('--start-from='))?.split('=')[1] || '1') - 1;
  const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0');
  const skipDiscounts = args.includes('--skip-discounts');
  
  console.log('\n🚀 Import Vanos Pricebook from CSV\n');
  console.log(`   Spreadsheet ID: ${SPREADSHEET_ID}`);
  console.log(`   CSV File: ${CSV_FILE}\n`);
  
  // Parse CSV
  console.log('📊 Parsing CSV file...');
  const allSheets = parseCSV();
  console.log(`   Found ${allSheets.length} total sheets\n`);
  
  // Filter out skip sheets
  const productSheets = allSheets.filter(s => !SKIP_SHEETS.includes(s.name));
  console.log(`📋 Processing ${productSheets.length} product sheets\n`);
  
  // Apply start/limit
  const sheetsToProcess = limit > 0 
    ? productSheets.slice(startFrom, startFrom + limit)
    : productSheets.slice(startFrom);
  
  console.log(`   Starting from sheet ${startFrom + 1}`);
  if (limit > 0) {
    console.log(`   Processing ${sheetsToProcess.length} sheet(s)\n`);
  }
  
  // Process each sheet
  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    needsData: []
  };
  
  for (let i = 0; i < sheetsToProcess.length; i++) {
    const csvSheet = sheetsToProcess[i];
    const result = await processSheet(csvSheet, startFrom + i, allSheets.length);
    
    if (result.success) {
      results.success++;
    } else if (result.skipped) {
      results.skipped++;
    } else if (result.failed) {
      results.failed++;
    } else if (result.needsData) {
      results.needsData.push({ sheet: csvSheet, result });
      results.failed++;
    }
    
    // Small delay to avoid rate limiting
    if (i < sheetsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Import Summary');
  console.log('='.repeat(70));
  console.log(`✅ Successfully imported: ${results.success}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📄 Total processed: ${sheetsToProcess.length}`);
  
  if (results.needsData.length > 0) {
    console.log('\n⚠️  Sheets needing manual data fetch:');
    results.needsData.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.sheet.name} (GID: ${item.sheet.gid})`);
    });
  }
  
  console.log('\n💡 Next steps:');
  console.log(`   - To continue from sheet ${startFrom + sheetsToProcess.length + 1}:`);
  console.log(`     node scripts/import-vanos-pricebook-from-csv.js --start-from=${startFrom + sheetsToProcess.length + 1}`);
  console.log(`   - To check progress:`);
  console.log(`     node scripts/pricebook-import-helper.js progress`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { parseCSV, processSheet, SPREADSHEET_ID };

