# Pricebook Architecture Analysis & Enhancement Recommendations

## Executive Summary

This document analyzes the current pricebook/product data architecture and provides recommendations for enhancing the system to clearly display **distributor-specific price sheets** and enable **cross-distributor price comparisons**.

## Test Data Created

A comprehensive seed script (`scripts/seed-complex-product-data.js`) has been created with:

### Companies
- **3 Manufacturers (Suppliers):**
  - Armacell (Test)
  - K-Flex USA (Test)
  - Johns Manville (Test)

- **3 Distributors:**
  - IMPRO (Test) - Carries all manufacturers
  - Crossroads C&I (Test) - Carries Armacell & K-Flex
  - Industrial Supply Co (Test) - Carries K-Flex & Johns Manville

### Products Created

1. **Elastomeric Pipe Insulation - Armaflex** (Armacell)
   - **Distributors:** IMPRO, Crossroads C&I
   - **Variants:** 3 (different sizes)
   - **Scenario:** Same product, same manufacturer, different distributor prices
   - **Key Insight:** Crossroads has higher list price but better net price due to better discount

2. **K-Flex Pipe Insulation - ST** (K-Flex USA)
   - **Distributors:** IMPRO, Crossroads C&I, Industrial Supply Co
   - **Variants:** 2
   - **Scenario:** Same product sold by 3 distributors with different pricing
   - **Key Insight:** Industrial Supply has best pricing overall

3. **Johns Manville Duct Liner - Microlite** (Johns Manville)
   - **Distributors:** IMPRO, Industrial Supply Co
   - **Variants:** 2
   - **Scenario:** Two distributors with different pricing strategies

4. **Armacell Armaflex Board - Black** (Armacell)
   - **Distributors:** IMPRO only
   - **Variants:** 1
   - **Scenario:** Exclusive product - single distributor only

## Current Architecture Validation

### ✅ What's Working Well

1. **Multi-Distributor Product Support**
   - Products correctly store multiple distributor pricing in `suppliers` array
   - Variants have their own `suppliers` array with distributor-specific pricing
   - Primary `distributorId` and `manufacturerId` fields for quick access

2. **Relationship Tracking**
   - `Company.distributorSuppliers` tracks which manufacturers each distributor carries
   - Product-level `suppliers` array tracks distributor-manufacturer combinations with pricing

3. **API Endpoints**
   - `/api/products/by-distributor/:id` - Get products for a distributor
   - `/api/products/by-manufacturer/:id` - Get products for a manufacturer
   - `/api/companies/:id/manufacturers` - Get manufacturers for a distributor
   - `/api/companies/:id/distributors` - Get distributors for a manufacturer

### ⚠️ Gaps Identified

1. **Pricebook View Doesn't Show Distributor Context**
   - Current `PricebookView.jsx` shows products organized by pricebook sections/pages
   - **Missing:** Which distributor's price sheet is being displayed
   - **Missing:** Ability to switch between distributor price sheets
   - **Missing:** Visual indication that prices are distributor-specific

2. **Product List Doesn't Emphasize Distributor Pricing**
   - `ProductList.jsx` shows products but doesn't clearly indicate:
     - Which distributor's price is shown
     - That the same product may have different prices from different distributors
     - Price comparison opportunities

3. **No Distributor-Specific Pricebook Endpoint**
   - Current `/api/products/by-pricebook` doesn't filter by distributor
   - All products are shown regardless of which distributor's price sheet you're viewing

4. **Missing Price Comparison Features**
   - No side-by-side price comparison for same product across distributors
   - No "best price" indicators
   - No price difference calculations

## Recommended Enhancements

### 1. Distributor-Specific Pricebook View

**Goal:** Make it clear that price sheets are distributor-specific and allow switching between distributors.

#### Frontend Changes

**`PricebookView.jsx` Enhancements:**

```jsx
// Add distributor selector at top
const [selectedDistributor, setSelectedDistributor] = useState(null);

// Fetch distributors
const { data: distributors } = useQuery({
  queryKey: ['distributors'],
  queryFn: () => companyAPI.getDistributors().then(res => res.data.data)
});

// Update API call to include distributor filter
const fetchPricebookData = async () => {
  const params = selectedDistributor ? { distributorId: selectedDistributor } : {};
  const response = await api.get('/api/products/by-pricebook', { params });
  // ...
};

// Add distributor selector UI
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    View Price Sheet For:
  </label>
  <select
    value={selectedDistributor || ''}
    onChange={(e) => setSelectedDistributor(e.target.value)}
    className="rounded-md border-gray-300"
  >
    <option value="">All Distributors</option>
    {distributors?.map(dist => (
      <option key={dist._id} value={dist._id}>
        {dist.name}
      </option>
    ))}
  </select>
</div>
```

#### Backend Changes

**`productController.js` - Update `getProductsByPricebook`:**

