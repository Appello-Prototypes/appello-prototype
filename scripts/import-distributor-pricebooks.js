/**
 * Import Distributor Pricebooks
 * 
 * Imports the first 5 product pages from CROSSROADS and IMPRO pricebook CSVs.
 * Follows the same pattern as import-all-sheets-from-csv.js and import-vanos-pricebook-from-csv.js
 * 
 * Usage:
 *   node scripts/import-distributor-pricebooks.js [--test] [--distributor CROSSROADS|IMPRO]
 * 
 * Options:
 *   --test          Test with one sheet only
 *   --distributor   Import from specific distributor only
 */

require('dotenv').config({ path: '.env.local', override: true });
const fs = require('fs');
const path = require('path');
const { importSheet, loadProgress } = require('./import-pricebook-sheet');
const { DISCOUNT_SUMMARY } = require('./pricebook-import-helper');

// CSV file paths
const CROSSROADS_CSV = path.join(__dirname, '..', 'CROSSROADS PRICEBOOK.csv');
const IMPRO_CSV = path.join(__dirname, '..', 'scripts', 'IMPRO PRICEBOOK.csv');

// Spreadsheet IDs
const CROSSROADS_SPREADSHEET_ID = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';
const IMPRO_SPREADSHEET_ID = '1VkQmOFmyJq1fZKnfkI-Tdfv_KvgVl1XcnQmJ1dCRbe4';

