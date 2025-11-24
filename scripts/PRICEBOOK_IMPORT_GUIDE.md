# Pricebook Import Guide

This guide explains how to import products from the pricebook Google Sheets document one sheet at a time.

## Overview

The pricebook contains multiple sheets (tabs), each representing a different product category/page. Each sheet may have a different format, so we process them one at a time.

## Process

### Step 1: Identify the Sheet to Import

From the discount summary, identify which product page you want to import. Each page has:
- **Page Name**: e.g., "FIBREGLASS PIPE WITH ASJ"
- **Page Number**: e.g., "1.1"
- **Group Code**: e.g., "CAEG171"
- **Section**: e.g., "1" (FIBREGLASS)
- **Discount**: e.g., "67.75%"

### Step 2: Fetch Sheet Data

You can fetch sheet data in two ways:

**Option A: Using Google Workspace MCP Tool**
Ask the assistant to fetch the sheet data for you.

**Option B: Manual Data File**
Create a JSON file: `scripts/sheet-data-[SHEET_NAME].json`
Format: Array of rows, where each row is an array of cell values
```json
[
  ["Header1", "Header2", "Header3"],
  ["Data1", "Data2", "Data3"],
  ["Data4", "Data5", "Data6"]
]
```

### Step 3: Run Import Script

```bash
node scripts/import-pricebook-sheet.js "[PAGE_NAME]" "" "[GROUP_CODE]" "[SECTION]" "[PAGE_NUMBER]" "[DISCOUNT]"
```

Example:
```bash
node scripts/import-pricebook-sheet.js "FIBERGLASS FITTING 45 DEGREE" "" "CAEG164" "1" "1.2" "59.88"
```

### Step 4: Verify Import

The script automatically tests the import by:
- Verifying the product was created
- Checking variant count matches expected
- Ensuring variants have pricing data

### Step 5: Check Progress

```bash
node scripts/pricebook-import-helper.js progress
```

## Progress Tracking

Progress is saved to `scripts/pricebook-import-progress.json`:
- **Completed**: List of successfully imported sheets
- **Failed**: List of failed imports with error messages
- **Last Updated**: Timestamp of last update

## Supported Formats

Currently supported:
- **pipe-insulation**: Copper/Iron diameter columns + thickness price columns

To add support for new formats, edit `scripts/import-pricebook-sheet.js` and add a new case in the `processPipeInsulationSheet` function or create a new processor function.

## Next Steps

1. Start with the first unimported sheet
2. Fetch its data (ask assistant or create data file)
3. Run import script
4. Verify results
5. Move to next sheet

## Troubleshooting

**"Sheet data not found"**
- Create the data file manually, or
- Ask assistant to fetch it using Google Workspace API

**"Unsupported format"**
- Analyze the sheet structure
- Add a new format handler to the import script

**"No variants found"**
- Check that the sheet has data rows
- Verify the data format matches expected structure

