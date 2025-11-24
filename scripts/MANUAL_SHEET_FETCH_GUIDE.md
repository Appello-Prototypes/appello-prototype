# Manual Sheet Fetch Guide

## Current Challenge

The Google Sheets API requires exact sheet tab names, but we're having trouble accessing sheets with spaces in their names. To continue importing sheets one by one, we need to:

1. **Get the GID for each sheet** (from the URL when you click on the sheet tab)
2. **Or fetch the sheet data directly** using the Google Workspace API

## Process

### Option 1: Extract GIDs Manually

1. Open the spreadsheet: https://docs.google.com/spreadsheets/d/1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM/edit
2. For each sheet tab:
   - Click on the tab
   - Look at the URL - it will have `#gid=XXXXX`
   - Copy that number
3. Run: `node scripts/get-sheet-gid.js [paste-url]` to extract the GID
4. Then: `node scripts/import-next-sheet-with-gid.js [gid]`

### Option 2: Fetch Sheet Data Directly

1. Open the spreadsheet
2. Navigate to each sheet tab
3. Copy the sheet data as JSON (array of rows)
4. Run: `node scripts/import-pricebook-sheet.js "[PAGE_NAME]" "" "[GROUP_CODE]" "[SECTION]" "[PAGE_NUMBER]" "[DISCOUNT]" --data '[JSON_DATA]'`

### Option 3: Use Browser Extension

If the browser extension is available:
1. Navigate to each sheet tab
2. Extract the data
3. Import it

## Next Sheet to Process

**FIBERGLASS FITTING 45 DEGREE**
- Page: 1.2
- Group Code: CAEG164
- Section: 1
- Discount: 59.88%

## Quick Commands

```bash
# Check progress
node scripts/pricebook-import-helper.js progress

# Get next sheet info
node scripts/process-sheets-manually.js

# Import with GID
node scripts/import-next-sheet-with-gid.js [GID]

# Import with data
node scripts/import-pricebook-sheet.js "[NAME]" "" "[CODE]" "[SEC]" "[PAGE]" "[DISC]" --data '[JSON]'
```

