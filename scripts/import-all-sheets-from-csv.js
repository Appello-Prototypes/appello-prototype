/**
 * Import All Sheets From CSV
 * 
 * Parses the CSV file with sheet URLs/GIDs and imports each sheet
 * one by one, matching them to the discount summary.
 */

require('dotenv').config({ path: '.env.local', override: true });
const fs = require('fs');
const path = require('path');
const { importSheet, loadProgress } = require('./import-pricebook-sheet');
const { DISCOUNT_SUMMARY } = require('./pricebook-import-helper');

const CSV_FILE = path.join(__dirname, '..', 'VANOS INSULATION- CCI CATALOGUE - JANUARY, 2025 - Sheet URLs.csv');

/**
 * Parse CSV file properly (handles URLs with commas)
 */
function parseCSV() {
  const content = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const sheets = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // CSV format: Sheet Name,URL
    // URL contains commas, so we need to split carefully
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
 * Match sheet name from CSV to discount summary entry
 */
function findMatchingDiscountEntry(csvSheetName) {
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
 * Fetch sheet data using GID and sheet name
 * Uses Google Workspace API MCP tool
 */
async function fetchSheetByGid(gid, sheetName) {
  const spreadsheetId = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';
  
  // Try different sheet name formats
  const nameVariations = [
    sheetName,
    `'${sheetName}'`,
    sheetName.replace(/ /g, '_'),
    sheetName.replace(/ /g, '-')
  ];
  
  // Note: This will be called via MCP tool in the main function
  // For now, return the info needed to fetch
  return { spreadsheetId, gid, nameVariations };
}

/**
 * Process one sheet
 */
async function processSheet(csvSheet, index, total) {
  console.log(`\n[${index + 1}/${total}] Processing: ${csvSheet.name}`);
  console.log(`   GID: ${csvSheet.gid}`);
  
  // Check if already completed
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  // Try to find matching discount entry
  const discountEntry = findMatchingDiscountEntry(csvSheet.name);
  
  if (discountEntry) {
    console.log(`   ✅ Matched to: ${discountEntry.pageName}`);
    console.log(`   Page: ${discountEntry.pageNumber || 'N/A'}`);
    console.log(`   Group Code: ${discountEntry.groupCode}`);
    console.log(`   Discount: ${discountEntry.discount}%`);
    
    // Skip if already completed
    if (completedNames.has(discountEntry.pageName)) {
      console.log(`   ⏭️  Already completed, skipping...`);
      return { skipped: true };
    }
  } else {
    console.log(`   ⚠️  No matching discount entry found`);
    // Still try to import if it's a LIST sheet
    if (!csvSheet.name.includes('LIST') && !csvSheet.name.includes('NET')) {
      console.log(`   ⏭️  Skipping non-pricing sheet`);
      return { skipped: true };
    }
  }
  
  // Try to fetch sheet data using GID
  console.log(`   🔍 Fetching sheet data...`);
  const sheetData = await fetchSheetByGid(csvSheet.gid);
  
  if (!sheetData) {
    console.log(`   ⚠️  Could not auto-fetch. Will need manual fetch.`);
    return { needsManualFetch: true, csvSheet, discountEntry };
  }
  
  // Import the sheet
  if (discountEntry) {
    const sheetInfo = {
      groupCode: discountEntry.groupCode,
      section: discountEntry.section,
      pageNumber: discountEntry.pageNumber,
      pageName: discountEntry.pageName,
      discountPercent: discountEntry.discount
    };
    
    try {
      await importSheet(discountEntry.pageName, csvSheet.gid, sheetInfo, sheetData);
      console.log(`   ✅ Successfully imported!`);
      return { success: true };
    } catch (error) {
      console.error(`   ❌ Import failed:`, error.message);
      return { error: error.message };
    }
  }
  
  return { skipped: true, reason: 'No discount entry match' };
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Import All Sheets From CSV\n');
  
  // Parse CSV
  console.log('📊 Parsing CSV file...');
  const csvSheets = parseCSV();
  console.log(`   Found ${csvSheets.length} sheets with GIDs\n`);
  
  // Filter to LIST sheets (we'll handle NET separately if needed)
  const listSheets = csvSheets.filter(s => s.name.includes('LIST'));
  console.log(`📋 Processing ${listSheets.length} LIST sheets\n`);
  
  // Process each sheet
  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    needsManualFetch: []
  };
  
  for (let i = 0; i < listSheets.length; i++) {
    const csvSheet = listSheets[i];
    const result = await processSheet(csvSheet, i, listSheets.length);
    
    if (result.success) {
      results.success++;
    } else if (result.skipped) {
      results.skipped++;
    } else if (result.needsManualFetch) {
      results.needsManualFetch.push(result);
      results.failed++;
    } else if (result.error) {
      results.failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${results.success}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Failed/Needs manual fetch: ${results.failed}`);
  console.log(`📄 Total processed: ${listSheets.length}`);
  
  if (results.needsManualFetch.length > 0) {
    console.log('\n⚠️  Sheets needing manual fetch:');
    results.needsManualFetch.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.csvSheet.name} (GID: ${item.csvSheet.gid})`);
    });
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { parseCSV, findMatchingDiscountEntry, processSheet };

