# Property Migration Guide

## Overview

This migration script updates all existing ProductTypes, Products, and Specifications to use canonical property keys from the global PropertyDefinitions system instead of custom property keys.

## What It Does

1. **ProductTypes**: Updates property keys in the `properties` array and `variantSettings.variantProperties` to use canonical keys
2. **Products**: Updates property keys in `properties` Map and variant `properties` Maps to use canonical keys
3. **Specifications**: Updates property keys in `requiredProperties` Map and `propertyMatchingRules` to use canonical keys

## Key Mappings

The migration automatically maps common property key variations to canonical keys:

- `pipe_size` → `pipe_diameter`
- `diameter` → `pipe_diameter`
- `thickness` → `insulation_thickness` (if context suggests insulation)
- `wall_thickness` → `wall_thickness`
- And many more based on PropertyDefinition aliases

## Usage

### Dry Run (Recommended First)

See what would be changed without actually updating:

```bash
npm run migrate:properties:dry-run
```

### Verbose Dry Run

See detailed output for each change:

```bash
npm run migrate:properties:verbose -- --dry-run
```

### Run Migration

Apply the changes:

```bash
npm run migrate:properties
```

### Verbose Migration

See detailed output while migrating:

```bash
npm run migrate:properties:verbose
```

## Example Output

```
🚀 Starting Property Migration to Global Definitions

Mode: DRY RUN (no changes will be saved)
Verbose: OFF

✅ Connected to MongoDB

📋 Building property key mapping...
✅ Found 14 Property Definitions
✅ Built mapping for 28 keys

📦 Migrating ProductTypes...

  ✅ Pipe Insulation: Updated 2 properties (dry-run)
  ✅ Duct Liner: Updated 1 properties (dry-run)

📊 ProductTypes: 2/5 updated, 3 properties migrated

📦 Migrating Products...

  ✅ Fiberglass Pipe Insulation: Updated 5 properties, 12 variant properties (dry-run)

📊 Products: 1/10 updated, 5 properties migrated, 12 variant properties migrated

📦 Migrating Specifications...

  ✅ Chilled Water - Iron Pipe: Updated 2 properties (dry-run)

📊 Specifications: 1/3 updated, 2 properties migrated

============================================================
📊 MIGRATION SUMMARY
============================================================
ProductTypes:    2/5 updated (3 properties)
Products:        1/10 updated (5 properties, 12 variant properties)
Specifications:  1/3 updated (2 properties)

⚠️  DRY RUN MODE - No changes were saved
   Run without --dry-run to apply changes
```

## Safety Features

1. **Dry Run Mode**: Test the migration without making changes
2. **Backup Recommended**: Always backup your database before running migrations
3. **Idempotent**: Safe to run multiple times (won't duplicate changes)
4. **Error Handling**: Catches and reports errors without stopping the entire migration

## What Gets Updated

### ProductType Properties

**Before:**
```javascript
{
  key: "pipe_size",  // Old key
  label: "Pipe Size",
  type: "string"
}
```

**After:**
```javascript
{
  key: "pipe_diameter",  // Canonical key
  label: "Pipe Diameter",  // Updated from PropertyDefinition
  type: "string",
  display: {
    placeholder: "e.g., 1/2, 2, 3 1/2"  // Added from PropertyDefinition
  }
}
```

### Product Properties Map

**Before:**
```javascript
properties: Map {
  "pipe_size" => "2\"",
  "thickness" => "1 1/2\""
}
```

**After:**
```javascript
properties: Map {
  "pipe_diameter" => "2\"",
  "insulation_thickness" => "1 1/2\""
}
```

### Specification Property Matching Rules

**Before:**
```javascript
propertyMatchingRules: [{
  propertyKey: "pipe_size",  // Old key
  matchType: "exact",
  value: "2\""
}]
```

**After:**
```javascript
propertyMatchingRules: [{
  propertyKey: "pipe_diameter",  // Canonical key
  matchType: "exact",
  value: "2\""
}]
```

## Troubleshooting

### Migration doesn't find matches

If properties aren't being matched:
1. Check that PropertyDefinitions exist in the database
2. Verify aliases are set correctly in PropertyDefinitions
3. Run with `--verbose` to see which properties aren't matching

### Properties remain unchanged

If properties aren't being updated:
1. Check that the property keys actually differ from canonical keys
2. Verify PropertyDefinitions have the correct aliases
3. Some properties may be custom and intentionally not in global definitions

## After Migration

After running the migration:

1. ✅ All property keys use canonical keys from PropertyDefinitions
2. ✅ ProductTypes have updated property details (labels, placeholders, etc.)
3. ✅ Products and variants use canonical property keys
4. ✅ Specifications use canonical property keys for matching

## Rollback

If you need to rollback:

1. Restore from database backup
2. Or manually revert changes (not recommended - complex)

**Recommendation**: Always backup before running migrations!

