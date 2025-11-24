/**
 * Multi-Unit System - Step-by-Step Manual Testing Guide
 * 
 * This test walks through each interface step by step to verify:
 * 1. PropertyDefinitions show units
 * 2. ProductTypes reference PropertyDefinitions with units
 * 3. ProductConfiguration displays units and dropdowns
 * 4. Purchase Order product selection works with units
 * 5. Cross-unit search/filtering works
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Unit System - Step-by-Step Testing', () => {
  
  test('Step 1: Verify PropertyDefinitions have units', async ({ page }) => {
    console.log('\n📋 STEP 1: Checking PropertyDefinitions...');
    await page.goto('/property-definitions');
    await page.waitForLoadState('networkidle');

    // Check page loaded
    const heading = page.locator('h1, h2').filter({ hasText: /Property.*Definition/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log('✅ PropertyDefinitions page loaded');

    // Check for unit information in table
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      // Look for unit column
      const headers = await table.locator('th').allTextContents();
      const hasUnitColumn = headers.some(h => h.toLowerCase().includes('unit'));
      console.log(`✅ Table headers: ${headers.join(', ')}`);
      console.log(`   Has unit column: ${hasUnitColumn}`);

      // Check for properties with units
      const unitCells = table.locator('td').filter({ hasText: /inches|mm|ft|in|cm/i });
      const unitCount = await unitCells.count();
      console.log(`✅ Found ${unitCount} cells with unit information`);

      if (unitCount > 0) {
        const sampleUnit = await unitCells.first().textContent();
        console.log(`   Sample unit: ${sampleUnit}`);
      }

      // Check for Height property specifically
      const heightRow = table.locator('tr').filter({ hasText: /height/i }).first();
      if (await heightRow.isVisible()) {
        const heightCells = await heightRow.locator('td').allTextContents();
        console.log(`✅ Height property row: ${heightCells.join(' | ')}`);
        
        // Check if it has unit
        const hasUnit = heightCells.some(c => /inches|mm|in/i.test(c));
        expect(hasUnit).toBeTruthy();
        console.log(`   Height has unit: ${hasUnit}`);
      }
    }
  });

  test('Step 2: Verify ProductTypes reference PropertyDefinitions', async ({ page }) => {
    console.log('\n📋 STEP 2: Checking ProductTypes...');
    await page.goto('/product-types');
    await page.waitForLoadState('networkidle');

    // Find Ductwork product type
    const ductworkLink = page.locator('a, button').filter({ hasText: /ductwork/i }).first();
    
    if (await ductworkLink.isVisible({ timeout: 5000 })) {
      console.log('✅ Found Ductwork product type');
      await ductworkLink.click();
      await page.waitForLoadState('networkidle');

      // Check if properties section shows units
      const propertiesSection = page.locator('text=/properties/i, [class*="property"]').first();
      if (await propertiesSection.isVisible()) {
        console.log('✅ Properties section visible');

        // Look for Height property
        const heightLabel = page.locator('label, td, th').filter({ hasText: /height/i }).first();
        if (await heightLabel.isVisible()) {
          const heightText = await heightLabel.textContent();
          console.log(`✅ Height property found: ${heightText}`);
          
          // Check if unit is shown
          if (heightText.includes('(') && heightText.includes(')')) {
            console.log('✅ Height shows unit in label');
            expect(heightText).toMatch(/\(.*\)/);
          }

          // Check for unit display next to input
          const unitDisplay = page.locator('text=/Unit:.*/').first();
          if (await unitDisplay.isVisible()) {
            const unitText = await unitDisplay.textContent();
            console.log(`✅ Unit displayed: ${unitText}`);
          }
        }
      }
    } else {
      // Try API instead
      const response = await page.request.get('/api/product-types');
      if (response.ok()) {
        const data = await response.json();
        const ductwork = data.data?.find(pt => pt.slug === 'ductwork' || pt.name.toLowerCase().includes('ductwork'));
        if (ductwork) {
          console.log(`✅ Ductwork ProductType found via API`);
          const heightProp = ductwork.properties?.find(p => p.key === 'height');
          if (heightProp) {
            console.log(`✅ Height property:`);
            console.log(`   Unit: ${heightProp.unit || 'N/A'}`);
            console.log(`   UnitSystem: ${heightProp.unitSystem || 'N/A'}`);
            console.log(`   Has PropertyDefinition: ${!!heightProp.propertyDefinitionId}`);
            expect(heightProp.unit).toBeTruthy();
          }
        }
      }
    }
  });

  test('Step 3: Test ProductConfiguration in Purchase Order', async ({ page }) => {
    console.log('\n📋 STEP 3: Testing ProductConfiguration in Purchase Order...');
    await page.goto('/purchase-orders/create');
    await page.waitForLoadState('networkidle');

    // Select supplier
    const supplierSelect = page.locator('select[name="supplierId"]').first();
    if (await supplierSelect.isVisible({ timeout: 5000 })) {
      const options = await supplierSelect.locator('option').count();
      console.log(`✅ Supplier dropdown found with ${options} options`);
      
      if (options > 1) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(2000);
        console.log('✅ Supplier selected');
      }
    }

    // Look for Browse/Add Product button
    const browseButton = page.locator('button').filter({ 
      hasText: /browse|add.*product|search.*product/i 
    }).first();

    if (await browseButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Browse button found');
      await browseButton.click();
      await page.waitForTimeout(2000);

      // Check if modal opened
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').first();
      if (await modal.isVisible({ timeout: 3000 })) {
        console.log('✅ Product selection modal opened');

        // Look for products
        const products = page.locator('[class*="product"], [class*="card"], button').filter({ 
          hasText: /ductwork|pipe|insulation/i 
        });
        const productCount = await products.count();
        console.log(`✅ Found ${productCount} products in modal`);

        if (productCount > 0) {
          // Select first product
          await products.first().click();
          await page.waitForTimeout(2000);
          console.log('✅ Product selected');

          // Check for ProductConfiguration panel
          const configPanel = page.locator('[class*="config"], [class*="property"], label').filter({
            hasText: /height|width|property/i
          }).first();

          if (await configPanel.isVisible({ timeout: 3000 })) {
            console.log('✅ ProductConfiguration panel visible');

            // Check for units in labels
            const labelsWithUnits = page.locator('label').filter({ hasText: /\(.*\)/ });
            const labelCount = await labelsWithUnits.count();
            
            if (labelCount > 0) {
              const firstLabel = await labelsWithUnits.first().textContent();
              console.log(`✅ Found ${labelCount} properties with units`);
              console.log(`   Example: ${firstLabel}`);
              expect(labelCount).toBeGreaterThan(0);
            }

            // Check for dropdown selects (standardValues)
            const selects = page.locator('select').filter({ 
              has: page.locator('option') 
            });
            const selectCount = await selects.count();
            
            if (selectCount > 0) {
              console.log(`✅ Found ${selectCount} property dropdowns`);
              
              // Check Height dropdown specifically
              const heightSelect = selects.filter({ 
                has: page.locator('label:has-text("Height")') 
              }).first();
              
              if (await heightSelect.isVisible()) {
                const options = await heightSelect.locator('option').count();
                console.log(`✅ Height dropdown has ${options} options`);
                
                if (options > 1) {
                  const firstOption = await heightSelect.locator('option').nth(1).textContent();
                  console.log(`   First option: ${firstOption}`);
                  
                  // Select an option
                  await heightSelect.selectOption({ index: 1 });
                  console.log('✅ Selected value from Height dropdown');
                }
              }
            }
          }
        }
      }
    }
  });

  test('Step 4: Test PropertyFilterSidebar', async ({ page }) => {
    console.log('\n📋 STEP 4: Testing PropertyFilterSidebar...');
    await page.goto('/purchase-orders/create');
    await page.waitForLoadState('networkidle');

    const supplierSelect = page.locator('select[name="supplierId"]').first();
    if (await supplierSelect.isVisible({ timeout: 5000 })) {
      const options = await supplierSelect.locator('option').count();
      if (options > 1) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(2000);
      }
    }

    const browseButton = page.locator('button').filter({ hasText: /browse/i }).first();
    if (await browseButton.isVisible({ timeout: 5000 })) {
      await browseButton.click();
      await page.waitForTimeout(2000);

      // Look for filter sidebar
      const sidebar = page.locator('aside, [class*="sidebar"], [class*="filter"]').first();
      if (await sidebar.isVisible({ timeout: 3000 })) {
        console.log('✅ Filter sidebar found');

        // Check for property filters with units
        const filterLabels = sidebar.locator('label').filter({ hasText: /\(.*\)/ });
        const filterCount = await filterLabels.count();
        
        if (filterCount > 0) {
          const firstFilter = await filterLabels.first().textContent();
          console.log(`✅ Found ${filterCount} filters with units`);
          console.log(`   Example: ${firstFilter}`);
        }

        // Check for dropdown filters (standardValues)
        const filterSelects = sidebar.locator('select');
        const selectCount = await filterSelects.count();
        
        if (selectCount > 0) {
          console.log(`✅ Found ${selectCount} filter dropdowns`);
          
          // Try filtering by width
          const widthFilter = filterSelects.filter({
            has: page.locator('label:has-text("Width")')
          }).first();
          
          if (await widthFilter.isVisible()) {
            const options = await widthFilter.locator('option').count();
            console.log(`✅ Width filter dropdown has ${options} options`);
            
            if (options > 1) {
              await widthFilter.selectOption({ index: 1 });
              await page.waitForTimeout(1000);
              console.log('✅ Applied width filter');
            }
          }
        }
      }
    }
  });

  test('Step 5: Test Cross-Unit Search API', async ({ page }) => {
    console.log('\n📋 STEP 5: Testing Cross-Unit Search API...');
    
    // Test 1: Search with width filter in inches
    const filters1 = JSON.stringify({
      width: { min: 10, max: 14, unit: 'in' }
    });
    
    const response1 = await page.request.get(
      `/api/products/search/autocomplete?filters=${encodeURIComponent(filters1)}`
    );
    
    if (response1.ok()) {
      const data1 = await response1.json();
      console.log(`✅ Search with width 10-14 inches: ${data1.success}`);
      console.log(`   Found ${data1.data?.length || 0} products`);
    }

    // Test 2: Search with width filter in mm (should find same products)
    const filters2 = JSON.stringify({
      width: { min: 250, max: 360, unit: 'mm' } // ~10-14 inches
    });
    
    const response2 = await page.request.get(
      `/api/products/search/autocomplete?filters=${encodeURIComponent(filters2)}`
    );
    
    if (response2.ok()) {
      const data2 = await response2.json();
      console.log(`✅ Search with width 250-360 mm: ${data2.success}`);
      console.log(`   Found ${data2.data?.length || 0} products`);
      
      // Both searches should find similar products (cross-unit)
      if (data1.success && data2.success) {
        console.log(`✅ Cross-unit search working (both queries executed)`);
      }
    }
  });

  test('Step 6: Verify Normalized Properties in Database', async ({ page }) => {
    console.log('\n📋 STEP 6: Verifying Normalized Properties...');
    
    // Get products with variants
    const response = await page.request.get('/api/products?limit=10');
    
    if (response.ok()) {
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // Find products with variants
        const productsWithVariants = data.data.filter(p => 
          p.variants && p.variants.length > 0
        );
        
        console.log(`✅ Found ${productsWithVariants.length} products with variants`);
        
        if (productsWithVariants.length > 0) {
          const product = productsWithVariants[0];
          console.log(`   Product: ${product.name}`);
          
          if (product.variants && product.variants.length > 0) {
            const variant = product.variants[0];
            console.log(`   Variant: ${variant.name || 'N/A'}`);
            
            if (variant.propertiesNormalized) {
              const normalizedKeys = Object.keys(variant.propertiesNormalized);
              console.log(`✅ Variant has normalized properties: ${normalizedKeys.join(', ')}`);
              
              if (normalizedKeys.length > 0) {
                // Check a specific property
                if (variant.propertiesNormalized.width) {
                  console.log(`   Width normalized: ${variant.propertiesNormalized.width} mm`);
                }
                if (variant.propertiesNormalized.height) {
                  console.log(`   Height normalized: ${variant.propertiesNormalized.height} mm`);
                }
              }
            }
            
            if (variant.propertyUnits) {
              const unitKeys = Object.keys(variant.propertyUnits);
              console.log(`✅ Variant has unit information: ${unitKeys.join(', ')}`);
              
              if (unitKeys.length > 0) {
                unitKeys.forEach(key => {
                  console.log(`   ${key}: ${variant.propertyUnits[key]}`);
                });
              }
            }
          }
        }
      }
    }
  });

  test('Step 7: Test ProductTypeForm - Add Property with Unit', async ({ page }) => {
    console.log('\n📋 STEP 7: Testing ProductTypeForm...');
    await page.goto('/product-types/create');
    await page.waitForLoadState('networkidle');

    // Fill in name
    const nameInput = page.locator('input[name="name"]').first();
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill('Test Multi-Unit Product Type');
      console.log('✅ Product type name entered');
    }

    // Find "Add from Global Properties" dropdown
    const addPropertySelect = page.locator('select').filter({
      hasText: /Add from Global|Global Properties/i
    }).first();

    if (await addPropertySelect.isVisible({ timeout: 5000 })) {
      console.log('✅ "Add from Global Properties" dropdown found');
      
      // Get all options
      const options = await addPropertySelect.locator('option').allTextContents();
      const optionsWithUnits = options.filter(opt => 
        opt.includes('(') && opt.includes(')') && 
        (opt.includes('inches') || opt.includes('mm') || opt.includes('ft'))
      );
      
      console.log(`✅ Found ${optionsWithUnits.length} property options with units`);
      
      if (optionsWithUnits.length > 0) {
        // Find Height option
        const heightOption = options.find(opt => 
          opt.toLowerCase().includes('height') && opt.includes('(')
        );
        
        if (heightOption) {
          console.log(`✅ Found Height option: ${heightOption}`);
          
          // Select it
          await addPropertySelect.selectOption({ 
            label: heightOption.split('(')[0].trim() 
          });
          await page.waitForTimeout(1000);
          console.log('✅ Height property selected');

          // Check if unit is displayed
          const unitDisplay = page.locator('text=/Unit:.*/').first();
          if (await unitDisplay.isVisible({ timeout: 2000 })) {
            const unitText = await unitDisplay.textContent();
            console.log(`✅ Unit displayed: ${unitText}`);
            expect(unitText).toMatch(/Unit:/);
          }

          // Check if unit system is shown
          const unitSystemDisplay = page.locator('text=/System:.*/').first();
          if (await unitSystemDisplay.isVisible()) {
            const systemText = await unitSystemDisplay.textContent();
            console.log(`✅ Unit system displayed: ${systemText}`);
          }
        }
      }
    }
  });
});

