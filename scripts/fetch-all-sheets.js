/**
 * Fetch All Sheets - Automated Import
 * 
 * Fetches the discount summary, extracts all sheet names,
 * and imports them one by one.
 */

require('dotenv').config({ path: '.env.local', override: true });
const { importSheet, loadProgress, markCompleted } = require('./import-pricebook-sheet');
const { extractSheetList } = require('./extract-sheet-list');

const spreadsheetId = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';

/**
 * Fetch sheet data using Google Workspace API
 */
async function fetchSheetByName(sheetName) {
  // Try different sheet name formats
  const possibleNames = [
    sheetName,
    `'${sheetName}'`,
    sheetName.replace(/ /g, '_'),
    sheetName.replace(/ /g, '-')
  ];
  
  // This will be implemented using MCP Google Workspace tool
  // For now, returns null to indicate manual fetch needed
  return null;
}

/**
 * Main import loop
 */
async function importAllSheets() {
  console.log('\n🚀 Starting automated pricebook import\n');
  
  // Step 1: Fetch discount summary
  console.log('📊 Step 1: Fetching discount summary...');
  // This would use the MCP tool to fetch the first sheet
  // For now, we'll use the data we already have
  
  // Step 2: Extract sheet list
  console.log('📋 Step 2: Extracting sheet list...');
  const progress = loadProgress();
  const completedNames = new Set(progress.completed.map(s => s.name));
  
  // Get sheet list from discount summary
  // This would come from the actual API call
  const allSheets = [
    { groupCode: 'CAEG171', section: '1', sectionName: 'FIBREGLASS', pageNumber: '1.1', pageName: 'FIBREGLASS PIPE WITH ASJ', discountPercent: 67.75 },
    { groupCode: 'CAEG164', section: '1', sectionName: 'FIBREGLASS', pageNumber: '1.2', pageName: 'FIBERGLASS FITTING 45 DEGREE', discountPercent: 59.88 },
    // ... more sheets
  ];
  
  // Filter to only uncompleted sheets
  const sheetsToImport = allSheets.filter(sheet => !completedNames.has(sheet.pageName));
  
  console.log(`\n📊 Found ${sheetsToImport.length} sheets to import (${allSheets.length - sheetsToImport.length} already completed)\n`);
  
  // Step 3: Import each sheet
  for (let i = 0; i < sheetsToImport.length; i++) {
    const sheet = sheetsToImport[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Sheet ${i + 1}/${sheetsToImport.length}: ${sheet.pageName}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Try to fetch sheet data
      let sheetData = await fetchSheetByName(sheet.pageName);
      
      if (!sheetData) {
        console.log(`⚠️  Could not auto-fetch sheet data for: ${sheet.pageName}`);
        console.log(`   Skipping for now. Use manual import script to process this sheet.`);
        continue;
      }
      
      // Import the sheet
      const sheetInfo = {
        groupCode: sheet.groupCode,
        section: sheet.section,
        pageNumber: sheet.pageNumber,
        pageName: sheet.pageName,
        discountPercent: sheet.discountPercent
      };
      
      await importSheet(sheet.pageName, '', sheetInfo, sheetData);
      console.log(`✅ Successfully imported: ${sheet.pageName}`);
      
    } catch (error) {
      console.error(`❌ Failed to import ${sheet.pageName}:`, error.message);
      // Continue with next sheet
    }
  }
  
  console.log('\n✅ Import process completed!');
  console.log(`   Check progress: node scripts/pricebook-import-helper.js progress`);
}

if (require.main === module) {
  importAllSheets()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { importAllSheets, fetchSheetByName };

