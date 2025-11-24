/**
 * Fetch Sheet Data from Google Sheets
 * 
 * Fetches data from a specific sheet and saves it to a JSON file
 * for use by the import script.
 * 
 * Usage:
 *   node scripts/fetch-sheet-data.js [sheet-name] [range]
 * 
 * Example:
 *   node scripts/fetch-sheet-data.js "FIBREGLASS PIPE WITH ASJ" "A1:Z1000"
 */

const fs = require('fs');
const path = require('path');

// This script will be called with sheet data fetched via MCP tool
// The actual fetching happens via the MCP Google Workspace tool

async function saveSheetData(sheetName, data) {
  const dataFile = path.join(__dirname, `sheet-data-${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  console.log(`✅ Saved sheet data to: ${dataFile}`);
  console.log(`   Rows: ${data.length}`);
  return dataFile;
}

if (require.main === module) {
  const sheetName = process.argv[2];
  const dataJson = process.argv[3];
  
  if (!sheetName || !dataJson) {
    console.error('Usage: node scripts/fetch-sheet-data.js [sheet-name] [json-data]');
    console.error('\nOr provide data as JSON string:');
    console.error('  node scripts/fetch-sheet-data.js "Sheet Name" \'[[row1], [row2]]\'');
    process.exit(1);
  }

  try {
    const data = JSON.parse(dataJson);
    saveSheetData(sheetName, data);
  } catch (error) {
    console.error('Error parsing JSON data:', error.message);
    process.exit(1);
  }
}

module.exports = { saveSheetData };

