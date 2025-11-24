# Multi-Unit System Architecture

## Problem Statement

**Current Issue:**
- Products can be added with properties in different units (imperial vs metric)
- Example: `width: "12"` (inches) vs `width: "300"` (mm)
- Searching/filtering fails because values aren't normalized
- No way to compare "12 inches" with "300 mm" (same value, different units)

**Question:** Do we need separate properties for metric vs imperial?

**Answer:** **NO** - We use a single property with unit conversion.

---

## Solution: Single Property + Unit Conversion

### Architecture

```
PropertyDefinition (Global)
├── key: "width"
├── unitSystem: "both" (supports imperial AND metric)
└── unitOfMeasureId: [ref to UnitOfMeasure]

    ↓ (used by)

Product Property Value
├── value: 12 (or 300)
├── unit: "in" (or "mm")
└── normalizedValue: 304.8 (always stored in base unit: mm)

    ↓ (for search/filter)

Search Query
├── userQuery: "width = 12 inches"
├── normalized: 304.8 mm
└── matches: All products with width ≈ 304.8 mm (regardless of original unit)
```

---

## Implementation Strategy

### Phase 1: Store Value + Unit ✅ (Current)

**Product Property Storage:**
```javascript
// Current (simple)
properties: {
  width: "12"  // Unit unknown!
}

// Enhanced (with unit)
properties: {
  width: {
    value: 12,
    unit: "in",  // or "mm", "ft", etc.
    normalizedValue: 304.8  // Always in base unit (mm for length)
  }
}
```

**Benefits:**
- ✅ Unit is always known
- ✅ Normalized value enables cross-unit comparison
- ✅ Original unit preserved for display

### Phase 2: Unit Conversion Service ✅ (New)

**Location:** `src/server/services/unitConversionService.js`

**Functions:**
- `normalizeToBase(value, unit, type)` - Convert to base unit
- `convert(value, fromUnit, toUnit, type)` - Convert between units
- `compareValues(value1, unit1, value2, unit2)` - Compare across units
- `isInRange(value, valueUnit, min, minUnit, max, maxUnit)` - Range queries

**Base Units:**
- Length: `mm` (millimeters)
- Area: `sq_m` (square meters)
- Volume: `l` (liters)
- Weight: `kg` (kilograms)
- Temperature: `c` (Celsius)

### Phase 3: Enhanced Property Storage

**Update Product Model:**
```javascript
// Property value can be:
// 1. Simple value (backward compatible)
properties: {
  width: "12"  // Legacy format
}

// 2. Value with unit (new format)
properties: {
  width: {
    value: 12,
    unit: "in",
    normalizedValue: 304.8
  }
}
```

**Migration Strategy:**
- Keep backward compatibility
- Auto-detect unit from PropertyDefinition when saving
- Normalize on save if unit is known

### Phase 4: Search/Filter Enhancement

**Current Search:**
```javascript
// Fails: "12" !== "300"
Product.find({ 'properties.width': '12' })
```

**Enhanced Search:**
```javascript
// Works: Normalizes both values to base unit
const normalizedQuery = normalizeToBase(12, 'in', 'length'); // 304.8 mm
Product.find({
  $or: [
    { 'properties.width.normalizedValue': normalizedQuery },
    { 'properties.width': normalizedQuery } // Legacy support
  ]
})
```

---

## Example: Width Property

### PropertyDefinition

```javascript
{
  key: "width",
  label: "Width",
  unitSystem: "both",  // Supports both imperial and metric
  unitOfMeasureId: [ref to "Length" category],
  standardValues: [
    // Imperial
    { displayValue: "12\"", normalizedValue: 304.8, unit: "in" },
    { displayValue: "24\"", normalizedValue: 609.6, unit: "in" },
    // Metric
    { displayValue: "300mm", normalizedValue: 300, unit: "mm" },
    { displayValue: "600mm", normalizedValue: 600, unit: "mm" }
  ]
}
```

### Product A (Imperial)

