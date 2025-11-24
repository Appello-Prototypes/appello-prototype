# Property Migration to Global Definitions - Ready ✅

## Overview

A comprehensive migration script has been created to update all existing ProductTypes, Products, and Specifications to use canonical property keys from the global PropertyDefinitions system.

---

## ✅ What Was Created

### 1. Migration Script
**File:** `scripts/migrate-properties-to-global-definitions.js`

**Features:**
- ✅ Migrates ProductType properties to canonical keys
- ✅ Migrates Product properties (base and variants) to canonical keys
- ✅ Migrates Specification properties to canonical keys
- ✅ Dry-run mode for safe testing
- ✅ Verbose mode for detailed output
- ✅ Comprehensive error handling
- ✅ Detailed statistics and reporting

### 2. Migration Guide
**File:** `scripts/MIGRATION_GUIDE.md`

Complete documentation including:
- Usage instructions
- Example output
- Safety features
- Troubleshooting guide

### 3. NPM Scripts
Added to `package.json`:
- `npm run migrate:properties` - Run migration
- `npm run migrate:properties:dry-run` - Test without changes
- `npm run migrate:properties:verbose` - Detailed output

---

## 🧪 Test Results

**Dry-run test on dev database:**
```
✅ Found 14 Property Definitions
✅ Built mapping for 34 keys (canonical + aliases)

ProductTypes:    7/8 updated (18 properties)
Products:        8 products with variant properties to migrate
Specifications:  Ready for migration
```

**Key Mappings Found:**
- `pipe_size` → `pipe_diameter`
- `thickness` → `insulation_thickness`
- `diameter` → `pipe_diameter`
- And many more via PropertyDefinition aliases

---

## 🚀 How to Run

### Step 1: Test Migration (Dry Run)

```bash
npm run migrate:properties:dry-run
```

This shows what would be changed without actually updating the database.

### Step 2: Review Output

Check the migration summary:
- How many ProductTypes will be updated
- How many Products will be updated
- How many Specifications will be updated

### Step 3: Run Migration

```bash
npm run migrate:properties
```

This applies the changes to the database.

### Step 4: Verify

After migration:
1. Check ProductTypes - properties should use canonical keys
2. Check Products - property keys should be canonical
3. Check Specifications - property matching rules should use canonical keys

---

## 📊 What Gets Migrated

### ProductTypes
- Property keys in `properties` array
- Property details updated from PropertyDefinitions (labels, placeholders, etc.)
- Variant property keys in `variantSettings.variantProperties`

### Products
- Property keys in `properties` Map
- Variant property keys in `variants[].properties` Map

### Specifications
- Property keys in `requiredProperties` Map
- Property keys in `propertyMatchingRules[].propertyKey`

---

## 🔄 Example Migration

### Before Migration

**ProductType Property:**
```javascript
{
  key: "pipe_size",  // Old key
  label: "Pipe Size",
  type: "string"
}
```

**Product Properties:**
```javascript
properties: Map {
  "pipe_size" => "2\"",
  "thickness" => "1 1/2\""
}
```

### After Migration

**ProductType Property:**
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

**Product Properties:**
```javascript
properties: Map {
  "pipe_diameter" => "2\"",
  "insulation_thickness" => "1 1/2\""
}
```

---

## ⚠️ Important Notes

### Database Selection

The migration script uses:
- **MONGODB_DEV_URI** (preferred for local development)
- Falls back to **MONGODB_URI** (production)

**⚠️ WARNING:** Make sure you're running against the correct database!

### Backup Recommended

Always backup your database before running migrations:

```bash
# MongoDB backup example
mongodump --uri="your-connection-string" --out=backup-$(date +%Y%m%d)
```

### Idempotent

The migration is safe to run multiple times - it won't duplicate changes.

---

## 📈 Migration Statistics

Based on dry-run test:

- **Property Definitions:** 14 found
- **Property Key Mappings:** 34 (canonical + aliases)
- **ProductTypes:** 7/8 will be updated (18 properties)
- **Products:** 8 products with variant properties to migrate
- **Specifications:** Ready for migration

---

## ✅ Status

**Migration script is ready to use!**

1. ✅ Script created and tested
2. ✅ Dry-run mode working
3. ✅ Property mappings verified
4. ✅ Documentation complete
5. ✅ NPM scripts added

**Next Steps:**
1. Review dry-run output
2. Backup database
3. Run migration
4. Verify results

---

## 🎯 Benefits After Migration

- ✅ **Consistency**: All properties use canonical keys
- ✅ **No Typos**: Can't have `pipe_size` vs `pipe_diameter` confusion
- ✅ **Better Matching**: Specifications will match products correctly
- ✅ **Standardized**: All product types use same property keys
- ✅ **Future-Proof**: New properties will use dropdowns automatically

---

**Ready to migrate!** 🚀

