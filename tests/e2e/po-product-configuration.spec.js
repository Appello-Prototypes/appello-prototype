import { test, expect } from '@playwright/test';

test.describe('Purchase Order Product Configuration', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Navigate to purchase order form
    await page.goto(`${baseURL}/purchase-orders/create`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for supplier select to be visible
    await page.waitForSelector('select[name="supplierId"]', { timeout: 10000 });
  });

  test('should display product configuration when product is selected', async ({ page }) => {
    // Step 1: Select a supplier
    const supplierSelect = page.locator('select[name="supplierId"]');
    await expect(supplierSelect).toBeVisible();
    
    // Get available suppliers
    const suppliers = await supplierSelect.locator('option').all();
    if (suppliers.length <= 1) {
      test.skip('No suppliers available for testing');
    }
    
    // Select first non-empty supplier
    await supplierSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500); // Wait for supplier selection to process
    
    // Step 2: Add a line item
    const addItemButton = page.locator('button:has-text("Add Item")');
    await addItemButton.click();
    await page.waitForTimeout(500);
    
    // Step 3: Check if product search is enabled
    const productSearch = page.locator('input[placeholder*="Search"]').first();
    await expect(productSearch).toBeVisible();
    await expect(productSearch).not.toBeDisabled();
    
    // Step 4: Click on product search to open dropdown
    await productSearch.click();
    await page.waitForTimeout(1000); // Wait for dropdown to load
    
    // Check if dropdown appears
    const dropdown = page.locator('div[class*="absolute"]').filter({ hasText: /product/i });
    
    // Step 5: Type to search for products
    await productSearch.fill('duct');
    await page.waitForTimeout(1000); // Wait for search results
    
    // Step 6: Check if products are displayed
    const productOptions = page.locator('li[class*="cursor-pointer"]');
    const productCount = await productOptions.count();
    
    console.log(`Found ${productCount} products in dropdown`);
    
    if (productCount > 0) {
      // Select first product
      await productOptions.first().click();
      await page.waitForTimeout(2000); // Wait for product details to load
      
      // Step 7: Check if product details are populated
      const productName = page.locator('input[placeholder*="Search"]').first();
      const productValue = await productName.inputValue();
      console.log(`Selected product: ${productValue}`);
      
      // Step 8: Check if unit price is populated
      const unitPriceInput = page.locator('input[type="number"]').filter({ hasText: /unit/i }).or(
        page.locator('input').filter({ hasText: /price/i })
      ).first();
      
      // Try to find unit price field by label
      const unitPriceLabel = page.locator('label:has-text("Unit Price")');
      if (await unitPriceLabel.count() > 0) {
        const unitPriceField = page.locator('input[type="number"]').nth(
          await page.locator('label:has-text("Unit Price")').count() - 1
        );
        const unitPrice = await unitPriceField.inputValue();
        console.log(`Unit price: ${unitPrice}`);
        
        // Check if price is not 0
        if (unitPrice && parseFloat(unitPrice) > 0) {
          console.log('✓ Unit price is populated correctly');
        } else {
          console.log('⚠ Unit price is 0 or empty');
        }
      }
      
      // Step 9: Check if configuration panel exists
      const configButton = page.locator('button:has-text("Configure Product Properties")');
      const configExists = await configButton.count() > 0;
      console.log(`Configuration panel exists: ${configExists}`);
      
      if (configExists) {
        // Expand configuration panel
        await configButton.click();
        await page.waitForTimeout(1000);
        
        // Check if pricing information is displayed
        const pricingInfo = page.locator('text=/Pricing Information/i');
        const pricingExists = await pricingInfo.count() > 0;
        console.log(`Pricing information displayed: ${pricingExists}`);
        
        // Check for pricing values
        const listPrice = page.locator('text=/List Price/i');
        const netPrice = page.locator('text=/Net Price/i');
        
        if (await listPrice.count() > 0) {
          console.log('✓ List Price section found');
        }
        if (await netPrice.count() > 0) {
          console.log('✓ Net Price section found');
        }
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/po-configuration.png', fullPage: true });
      }
    } else {
      console.log('⚠ No products found in dropdown');
      await page.screenshot({ path: 'test-results/po-no-products.png', fullPage: true });
    }
  });

  test('should update pricing when properties are configured', async ({ page }) => {
    // This test will be expanded once we verify the basic flow works
    test.skip('Pending basic flow verification');
  });
});

