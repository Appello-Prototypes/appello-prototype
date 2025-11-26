# Vanos Pricebook Import Status

## Overview

Working on importing the 2025 Vanos Price Book from Google Sheets CSV file.

## Current Status

✅ **Completed:**
- Created CSV parsing script (`import-vanos-pricebook-from-csv.js`)
- Created sheet processing script (`process-vanos-sheet.js`)
- Added elastomeric pipe insulation format handler
- Format detection working correctly

⚠️ **Current Issue:**
- Prices showing "#N/A" in fetched data
- Formulas not calculating (likely referencing cells outside fetched range)
- Need to fetch calculated values instead of formulas

## CSV File Analysis

**File:** `scripts/Import 2025 Vanos Price Book - Sheet URLs.csv`
**Spreadsheet ID:** `1VkQmOFmyJq1fZKnfkI-Tdfv_KvgVl1XcnQmJ1dCRbe4`
**Total Sheets:** 130 sheets

**Sheets to Skip (metadata/config):**
- CATALOG DISCOUNTS CHANGE SHEET
- sales line discount group
- Template Work
- Logos
- SELECTION
- Product List
- APX (old)
- MENU
- CALC MARG

**Product Sheets:** ~121 sheets remaining

## Test Sheet: ELTUA

**GID:** 311167720
**Format:** Elastomeric Pipe Insulation
**Structure:**
- Interior Diameter column
- Copper Tube Size column
- Multiple thickness columns (3/8'', 1/2'', 3/4'', etc.)
- Each thickness has: List, NET, lf/ctn columns

**Issue:** All prices show "#N/A" - formulas not calculating

## Next Steps

1. **Fix Price Fetching:**
   - Investigate fetching calculated values vs formulas
   - May need to use different Google Sheets API approach
   - Or fetch larger range to include referenced cells

2. **Process Discount Sheet:**
   - Import discount information from "CATALOG DISCOUNTS CHANGE SHEET"
   - Map discounts to product sheets

3. **Batch Import:**
   - Once price fetching is fixed, process all sheets
   - Track progress and handle errors

## Scripts Created

1. `import-vanos-pricebook-from-csv.js` - Main CSV import script
2. `process-vanos-sheet.js` - Process individual sheet
3. `fetch-sheet-by-gid.js` - Helper for fetching by GID
4. Updated `import-pricebook-sheet.js` - Added elastomeric format handler

## Format Handlers

✅ **Supported Formats:**
- pipe-insulation
- fitting-matrix
- duct-liner
- board
- mineral-wool-pipe
- **elastomeric-pipe-insulation** (NEW)

## Commands

```bash
# Process a single sheet
node scripts/process-vanos-sheet.js "ELTUA" "311167720" "0"

# Import from CSV (when ready)
node scripts/import-vanos-pricebook-from-csv.js --start-from=1 --limit=5
```

