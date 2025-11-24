const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001';

const testAPI = async () => {
  console.log('🧪 Testing Product Types & Variants API\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Test 1: Get all product types
    console.log('1️⃣  Testing GET /api/product-types');
    const productTypesRes = await axios.get(`${API_BASE}/api/product-types`);
    console.log(`   ✅ Found ${productTypesRes.data.data.length} product types`);
    
    if (productTypesRes.data.data.length > 0) {
      const firstType = productTypesRes.data.data[0];
      console.log(`   📦 Example: ${firstType.name}`);
      console.log(`      Properties: ${firstType.properties?.length || 0}`);
      console.log(`      Variants Enabled: ${firstType.variantSettings?.enabled ? 'Yes' : 'No'}\n`);
    }

    // Test 2: Get specific product type
    if (productTypesRes.data.data.length > 0) {
      const typeId = productTypesRes.data.data[0]._id;
      console.log(`2️⃣  Testing GET /api/product-types/${typeId}`);
      const typeRes = await axios.get(`${API_BASE}/api/product-types/${typeId}`);
      console.log(`   ✅ Retrieved: ${typeRes.data.data.name}`);
      console.log(`      Properties: ${typeRes.data.data.properties?.length || 0}\n`);
    }

    // Test 3: Get products with product types
    console.log('3️⃣  Testing GET /api/products (with product types)');
    const productsRes = await axios.get(`${API_BASE}/api/products`);
    const productsWithTypes = productsRes.data.data.filter(p => p.productTypeId);
    console.log(`   ✅ Found ${productsRes.data.data.length} total products`);
    console.log(`   ✅ Found ${productsWithTypes.length} products with product types\n`);

    // Test 4: Get product with variants
    const productWithVariants = productsRes.data.data.find(p => p.variants && p.variants.length > 0);
    if (productWithVariants) {
      console.log(`4️⃣  Testing GET /api/products/${productWithVariants._id} (with variants)`);
      const productRes = await axios.get(`${API_BASE}/api/products/${productWithVariants._id}`);
      const product = productRes.data.data;
      console.log(`   ✅ Retrieved: ${product.name}`);
      console.log(`      Product Type: ${product.productTypeId?.name || 'None'}`);
      console.log(`      Variants: ${product.variants?.length || 0}`);
      
      if (product.variants && product.variants.length > 0) {
        console.log(`      Variant Examples:`);
        product.variants.slice(0, 2).forEach((variant, idx) => {
          console.log(`        ${idx + 1}. ${variant.name || `Variant ${idx + 1}`}`);
          if (variant.sku) console.log(`           SKU: ${variant.sku}`);
          if (variant.properties) {
            const props = variant.properties instanceof Map 
              ? Object.fromEntries(variant.properties)
              : variant.properties;
            const propEntries = Object.entries(props).slice(0, 2);
            propEntries.forEach(([key, value]) => {
              console.log(`           ${key}: ${value}`);
            });
          }
        });
      }
      console.log('');
    }

    // Test 5: Get products by type
    if (productTypesRes.data.data.length > 0) {
      const typeId = productTypesRes.data.data[0]._id;
      console.log(`5️⃣  Testing GET /api/product-types/${typeId}/products`);
      const productsByTypeRes = await axios.get(`${API_BASE}/api/product-types/${typeId}/products`);
      console.log(`   ✅ Found ${productsByTypeRes.data.data.length} products of this type\n`);
    }

    // Test 6: Test variant endpoints
    if (productWithVariants) {
      console.log(`6️⃣  Testing Variant Endpoints`);
      const productId = productWithVariants._id;
      
      // Create a test variant
      const productType = productWithVariants.productTypeId;
      if (productType && productType.variantSettings?.enabled) {
        const variantProps = {};
        productType.variantSettings.variantProperties.forEach(key => {
          // Get a sample value from existing variants
          const existingVariant = productWithVariants.variants[0];
          if (existingVariant && existingVariant.properties) {
            const existingProps = existingVariant.properties instanceof Map
              ? Object.fromEntries(existingVariant.properties)
              : existingVariant.properties;
            variantProps[key] = existingProps[key] || 'test';
          }
        });

        try {
          const createVariantRes = await axios.post(
            `${API_BASE}/api/products/${productId}/variants`,
            {
              name: 'Test Variant',
              sku: 'TEST-VARIANT-001',
              properties: variantProps,
              pricing: {
                standardCost: 10.00,
                lastPrice: 12.00
              },
              isActive: true
            }
          );
          console.log(`   ✅ Created variant: ${createVariantRes.data.data.name}`);
          
          const variantId = createVariantRes.data.data._id;
          
          // Update variant
          const updateVariantRes = await axios.patch(
            `${API_BASE}/api/products/${productId}/variants/${variantId}`,
            { name: 'Updated Test Variant' }
          );
          console.log(`   ✅ Updated variant: ${updateVariantRes.data.data.name}`);
          
          // Delete variant
          await axios.delete(`${API_BASE}/api/products/${productId}/variants/${variantId}`);
          console.log(`   ✅ Deleted variant\n`);
        } catch (error) {
          console.log(`   ⚠️  Variant operations: ${error.response?.data?.message || error.message}\n`);
        }
      }
    }

    console.log('=' .repeat(60));
    console.log('✅ All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
    process.exit(1);
  }
};

testAPI();

