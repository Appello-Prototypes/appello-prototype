# Distributor Pricebook Import Summary

## Overview

Created a script to import the first 5 product pages from both CROSSROADS and IMPRO pricebook CSVs, following the existing import pattern used in `import-all-sheets-from-csv.js` and `import-vanos-pricebook-from-csv.js`.

## Files Created/Modified

1. **`scripts/import-distributor-pricebooks.js`** - Main import script
2. **`scripts/sheet-data-1_1_FIBREGLASS_PIPE_ASJ_LIST.json`** - Test sheet data file

## Process

### 1. CSV Parsing
- Parses both `CROSSROADS PRICEBOOK.csv` and `scripts/IMPRO PRICEBOOK.csv`
- Extracts sheet names, URLs, spreadsheet IDs, and GIDs
- Filters out metadata sheets (Discount Summary, Template Work, etc.)
- For CROSSROADS: Prefers LIST sheets over NET sheets
- For IMPRO: Includes all product sheets

### 2. Sheet Identification
- **CROSSROADS**: Extracts page number, section, and page name from sheet name format: `"1.1 FIBREGLASS PIPE ASJ LIST"`
- **IMPRO**: Uses sheet name directly (e.g., "ELTUA", "ELTUK")

### 3. Discount Matching (CROSSROADS only)
- Matches CROSSROADS sheets to discount entries from `DISCOUNT_SUMMARY` in `pricebook-import-helper.js`
- Extracts: groupCode, section, pageNumber, pageName, discountPercent

### 4. Data Fetching
- Uses Google Sheets API via Google Workspace MCP tool
- Saves fetched data as JSON files: `scripts/sheet-data-[SHEET_NAME].json`
- Format: Array of rows, where each row is an array of cell values

### 5. Import
- Calls existing `importSheet()` function from `import-pricebook-sheet.js`
- Handles format detection (pipe-insulation, fitting-matrix, duct-liner, etc.)
- Creates products with variants and pricing

## Test Results

✅ **Successfully tested with first CROSSROADS sheet:**
- Sheet: "1.1 FIBREGLASS PIPE ASJ LIST"
- GID: 1162189323
- Matched discount entry: CAEG171, Section 1, Page 1.1, Discount 67.75%
- Created: 280 variants with pricing
- Product ID: 6925dfde40d74d43f7c1c426

## First 5 Sheets Identified

### CROSSROADS:
1. 1.1 FIBREGLASS PIPE ASJ LIST (GID: 1162189323) ✅ Tested
2. 1.2 FIBREGLASS 45 DEG LIST (GID: 646084190)
3. 1.3 FIBREGLASS 90 DEG LIST (GID: 1955113407)
4. 1.4 FIBREGLASS TEE LIST (GID: 1375155269)
5. 1.5 DUCT LINER LIST (GID: 2035883707)

### IMPRO:
1. ELTUA (GID: 311167720)
2. ELTUK (GID: 1464653345)
3. ELTCA (GID: 1124165374)
4. ELTCK (GID: 333928831)
5. ELTLSA (GID: 120545748)

## Usage

### Test Mode (one sheet):
```bash
node scripts/import-distributor-pricebooks.js --test
```

### Import specific distributor:
```bash
node scripts/import-distributor-pricebooks.js --distributor=CROSSROADS
node scripts/import-distributor-pricebooks.js --distributor=IMPRO
```

### Import all first 5 sheets:
```bash
node scripts/import-distributor-pricebooks.js
```

## Data Setup Requirements

For each sheet to import, you need to:

1. **Fetch sheet data** using Google Sheets API:
   - Use Google Workspace MCP tool: `sheets_get_values`
   - Spreadsheet ID and sheet name from CSV
   - Save as: `scripts/sheet-data-[SHEET_NAME].json`

2. **Add manufacturer info** (if not in sheet):
   - Add a row with "Supplier:" label and manufacturer name
   - Example: `["","","","","","","","Supplier:","Micro-Lok"]`

3. **Re-run import script** - it will automatically use the data file

## Known Limitations

1. **Distributor Hardcoding**: The `importSheet()` function uses `getImportDistributor()` which is hardcoded to IMPRO. For CROSSROADS sheets, products will be imported with IMPRO as distributor. This may need to be addressed later.

2. **Manufacturer Extraction**: The import expects a "Supplier:" field in the sheet data. If not present, manufacturer must be added manually to the data file.

3. **Discount Info**: IMPRO sheets don't have discount summary matching - discount info would need to be added manually or fetched from IMPRO's discount sheet.

## Next Steps

1. ✅ Test import with one sheet - **COMPLETED**
2. Fetch data for remaining 9 sheets (4 CROSSROADS + 5 IMPRO)
3. Import all 10 sheets
4. Verify products created correctly
5. Address distributor assignment for CROSSROADS sheets (if needed)
6. Set up discount info for IMPRO sheets (if needed)

## Notes

- The script follows the exact same pattern as existing import scripts
- Uses existing `importSheet()` function - no modifications needed
- Progress tracking via `pricebook-import-progress.json`
- Supports both manual data files and Google Sheets API fetching


