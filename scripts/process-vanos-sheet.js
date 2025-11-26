/**
 * Process Vanos Pricebook Sheet
 * 
 * Processes a single sheet from the Vanos pricebook by fetching data
 * and importing products/variants with discounts.
 * 
 * Usage:
 *   node scripts/process-vanos-sheet.js [sheet-name] [gid] [discount-percent]
 * 
 * Example:
 *   node scripts/process-vanos-sheet.js "ELTUA" "311167720" "0"
 */

require('dotenv').config({ path: '.env.local', override: true });
const { importSheet } = require('./import-pricebook-sheet');
const SPREADSHEET_ID = '1VkQmOFmyJq1fZKnfkI-Tdfv_KvgVl1XcnQmJ1dCRbe4';

async function processVanosSheet(sheetName, gid, discountPercent = null) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📄 Processing Vanos Sheet: ${sheetName}`);
  console.log(`   GID: ${gid}`);
  console.log(`   Discount: ${discountPercent || 'Not specified'}%`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Prepare sheet info
  const sheetInfo = {
    groupCode: null,
    section: null,
    pageNumber: null,
    pageName: sheetName,
    discountPercent: discountPercent ? parseFloat(discountPercent) : null
  };
  
  try {
    // Import the sheet (data should be fetched externally and passed)
    // For now, this will use the existing importSheet function
    // which expects data to be in a file or provided directly
    
    console.log('⚠️  Note: Sheet data must be fetched using Google Sheets API');
    console.log('   Use MCP Google Workspace tool to fetch data, then provide it\n');
    
    // The importSheet function will look for data file or expect providedData
    const result = await importSheet(
      sheetName,
      gid,
      sheetInfo,
      null // providedData - will be set when fetching via MCP
    );
    
    console.log(`\n✅ Successfully processed: ${sheetName}`);
    return result;
    
  } catch (error) {
    console.error(`\n❌ Error processing sheet ${sheetName}:`, error.message);
    throw error;
  }
}

if (require.main === module) {
  const sheetName = process.argv[2];
  const gid = process.argv[3];
  const discountPercent = process.argv[4];
  
  if (!sheetName || !gid) {
    console.error('Usage: node scripts/process-vanos-sheet.js [sheet-name] [gid] [discount-percent]');
    console.error('\nExample:');
    console.error('  node scripts/process-vanos-sheet.js "ELTUA" "311167720" "0"');
    process.exit(1);
  }
  
  processVanosSheet(sheetName, gid, discountPercent)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { processVanosSheet, SPREADSHEET_ID };

