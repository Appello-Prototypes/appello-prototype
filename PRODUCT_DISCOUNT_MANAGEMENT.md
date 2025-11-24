# Product-Level Discount Management

## Overview

Products now have **product-level discounts** that apply to all variants by default. This matches the pricebook structure where discounts are per price sheet/page.

## Features

✅ **Product-Level Discount Display** - Shown prominently at top of product detail page  
✅ **Edit Discount** - Click Edit to change product discount  
✅ **Apply to All Variants** - Mass apply discount to all variants with one click  
✅ **Variant Override** - Variants can still have their own discounts (rare cases)  
✅ **Auto-Apply on Save** - When you save a discount, it automatically applies to all variants  

---

## Product Detail Page

### Discount Display

At the top of the product detail page, you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ 💵 Product Discount                                     │
│    Applies to all variants by default                   │
│                                                          │
│    67.75%                    [Edit] [Apply to All]     │
│    280 / 280 variants match                            │
└─────────────────────────────────────────────────────────┘
```

### Editing Discount

1. Click **"Edit"** button
2. Enter discount percentage (0-100)
3. Click **"Save"**
   - Discount is saved to product
   - **Automatically applied to all variants** (default behavior)

### Apply to All Variants

If discount is set but some variants don't match:

1. Click **"Apply to All Variants"** button
2. Confirm the action
3. All variants get updated with product discount

---

## How It Works

### Product-Level Discount

Stored in `product.productDiscount`:
```javascript
{
  discountPercent: 67.75,
  effectiveDate: Date,
  notes: "From pricebook discount: FIBREGLASS PIPE WITH ASJ"
}
```

### Variant Discounts

Variants inherit product discount, but can override:
- **Default:** Variant uses product discount
- **Override:** Variant can have its own discount (rare cases)

### Discount Application Logic

When you save a product discount:
1. Product discount is saved
2. **All variants are updated** (unless they have explicit overrides)
3. Net prices are calculated: `netPrice = listPrice × (1 - discountPercent/100)`

---

## API Endpoint

**Update Product Discount:**
```
PATCH /api/products/:id/discount

Body:
{
  "discountPercent": 67.75,
  "applyToVariants": true  // Default: true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": { ... },
    "variantsUpdated": 280
  }
}
```

---

## Ingestion

When ingesting products from pricebook:

1. **Find matching discount** by group code and page number
2. **Set product discount** from discount record
3. **Apply to all variants** automatically

Example from Micro-Lok ingestion:
- Found discount: CAEG171 (67.75%)
- Set product discount: 67.75%
- Applied to 280 variants automatically

---

## Use Cases

### Normal Case (99% of products)

1. Set product discount once
2. All variants inherit it
3. Done!

### Rare Case (Variant Override)

1. Set product discount (applies to most variants)
2. Edit specific variant to override discount
3. That variant keeps its own discount

---

## Benefits

✅ **Matches Pricebook Structure** - Discount per price sheet  
✅ **One-Click Management** - Set discount once, applies everywhere  
✅ **Mass Updates** - Update all variants instantly  
✅ **Flexibility** - Variants can override if needed  
✅ **Visual Clarity** - Discount shown prominently at top  

---

## Example Workflow

1. **View Product** - See discount at top (67.75%)
2. **Edit Discount** - Change to 70%
3. **Save** - Automatically applies to all 280 variants
4. **Verify** - Check variants show new discount

**Time:** ~5 seconds to update all variants!

---

## Summary

- ✅ Product discount shown at top of product page
- ✅ Edit discount easily
- ✅ Mass apply to all variants (default behavior)
- ✅ Variants can override (rare cases)
- ✅ Matches pricebook structure (discount per price sheet)

The system now matches your workflow: **discount per price sheet, applies to all variants by default!**

