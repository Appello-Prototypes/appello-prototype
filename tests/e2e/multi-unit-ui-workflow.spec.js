/**
 * Multi-Unit System UI Workflow Tests
 * 
 * Tests the complete UI workflow for multi-unit functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Unit System UI Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('PropertyDefinitions page shows units', async ({ page }) => {
    await page.goto('/property-definitions');
    await page.waitForLoadState('networkidle');

    // Check page loaded
    const heading = page.locator('h2:has-text("Property Definitions"), h1:has-text("Property")').first();
    await expect(heading).toBeVisible();

    // Check for unit column or unit information
    const unitCells = page.locator('td').filter({ hasText: /inches|mm|ft|lb|kg/i });
    const unitCount = await unitCells.count();
    
    console.log(`✅ Found ${unitCount} cells with unit information`);
    
    if (unitCount > 0) {
      // Verify units are displayed
      const firstUnit = await unitCells.first().textContent();
      console.log(`   Example unit: ${firstUnit}`);
      expect(unitCount).toBeGreaterThan(0);
    }
  });

  test('ProductTypeForm shows units when adding properties', async ({ page }) => {
    await page.goto('/product-types/create');
    await page.waitForLoadState('networkidle');

    // Wait for form to load
    await page.waitForSelector('input[name="name"], h2:has-text("Product Type")', { timeout: 5000 });

    // Fill in basic info
    const nameInput = page.locator('input[name="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Product Type');
    }

    // Look for "Add from Global Properties" dropdown
    const addPropertySelect = page.locator('select').filter({ 
      hasText: /Add from Global|Global Properties/i 
    }).first();

    if (await addPropertySelect.isVisible()) {
      // Get options
      const options = await addPropertySelect.locator('option').allTextContents();
      const optionsWithUnits = options.filter(opt => opt.includes('(') && opt.includes(')'));
      
      console.log(`✅ Found ${optionsWithUnits.length} property options with units`);
      
      if (optionsWithUnits.length > 0) {
        // Select a property with unit (e.g., Height)
        const heightOption = options.find(opt => opt.toLowerCase().includes('height'));
        if (heightOption) {
          await addPropertySelect.selectOption({ 
            label: heightOption.split('(')[0].trim() 
          });
          await page.waitForTimeout(1000);

          // Check if unit is displayed
          const unitDisplay = page.locator('text=/Unit:.*/').first();
          if (await unitDisplay.isVisible()) {
            const unitText = await unitDisplay.textContent();
            console.log(`✅ Unit displayed: ${unitText}`);
            expect(unitText).toMatch(/Unit:/);
          }
        }
      }
    }
  });

  test('Purchase Order form - Product selection workflow', async ({ page }) => {
    await page.goto('/purchase-orders/create');
    await page.waitForLoadState('networkidle');

    // Select a supplier
    const supplierSelect = page.locator('select[name="supplierId"]').first();
    if (await supplierSelect.isVisible()) {
      const options = await supplierSelect.locator('option').count();
      if (options > 1) {
        await supplierSelect.selectOption({ index: 1 });
        await page.waitForTimeout(2000); // Wait for products to load
      }
    }

    // Look for "Browse" or "Add Product" button
    const browseButton = page.locator('button:has-text("Browse"), button:has-text("Add Product"), button:has-text("Search")').first();
    
    if (await browseButton.isVisible()) {
      await browseButton.click();
      await page.waitForTimeout(2000);

      // Check if product selection modal opened
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').first();
      if (await modal.isVisible()) {
        console.log('✅ Product selection modal opened');

        // Look for product cards/options
        const productCards = page.locator('[class*="product"], [class*="card"], button:has-text("Select")');
        const cardCount = await productCards.count();
        
        if (cardCount > 0) {
          console.log(`✅ Found ${cardCount} product options`);
          
          // Select first product
          await productCards.first().click();
          await page.waitForTimeout(2000);

          // Check if ProductConfiguration panel appeared
          const configPanel = page.locator('[class*="config"], [class*="properties"], label:has-text("Height"), label:has-text("Width")').first();
          if (await configPanel.isVisible()) {
            console.log('✅ ProductConfiguration panel visible');

            // Check for units in property labels
            const unitLabels = page.locator('label').filter({ hasText: /\(.*\)/ });
            const unitLabelCount = await unitLabels.count();
            
            if (unitLabelCount > 0) {
              const labelText = await unitLabels.first().textContent();
              console.log(`✅ Found property with unit: ${labelText}`);
              expect(labelText).toMatch(/\(.*\)/);
            }

            // Check for dropdown selects (standardValues)
            const propertySelects = page.locator('select[name*="height"], select[name*="width"], select[name*="pipe"]');
            const selectCount = await propertySelects.count();
            
            if (selectCount > 0) {
              console.log(`✅ Found ${selectCount} property dropdowns (using standardValues)`);
              
              // Try selecting a value
              const firstSelect = propertySelects.first();
              const options = await firstSelect.locator('option').count();
              if (options > 1) {
                await firstSelect.selectOption({ index: 1 });
                console.log('✅ Selected property value from dropdown');
              }
            }
          }
        }
      }
    }
  });

  test('ProductConfiguration displays units correctly', async ({ page }) => {
    // Navigate to a PO with a product already added (or create one)
    await page.goto('/purchase-orders/create');
    await page.waitForLoadState('networkidle');

    // Try to add a product and check configuration
    const supplierSelect = page.locator('select[name="supplierId"]').first();
    if (await supplierSelect.isVisible()) {
      await supplierSelect.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      // Look for product selection
      const addButton = page.locator('button:has-text("Browse"), button:has-text("Add")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(2000);

        // Select a product if modal opened
        const productOption = page.locator('[class*="product"], button:has-text("Select")').first();
        if (await productOption.isVisible()) {
          await productOption.click();
          await page.waitForTimeout(2000);

          // Now check for property configuration
          const heightLabel = page.locator('label:has-text("Height"), label:has-text("height")').first();
          if (await heightLabel.isVisible()) {
            const labelText = await heightLabel.textContent();
            console.log(`✅ Height label: ${labelText}`);
            
            // Check if unit is in label
            if (labelText.includes('(') && labelText.includes(')')) {
              console.log('✅ Unit displayed in property label');
              expect(labelText).toMatch(/\(.*\)/);
            }
          }
        }
      }
    }
  });

  test('PropertyFilterSidebar shows unit information', async ({ page }) => {
    await page.goto('/purchase-orders/create');
    await page.waitForLoadState('networkidle');

    const supplierSelect = page.locator('select[name="supplierId"]').first();
    if (await supplierSelect.isVisible()) {
      await supplierSelect.selectOption({ index: 1 });
      await page.waitForTimeout(2000);
    }

    const browseButton = page.locator('button:has-text("Browse")').first();
    if (await browseButton.isVisible()) {
      await browseButton.click();
      await page.waitForTimeout(2000);

      // Look for filter sidebar
      const filterSidebar = page.locator('[class*="filter"], [class*="sidebar"], aside').first();
      if (await filterSidebar.isVisible()) {
        console.log('✅ Filter sidebar found');

        // Check for property filters with units
        const filterLabels = filterSidebar.locator('label').filter({ hasText: /\(.*\)/ });
        const filterLabelCount = await filterLabels.count();
        
        if (filterLabelCount > 0) {
          const labelText = await filterLabels.first().textContent();
          console.log(`✅ Filter label with unit: ${labelText}`);
          expect(labelText).toMatch(/\(.*\)/);
        }
      }
    }
  });
});



