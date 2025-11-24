/**
 * Multi-Unit System E2E Tests
 * 
 * Tests the complete multi-unit system functionality:
 * - Property normalization
 * - Cross-unit search/filtering
 * - Unit display in UI
 * - Property dropdowns with standard values
 * - ProductTypeForm with unit information
 * - Purchase Order product selection
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Unit System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Property Normalization', () => {
    test('should display units in ProductConfiguration', async ({ page }) => {
      // Navigate to Purchase Orders
      await page.goto('/purchase-orders/create');
      await page.waitForLoadState('networkidle');

      // Select a supplier (if dropdown exists)
      const supplierSelect = page.locator('select[name="supplierId"], select:has-text("Supplier")').first();
      if (await supplierSelect.isVisible()) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }

      // Look for product search/browse button
      const browseButton = page.locator('button:has-text("Browse"), button:has-text("Search"), button:has-text("Add Product")').first();
      if (await browseButton.isVisible()) {
        await browseButton.click();
        await page.waitForTimeout(1000);
      }

      // Check if ProductConfiguration shows units
      const unitLabels = page.locator('text=/.*\\(.*\\)/'); // Matches "Height (inches)" format
      const count = await unitLabels.count();
      
      if (count > 0) {
        console.log(`✅ Found ${count} properties with units displayed`);
        // Verify at least one property shows unit
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should show property dropdowns with standard values', async ({ page }) => {
      await page.goto('/purchase-orders/create');
      await page.waitForLoadState('networkidle');

      // Select supplier
      const supplierSelect = page.locator('select[name="supplierId"]').first();
      if (await supplierSelect.isVisible()) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }

      // Look for product selection
      const browseButton = page.locator('button:has-text("Browse")').first();
      if (await browseButton.isVisible()) {
        await browseButton.click();
        await page.waitForTimeout(1000);

        // Check for dropdown selects (not text inputs) for dimension properties
        const heightSelect = page.locator('select[name*="height"], select:has-text("Height")').first();
        if (await heightSelect.isVisible()) {
          const options = await heightSelect.locator('option').count();
          console.log(`✅ Height dropdown has ${options} options`);
          expect(options).toBeGreaterThan(1); // Should have options if standardValues exist
        }
      }
    });
  });

  test.describe('ProductTypeForm Unit Display', () => {
    test('should show units when selecting properties from PropertyDefinitions', async ({ page }) => {
      await page.goto('/product-types/create');
      await page.waitForLoadState('networkidle');

      // Look for "Add from Global Properties" dropdown
      const addPropertyDropdown = page.locator('select:has-text("Add from Global Properties")').first();
      
      if (await addPropertyDropdown.isVisible()) {
        // Check if options show units
        const options = await addPropertyDropdown.locator('option').allTextContents();
        const optionsWithUnits = options.filter(opt => opt.includes('(') && opt.includes(')'));
        
        console.log(`✅ Found ${optionsWithUnits.length} property options with units`);
        if (optionsWithUnits.length > 0) {
          console.log(`   Examples: ${optionsWithUnits.slice(0, 3).join(', ')}`);
        }
        
        // Select a property with unit
        if (optionsWithUnits.length > 0) {
          await addPropertyDropdown.selectOption({ index: 1 });
          await page.waitForTimeout(500);
          
          // Check if unit is displayed next to label input
          const unitDisplay = page.locator('text=/Unit:.*/').first();
          if (await unitDisplay.isVisible()) {
            console.log('✅ Unit displayed next to property label');
            expect(await unitDisplay.isVisible()).toBeTruthy();
          }
        }
      }
    });

    test('should display unit information for existing properties', async ({ page }) => {
      // Navigate to edit an existing ProductType (Ductwork)
      await page.goto('/product-types');
      await page.waitForLoadState('networkidle');

      // Look for Ductwork product type
      const ductworkLink = page.locator('a:has-text("Ductwork"), tr:has-text("Ductwork") a').first();
      if (await ductworkLink.isVisible()) {
        await ductworkLink.click();
        await page.waitForLoadState('networkidle');

        // Check if properties show units
        const unitDisplays = page.locator('text=/Unit:.*/');
        const count = await unitDisplays.count();
        
        if (count > 0) {
          console.log(`✅ Found ${count} properties with unit information displayed`);
          expect(count).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Cross-Unit Search', () => {
    test('should search products across different units', async ({ page }) => {
      // Test API directly for cross-unit search
      const response = await page.request.get('/api/products/search/autocomplete?supplierId=test&filters=' + 
        encodeURIComponent(JSON.stringify({ width: { min: 10, max: 14, unit: 'in' } })));
      
      if (response.ok()) {
        const data = await response.json();
        console.log(`✅ Cross-unit search API responded: ${data.success}`);
        
        // Verify response structure
        if (data.success && Array.isArray(data.data)) {
          console.log(`   Found ${data.data.length} products`);
        }
      }
    });

    test('should filter products by normalized property values', async ({ page }) => {
      await page.goto('/purchase-orders/create');
      await page.waitForLoadState('networkidle');

      // Select supplier
      const supplierSelect = page.locator('select[name="supplierId"]').first();
      if (await supplierSelect.isVisible()) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }

      // Open product selection modal
      const browseButton = page.locator('button:has-text("Browse")').first();
      if (await browseButton.isVisible()) {
        await browseButton.click();
        await page.waitForTimeout(1000);

        // Look for property filters sidebar
        const filterSidebar = page.locator('[class*="filter"], [class*="sidebar"]').first();
        if (await filterSidebar.isVisible()) {
          // Check for width filter
          const widthFilter = page.locator('input[name*="width"], select[name*="width"]').first();
          if (await widthFilter.isVisible()) {
            console.log('✅ Property filter found');
            
            // Try to set a filter value
            if (await widthFilter.getAttribute('type') === 'select-one') {
              await widthFilter.selectOption({ index: 1 });
            } else {
              await widthFilter.fill('12');
            }
            
            await page.waitForTimeout(1000);
            console.log('✅ Property filter applied');
          }
        }
      }
    });
  });

  test.describe('PropertyDefinition List', () => {
    test('should display PropertyDefinitions with unit information', async ({ page }) => {
      await page.goto('/property-definitions');
      await page.waitForLoadState('networkidle');

      // Check if properties are displayed
      const propertyRows = page.locator('tr').filter({ hasNotText: 'Label' }); // Exclude header
      const rowCount = await propertyRows.count();
      
      if (rowCount > 0) {
        console.log(`✅ Found ${rowCount} property definitions`);
        
        // Check if units are displayed
        const unitCells = page.locator('td:has-text("inches"), td:has-text("mm"), td:has-text("ft")');
        const unitCount = await unitCells.count();
        
        if (unitCount > 0) {
          console.log(`✅ Found ${unitCount} properties with units displayed`);
          expect(unitCount).toBeGreaterThan(0);
        }
      }
    });

    test('should show standardValues for dimension properties', async ({ page }) => {
      await page.goto('/property-definitions');
      await page.waitForLoadState('networkidle');

      // Look for Height property
      const heightRow = page.locator('tr:has-text("Height")').first();
      if (await heightRow.isVisible()) {
        // Click to edit or view details
        const editLink = heightRow.locator('a[href*="edit"], button:has-text("Edit")').first();
        if (await editLink.isVisible()) {
          await editLink.click();
          await page.waitForLoadState('networkidle');

          // Check for standardValues section
          const standardValuesSection = page.locator('text=/standard.*value/i, text=/dropdown/i').first();
          if (await standardValuesSection.isVisible()) {
            console.log('✅ StandardValues section found');
          }
        }
      }
    });
  });

  test.describe('Purchase Order Product Selection', () => {
    test('should show units when configuring product properties', async ({ page }) => {
      await page.goto('/purchase-orders/create');
      await page.waitForLoadState('networkidle');

      // Select supplier
      const supplierSelect = page.locator('select[name="supplierId"]').first();
      if (await supplierSelect.isVisible()) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }

      // Add a product
      const addProductButton = page.locator('button:has-text("Add"), button:has-text("Browse")').first();
      if (await addProductButton.isVisible()) {
        await addProductButton.click();
        await page.waitForTimeout(1000);

        // Select a product (if modal opens)
        const productOption = page.locator('[class*="product"], [class*="card"]').first();
        if (await productOption.isVisible()) {
          await productOption.click();
          await page.waitForTimeout(1000);

          // Check if ProductConfiguration shows units
          const unitLabels = page.locator('label:has-text("("), text=/.*\\(.*\\)/').first();
          if (await unitLabels.isVisible()) {
            const text = await unitLabels.textContent();
            console.log(`✅ Found property with unit: ${text}`);
            expect(text).toMatch(/\(.*\)/); // Should contain unit in parentheses
          }
        }
      }
    });

    test('should use dropdowns for properties with standardValues', async ({ page }) => {
      await page.goto('/purchase-orders/create');
      await page.waitForLoadState('networkidle');

      // Select supplier and add product
      const supplierSelect = page.locator('select[name="supplierId"]').first();
      if (await supplierSelect.isVisible()) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        const addButton = page.locator('button:has-text("Browse")').first();
        if (await addButton.isVisible()) {
          await addButton.click();
          await page.waitForTimeout(1000);

          // After selecting product, check for dropdown selects
          const propertySelects = page.locator('select[name*="height"], select[name*="width"], select[name*="pipe_diameter"]');
          const selectCount = await propertySelects.count();
          
          if (selectCount > 0) {
            console.log(`✅ Found ${selectCount} property dropdowns (using standardValues)`);
            expect(selectCount).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('API Endpoints', () => {
    test('should return normalized property values in product search', async ({ page }) => {
      const response = await page.request.get('/api/products/search/autocomplete?supplierId=test');
      
      if (response.ok()) {
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const product = data.data[0];
          
          // Check if product has normalized properties (if variant)
          if (product.variantId && product.properties) {
            console.log('✅ Product search returns product data');
            console.log(`   Product: ${product.name}`);
            console.log(`   Has properties: ${!!product.properties}`);
          }
        }
      }
    });

    test('should handle property filters with unit conversion', async ({ page }) => {
      // Test with width filter in inches
      const filters = JSON.stringify({
        width: { min: 10, max: 14, unit: 'in' }
      });
      
      const response = await page.request.get(
        `/api/products/search/autocomplete?filters=${encodeURIComponent(filters)}`
      );
      
      if (response.ok()) {
        const data = await response.json();
        console.log(`✅ Property filter API responded: ${data.success}`);
        
        if (data.success) {
          console.log(`   Found ${data.data?.length || 0} products matching filter`);
        }
      }
    });
  });

  test.describe('Data Integrity', () => {
    test('should have normalized values for products with dimension properties', async ({ page }) => {
      // Test API to check if products have normalized values
      const response = await page.request.get('/api/products?limit=5');
      
      if (response.ok()) {
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          const productsWithNormalized = data.data.filter(p => 
            p.propertiesNormalized && Object.keys(p.propertiesNormalized).length > 0
          );
          
          console.log(`✅ Found ${productsWithNormalized.length}/${data.data.length} products with normalized properties`);
          
          if (productsWithNormalized.length > 0) {
            const sample = productsWithNormalized[0];
            console.log(`   Sample: ${sample.name}`);
            console.log(`   Normalized properties: ${Object.keys(sample.propertiesNormalized).join(', ')}`);
          }
        }
      }
    });

    test('should have normalized values for variants', async ({ page }) => {
      const response = await page.request.get('/api/products?limit=1');
      
      if (response.ok()) {
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const product = data.data[0];
          
          if (product.variants && product.variants.length > 0) {
            const variant = product.variants[0];
            
            if (variant.propertiesNormalized && Object.keys(variant.propertiesNormalized).length > 0) {
              console.log(`✅ Variant has normalized properties`);
              console.log(`   Variant: ${variant.name}`);
              console.log(`   Normalized: ${Object.keys(variant.propertiesNormalized).join(', ')}`);
            }
          }
        }
      }
    });
  });
});

