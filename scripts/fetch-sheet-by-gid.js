/**
 * Fetch Sheet Data by GID
 * 
 * Fetches sheet data from Google Sheets using GID instead of sheet name.
 * This is useful when sheet names have special characters or spaces.
 * 
 * Usage:
 *   node scripts/fetch-sheet-by-gid.js [spreadsheet-id] [gid] [range]
 * 
 * Example:
 *   node scripts/fetch-sheet-by-gid.js 1VkQmOFmyJq1fZKnfkI-Tdfv_KvgVl1XcnQmJ1dCRbe4 311167720 A1:Z100
 */

// This script is a helper for fetching sheets by GID
// The actual fetching will be done via MCP Google Workspace tools
// This script provides the interface and saves the data

const fs = require('fs');
const path = require('path');

/**
 * Save fetched sheet data to JSON file
 */
function saveSheetData(sheetName, gid, data) {
  const safeName = sheetName.replace(/[^a-zA-Z0-9]/g, '_');
  const dataFile = path.join(__dirname, `sheet-data-${safeName}-${gid}.json`);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  console.log(`✅ Saved sheet data to: ${dataFile}`);
  console.log(`   Rows: ${data.length}`);
  return dataFile;
}

if (require.main === module) {
  const spreadsheetId = process.argv[2];
  const gid = process.argv[3];
  const range = process.argv[4] || 'A1:Z1000';
  const dataJson = process.argv[5];
  
  if (!spreadsheetId || !gid) {
    console.error('Usage: node scripts/fetch-sheet-by-gid.js [spreadsheet-id] [gid] [range] [json-data]');
    console.error('\nOr provide data as JSON string:');
    console.error('  node scripts/fetch-sheet-by-gid.js [id] [gid] [range] \'[[row1], [row2]]\'');
    process.exit(1);
  }

  if (dataJson) {
    try {
      const data = JSON.parse(dataJson);
      const sheetName = `Sheet_${gid}`;
      saveSheetData(sheetName, gid, data);
    } catch (error) {
      console.error('Error parsing JSON data:', error.message);
      process.exit(1);
    }
  } else {
    console.log(`\n📋 Fetch Sheet by GID`);
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);
    console.log(`   GID: ${gid}`);
    console.log(`   Range: ${range}\n`);
    console.log('⚠️  This script requires sheet data to be fetched externally.');
    console.log('   Use Google Workspace MCP tool to fetch the data, then provide it as JSON.');
    console.log(`   Or manually create: scripts/sheet-data-Sheet_${gid}-${gid}.json\n`);
  }
}

module.exports = { saveSheetData };

