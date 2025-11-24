# Pricebook Import Workflow

## Current Status

**Completed:** Micro-Lok ASJ Fibreglass Pipe Insulation (FIBREGLASS PIPE WITH ASJ)
**Next:** FIBERGLASS FITTING 45 DEGREE (Page 1.2)

## Process for Each Sheet

### Step 1: Get Sheet Data

Since Google Sheets requires authentication, we need to get the sheet data manually or via API.

**Option A: Ask Assistant to Fetch**
- Ask: "Fetch the sheet data for [SHEET NAME]"
- Assistant will use Google Workspace API to get the data

**Option B: Manual Data File**
- Create: `scripts/sheet-data-[SHEET_NAME].json`
- Format: `[[row1], [row2], ...]` (JSON array of rows)

**Option C: Interactive Script**
- Run: `node scripts/import-next-sheet.js`
- Paste JSON data when prompted

### Step 2: Import the Sheet

```bash
node scripts/import-pricebook-sheet.js "[PAGE_NAME]" "" "[GROUP_CODE]" "[SECTION]" "[PAGE_NUMBER]" "[DISCOUNT]" --data '[JSON_DATA]'
```

Or use the interactive script:
```bash
node scripts/import-next-sheet.js
```

### Step 3: Verify

The script automatically:
- ✅ Creates/updates supplier
- ✅ Creates product with variants
- ✅ Applies discount
- ✅ Tests import (verifies variant count and pricing)

### Step 4: Check Progress

```bash
node scripts/pricebook-import-helper.js progress
```

## Next Sheet to Import

**FIBERGLASS FITTING 45 DEGREE**
- Page: 1.2
- Group Code: CAEG164
- Section: 1 (FIBREGLASS)
- Discount: 59.88%

## Notes

- Each sheet may have a different format
- The script will analyze the format automatically
- Currently supports: pipe-insulation format
- New formats can be added to `import-pricebook-sheet.js`

