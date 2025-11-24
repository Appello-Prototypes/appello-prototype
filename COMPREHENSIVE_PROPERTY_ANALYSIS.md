# Comprehensive Property Analysis & Standardization

## Goal

**100% Property Standardization** - All ProductTypes and Products must use global PropertyDefinitions. No custom properties allowed.

---

## Analysis Results

### Current State

**Total Unique Properties Found:** 33 properties across all ProductTypes and Products

**Breakdown:**
- **Dimensions:** 9 properties
- **Materials:** 4 properties
- **Specifications:** 7 properties
- **Performance:** 8 properties
- **Quantity/Packaging:** 3 properties
- **Features/Other:** 2 properties

---

## Property Definitions Created

### Dimension Properties (9)

1. ✅ `pipe_diameter` - Pipe Diameter (inches, fraction)
   - Aliases: `pipe_size`, `diameter`, `size`
   
2. ✅ `insulation_thickness` - Insulation Thickness (inches, fraction)
   - Aliases: `thickness`, `insulation_t`, `wall_thickness`
   
3. ✅ `wall_thickness` - Wall Thickness (inches, fraction)
   - Aliases: `wall_t`
   
4. ✅ `width` - Width (inches, number)
   
5. ✅ `height` - Height (inches, number)
   
6. ✅ `length` - Length (feet, number)
   
7. ✅ `dimensions` - Dimensions (text, e.g., "48" X 100'")
   
8. ✅ `gauge` - Gauge (number, enum: 20, 22, 24, 26)
   
9. ✅ `size` - Size (text, e.g., #8, #10)

### Material Properties (4)

10. ✅ `pipe_type` - Pipe Type (enum: copper, iron, steel, pvc, cpvc, duct)
    
11. ✅ `facing` - Facing Type (enum: asj, fsk, pvc, foil, none)
    
12. ✅ `material` - Material (enum: fiberglass, mineral_wool, steel, stainless, zinc, etc.)
    
13. ✅ `density` - Density (text, LB/CU.FT)

### Specification Properties (7)

14. ✅ `fitting_type` - Fitting Type (enum: 45-degree, 90-degree, tee, reducer, coupling, cap)
    - Aliases: `fittingtype`
    
15. ✅ `head_type` - Head Type (enum: flat, pan, round, hex, phillips, slotted)
    
16. ✅ `thread_type` - Thread Type (enum: coarse, fine, machine, wood)
    
17. ✅ `shape` - Shape (enum: rectangular, round, oval, square)
    
18. ✅ `product_type` - Product Type (enum: rc, pm, r300, certainteed, etc.)
    - Aliases: `producttype`
    
19. ✅ `product_code` - Product Code (text, e.g., JM 813, CB300)
    - Aliases: `productcode`
    
20. ✅ `insulated` - Insulated (boolean)

### Performance Properties (8)

21. ✅ `temperature_rating_min` - Min Temperature (°F)
    
22. ✅ `temperature_rating_max` - Max Temperature (°F)
    
23. ✅ `r_value` - R-Value (number)
    
24. ✅ `fire_rated` - Fire Rated (boolean)
    
25. ✅ `capacity` - Capacity (number, tons)
    
26. ✅ `voltage` - Voltage (enum: 120, 208, 240, 480)
    
27. ✅ `phase` - Phase (enum: single, three)
    
28. ✅ `efficiency_rating` - Efficiency Rating (number, SEER)
    
29. ✅ `warranty_years` - Warranty (Years) (number)

### Quantity/Packaging Properties (3)

30. ✅ `sq_ft_per_roll` - Square Feet Per Roll (number)
    - Aliases: `sqftperroll`
    
31. ✅ `sq_ft_per_bundle` - Square Feet Per Bundle (number)
    - Aliases: `sqftperbundle`
    
32. ✅ `lf_per_box` - Lineal Feet Per Box (number)
    - Aliases: `lfperbox`

### Features/Other Properties (2)

33. ✅ `features` - Features (enum, multiselect: wifi, smart_thermostat, variable_speed, etc.)

---

## Property Key Mappings

### Key Normalizations

| Old Key | Canonical Key | Notes |
|---------|---------------|-------|
| `pipe_size` | `pipe_diameter` | Via alias |
| `diameter` | `pipe_diameter` | Via alias |
| `thickness` | `insulation_thickness` | Context-dependent |
| `wall_thickness` | `wall_thickness` | Direct match |
| `fittingtype` | `fitting_type` | Via alias |
| `producttype` | `product_type` | Via alias |
| `productcode` | `product_code` | Via alias |
| `sqftperroll` | `sq_ft_per_roll` | Via alias |
| `sqftperbundle` | `sq_ft_per_bundle` | Via alias |
| `lfperbox` | `lf_per_box` | Via alias |

---

## Migration Strategy

### Phase 1: PropertyDefinitions Created ✅

- ✅ Created 33 comprehensive PropertyDefinitions
- ✅ All properties from ProductTypes and Products analyzed
- ✅ Aliases defined for common variations
- ✅ Enum options defined where applicable

### Phase 2: Update Migration Script

The migration script needs to:
1. Map ALL property keys to canonical keys (including custom ones)
2. Update ProductTypes to use PropertyDefinitions
3. Update Products to use canonical keys
4. Ensure NO custom properties remain

### Phase 3: Enforce Standardization

After migration:
1. ProductTypeForm will only allow selecting from PropertyDefinitions
2. Custom properties will be discouraged/blocked
3. All new properties must come from global PropertyDefinitions

---

## Next Steps

1. ✅ **PropertyDefinitions Created** - 33 properties defined
2. ⏳ **Update Migration Script** - Map all properties including custom ones
3. ⏳ **Run Migration** - Update all ProductTypes and Products
4. ⏳ **Enforce in UI** - ProductTypeForm should prevent custom properties
5. ⏳ **Verify** - Ensure 100% standardization achieved

---

## Property Coverage

### ProductTypes Coverage

- ✅ **Pipe Insulation** - All properties mapped
- ✅ **Ductwork** - All properties mapped
- ⚠️ **HVAC Equipment** - Custom properties now have PropertyDefinitions
- ✅ **Fasteners** - All properties mapped
- ✅ **Pipe Fittings** - All properties mapped
- ✅ **Duct Liner** - All properties mapped
- ✅ **Fiberglass Board** - All properties mapped
- ✅ **Mineral Wool Pipe Insulation** - All properties mapped

### Products Coverage

- ✅ All variant properties can be mapped to PropertyDefinitions
- ✅ No custom properties needed

---

## Benefits

1. ✅ **100% Standardization** - All properties use global definitions
2. ✅ **Consistent Keys** - No more `pipe_size` vs `pipe_diameter`
3. ✅ **Better Matching** - Specifications match products correctly
4. ✅ **Dropdowns Everywhere** - All property inputs use dropdowns
5. ✅ **Structured Data** - All data is normalized and searchable
6. ✅ **Future-Proof** - New products automatically use standard properties

---

**Status:** PropertyDefinitions created. Ready for comprehensive migration.

