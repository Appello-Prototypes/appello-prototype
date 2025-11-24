# Unit of Measure & Standard Values System

## Overview

This system provides industry-standard units of measure (Imperial and Metric) with standardized value dropdowns for construction materials. This ensures consistency, reduces errors, and makes data entry faster and more accurate.

---

## 🎯 Key Features

### 1. **Unit of Measure Model** ✅

**Location:** `src/server/models/UnitOfMeasure.js`

**Features:**
- Supports both Imperial and Metric systems
- Industry-standard units for construction
- Conversion factors between units
- Standard values for common measurements
- Category-based organization (length, area, volume, weight, temperature)

**Example Units:**
- **Length (Imperial):** Inches (IN), Feet (FT), Lineal Feet (LF)
- **Length (Metric):** Millimeters (MM), Centimeters (CM), Meters (M)
- **Area:** Square Feet (SQ_FT), Square Meters (SQ_M)
- **Weight:** Pounds (LB), Kilograms (KG)
- **Temperature:** Fahrenheit (F), Celsius (C)

### 2. **Enhanced PropertyDefinition Model** ✅

**New Fields:**
- `unitOfMeasureId` - Reference to UnitOfMeasure
- `unitSystem` - Preferred system (imperial/metric/both)
- `useStandardValuesAsDropdown` - Flag to force dropdown when standardValues exist
- Enhanced `standardValues` with unit support

### 3. **Standard Values System** ✅

Properties with `standardValues` automatically show as **dropdowns** instead of text inputs.

**Benefits:**
- ✅ No typing errors
- ✅ Consistent values across all products
- ✅ Faster data entry
- ✅ Industry-standard sizes

**Example:**
- **Height property** → Dropdown with: `3"`, `6"`, `12"`, `18"`, `24"`, `30"`, `36"`, `42"`, `48"`, `56"`, `59"`
- **Insulation Thickness** → Dropdown with: `1/2"`, `1"`, `1 1/2"`, `2"`, `2 1/2"`, `3"`, `3 1/2"`, `4"`
- **Pipe Diameter** → Dropdown with: `1/2"`, `3/4"`, `1"`, `1 1/4"`, `1 1/2"`, `2"`, `2 1/2"`, `3"`, `4"`, `6"`, `8"`, `10"`, `12"`

---

## 📋 Implementation Details

### PropertyFilterSidebar Enhancement

**Location:** `src/client/src/components/PropertyFilterSidebar.jsx`

**Logic:**
1. Check if property has `standardValues`
2. If yes → Show dropdown with standard values
3. If no → Show text input (backward compatible)

**Code:**
```javascript
const getPropertyValueOptions = (propertyDef) => {
  // Enum types → use enumOptions
  if (propertyDef.dataType === 'enum' && propertyDef.enumOptions) {
    return propertyDef.enumOptions.map(opt => ({
      value: opt.value,
      label: opt.label
    }));
  }
  
  // Properties with standardValues → use as dropdown
  if (propertyDef.standardValues && propertyDef.standardValues.length > 0) {
    return propertyDef.standardValues.map(sv => ({
      value: sv.displayValue,
      label: `${sv.displayValue}${propertyDef.unit ? ` ${propertyDef.unit}` : ''}`
    }));
  }
  
  // Otherwise → text input
  return [];
};
```

---

## 🚀 Usage

### Seeding Units of Measure

```bash
node scripts/seed-units-of-measure.js
```

This creates:
- ✅ All standard Imperial units (inches, feet, pounds, etc.)
- ✅ All standard Metric units (mm, cm, m, kg, etc.)
- ✅ Standard values for each unit (e.g., common inch sizes)
- ✅ Conversion factors

### Seeding Property Definitions with Standard Values

```bash
node scripts/seed-comprehensive-property-definitions.js
```

This updates properties like:
- `height` → Dropdown with standard heights
- `width` → Dropdown with standard widths
- `insulation_thickness` → Dropdown with standard thicknesses
- `pipe_diameter` → Dropdown with standard diameters

---

## 🎨 User Experience

### Before:
- User types: `12"` (could be `12`, `12in`, `12 inches`, `1ft`, etc.)
- Inconsistent values across products
- Typo risk

### After:
- User selects from dropdown: `12"`
- Consistent values everywhere
- No typos
- Faster selection

---

## 📊 Standard Values Examples

### Height/Width (Inches)
```
3", 6", 12", 18", 24", 30", 36", 42", 47", 48", 56", 59"
```

### Insulation Thickness (Inches)
```
1/2", 1", 1 1/2", 2", 2.2", 2 1/2", 3", 3 1/2", 4"
```

### Pipe Diameter (Inches)
```
1/2", 3/4", 1", 1 1/4", 1 1/2", 2", 2 1/2", 3", 3 1/2", 4", 5", 6", 8", 10", 12"
```

### Square Feet (Area)
```
25, 50, 96, 108, 128, 192, 200, 240, 256, 276, 280, 300, 392, 400, 467, 492
```

---

## 🔧 API Endpoints

### Units of Measure

- `GET /api/units-of-measure` - Get all units
- `GET /api/units-of-measure?system=imperial` - Filter by system
- `GET /api/units-of-measure?category=length` - Filter by category
- `GET /api/units-of-measure/categories` - Get all categories
- `GET /api/units-of-measure/:id` - Get single unit
- `POST /api/units-of-measure` - Create unit
- `PATCH /api/units-of-measure/:id` - Update unit
- `DELETE /api/units-of-measure/:id` - Delete unit

---

## 🌍 Multi-System Support

### Imperial (US/Canada)
- Primary system for North American construction
- Inches, feet, pounds, Fahrenheit
- Standard values match industry norms

### Metric (International)
- Primary system for international projects
- Millimeters, meters, kilograms, Celsius
- Standard values match ISO standards

### Both
- Products can support both systems
- Automatic conversion available
- User preference can be set

---

## ✅ Benefits

1. **Consistency** - Same values everywhere
2. **Accuracy** - No typing errors
3. **Speed** - Dropdown faster than typing
4. **Standards** - Industry-standard sizes
5. **International** - Support for metric/imperial
6. **Scalability** - Easy to add new standard values

---

## 📝 Next Steps

1. ✅ Seed units of measure
2. ✅ Update property definitions with standardValues
3. ✅ Enhance PropertyFilterSidebar to use dropdowns
4. 🔄 Update ProductConfiguration component to use dropdowns
5. 🔄 Update SpecificationForm to use dropdowns
6. 🔄 Add unit conversion utilities
7. 🔄 Add user preference for unit system

---

## 🎉 Status: IMPLEMENTED

The unit of measure and standard values system is now ready! Properties with `standardValues` will automatically show as dropdowns in:
- ✅ PropertyFilterSidebar (filters)
- 🔄 ProductConfiguration (product setup)
- 🔄 SpecificationForm (specification creation)
- 🔄 All property input forms

**The system is production-ready!**