// Metadata sheets to skip
const CROSSROADS_SKIP_SHEETS = ['Discount Summary'];
const IMPRO_SKIP_SHEETS = [
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
 * Parse CSV file and extract sheet information
 */
function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
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
 * Get first 5 product pages from a distributor CSV
 */
function getFirst5ProductPages(csvPath, skipSheets) {
  const allSheets = parseCSV(csvPath);
  
  // Filter out metadata sheets and get LIST sheets (prefer LIST over NET)
  const productSheets = allSheets.filter(sheet => {
    // Skip metadata sheets
    if (skipSheets.includes(sheet.name)) {
      return false;
    }
    
    // For CROSSROADS: prefer LIST sheets, skip NET sheets
    if (csvPath.includes('CROSSROADS')) {
      return sheet.name.includes('LIST') && !sheet.name.includes('NET');
    }
    
    // For IMPRO: all product sheets (no LIST/NET distinction in names)
    return true;
  });
  
  return productSheets.slice(0, 5);
}

/**
 * Match CROSSROADS sheet name to discount summary entry
 * Similar to findMatchingDiscountEntry in import-all-sheets-from-csv.js
 */
function findCrossroadsDiscountEntry(csvSheetName) {
  // Remove page numbers and LIST/NET suffixes for matching
  const cleanCSV = csvSheetName
    .replace(/^\d+\.\d+\s+/, '') // Remove leading page number like "1.1 "
    .replace(/\s+LIST$/, '')
    .replace(/\s+NET$/, '')
    .trim()
    .toUpperCase();
  
  // Try to match with discount summary entries
  for (const entry of DISCOUNT_SUMMARY) {
    const cleanEntry = entry.pageName.toUpperCase().trim();
    
    // Exact match
    if (cleanCSV === cleanEntry) {
      return entry;
    }
    
    // Check if CSV name contains entry name or vice versa
    if (cleanCSV.includes(cleanEntry) || cleanEntry.includes(cleanCSV)) {
      return entry;
    }
    
    // Check key words match
    const csvWords = cleanCSV.split(/\s+/).filter(w => w.length > 2);
    const entryWords = cleanEntry.split(/\s+/).filter(w => w.length > 2);
    
    // Count matching significant words
    const matchingWords = csvWords.filter(csvWord => 
      entryWords.some(entryWord => 
        entryWord.includes(csvWord) || csvWord.includes(entryWord)
      )
    );
    
    // If most words match, consider it a match
    if (matchingWords.length >= Math.min(2, Math.max(csvWords.length - 1, entryWords.length - 1))) {
      return entry;
    }
  }
  
  return null;
}

/**
 * Extract sheet info for CROSSROADS sheets
 * Format: "1.1 FIBREGLASS PIPE ASJ LIST"
 */
function extractCrossroadsSheetInfo(sheetName) {
  const match = sheetName.match(/^(\d+)\.(\d+)\s+(.+?)\s+LIST$/);
  if (match) {
    const section = match[1];
    const pageNumber = `${match[1]}.${match[2]}`;
    const pageName = match[3];
    
    // Try to find matching discount entry
    const discountEntry = findCrossroadsDiscountEntry(sheetName);
    
    return {
      section: discountEntry?.section || section,
      pageNumber: discountEntry?.pageNumber || pageNumber,
      pageName: discountEntry?.pageName || pageName,
      groupCode: discountEntry?.groupCode || '',
      discountPercent: discountEntry?.discount || null
    };
  }
  
  // Try to find discount entry even without page number match
  const discountEntry = findCrossroadsDiscountEntry(sheetName);
  if (discountEntry) {
    return {
      section: discountEntry.section,
      pageNumber: discountEntry.pageNumber,
      pageName: discountEntry.pageName,
      groupCode: discountEntry.groupCode,
      discountPercent: discountEntry.discount
    };
  }
  
  return {
    section: '',
    pageNumber: '',
    pageName: sheetName,
    groupCode: '',
    discountPercent: null
  };
}

/**
 * Extract sheet info for IMPRO sheets
 * Format: "ELTUA", "ELTUK", etc.
 */
function extractImproSheetInfo(sheetName) {
  return {
    section: '',
    pageNumber: '',
    pageName: sheetName,
    groupCode: '',
    discountPercent: null
  };
}

/**
 * Process a single sheet
 * Follows the same pattern as import-all-sheets-from-csv.js
 */
async function processSheet(csvSheet, distributorName, spreadsheetId, index, total) {
  console.log(`\n[${index + 1}/${total}] Processing: ${csvSheet.name}`);
  console.log(`   Distributor: ${distributorName}`);
  console.log(`   GID: ${csvSheet.gid}`);
  
  // Check if already completed
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  if (completedNames.has(csvSheet.name)) {
    console.log(`   ⏭️  Already completed, skipping...`);
    return { skipped: true };
  }
  
  // Extract sheet info based on distributor
  let sheetInfo;
  if (distributorName === 'Crossroads C&I') {
    sheetInfo = extractCrossroadsSheetInfo(csvSheet.name);
    if (sheetInfo.groupCode) {
      console.log(`   ✅ Matched to discount entry:`);
      console.log(`      Page: ${sheetInfo.pageNumber || 'N/A'}`);
      console.log(`      Section: ${sheetInfo.section || 'N/A'}`);
      console.log(`      Group Code: ${sheetInfo.groupCode}`);
      console.log(`      Discount: ${sheetInfo.discountPercent}%`);
    } else {
      console.log(`   ⚠️  No discount entry match found`);
      console.log(`   Page: ${sheetInfo.pageNumber || 'N/A'}`);
      console.log(`   Section: ${sheetInfo.section || 'N/A'}`);
    }
  } else {
    sheetInfo = extractImproSheetInfo(csvSheet.name);
    console.log(`   Page: ${sheetInfo.pageNumber || 'N/A'}`);
    console.log(`   Section: ${sheetInfo.section || 'N/A'}`);
  }
  
  try {
    // Call importSheet - it will handle data fetching or prompt for manual input
    // The importSheet function expects: (sheetName, gid, sheetInfo, providedData)
    const result = await importSheet(
      csvSheet.name,
      csvSheet.gid,
      sheetInfo,
      null // No provided data - importSheet will look for data file or prompt
    );
    
    console.log(`   ✅ Successfully imported!`);
    return { success: true, result };
    
  } catch (error) {
    // If error is about missing data, that's expected - user needs to provide it
    if (error.message.includes('Sheet data not found') || error.message.includes('No data file found')) {
      console.log(`   ⚠️  Sheet data needed. Options:`);
      console.log(`      1. Create: scripts/sheet-data-${csvSheet.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      console.log(`      2. Use Google Workspace MCP tool to fetch data`);
      console.log(`      3. Provide via --data flag when calling importSheet directly`);
      return { needsData: true, csvSheet, sheetInfo };
    }
    
    console.error(`   ❌ Import failed:`, error.message);
    return { error: error.message, failed: true };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const distributorFilter = args.find(arg => arg.startsWith('--distributor='))?.split('=')[1];
  
  console.log('\n🚀 Import Distributor Pricebooks\n');
  
  if (testMode) {
    console.log('🧪 TEST MODE: Will import one sheet only\n');
  }
  
  // Parse CSVs and get first 5 product pages
  const crossroadsSheets = getFirst5ProductPages(CROSSROADS_CSV, CROSSROADS_SKIP_SHEETS);
  const improSheets = getFirst5ProductPages(IMPRO_CSV, IMPRO_SKIP_SHEETS);
  
  console.log(`📊 Found sheets:`);
  console.log(`   CROSSROADS: ${crossroadsSheets.length} sheets`);
  crossroadsSheets.forEach((s, i) => console.log(`     ${i + 1}. ${s.name} (GID: ${s.gid})`));
  console.log(`   IMPRO: ${improSheets.length} sheets`);
  improSheets.forEach((s, i) => console.log(`     ${i + 1}. ${s.name} (GID: ${s.gid})`));
  console.log();
  
  // Prepare sheets to process
  const sheetsToProcess = [];
  
  if (!distributorFilter || distributorFilter === 'CROSSROADS') {
    crossroadsSheets.forEach(sheet => {
      sheetsToProcess.push({ 
        sheet, 
        distributorName: 'Crossroads C&I',
        spreadsheetId: CROSSROADS_SPREADSHEET_ID
      });
    });
  }
  
  if (!distributorFilter || distributorFilter === 'IMPRO') {
    improSheets.forEach(sheet => {
      sheetsToProcess.push({ 
        sheet, 
        distributorName: 'IMPRO',
        spreadsheetId: IMPRO_SPREADSHEET_ID
      });
    });
  }
  
  if (testMode) {
    // Only process first sheet
    console.log('🧪 TEST MODE: Processing first sheet only\n');
    sheetsToProcess.splice(1);
  }
  
  console.log(`\n📋 Processing ${sheetsToProcess.length} sheets...\n`);
  
  // Process each sheet
  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    needsData: []
  };
  
  for (let i = 0; i < sheetsToProcess.length; i++) {
    const { sheet, distributorName, spreadsheetId } = sheetsToProcess[i];
    const result = await processSheet(sheet, distributorName, spreadsheetId, i, sheetsToProcess.length);
    
    if (result.success) {
      results.success++;
    } else if (result.skipped) {
      results.skipped++;
    } else if (result.needsData) {
      results.needsData.push(result);
      results.failed++;
    } else if (result.failed) {
      results.failed++;
    }
    
    // Small delay to avoid rate limiting
    if (i < sheetsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${results.success}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Failed/Needs data: ${results.failed}`);
  console.log(`📄 Total processed: ${sheetsToProcess.length}`);
  
  if (results.needsData.length > 0) {
    console.log('\n⚠️  Sheets needing data:');
    results.needsData.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.csvSheet.name} (GID: ${item.csvSheet.gid})`);
      console.log(`      Spreadsheet ID: ${item.csvSheet.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || 'N/A'}`);
    });
    console.log('\n💡 To import these sheets:');
    console.log('   1. Fetch sheet data using Google Workspace MCP tool');
    console.log('   2. Save as: scripts/sheet-data-[SHEET_NAME].json');
    console.log('   3. Re-run this script');
  }
  
  if (testMode && results.needsData.length > 0) {
    const testSheet = results.needsData[0];
    console.log('\n🧪 TEST MODE: Ready to test import with first sheet');
    console.log(`   Sheet: ${testSheet.csvSheet.name}`);
    console.log(`   GID: ${testSheet.csvSheet.gid}`);
    console.log(`   URL: ${testSheet.csvSheet.url}`);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { parseCSV, getFirst5ProductPages, processSheet };