```javascript
getProductsByPricebook: async (req, res) => {
  try {
    const { distributorId } = req.query;
    
    const filter = { isActive: true };
    
    // Filter by distributor if specified
    if (distributorId) {
      filter.$or = [
        { distributorId: distributorId },
        { 'suppliers.distributorId': distributorId }
      ];
    }
    
    const products = await Product.find(filter)
      .populate('manufacturerId', 'name')
      .populate('distributorId', 'name')
      .populate('suppliers.distributorId', 'name')
      .populate('suppliers.manufacturerId', 'name')
      .select('name description variants pricebookSection pricebookPageNumber pricebookPageName pricebookGroupCode category suppliers distributorId manufacturerId')
      .sort({ pricebookSection: 1, pricebookPageNumber: 1, name: 1 })
      .lean();
    
    // When filtering by distributor, show only that distributor's pricing
    // Transform products to show selected distributor's prices
    const transformedProducts = distributorId 
      ? products.map(product => {
          // Find supplier entry for selected distributor
          const supplierEntry = product.suppliers.find(
            s => s.distributorId._id.toString() === distributorId
          );
          
          return {
            ...product,
            // Override pricing with selected distributor's pricing
            listPrice: supplierEntry?.listPrice || product.listPrice,
            netPrice: supplierEntry?.netPrice || product.netPrice,
            discountPercent: supplierEntry?.discountPercent || product.discountPercent,
            // Mark which distributor's price is shown
            priceSheetDistributor: supplierEntry?.distributorId,
            variants: product.variants.map(variant => {
              const variantSupplier = variant.suppliers?.find(
                s => s.distributorId._id.toString() === distributorId
              );
              return {
                ...variant,
                listPrice: variantSupplier?.listPrice || variant.pricing?.listPrice,
                netPrice: variantSupplier?.netPrice || variant.pricing?.netPrice,
                discountPercent: variantSupplier?.discountPercent || variant.pricing?.discountPercent
              };
            })
          };
        })
      : products;
    
    // Organize by pricebook structure (existing logic)
    // ...
  }
}
```

### 2. Enhanced Product Display with Price Comparison

**Goal:** Show distributor pricing clearly and enable quick comparisons.

#### Product Card Enhancement

Add to product display:

```jsx
// Show distributor badge
{product.priceSheetDistributor && (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
    {product.priceSheetDistributor.name} Price Sheet
  </span>
)}

// Show price comparison indicator if multiple distributors available
{product.suppliers?.length > 1 && (
  <button
    onClick={() => showPriceComparison(product)}
    className="text-xs text-blue-600 hover:text-blue-800"
  >
    Compare {product.suppliers.length} distributor prices →
  </button>
)}
```

### 3. Cross-Distributor Price Comparison Component

**Goal:** Side-by-side comparison of same product across distributors.

**New Component: `DistributorPriceComparison.jsx`:**

```jsx
const DistributorPriceComparison = ({ product }) => {
  const distributors = product.suppliers.map(s => ({
    distributor: s.distributorId,
    manufacturer: s.manufacturerId,
    listPrice: s.listPrice,
    netPrice: s.netPrice,
    discountPercent: s.discountPercent,
    isPreferred: s.isPreferred
  }));
  
  // Sort by net price (best first)
  const sortedDistributors = [...distributors].sort((a, b) => a.netPrice - b.netPrice);
  const bestPrice = sortedDistributors[0]?.netPrice;
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">
        Price Comparison: {product.name}
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th>Distributor</th>
              <th>List Price</th>
              <th>Discount</th>
              <th>Net Price</th>
              <th>Savings vs Best</th>
            </tr>
          </thead>
          <tbody>
            {sortedDistributors.map((dist, idx) => {
              const savings = dist.netPrice - bestPrice;
              const isBest = idx === 0;
              
              return (
                <tr key={dist.distributor._id} className={isBest ? 'bg-green-50' : ''}>
                  <td>
                    {dist.distributor.name}
                    {dist.isPreferred && <span className="ml-2 text-xs text-blue-600">(Preferred)</span>}
                    {isBest && <span className="ml-2 text-xs text-green-600">(Best Price)</span>}
                  </td>
                  <td>${dist.listPrice.toFixed(2)}</td>
                  <td>{dist.discountPercent.toFixed(1)}%</td>
                  <td className="font-semibold">${dist.netPrice.toFixed(2)}</td>
                  <td>
                    {savings === 0 ? (
                      <span className="text-green-600">Best Price</span>
                    ) : (
                      <span className="text-red-600">
                        +${Math.abs(savings).toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Variant-level comparison */}
      {product.variants?.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Variant Pricing Comparison</h4>
          {/* Similar table for each variant */}
        </div>
      )}
    </div>
  );
};
```

### 4. Distributor Price Sheet Export/Print View

**Goal:** Generate printable price sheets organized by distributor.

**New Endpoint: `/api/products/price-sheet/:distributorId`**

