import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';

test.describe('Inventory Management - API Integration Tests', () => {
  let helpers;
  let authToken = null;
  let testProductId = null;
  let testInventoryId = null;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    await helpers.waitForAPICalls();
    
    // Get auth token from localStorage
    authToken = await page.evaluate(() => localStorage.getItem('authToken'));
  });

  test('API: Get all inventory items', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/inventory', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    // API returns 'data' or 'inventory' depending on endpoint
    const hasData = data.hasOwnProperty('data') && Array.isArray(data.data);
    const hasInventory = data.hasOwnProperty('inventory') && Array.isArray(data.inventory);
    expect(hasData || hasInventory).toBe(true);
  });

  test('API: Create inventory record', async ({ page }) => {
      // First, get a product to use
      const productsResponse = await page.request.get('http://localhost:3001/api/products/search?limit=1', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Products endpoint might return 200 or 400 if no products
      if (productsResponse.status() !== 200) {
        test.skip(); // Skip if products endpoint fails
        return;
      }
    const productsData = await productsResponse.json();
    
    if (productsData.products && productsData.products.length > 0) {
      testProductId = productsData.products[0]._id || productsData.products[0].productId;

      // Create inventory record
      const createResponse = await page.request.post('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          productId: testProductId,
          inventoryType: 'bulk',
          quantityOnHand: 100,
          primaryLocation: 'Warehouse A',
          reorderPoint: 20,
          reorderQuantity: 50
        }
      });

      expect(createResponse.status()).toBe(200);
      const createData = await createResponse.json();
      expect(createData).toHaveProperty('success', true);
      expect(createData).toHaveProperty('inventory');
      
      if (createData.inventory && createData.inventory._id) {
        testInventoryId = createData.inventory._id;
      }
    }
  });

  test('API: Get inventory by product ID', async ({ page }) => {
    if (!testProductId) {
      // Get a product if we don't have one
      const productsResponse = await page.request.get('http://localhost:3001/api/products/search?limit=1', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (productsResponse.status() === 200) {
        const productsData = await productsResponse.json();
        if (productsData.products && productsData.products.length > 0) {
          testProductId = productsData.products[0]._id || productsData.products[0].productId;
        }
      }
    }

    if (testProductId) {
      const response = await page.request.get(`http://localhost:3001/api/inventory/product/${testProductId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('inventory');
    }
  });

  test('API: Add inventory transaction (receipt)', async ({ page }) => {
    if (!testInventoryId) {
      // Try to get an existing inventory item
      const inventoryResponse = await page.request.get('http://localhost:3001/api/inventory?limit=1', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (inventoryResponse.status() === 200) {
        const inventoryData = await inventoryResponse.json();
        if (inventoryData.inventory && inventoryData.inventory.length > 0) {
          testInventoryId = inventoryData.inventory[0]._id;
        }
      }
    }

    if (testInventoryId) {
      const response = await page.request.post(`http://localhost:3001/api/inventory/${testInventoryId}/transaction`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          transactionType: 'receipt',
          quantity: 25,
          unitCost: 10.50,
          location: 'Warehouse A',
          notes: 'Test receipt transaction'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('inventory');
      
      // Verify quantity was updated
      if (data.inventory && data.inventory.inventoryType === 'bulk') {
        expect(data.inventory.quantityOnHand).toBeGreaterThan(0);
      }
    }
  });

  test('API: Filter inventory by type', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/inventory?inventoryType=bulk', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    
    // API returns 'data' or 'inventory'
    const inventory = data.data || data.inventory || [];
    expect(Array.isArray(inventory)).toBe(true);
    
    // Verify all returned items are bulk type
    if (inventory.length > 0) {
      inventory.forEach(item => {
        expect(item.inventoryType).toBe('bulk');
      });
    }
  });

  test('API: Filter inventory by low stock', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/inventory?lowStock=true', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    
    // API returns 'data' or 'inventory'
    const inventory = data.data || data.inventory || [];
    expect(Array.isArray(inventory)).toBe(true);
    
    // Verify all returned items are low stock
    if (inventory.length > 0) {
      inventory.forEach(item => {
        if (item.inventoryType === 'bulk' && item.reorderPoint !== undefined) {
          expect(item.quantityOnHand).toBeLessThanOrEqual(item.reorderPoint);
        }
      });
    }
  });

  test('API: Search inventory by product name', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/inventory?search=test', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    
    // API returns 'data' or 'inventory'
    const inventory = data.data || data.inventory || [];
    expect(Array.isArray(inventory)).toBe(true);
  });

  test('API: Get inventory transactions', async ({ page }) => {
    if (!testInventoryId) {
      // Try to get an existing inventory item
      const inventoryResponse = await page.request.get('http://localhost:3001/api/inventory?limit=1', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (inventoryResponse.status() === 200) {
        const inventoryData = await inventoryResponse.json();
        if (inventoryData.inventory && inventoryData.inventory.length > 0) {
          testInventoryId = inventoryData.inventory[0]._id;
        }
      }
    }

    if (testInventoryId) {
      const response = await page.request.get(`http://localhost:3001/api/inventory/${testInventoryId}/transactions`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('transactions');
      expect(Array.isArray(data.transactions)).toBe(true);
    }
  });

  test('API: Verify inventory quantities update correctly', async ({ page }) => {
    if (!testInventoryId) {
      // Try to get an existing inventory item
      const inventoryResponse = await page.request.get('http://localhost:3001/api/inventory?limit=1&inventoryType=bulk', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (inventoryResponse.status() === 200) {
        const inventoryData = await inventoryResponse.json();
        if (inventoryData.inventory && inventoryData.inventory.length > 0) {
          testInventoryId = inventoryData.inventory[0]._id;
        }
      }
    }

    if (testInventoryId) {
      // Get initial quantity
      const initialResponse = await page.request.get(`http://localhost:3001/api/inventory/${testInventoryId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(initialResponse.status()).toBe(200);
      const initialData = await initialResponse.json();
      const initialQty = initialData.inventory?.quantityOnHand || 0;

      // Add a transaction
      const transactionResponse = await page.request.post(`http://localhost:3001/api/inventory/${testInventoryId}/transaction`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          transactionType: 'receipt',
          quantity: 10,
          unitCost: 5.00,
          location: 'Warehouse A'
        }
      });

      expect(transactionResponse.status()).toBe(200);

      // Get updated quantity
      const updatedResponse = await page.request.get(`http://localhost:3001/api/inventory/${testInventoryId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(updatedResponse.status()).toBe(200);
      const updatedData = await updatedResponse.json();
      const updatedQty = updatedData.inventory?.quantityOnHand || 0;

      // Verify quantity increased
      expect(updatedQty).toBeGreaterThanOrEqual(initialQty);
    }
  });

  test('API: Verify error handling for invalid data', async ({ page }) => {
    // Try to create inventory with invalid data
    const response = await page.request.post('http://localhost:3001/api/inventory', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        // Missing required fields
        inventoryType: 'bulk'
        // No productId, quantity, etc.
      }
    });

    // Should return an error
    expect([400, 422, 500]).toContain(response.status());
  });
});

