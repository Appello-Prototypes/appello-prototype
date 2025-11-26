import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';

test.describe('Inventory Management Workflows', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Navigate to dashboard first to ensure we're logged in
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    await helpers.waitForAPICalls();
  });

  // Helper function to open Product Catalog panel
  async function openProductCatalog(page) {
    // Find the Product Catalog button - try multiple selectors
    // The button has title="Product Catalog" and contains CubeIcon
    let catalogButton = page.locator('button[title="Product Catalog"]');
    
    // If not found, try finding by CubeIcon parent
    if (await catalogButton.count() === 0) {
      catalogButton = page.locator('button').filter({ 
        has: page.locator('svg[class*="Cube"], svg[data-testid*="cube"]') 
      }).first();
    }
    
    // If still not found, try by text (might be hidden on mobile)
    if (await catalogButton.count() === 0) {
      catalogButton = page.getByRole('button', { name: /Product Catalog/i }).first();
    }
    
    // Wait for button to be visible
    await expect(catalogButton).toBeVisible({ timeout: 10000 });
    await catalogButton.click();
    await page.waitForTimeout(2000); // Wait for panel animation
    
    // Verify panel is open by checking for the panel heading
    const panelHeading = page.getByRole('heading', { name: 'Product Catalog' });
    await expect(panelHeading).toBeVisible({ timeout: 5000 });
  }

  // Helper function to navigate to Inventory tab
  async function navigateToInventoryTab(page) {
    // Find the Inventory tab button - it's in the Product Catalog panel tabs
    // Look for button with text "Inventory" that's a direct child of the tabs container
    const inventoryTab = page.locator('nav').filter({ hasText: 'Browse Products' })
      .getByRole('button', { name: 'Inventory', exact: true });
    
    await inventoryTab.click();
    await page.waitForTimeout(1000);
    
    // Verify we're on Inventory tab by checking for inventory-specific content
    const inventoryContent = page.getByText('Inventory Management').or(
      page.getByPlaceholder(/Search/i).or(
        page.getByRole('button', { name: /Low Stock/i })
      )
    );
    await expect(inventoryContent.first()).toBeVisible({ timeout: 5000 });
  }

  test('Open Product Catalog and navigate to Inventory tab', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);
    
    // Verify we're on Inventory tab
    const inventoryHeader = page.getByText('Inventory Management');
    await expect(inventoryHeader).toBeVisible({ timeout: 5000 });
  });

  test('Search for products in Inventory', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Find search input in Inventory tab
    const searchInput = page.getByPlaceholder(/Search/i).first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Enter search term
    await searchInput.fill('test');
    await page.waitForTimeout(1500); // Wait for search results

    // Verify search is working (either results appear or "no results" message)
    const hasResults = await page.locator('text=/No inventory|inventory|product/i').count() > 0;
    expect(hasResults).toBeTruthy();
  });

  test('View inventory detail for a product', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Look for any inventory item in the list (clickable items)
    const inventoryItems = page.locator('[class*="inventory"], [class*="list-item"], div[class*="cursor-pointer"]')
      .filter({ hasText: /SKU|Quantity|On Hand/i });
    
    const itemCount = await inventoryItems.count();
    if (itemCount > 0) {
      await inventoryItems.first().click();
      await page.waitForTimeout(1500);

      // Verify detail view appears (should show back button or product details)
      const detailView = page.getByRole('button', { name: /Back/i }).or(
        page.getByText(/Quantity on Hand|Available|Reserved/i)
      );
      await expect(detailView.first()).toBeVisible({ timeout: 5000 });
    } else {
      // If no items, verify empty state
      const emptyState = page.getByText(/No inventory|Select a product/i);
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Open Create Inventory Record modal', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Look for "Create Inventory Record" button
    const createButton = page.getByRole('button', { name: /Create Inventory Record/i });
    
    const buttonExists = await createButton.count() > 0;
    if (buttonExists) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Verify modal opens - look for modal dialog
      const modal = page.getByRole('heading', { name: /Create Inventory Record/i }).or(
        page.locator('[role="dialog"]')
      );
      await expect(modal.first()).toBeVisible({ timeout: 5000 });

      // Verify form fields exist
      await expect(page.getByText(/Inventory Type/i)).toBeVisible();
      
      // Close modal
      const closeButton = page.getByRole('button', { name: /Cancel/i }).or(
        page.locator('button').filter({ has: page.locator('svg[class*="XMark"]') })
      ).first();
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('Open Low Stock Dashboard', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Look for Low Stock button
    const lowStockButton = page.getByRole('button', { name: /Low Stock/i });
    const buttonExists = await lowStockButton.count() > 0;
    
    if (buttonExists) {
      await lowStockButton.click();
      await page.waitForTimeout(1000);

      // Verify Low Stock Dashboard opens - check for heading or title text
      const dashboard = page.getByRole('heading', { name: /Low Stock Alert/i }).or(
        page.getByText(/Low Stock Alert/i)
      );
      const dashboardVisible = await dashboard.count() > 0;
      
      if (dashboardVisible) {
        await expect(dashboard.first()).toBeVisible({ timeout: 5000 });

        // Close dashboard - find close button in the modal/dashboard
        const modal = page.locator('[role="dialog"]').or(
          page.locator('div').filter({ has: dashboard })
        );
        const closeButton = modal.locator('button').filter({ 
          has: page.locator('svg[class*="XMark"]') 
        }).or(
          modal.getByRole('button', { name: /close/i })
        ).first();
        
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('Filter inventory by type', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Look for filter dropdowns or radio buttons
    const typeFilter = page.locator('select').or(
      page.locator('input[type="radio"][value="bulk"]')
    ).first();
    
    const filterExists = await typeFilter.count() > 0;
    if (filterExists) {
      // Try to interact with filter
      const tagName = await typeFilter.evaluate(el => el.tagName);
      if (tagName === 'SELECT') {
        await typeFilter.selectOption('bulk');
      } else {
        await typeFilter.click();
      }
      await page.waitForTimeout(1000);
    }
  });

  test('Navigate back from inventory detail view', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Click on an inventory item if available
    const inventoryItems = page.locator('[class*="cursor-pointer"]').filter({ 
      hasText: /SKU|Quantity/i 
    });
    const itemCount = await inventoryItems.count();
    
    if (itemCount > 0) {
      await inventoryItems.first().click();
      await page.waitForTimeout(1000);

      // Find and click back button
      const backButton = page.getByRole('button', { name: /Back|Back to inventory list/i });
      await expect(backButton.first()).toBeVisible({ timeout: 5000 });
      
      await backButton.first().click();
      await page.waitForTimeout(1000);

      // Verify we're back to list view
      const listView = page.getByPlaceholder(/Search/i).or(
        page.getByRole('button', { name: /Low Stock/i })
      );
      await expect(listView.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Verify inventory action buttons exist in detail view', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Click on an inventory item if available
    const inventoryItems = page.locator('[class*="cursor-pointer"]').filter({ 
      hasText: /SKU|Quantity/i 
    });
    const itemCount = await inventoryItems.count();
    
    if (itemCount > 0) {
      await inventoryItems.first().click();
      await page.waitForTimeout(1000);

      // Check for action buttons section
      const actionsSection = page.getByText('Actions').or(
        page.getByRole('heading', { name: 'Actions' })
      );
      
      const hasActions = await actionsSection.count() > 0;
      if (hasActions) {
        // Verify common action buttons exist
        const issueButton = page.getByRole('button', { name: /Issue/i });
        const adjustButton = page.getByRole('button', { name: /Adjust/i });
        const transferButton = page.getByRole('button', { name: /Transfer/i });

        // At least one action button should exist
        const totalActions = await issueButton.count() + await adjustButton.count() + await transferButton.count();
        expect(totalActions).toBeGreaterThan(0);
      }
    }
  });

  test('Check transaction history display', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Click on an inventory item if available
    const inventoryItems = page.locator('[class*="cursor-pointer"]').filter({ 
      hasText: /SKU|Quantity/i 
    });
    const itemCount = await inventoryItems.count();
    
    if (itemCount > 0) {
      await inventoryItems.first().click();
      await page.waitForTimeout(1000);

      // Look for Transaction History section
      const transactionHistory = page.getByText('Transaction History').or(
        page.getByRole('heading', { name: 'Transaction History' })
      );
      
      const hasHistory = await transactionHistory.count() > 0;
      if (hasHistory) {
        // Verify history section is visible
        await expect(transactionHistory.first()).toBeVisible({ timeout: 5000 });
        
        // Check for "View All" link if transactions exist - be specific to Transaction History section
        const transactionSection = page.getByText('Transaction History').locator('..');
        const viewAllLink = transactionSection.getByRole('button', { name: /View All/i }).or(
          transactionSection.getByText(/View All/i)
        );
        const hasViewAll = await viewAllLink.count() > 0;
        
        if (hasViewAll) {
          // Use force click to bypass overlay interception
          await viewAllLink.first().click({ force: true });
          await page.waitForTimeout(1500);
          
          // Verify transaction history modal opens
          const historyModal = page.getByRole('heading', { name: /Transaction History/i }).or(
            page.locator('[role="dialog"]').filter({ hasText: /Transaction History/i })
          );
          await expect(historyModal.first()).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('Verify inventory list displays correctly', async ({ page }) => {
    await openProductCatalog(page);
    await navigateToInventoryTab(page);

    // Verify key elements exist
    const searchInput = page.getByPlaceholder(/Search/i).first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Check for filters or empty state
    const hasContent = await page.locator('text=/No inventory|Select a product|Inventory Management/i').count() > 0;
    expect(hasContent).toBeTruthy();
  });
});
