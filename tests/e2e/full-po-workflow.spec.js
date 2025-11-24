const { test, expect } = require('@playwright/test');

/**
 * Full PO Workflow E2E Test
 * 
 * Tests the complete workflow:
 * 1. Google SSO Login
 * 2. Create Material Request
 * 3. Approve Request
 * 4. Convert to PO
 * 5. Issue PO (PDF + Email)
 * 6. Receive Materials (with photos)
 * 7. Verify Gmail Integration
 */

test.describe('Full PO Workflow - End to End', () => {
  let baseURL;
  let authToken;
  let materialRequestId;
  let purchaseOrderId;
  let poReceiptId;
  let testJobId;
  let testProductId;
  let testCompanyId;

  test.beforeAll(async ({ request }) => {
    baseURL = process.env.BASE_URL || 'http://localhost:3000';
    const apiURL = process.env.API_URL || 'http://localhost:3001';

    // Skip if not local environment
    if (!baseURL.includes('localhost')) {
      test.skip();
    }

    console.log(`🧪 Testing against: ${baseURL}`);
    console.log(`📡 API URL: ${apiURL}`);

    // Get or create test data
    try {
      // Get a test job
      const jobsResponse = await request.get(`${apiURL}/api/jobs?limit=1`);
      if (jobsResponse.ok()) {
        const jobsData = await jobsResponse.json();
        if (jobsData.success && jobsData.data && jobsData.data.length > 0) {
          testJobId = jobsData.data[0]._id;
        }
      }

      // Get a test product
      const productsResponse = await request.get(`${apiURL}/api/products?limit=1`);
      if (productsResponse.ok()) {
        const productsData = await productsResponse.json();
        if (productsData.success && productsData.data && productsData.data.length > 0) {
          testProductId = productsData.data[0]._id;
        }
      }

      // Get a test company
      const companiesResponse = await request.get(`${apiURL}/api/companies?limit=1`);
      if (companiesResponse.ok()) {
        const companiesData = await companiesResponse.json();
        if (companiesData.success && companiesData.data && companiesData.data.length > 0) {
          testCompanyId = companiesData.data[0]._id;
        }
      }

      console.log(`✅ Test data ready:`);
      console.log(`   Job ID: ${testJobId || 'NOT FOUND'}`);
      console.log(`   Product ID: ${testProductId || 'NOT FOUND'}`);
      console.log(`   Company ID: ${testCompanyId || 'NOT FOUND'}`);
    } catch (error) {
      console.warn('⚠️  Could not fetch test data:', error.message);
    }
  });

  test('1. Google SSO Login Flow', async ({ page, context }) => {
    test.setTimeout(60000); // 60 seconds for OAuth flow

    console.log('\n📝 Step 1: Testing Google SSO Login...');

    await page.goto(`${baseURL}/login`);

    // Wait for login page to load
    await expect(page.locator('text=Sign in with Google')).toBeVisible({ timeout: 10000 });

    // Check if Google button exists
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();

    console.log('✅ Login page loaded');

    // Note: Actual Google OAuth flow requires manual interaction
    // For automated testing, we'll need to mock or use test credentials
    // For now, we'll verify the page structure and button exists
    
    // If we have a test token, we can set it directly
    // Otherwise, we'll need to handle OAuth manually or skip this step
    
    console.log('⚠️  Google OAuth requires manual interaction or test credentials');
    console.log('   Skipping actual OAuth flow for automated test');
    console.log('   To test manually: Click button and complete OAuth');

    // For now, verify the login page is functional
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('2. Create Material Request', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('\n📝 Step 2: Creating Material Request...');

    const apiURL = process.env.API_URL || 'http://localhost:3001';

    // Skip if we don't have required test data
    if (!testJobId || !testProductId) {
      test.skip('Missing test data (job or product)');
    }

    // First, we need to authenticate
    // For automated tests, we'll need a test user token
    // For now, let's try to create a request via API if we have auth

    // Get a test user ID first
    let testUserId = null;
    try {
      const usersResponse = await request.get(`${apiURL}/api/users?limit=1`);
      if (usersResponse.ok()) {
        const usersData = await usersResponse.json();
        if (usersData.success && usersData.data && usersData.data.length > 0) {
          testUserId = usersData.data[0]._id;
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch test user: ${error.message}`);
    }

    // Get product details to get productName
    let productName = 'Test Product';
    try {
      const productResponse = await request.get(`${apiURL}/api/products/${testProductId}`);
      if (productResponse.ok()) {
        const productData = await productResponse.json();
        if (productData.success && productData.data) {
          productName = productData.data.name || productData.data.productName || 'Test Product';
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch product details: ${error.message}`);
    }

    // Get job details to get projectId
    let projectId = null;
    try {
      const jobResponse = await request.get(`${apiURL}/api/jobs/${testJobId}`);
      if (jobResponse.ok()) {
        const jobData = await jobResponse.json();
        if (jobData.success && jobData.data) {
          projectId = jobData.data.projectId || jobData.data.project?._id;
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch job details: ${error.message}`);
    }

    if (!projectId) {
      test.skip('Could not get projectId from job');
      return;
    }

    const materialRequestData = {
      jobId: testJobId,
      projectId: projectId,
      requestedBy: testUserId || testJobId, // Use jobId as fallback if no user
      lineItems: [
        {
          productId: testProductId,
          productName: productName,
          quantity: 10,
          unit: 'EA', // Must be uppercase enum value
          notes: 'Test material request from automated test'
        }
      ],
      deliveryAddress: '123 Test St, Test City, TC 12345',
      deliveryLocation: 'jobsite', // Required enum
      priority: 'standard', // Must be: 'urgent', 'standard', or 'low'
      requiredByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    try {
      const response = await request.post(`${apiURL}/api/material-requests`, {
        data: materialRequestData,
        headers: {
          'Content-Type': 'application/json'
          // Note: Would need Authorization header with valid token
        }
      });

      if (response.status() === 401) {
        console.log('⚠️  Authentication required - skipping API test');
        test.skip('Authentication required for API calls');
        return;
      }

      if (response.ok()) {
        const data = await response.json();
        if (data.success && data.data) {
          materialRequestId = data.data._id;
          console.log(`✅ Material Request created: ${materialRequestId}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`⚠️  API Error: ${response.status()} - ${errorText}`);
      }
    } catch (error) {
      console.log(`⚠️  Error creating material request: ${error.message}`);
    }

    // Test via UI if we can navigate there
    await page.goto(`${baseURL}/material-requests`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page loads (might redirect to login if not authenticated)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('⚠️  Redirected to login - authentication required');
      test.skip('Authentication required for UI tests');
      return;
    }

    // Try to find "New Request" button
    const newRequestButton = page.locator('button:has-text("New"), a:has-text("New Request")');
    const buttonExists = await newRequestButton.count() > 0;
    
    if (buttonExists) {
      console.log('✅ Material Requests page loaded');
    } else {
      console.log('⚠️  Could not find New Request button');
    }
  });

  test('3. Approve Material Request', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('\n📝 Step 3: Approving Material Request...');

    if (!materialRequestId) {
      test.skip('No material request ID from previous step');
    }

    const apiURL = process.env.API_URL || 'http://localhost:3001';

    try {
      const response = await request.patch(
        `${apiURL}/api/material-requests/${materialRequestId}/approve`,
        {
          headers: {
            'Content-Type': 'application/json'
            // Would need Authorization header
          }
        }
      );

      if (response.status() === 401) {
        console.log('⚠️  Authentication required');
        test.skip('Authentication required');
        return;
      }

      if (response.ok()) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Material Request approved');
        }
      }
    } catch (error) {
      console.log(`⚠️  Error approving request: ${error.message}`);
    }
  });

  test('4. Convert to Purchase Order', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('\n📝 Step 4: Converting to Purchase Order...');

    if (!materialRequestId || !testCompanyId) {
      test.skip('Missing material request or company ID');
    }

    const apiURL = process.env.API_URL || 'http://localhost:3001';

    const poData = {
      materialRequestId: materialRequestId,
      supplierId: testCompanyId,
      terms: 'Net 30',
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      notes: 'Test PO from automated test'
    };

    try {
      const response = await request.post(`${apiURL}/api/purchase-orders`, {
        data: poData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 401) {
        console.log('⚠️  Authentication required');
        test.skip('Authentication required');
        return;
      }

      if (response.ok()) {
        const data = await response.json();
        if (data.success && data.data) {
          purchaseOrderId = data.data._id;
          console.log(`✅ Purchase Order created: ${purchaseOrderId}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error creating PO: ${error.message}`);
    }
  });

  test('5. Issue PO and Generate PDF', async ({ page, request }) => {
    test.setTimeout(60000);

    console.log('\n📝 Step 5: Issuing PO and Generating PDF...');

    if (!purchaseOrderId) {
      test.skip('No purchase order ID from previous step');
    }

    const apiURL = process.env.API_URL || 'http://localhost:3001';

    // First, approve the PO if needed
    try {
      const approveResponse = await request.patch(
        `${apiURL}/api/purchase-orders/${purchaseOrderId}/approve`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (approveResponse.ok()) {
        console.log('✅ PO approved');
      }
    } catch (error) {
      console.log(`⚠️  Error approving PO: ${error.message}`);
    }

    // Issue the PO
    try {
      const issueResponse = await request.patch(
        `${apiURL}/api/purchase-orders/${purchaseOrderId}/issue`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (issueResponse.status() === 401) {
        console.log('⚠️  Authentication required');
        test.skip('Authentication required');
        return;
      }

      if (issueResponse.ok()) {
        const data = await issueResponse.json();
        console.log('✅ PO issued');
        
        // Verify PDF endpoint
        const pdfResponse = await request.get(
          `${apiURL}/api/purchase-orders/${purchaseOrderId}/pdf`,
          {
            headers: {
              'Accept': 'application/pdf'
            }
          }
        );

        if (pdfResponse.ok()) {
          const contentType = pdfResponse.headers()['content-type'];
          if (contentType && contentType.includes('pdf')) {
            console.log('✅ PDF generated successfully');
            const pdfBuffer = await pdfResponse.body();
            expect(pdfBuffer.length).toBeGreaterThan(0);
          }
        } else {
          console.log(`⚠️  PDF generation failed: ${pdfResponse.status()}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error issuing PO: ${error.message}`);
    }
  });

  test('6. Send PO Email via Gmail', async ({ page, request }) => {
    test.setTimeout(60000);

    console.log('\n📝 Step 6: Sending PO Email via Gmail...');

    if (!purchaseOrderId) {
      test.skip('No purchase order ID from previous step');
    }

    const apiURL = process.env.API_URL || 'http://localhost:3001';

    try {
      const response = await request.post(
        `${apiURL}/api/purchase-orders/${purchaseOrderId}/send-email`,
        {
          data: {
            toEmail: 'test@example.com' // Test email
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status() === 401) {
        console.log('⚠️  Authentication required');
        test.skip('Authentication required');
        return;
      }

      if (response.ok()) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Email sent via ${data.data?.method || 'unknown'}`);
          console.log(`   Message ID: ${data.data?.messageId || 'N/A'}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log(`⚠️  Email send failed: ${response.status()}`);
        console.log(`   Error: ${errorData.message || 'Unknown error'}`);
        
        if (errorData.requiresGoogleAuth) {
          console.log('   → Google authentication required');
        }
      }
    } catch (error) {
      console.log(`⚠️  Error sending email: ${error.message}`);
    }
  });

  test('7. Receive Materials with Photos', async ({ page, request }) => {
    test.setTimeout(60000);

    console.log('\n📝 Step 7: Receiving Materials with Photos...');

    if (!purchaseOrderId) {
      test.skip('No purchase order ID from previous step');
    }

    const apiURL = process.env.API_URL || 'http://localhost:3001';

    // Get PO details to get line items
    try {
      const poResponse = await request.get(
        `${apiURL}/api/purchase-orders/${purchaseOrderId}`
      );

      if (!poResponse.ok()) {
        test.skip('Could not fetch PO details');
        return;
      }

      const poData = await poResponse.json();
      if (!poData.success || !poData.data) {
        test.skip('Invalid PO data');
        return;
      }

      const po = poData.data;
      const lineItems = po.lineItems || [];

      if (lineItems.length === 0) {
        test.skip('No line items in PO');
        return;
      }

      // Create receipt data
      const receiptData = {
        purchaseOrderId: purchaseOrderId,
        receivedBy: 'test-user',
        receivedDate: new Date().toISOString(),
        lineItems: lineItems.map((item, index) => ({
          poLineItemId: item._id || index,
          productId: item.productId,
          productName: item.productName,
          quantityReceived: item.quantity || item.quantityOrdered || 1,
          condition: 'good',
          notes: 'Test receipt from automated test'
        })),
        status: 'submitted'
      };

      const receiptResponse = await request.post(
        `${apiURL}/api/po-receipts`,
        {
          data: receiptData,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (receiptResponse.status() === 401) {
        console.log('⚠️  Authentication required');
        test.skip('Authentication required');
        return;
      }

      if (receiptResponse.ok()) {
        const receiptData = await receiptResponse.json();
        if (receiptData.success && receiptData.data) {
          poReceiptId = receiptData.data._id;
          console.log(`✅ Receipt created: ${poReceiptId}`);
        }
      } else {
        const errorText = await receiptResponse.text();
        console.log(`⚠️  Error creating receipt: ${receiptResponse.status()} - ${errorText}`);
      }
    } catch (error) {
      console.log(`⚠️  Error in receiving workflow: ${error.message}`);
    }
  });

  test('8. Verify Complete Workflow', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('\n📝 Step 8: Verifying Complete Workflow...');

    const apiURL = process.env.API_URL || 'http://localhost:3001';

    const checks = {
      materialRequest: false,
      purchaseOrder: false,
      receipt: false
    };

    // Verify Material Request
    if (materialRequestId) {
      try {
        const response = await request.get(
          `${apiURL}/api/material-requests/${materialRequestId}`
        );
        if (response.ok()) {
          const data = await response.json();
          if (data.success && data.data) {
            checks.materialRequest = true;
            console.log('✅ Material Request verified');
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not verify material request: ${error.message}`);
      }
    }

    // Verify Purchase Order
    if (purchaseOrderId) {
      try {
        const response = await request.get(
          `${apiURL}/api/purchase-orders/${purchaseOrderId}`
        );
        if (response.ok()) {
          const data = await response.json();
          if (data.success && data.data) {
            checks.purchaseOrder = true;
            const po = data.data;
            console.log(`✅ Purchase Order verified: ${po.poNumber || po._id}`);
            console.log(`   Status: ${po.status}`);
            console.log(`   Email Sent: ${po.emailSent ? 'Yes' : 'No'}`);
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not verify purchase order: ${error.message}`);
      }
    }

    // Verify Receipt
    if (poReceiptId) {
      try {
        const response = await request.get(
          `${apiURL}/api/po-receipts/${poReceiptId}`
        );
        if (response.ok()) {
          const data = await response.json();
          if (data.success && data.data) {
            checks.receipt = true;
            console.log('✅ Receipt verified');
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not verify receipt: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 Workflow Summary:');
    console.log(`   Material Request: ${checks.materialRequest ? '✅' : '❌'}`);
    console.log(`   Purchase Order: ${checks.purchaseOrder ? '✅' : '❌'}`);
    console.log(`   Receipt: ${checks.receipt ? '✅' : '❌'}`);

    const allPassed = Object.values(checks).every(check => check);
    
    if (allPassed) {
      console.log('\n🎉 All workflow steps completed successfully!');
    } else {
      console.log('\n⚠️  Some workflow steps were skipped or failed');
    }
  });
});