```javascript
getDistributorPriceSheet: async (req, res) => {
  try {
    const { distributorId } = req.params;
    const { format = 'json' } = req.query; // json, pdf, csv
    
    // Get all products for this distributor
    const products = await Product.find({
      $or: [
        { distributorId: distributorId },
        { 'suppliers.distributorId': distributorId }
      ],
      isActive: true
    })
      .populate('manufacturerId', 'name')
      .populate('suppliers.distributorId', 'name')
      .populate('suppliers.manufacturerId', 'name')
      .sort({ pricebookSection: 1, pricebookPageNumber: 1, name: 1 })
      .lean();
    
    // Transform to show only selected distributor's pricing
    const priceSheet = products.map(product => {
      const supplierEntry = product.suppliers.find(
        s => s.distributorId._id.toString() === distributorId
      );
      
      return {
        name: product.name,
        manufacturer: product.manufacturerId?.name,
        partNumber: supplierEntry?.supplierPartNumber,
        listPrice: supplierEntry?.listPrice,
        netPrice: supplierEntry?.netPrice,
        discountPercent: supplierEntry?.discountPercent,
        variants: product.variants.map(variant => {
          const variantSupplier = variant.suppliers?.find(
            s => s.distributorId._id.toString() === distributorId
          );
          return {
            name: variant.name,
            sku: variant.sku,
            listPrice: variantSupplier?.listPrice,
            netPrice: variantSupplier?.netPrice,
            discountPercent: variantSupplier?.discountPercent
          };
        })
      };
    });
    
    if (format === 'pdf') {
      // Generate PDF using PDF library
      // ...
    } else if (format === 'csv') {
      // Generate CSV
      // ...
    }
    
    res.json({
      success: true,
      data: priceSheet,
      distributor: await Company.findById(distributorId).select('name')
    });
  } catch (error) {
    // Error handling
  }
}
```

### 5. Product List Enhancements

**Goal:** Make distributor context clear in product listings.

**Update `ProductList.jsx`:**

```jsx
// Add distributor filter with price display
const [priceDisplayMode, setPriceDisplayMode] = useState('all'); // 'all', 'distributor', 'compare'

// Show price with distributor badge
{product.suppliers?.length > 0 && (
  <div className="mt-2">
    {priceDisplayMode === 'compare' && product.suppliers.length > 1 ? (
      <div className="text-xs">
        <div className="font-semibold">Price Range:</div>
        <div>
          ${Math.min(...product.suppliers.map(s => s.netPrice)).toFixed(2)} - 
          ${Math.max(...product.suppliers.map(s => s.netPrice)).toFixed(2)}
        </div>
        <button
          onClick={() => showComparison(product)}
          className="text-blue-600 hover:underline mt-1"
        >
          Compare {product.suppliers.length} distributors
        </button>
      </div>
    ) : (
      <div className="text-xs">
        {product.suppliers.map(supplier => (
          <div key={supplier.distributorId._id} className="flex items-center gap-2">
            <span className="font-medium">{supplier.distributorId.name}:</span>
            <span>${supplier.netPrice?.toFixed(2)}</span>
            {supplier.isPreferred && (
              <span className="text-xs text-blue-600">(Preferred)</span>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

## Implementation Priority

### Phase 1: Core Pricebook Enhancement (High Priority)
1. ✅ Add distributor selector to `PricebookView`
2. ✅ Update `getProductsByPricebook` to filter by distributor
3. ✅ Show distributor badge on products
4. ✅ Display selected distributor's pricing only

### Phase 2: Price Comparison (Medium Priority)
1. ✅ Create `DistributorPriceComparison` component
2. ✅ Add "Compare Prices" button to product cards
3. ✅ Show price range indicators in product lists

### Phase 3: Advanced Features (Lower Priority)
1. ✅ Price sheet export (PDF/CSV)
2. ✅ Price change tracking over time
3. ✅ Best price recommendations
4. ✅ Price alerts for significant changes

## Testing with Seed Data

Use the seed data to validate:

1. **Multi-Distributor Products:**
   - View "K-Flex Pipe Insulation - ST" - should show 3 distributors
   - Compare prices across IMPRO, Crossroads, Industrial Supply

2. **Price Comparison:**
   - Check that Industrial Supply has best price for K-Flex products
   - Verify Crossroads has better net price for Armaflex despite higher list price

3. **Distributor-Specific Views:**
   - Switch between distributors in PricebookView
   - Verify only that distributor's prices are shown
   - Check that products exclusive to one distributor only show that distributor

4. **Relationship Navigation:**
   - Click on IMPRO distributor → should see all 3 manufacturers
   - Click on Armacell manufacturer → should see IMPRO and Crossroads as distributors

## Conclusion

The current architecture correctly supports multi-distributor products, but the UI needs enhancement to:

1. **Make distributor context explicit** - Users should always know which distributor's price sheet they're viewing
2. **Enable price comparisons** - Easy way to compare same product across distributors
3. **Organize by distributor** - Price sheets should be clearly organized by distributor

These enhancements will make the system more intuitive and help users make better purchasing decisions by easily comparing prices across distributors.

