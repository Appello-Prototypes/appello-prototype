# Migration Results Explanation

## Why Only 7/8 ProductTypes Updated?

### ProductType Not Updated: "HVAC Equipment"

**Reason:** All 6 properties are **custom properties** that don't exist in PropertyDefinitions:

- `capacity` (Capacity (tons))
- `voltage` (Voltage)
- `phase` (Phase)
- `efficiency_rating` (Efficiency Rating (SEER))
- `warranty_years` (Warranty (years))
- `features` (Features)

**Why this is correct:**
- These are domain-specific properties for HVAC equipment
- They don't match any global PropertyDefinition
- The migration only updates properties that:
  1. Match a PropertyDefinition (by key or alias), OR
  2. Need their key changed to a canonical key

Since none of HVAC Equipment's properties match PropertyDefinitions, they remain as custom properties (which is correct).

### ProductTypes Updated (7/8)

These ProductTypes had properties that matched PropertyDefinitions:
- ✅ Pipe Insulation - `pipe_diameter`, `insulation_thickness`, `facing`, etc.
- ✅ Ductwork - `width`, `height`, `gauge`, `material`
- ✅ Fasteners - `length`, `material`
- ✅ Pipe Fittings - `pipe_diameter`, `wall_thickness`
- ✅ Duct Liner - `wall_thickness` (mapped to `insulation_thickness`)
- ✅ Fiberglass Board - `wall_thickness`
- ✅ Mineral Wool Pipe Insulation - `pipe_diameter`, `insulation_thickness`

---

## Why Only 53/82 Products Updated?

### Products Not Updated (29 products)

**Breakdown:**

1. **23 Products Have NO Variants** (nothing to migrate)
   - Examples: "2x4x8 SPF Lumber", "Plywood 4x8 1/2"", "Fiberglass Batts R-20"
   - These are simple products without variant properties
   - Migration only migrates variant properties (not base product properties in this case)

2. **6 Products Have Variants But Already Use Canonical Keys**
   - Examples:
     - "Fiberglass Pipe Insulation" - already uses `pipe_diameter`, `wall_thickness`, `facing`
     - "Galvanized Steel Ductwork" - already uses `width`, `height`, `gauge`
     - "Micro-Lok ASJ Fibreglass Pipe Insulation" - already uses canonical keys
   - These products were created after PropertyDefinitions were set up
   - Their variant properties already use canonical keys, so no update needed

### Products Updated (53/82)

These products had variant properties with **old keys** that needed migration:
- `pipe_size` → `pipe_diameter`
- `thickness` → `insulation_thickness`
- `diameter` → `pipe_diameter`
- And other mappings via PropertyDefinition aliases

**Total variant properties migrated:** 1,083 properties across 53 products

---

## Summary

### Migration Logic

The migration script only updates when:
1. ✅ Property key changes (e.g., `pipe_size` → `pipe_diameter`)
2. ✅ Property matches a PropertyDefinition (updates details like label, placeholder)

The migration does NOT update when:
1. ❌ Properties already use canonical keys (already correct)
2. ❌ Properties are custom and don't match PropertyDefinitions (intentionally custom)
3. ❌ Products have no variants (nothing to migrate)

### This is Correct Behavior!

- **HVAC Equipment** keeps its custom properties (they're domain-specific)
- **Products without variants** don't need migration (no variant properties)
- **Products with canonical keys** are already correct (no update needed)

### What Was Actually Migrated

- ✅ **18 ProductType properties** migrated to canonical keys
- ✅ **1,083 Product variant properties** migrated to canonical keys
- ✅ All properties that needed migration were successfully migrated

---

## Conclusion

The migration worked correctly! It only updated what needed to be updated:

- ✅ Properties with old keys → migrated to canonical keys
- ✅ Properties matching PropertyDefinitions → updated with better details
- ✅ Custom properties → left as-is (correctly)
- ✅ Already-correct properties → left as-is (correctly)

**The system is now fully consistent!** All properties that could be migrated have been migrated to use canonical keys from PropertyDefinitions.

