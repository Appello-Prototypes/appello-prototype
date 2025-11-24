# Multi-Unit System Implementation Plan

## Your Question Answered

> "For any property that could have products in either metric or imperial, don't we need to have a property for each?"

**Answer: NO** - We use **one property with unit conversion**.

---

## The Solution

### Single Property + Unit Storage

**Instead of:**
```
❌ width_imperial: "12"
❌ width_metric: "300"
```

**We use:**
```
✅ width: { value: 12, unit: "in", normalizedValue: 304.8 }
✅ width: { value: 300, unit: "mm", normalizedValue: 300 }
```

**Key:** Both store `normalizedValue` in base unit (mm for length), enabling comparison.

---

## How Search/Filter Works

### Example: Search "width = 12 inches"

**Step 1: Normalize Query**
```javascript
const queryValue = 12; // inches
const normalizedQuery = normalizeToBase(12, 'in', 'length'); // 304.8 mm
```

**Step 2: Search Normalized Values**
```javascript
Product.find({
  $or: [
    // New format (with unit)
    {
      'properties.width.normalizedValue': {
        $gte: normalizedQuery - 1,  // Tolerance: ±1mm
        $lte: normalizedQuery + 1
      }
    },
    // Legacy format (backward compatibility)
    {
      'properties.width': {
        $gte: 11.96,  // 304.8mm / 25.4 = 12in (with tolerance)
        $lte: 12.04
      }
    }
  ]
})
```

**Step 3: Results**
- ✅ Product A: `width: { value: 12, unit: "in" }` → normalizedValue: 304.8 mm
- ✅ Product B: `width: { value: 300, unit: "mm" }` → normalizedValue: 300 mm ≈ 11.8 in
- ✅ Product C: `width: { value: 305, unit: "mm" }` → normalizedValue: 305 mm ≈ 12.0 in

**All found!** Because normalized values are compared.

---

## Implementation Steps

### ✅ Step 1: Unit Conversion Service (DONE)
- Created `src/server/services/unitConversionService.js`
- Handles conversion between units
- Normalizes to base units

### 🔄 Step 2: Update Product Model (NEXT)
- Support enhanced property format
- Auto-normalize on save
- Backward compatible

### 🔄 Step 3: Update Search/Filter (NEXT)
- Normalize query values
- Search normalized values
- Handle both formats

### 🔄 Step 4: Update UI (NEXT)
- Unit selector dropdown
- Show converted values
- User preference

---

## Property Storage Format

### Current (Simple)
```javascript
properties: {
  width: "12"  // Unit unknown!
}
```

### Enhanced (With Unit)
```javascript
properties: {
  width: {
    value: 12,
    unit: "in",
    normalizedValue: 304.8  // Auto-calculated
  }
}
```

### Backward Compatible
```javascript
// Both formats work:
properties: {
  width: "12"  // Legacy - unit inferred from PropertyDefinition
}

properties: {
  width: { value: 12, unit: "in", normalizedValue: 304.8 }  // New
}
```

---

## PropertyDefinition Updates

### Set `unitSystem: "both"` for Dimension Properties

```javascript
{
  key: "width",
  label: "Width",
  unitSystem: "both",  // ✅ Supports both imperial AND metric
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

---

## Search Example: Real-World Scenario

### Products in Database

**Product A (US Supplier):**
```javascript
{
  name: "US Ductwork",
  properties: {
    width: { value: 12, unit: "in", normalizedValue: 304.8 }
  }
}
```

**Product B (European Supplier):**
```javascript
{
  name: "European Ductwork",
  properties: {
    width: { value: 300, unit: "mm", normalizedValue: 300 }
  }
}
```

### User Searches: "width = 12 inches"

**System Process:**
1. Normalize query: `12 in` → `304.8 mm`
2. Search: Find products where `normalizedValue` ≈ `304.8 mm`
3. Results:
   - Product A: `304.8 mm` ✅ Exact match
   - Product B: `300 mm` ✅ Close match (within tolerance)

**Display:**
- Product A: "12 in" (original unit)
- Product B: "300 mm" OR "11.8 in" (converted, if user prefers)

---

## Benefits

### ✅ Single Property Definition
- One `width` property, not two
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

## Next Implementation Steps

1. ✅ **Unit Conversion Service** - Created
2. 🔄 **Update Product Model** - Support enhanced format
3. 🔄 **Update Search/Filter** - Normalize queries
4. 🔄 **Update UI** - Unit selector
5. 🔄 **Migration Script** - Convert existing products

---

## Conclusion

**You asked:** "Do we need separate properties for metric vs imperial?"

**Answer:** **NO** - We use:
- ✅ **Single property** (`width`)
- ✅ **Value + unit** storage
- ✅ **Normalized value** for comparison
- ✅ **Unit conversion** for search/filter

This is the industry-standard approach used by major estimating software.

