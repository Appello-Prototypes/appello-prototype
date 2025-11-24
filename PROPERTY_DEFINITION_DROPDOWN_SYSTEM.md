# Property Definition Dropdown System

## Overview

Instead of typing property keys (which leads to typos and inconsistencies), users now select from **dropdowns** populated from **Global Property Definitions**.

## How It Works

### 1. Global Property Definitions (Admin Level)
- **Property Definitions** are created once at the global level
- Each definition includes:
  - **Canonical Key** (e.g., `pipe_diameter`)
  - **Display Label** (e.g., "Pipe Diameter")
  - **Data Type** (text, number, fraction, enum, boolean)
  - **Normalization Rules** (how to parse "1 1/2"" → 1.5)
  - **Enum Options** (for dropdowns)
  - **Standard Values** (predefined options)

### 2. Dropdowns Everywhere
When users need to specify a property:

**Before (Text Input - Error Prone):**
```
Property Key: [pipe_diameter        ]  ← User types, might typo
```

**After (Dropdown - Consistent):**
```
Property: [▼ Pipe Diameter          ]  ← Select from list
          [  Insulation Thickness   ]
          [  Facing Type            ]
          [  Pipe Type              ]
```

### 3. Where Dropdowns Are Used

#### A. Specification Form
- **Property Matching Rules**: Select property from dropdown
- **Required Properties**: Select property from dropdown
- **Value Input**: Based on property's dataType:
  - Enum → Dropdown of enum options
  - Fraction → Dropdown of standard values OR text input with validation
  - Number → Number input
  - Text → Text input

#### B. Product Type Form
- **Add Property**: Select from existing Property Definitions
- **Property Configuration**: Uses Property Definition settings

#### C. Product Form
- **Configure Properties**: Select property from dropdown
- **Value Input**: Based on Property Definition's dataType and enumOptions

#### D. Product Variant Form
- **Variant Properties**: Select property from dropdown
- **Value Input**: Based on Property Definition

## Benefits

### ✅ Consistency
- **No typos**: Can't type `pipe_size` when it should be `pipe_diameter`
- **Canonical keys**: Always uses the correct key
- **Alias support**: Old keys (`pipe_size`) automatically map to canonical (`pipe_diameter`)

### ✅ User-Friendly
- **Clear labels**: "Pipe Diameter" instead of cryptic `pipe_diameter`
- **Grouped by category**: Dimension, Material, Specification, etc.
- **Help text**: Each property can have description/help

### ✅ Validation
- **Data type enforcement**: Can't enter text for a number property
- **Enum validation**: Only valid enum values allowed
- **Range validation**: Min/max values enforced

### ✅ Normalization
- **Standard values**: "1 1/2"", "1-1/2"", "1.5"" all normalize to 1.5
- **Automatic matching**: Products match even with different formats

## Implementation

### Backend
1. ✅ `PropertyDefinition` model created
2. ✅ API endpoints: `/api/property-definitions`
3. ✅ Seed script: `scripts/seed-property-definitions.js`

### Frontend
1. ✅ API client: `propertyDefinitionAPI`
2. 🔧 Update `SpecificationForm` to use dropdowns
3. 🔧 Update `ProductTypeForm` to use dropdowns
4. 🔧 Update `ProductForm` to use dropdowns

## Example: Creating a Specification

**Step 1: Select Property**
```
Property Matching Rule:
Property: [▼ Pipe Diameter          ]
          [  Insulation Thickness   ]
          [  Facing Type            ]
          [  Pipe Type              ]
```

**Step 2: Select Match Type**
```
Match Type: [▼ Exact Match          ]
            [  Range (Min-Max)      ]
            [  Minimum Value        ]
            [  Maximum Value       ]
```

**Step 3: Enter Value** (based on property type)
```
Value: [▼ 2"                        ]  ← Dropdown if enum/fraction with standard values
       [  1 1/2"                    ]
       [  1"                        ]
       [  4"                        ]
```

**Result:**
- Property key: `pipe_diameter` (canonical)
- Value: `2"` (normalized to 2.0)
- Consistent across all specifications

## Migration Path

1. **Seed Property Definitions** → Run `node scripts/seed-property-definitions.js`
2. **Update Forms** → Replace text inputs with dropdowns
3. **Migrate Existing Data** → Map old keys to canonical keys using aliases
4. **Test** → Verify specifications match products correctly

---

**Status**: Foundation complete. Forms need updating to use dropdowns.

