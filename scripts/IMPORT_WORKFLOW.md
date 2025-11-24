# Pricebook Import Workflow

## Current Status

✅ **Completed:** FIBREGLASS PIPE WITH ASJ (Micro-Lok)
📄 **Next:** FIBERGLASS FITTING 45 DEGREE (Page 1.2, Group CAEG164, Discount 59.88%)

## Process for Each Sheet

### Step 1: Get Sheet GID from Hyperlink

1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM/edit
2. Go to the first sheet (Discount Summary)
3. Find the hyperlink for "FIBERGLASS FITTING 45 DEGREE" in column E
4. Click the hyperlink (or right-click → Copy link)
5. The URL will contain `#gid=XXXXX` - copy that number

### Step 2: Fetch Sheet Data

**Option A: Use Assistant**
- Ask: "Fetch sheet data for FIBERGLASS FITTING 45 DEGREE with GID [GID]"
- Assistant will fetch and import automatically

**Option B: Manual Import**
- Run: `node scripts/import-next-sheet-with-gid.js [GID]`
- Paste JSON data when prompted

**Option C: Direct Import**
- Fetch data yourself and save to: `scripts/sheet-data-FIBERGLASS_FITTING_45_DEGREE.json`
- Run: `node scripts/import-pricebook-sheet.js "FIBERGLASS FITTING 45 DEGREE" "[GID]" "CAEG164" "1" "1.2" "59.88"`

### Step 3: Verify Import

The script automatically:
- ✅ Creates/updates supplier
- ✅ Creates product with variants
- ✅ Applies discount
- ✅ Tests import (verifies variant count and pricing)

### Step 4: Check Progress

```bash
node scripts/pricebook-import-helper.js progress
```

## Quick Commands

**Import next sheet (interactive):**
```bash
node scripts/import-next-sheet-with-gid.js
```

**Import specific sheet:**
```bash
node scripts/import-pricebook-sheet.js "[PAGE_NAME]" "[GID]" "[GROUP_CODE]" "[SECTION]" "[PAGE_NUMBER]" "[DISCOUNT]"
```

**Check progress:**
```bash
node scripts/pricebook-import-helper.js progress
```

## Next 5 Sheets to Import

1. **FIBERGLASS FITTING 45 DEGREE** (1.2, CAEG164, 59.88%)
2. **FIBERGLASS FITTING 90 DEGREE** (1.3, CAEG164, 59.88%)
3. **FIBERGLASS FITTING TEES** (1.4, CAEG164, 59.88%)
4. **FIBREGLASS RC DUCTLINER** (1.5, CAEG162, 59.88%)
5. **FIBREGLASS PM DUCTLINER** (no page #, CAEG163, 59.88%)

## Notes

- Each sheet may have a different format
- The script analyzes format automatically
- Currently supports: pipe-insulation format
- New formats can be added to `import-pricebook-sheet.js`
- GID is required to fetch sheets via API (found in hyperlink URLs)

