# Distributor/Manufacturer Relationship Fix

## Overview

This script fixes distributor and manufacturer relationships for all imported products based on the pricebook CSV files:
- **IMPRO PRICEBOOK.csv**: All products should have IMPRO as distributor
- **CROSSROADS PRICEBOOK.csv**: All products should have Crossroads C&I as distributor

Manufacturers are determined from the sheet/page names in the pricebooks.

## What It Does

1. **Loads Pricebook Mappings**: Reads both CSV files to understand which sheets belong to which distributor
2. **Determines Distributor**: Matches products to distributors based on:
   - Page number format (Crossroads uses "1.1", "2.3", etc.)
   - Group codes (IMPRO uses codes like "ELTUA", "APK")
   - Page name patterns
3. **Extracts Manufacturer**: Determines manufacturer from:
   - Page names (e.g., "JM MINERAL WOOL" = Johns Manville)
   - Group codes (IMPRO codes map to manufacturers)
   - Existing manufacturer data (preserves if correct)
4. **Updates Products**: 
   - Sets correct `distributorId`
   - Sets correct `manufacturerId`
   - Updates `suppliers` array entries with correct distributor/manufacturer
5. **Creates Relationships**: Establishes distributor-supplier relationships in Company model

## Usage

### Dry Run (Recommended First)

```bash
npm run fix:distributor-manufacturer:dry-run
```

This will show you what changes would be made without actually updating the database.

### Apply Fixes

```bash
npm run fix:distributor-manufacturer
```

This will actually update the database with the fixes.

## Manufacturer Mappings

### Crossroads Pricebook Manufacturers

- **Johns Manville**: FIBREGLASS products, JM MINERAL WOOL
- **Rockwool**: MINERAL WOOL products, ROCKWOOL, CCI MW, FABROCK, COMFORT, CROSSROCK, SAFE
- **Armacell**: ARMAFLEX products
- **Dow**: DOW STYROFOAM, HIGHLOAD, CAVITYMATE
- **Foamglas**: FOAMGLAS products
- **Calcium Silicate**: CALSIL, CAL SIL products
- **3M**: 3M products
- **Henry**: HENRY products
- **Others**: NUTEC, SUPERWOOL, ASPEN, DYNAIR, LEWCO, BUCKAROO

### IMPRO Pricebook Manufacturers

Most IMPRO products are **Armacell** products (based on sheet codes like ELTUA, APK, etc.)

## Matching Logic

### Distributor Matching

1. **Primary Check**: Page number format
   - Crossroads: `1.1`, `2.3`, etc. (decimal format)
   - IMPRO: No decimal page numbers

2. **Secondary Check**: Group code matching
   - IMPRO: Short codes like "ELTUA", "APK"
   - Crossroads: Longer descriptive names

3. **Tertiary Check**: Page name patterns
   - Matches page names to sheet names in CSV files

### Manufacturer Matching

1. **Specific Mentions**: Looks for manufacturer names in page names
2. **Abbreviations**: "JM" = Johns Manville, "CCI MW" = Rockwool
3. **Product Type Defaults**: 
   - FIBREGLASS → Johns Manville
   - MINERAL WOOL → Rockwool
4. **Group Code Mapping**: IMPRO codes map to manufacturers

## Output

The script provides:
- Total products processed
- Number of distributor fixes
- Number of manufacturer fixes
- Number of supplier entry fixes
- Number of relationships created
- List of products needing manual review

## Products Needing Review

Some products may not match clearly to a distributor. These will be listed in the output for manual review. Common reasons:
- Missing pricebook metadata
- Unusual page number formats
- Sheet names not in CSV files

## Notes

- The script preserves existing correct data
- It only updates when it finds a better match
- Distributor-supplier relationships are automatically created
- All changes are logged for review