```javascript
{
  name: "US Ductwork",
  properties: {
    width: {
      value: 12,
      unit: "in",
      normalizedValue: 304.8  // Auto-calculated on save
    }
  }
}
```

### Product B (Metric)

```javascript
{
  name: "European Ductwork",
  properties: {
    width: {
      value: 300,
      unit: "mm",
      normalizedValue: 300  // Auto-calculated on save
    }
  }
}
```

### Search Query: "width = 12 inches"

```javascript
// 1. Normalize query value
const queryNormalized = normalizeToBase(12, 'in', 'length'); // 304.8 mm

// 2. Search with tolerance
Product.find({
  $or: [
    // New format
    {
      'properties.width.normalizedValue': {
        $gte: queryNormalized - 1,  // Tolerance: ±1mm
        $lte: queryNormalized + 1
      }
    },
    // Legacy format (if unit can be inferred)
    {
      'properties.width': {
        $gte: 11.96,  // 304.8mm / 25.4 = 12in (with tolerance)
        $lte: 12.04
      }
    }
  ]
})

// Result: Finds BOTH Product A (12in) AND Product B (300mm ≈ 11.8in)
```

---

## User Experience

### Product Entry

**Imperial Product:**
```
Width: [12] [in ▼]
  → Stored as: { value: 12, unit: "in", normalizedValue: 304.8 }
```

**Metric Product:**
```
Width: [300] [mm ▼]
  → Stored as: { value: 300, unit: "mm", normalizedValue: 300 }
```

### Search/Filter

**User searches:** "Width = 12 inches"

**System:**
1. Normalizes query: `12 in` → `304.8 mm`
2. Searches normalized values: `304.8 mm ± tolerance`
3. Finds:
   - Product A: `12 in` (304.8 mm) ✅
   - Product B: `300 mm` (300 mm ≈ 11.8 in) ✅
   - Product C: `305 mm` (305 mm ≈ 12.0 in) ✅

**Display:**
- Product A: "12 in" (original unit)
- Product B: "300 mm" (original unit) OR "11.8 in" (converted, if user prefers imperial)

---

## Migration Path

### Step 1: Update PropertyDefinition ✅
- Set `unitSystem: "both"` for dimension properties
- Add standardValues for both imperial and metric

### Step 2: Create Unit Conversion Service ✅
- Implement conversion functions
- Test with various units

### Step 3: Update Product Model (Next)
- Support both simple and enhanced property format
- Auto-normalize on save

### Step 4: Update Search/Filter (Next)
- Normalize query values
- Search normalized values

### Step 5: Update UI (Next)
- Show unit selector
- Display converted values
- Allow unit preference

---

## Benefits

### ✅ Single Property Definition
- One `width` property, not `width_imperial` and `width_metric`
- Easier to maintain
- Consistent across product types

### ✅ Automatic Conversion
- Search "12 inches" finds "300 mm" products
- Filter works across units
- No manual conversion needed

### ✅ Flexible Display
- Show in original unit
- Or convert to user's preference
- Or show both: "300 mm (11.8 in)"

### ✅ Backward Compatible
- Legacy products still work
- Gradual migration possible
- No breaking changes

---

## Next Steps

1. ✅ **Unit Conversion Service** - Created
2. 🔄 **Update Product Model** - Support enhanced property format
3. 🔄 **Update Search/Filter** - Normalize queries
4. 🔄 **Update UI** - Unit selector, conversion display
5. 🔄 **Migration Script** - Convert existing products

---

## Conclusion

**Answer to your question:**

> "Do we need separate properties for metric vs imperial?"

**NO** - We use:
- ✅ **Single property** (`width`)
- ✅ **Value + unit** storage (`{ value: 12, unit: "in" }`)
- ✅ **Normalized value** for comparison (`normalizedValue: 304.8`)
- ✅ **Unit conversion** for search/filter

This approach is:
- ✅ Industry standard (used by major estimating software)
- ✅ Scalable (works for any unit system)
- ✅ User-friendly (automatic conversion)
- ✅ Maintainable (single property definition)

