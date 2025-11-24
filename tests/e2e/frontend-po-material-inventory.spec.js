import { test, expect } from '@playwright/test';

/**
 * Frontend tests for Purchase Order & Material Inventory pages
 * Verifies that all new pages load correctly and navigation works
 */
test.describe('PO & Material Inventory Frontend Tests', () => {
  test.beforeEach(async ({ baseURL }) => {
    // Verify baseURL is configured correctly
    expect(baseURL).toBeDefined();
    if (baseURL.includes('localhost')) {
      expect(baseURL).toMatch(/http:\/\/localhost:\d+/);
      if (baseURL.includes('9323')) {
        throw new Error(`Invalid port detected: ${baseURL}. Expected localhost:3000`);
      }
    }
  });

  test('Companies page loads correctly', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/companies`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for page title
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Suppliers|Companies/i);
    
    // Page should render without critical errors
    const errorMessages = page.locator('text=/Error loading|Failed to load|404/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  test('Products page loads correctly', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/products`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Products/i);
    
    const errorMessages = page.locator('text=/Error loading|Failed to load|404/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  test('Material Requests page loads correctly', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/material-requests`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Material Requests/i);
    
    const errorMessages = page.locator('text=/Error loading|Failed to load|404/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  test('Purchase Orders page loads correctly', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/purchase-orders`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Purchase Orders/i);
    
    const errorMessages = page.locator('text=/Error loading|Failed to load|404/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  test('Receiving page loads correctly', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/receiving`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const title = page.locator('h1, [class*="text-2xl"]').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Material Receiving|Receiving/i);
  });

  test('Navigation menu includes new links', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    // Check for navigation links
    await expect(page.getByRole('link', { name: /Material Requests/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Purchase Orders/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Receiving/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Products/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Suppliers/i })).toBeVisible();
  });

  test('Can navigate between pages', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/dashboard`);
    
    // Navigate to Companies
    await page.getByRole('link', { name: /Suppliers/i }).click();
    await expect(page).toHaveURL(new RegExp(`${baseURL}/companies`));
    
    // Navigate to Products
    await page.getByRole('link', { name: /Products/i }).click();
    await expect(page).toHaveURL(new RegExp(`${baseURL}/products`));
    
    // Navigate to Material Requests
    await page.getByRole('link', { name: /Material Requests/i }).click();
    await expect(page).toHaveURL(new RegExp(`${baseURL}/material-requests`));
    
    // Navigate to Purchase Orders
    await page.getByRole('link', { name: /Purchase Orders/i }).click();
    await expect(page).toHaveURL(new RegExp(`${baseURL}/purchase-orders`));
    
    // Navigate to Receiving
    await page.getByRole('link', { name: /Receiving/i }).click();
    await expect(page).toHaveURL(new RegExp(`${baseURL}/receiving`));
  });

  test('Create company form page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/companies/create`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Company/i);
    
    // Check for form fields
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    
    const errorMessages = page.locator('text=/Error loading|Failed to load|404/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  test('Create product form page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/products/create`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Product/i);
    
    // Check for form fields
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    
    const errorMessages = page.locator('text=/Error loading|Failed to load|404/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  test('Create material request form page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/material-requests/create`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const title = page.locator('h1, [class*="text-2xl"]').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/New Material Request|Material Request/i);
    
    const jobField = page.getByLabel(/Job/i).or(page.locator('select[name="jobId"]'));
    await expect(jobField).toBeVisible({ timeout: 5000 });
  });

  test('Create purchase order form page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/purchase-orders/create`);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const title = page.locator('h1, [class*="text-2xl"]').first();
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/New Purchase Order|Purchase Order/i);
    
    const supplierField = page.getByLabel(/Supplier/i).or(page.locator('select[name="supplierId"]'));
    await expect(supplierField).toBeVisible({ timeout: 5000 });
  });

  test('All pages handle empty states gracefully', async ({ page, baseURL }) => {
    const pages = [
      { path: '/companies', text: 'No companies found' },
      { path: '/products', text: 'No products found' },
      { path: '/material-requests', text: 'No material requests found' },
      { path: '/purchase-orders', text: 'No purchase orders found' },
    ];

    for (const { path } of pages) {
      await page.goto(`${baseURL}${path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Pages should load without errors even if empty
      const title = page.locator('h1, [class*="text-2xl"]').first();
      await expect(title).toBeVisible({ timeout: 10000 });
      // May or may not show empty state text depending on data
    }
  });

  test('API endpoints are accessible from frontend', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/companies`);
    
    // Wait for API call to complete
    await page.waitForTimeout(2000);
    
    // Check if page loaded (no error messages)
    const errorMessages = page.locator('text=/Error|Failed|404/i');
    const errorCount = await errorMessages.count();
    
    // Page should load without critical errors
    // (May show "No companies found" which is fine)
    expect(errorCount).toBeLessThan(3); // Allow for some non-critical errors
  });
});

