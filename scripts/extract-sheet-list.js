/**
 * Extract Sheet List from Discount Summary
 * 
 * Parses the first sheet (discount summary) to extract all sheet names
 * and their metadata for importing.
 */

require('dotenv').config({ path: '.env.local', override: true });

const SHEET_DATA = [
  ["CONFIDENTIAL DISCOUNT SUMMARY"],
  [],
  ["Customer", "", "Vanos Insulation"],
  ["Contact", "", "Matt"],
  ["Effective", "", "1/6/2025"],
  [],
  [],
  ["Group No.", "Sec #", "Section", "Pg #", "Price Page", "Effective date", "Replacing date", "Discount"],
  ["CAEG171", "1", "FIBREGLASS", "1.1", "FIBREGLASS PIPE WITH ASJ", "6-Jan-25", "8-Jan-24", "67.75%"],
  ["CAEG164", "", "", "1.2", "FIBERGLASS FITTING 45 DEGREE", "6-Jan-25", "8-Jan-24", "59.88%"],
  // ... rest of the data
];

/**
 * Parse the discount summary to extract sheet information
 */
function extractSheetList(data) {
  const sheets = [];
  let headers = null;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Find header row
    if (row && row.length > 0 && row[0] === 'Group No.') {
      headers = row;
      continue;
    }
    
    // Skip empty rows or non-data rows
    if (!row || row.length < 5 || !row[0] || row[0] === 'Group No.') {
      continue;
    }
    
    // Extract sheet info
    const groupCode = row[0]?.trim() || '';
    const section = row[1]?.trim() || '';
    const sectionName = row[2]?.trim() || '';
    const pageNumber = row[3]?.trim() || '';
    const pageName = row[4]?.trim() || '';
    const discount = row[7]?.trim() || '';
    
    // Skip if no page name
    if (!pageName) continue;
    
    // Parse discount percentage
    const discountPercent = discount ? parseFloat(discount.replace('%', '')) : null;
    
    sheets.push({
      groupCode,
      section: section || (sheets.length > 0 ? sheets[sheets.length - 1].section : ''),
      sectionName: sectionName || (sheets.length > 0 ? sheets[sheets.length - 1].sectionName : ''),
      pageNumber,
      pageName,
      discountPercent
    });
  }
  
  return sheets;
}

if (require.main === module) {
  // This will be populated from the actual API call
  const sheets = extractSheetList(SHEET_DATA);
  console.log(JSON.stringify(sheets, null, 2));
}

module.exports = { extractSheetList };

