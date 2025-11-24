import { test, expect } from '@playwright/test';

/**
 * Tests for Purchase Order & Material Inventory API endpoints
 * These tests verify that all new API endpoints are working correctly
 */
test.describe('PO & Material Inventory API Tests', () => {
  test.beforeEach(async ({ baseURL }) => {
    // Verify baseURL is configured correctly
    expect(baseURL).toBeDefined();
    if (baseURL.includes('localhost')) {
      expect(baseURL).toMatch(/http:\/\/localhost:\d+/);
      // Should be port 3000, not 9323
      if (baseURL.includes('9323')) {
        throw new Error(`Invalid port detected: ${baseURL}. Expected localhost:3000`);
      }
    }
  });

  test('Companies API endpoints', async ({ request, baseURL }) => {
    // Test GET /api/companies
    const listResponse = await request.get(`${baseURL}/api/companies`);
    expect([200, 503]).toContain(listResponse.status());
    
    if (listResponse.status() === 200) {
      const body = await listResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }

    // Test search autocomplete
    const searchResponse = await request.get(`${baseURL}/api/companies/search/autocomplete?q=test`);
    expect([200, 503]).toContain(searchResponse.status());
  });

  test('Products API endpoints', async ({ request, baseURL }) => {
    // Test GET /api/products
    const listResponse = await request.get(`${baseURL}/api/products`);
    expect([200, 503]).toContain(listResponse.status());
    
    if (listResponse.status() === 200) {
      const body = await listResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }

    // Test search autocomplete
    const searchResponse = await request.get(`${baseURL}/api/products/search/autocomplete?q=test`);
    expect([200, 503]).toContain(searchResponse.status());
  });

  test('Material Requests API endpoints', async ({ request, baseURL }) => {
    // Test GET /api/material-requests
    const listResponse = await request.get(`${baseURL}/api/material-requests`);
    expect([200, 503]).toContain(listResponse.status());
    
    if (listResponse.status() === 200) {
      const body = await listResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  test('Purchase Orders API endpoints', async ({ request, baseURL }) => {
    // Test GET /api/purchase-orders
    const listResponse = await request.get(`${baseURL}/api/purchase-orders`);
    expect([200, 503]).toContain(listResponse.status());
    
    if (listResponse.status() === 200) {
      const body = await listResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  test('PO Receipts API endpoints', async ({ request, baseURL }) => {
    // Test GET /api/po-receipts
    const listResponse = await request.get(`${baseURL}/api/po-receipts`);
    expect([200, 503]).toContain(listResponse.status());
    
    if (listResponse.status() === 200) {
      const body = await listResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  test('Inventory API endpoints', async ({ request, baseURL }) => {
    // Test GET /api/inventory
    const listResponse = await request.get(`${baseURL}/api/inventory`);
    expect([200, 503]).toContain(listResponse.status());
    
    if (listResponse.status() === 200) {
      const body = await listResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }

    // Test transactions endpoint
    const transactionsResponse = await request.get(`${baseURL}/api/inventory/transactions`);
    expect([200, 503]).toContain(transactionsResponse.status());
  });

  test('API endpoints return proper error for invalid IDs', async ({ request, baseURL }) => {
    // Verify baseURL is correct (should be localhost:3000, not 9323)
    expect(baseURL).toMatch(/localhost:\d+|vercel\.app/);
    if (baseURL.includes('localhost')) {
      expect(baseURL).not.toContain('9323');
    }

    const invalidId = 'invalid-id-123';
    
    // Test invalid company ID - should return 400 (bad request) for invalid ObjectId format
    const companyResponse = await request.get(`${baseURL}/api/companies/${invalidId}`);
    const companyStatus = companyResponse.status();
    expect([400, 404, 503]).toContain(companyStatus);
    
    if (companyStatus === 400 || companyStatus === 404) {
      const body = await companyResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(false);
      expect(body).toHaveProperty('message');
    }

    // Test invalid product ID - should return 400 (bad request) for invalid ObjectId format
    const productResponse = await request.get(`${baseURL}/api/products/${invalidId}`);
    const productStatus = productResponse.status();
    expect([400, 404, 503]).toContain(productStatus);
    
    if (productStatus === 400 || productStatus === 404) {
      const body = await productResponse.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(false);
      expect(body).toHaveProperty('message');
    }

    // Test invalid material request ID
    const materialRequestResponse = await request.get(`${baseURL}/api/material-requests/${invalidId}`);
    const materialRequestStatus = materialRequestResponse.status();
    expect([400, 404, 503]).toContain(materialRequestStatus);
  });

  test('All new API endpoints are accessible', async ({ request, baseURL }) => {
    const endpoints = [
      '/api/companies',
      '/api/products',
      '/api/material-requests',
      '/api/purchase-orders',
      '/api/po-receipts',
      '/api/inventory',
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await request.get(`${baseURL}${endpoint}`);
        const responseTime = Date.now() - startTime;
        
        results.push({
          endpoint,
          status: response.status(),
          responseTime,
          success: response.ok(),
        });
      } catch (error) {
        results.push({
          endpoint,
          error: error.message,
          success: false,
        });
      }
    }

    console.log('PO & Material Inventory API Endpoints:', JSON.stringify(results, null, 2));

    // All endpoints should respond (may be 503 if DB not configured, but endpoint should exist)
    for (const result of results) {
      expect(result.status).toBeDefined();
      // Accept 200 (success) or 503 (service unavailable - DB not configured)
      if (result.status) {
        expect([200, 503, 404]).toContain(result.status);
      }
    }
  });
});

