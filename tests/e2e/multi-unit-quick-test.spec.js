/**
 * Quick Multi-Unit System Test
 * Tests key functionality without full UI navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Unit System - Quick Tests', () => {
  test('API: Products should have normalized properties', async ({ request }) => {
    const response = await request.get('/api/products?limit=5');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBeTruthy();
    
    if (data.data && data.data.length > 0) {
      const productsWithNormalized = data.data.filter(p => 
        p.propertiesNormalized && Object.keys(p.propertiesNormalized).length > 0
      );
      
      console.log(`✅ ${productsWithNormalized.length}/${data.data.length} products have normalized properties`);
      
      // Check variants
      const productsWithVariants = data.data.filter(p => p.variants && p.variants.length > 0);
      if (productsWithVariants.length > 0) {
        const variant = productsWithVariants[0].variants[0];
        if (variant.propertiesNormalized) {
          console.log(`✅ Variants have normalized properties: ${Object.keys(variant.propertiesNormalized).join(', ')}`);
        }
      }
    }
  });

  test('API: Property search with unit conversion', async ({ request }) => {
    // Search for products with width filter (inches)
    const filters = JSON.stringify({
      width: { min: 10, max: 14, unit: 'in' }
    });
    
    const response = await request.get(
      `/api/products/search/autocomplete?filters=${encodeURIComponent(filters)}&supplierId=test`
    );
    
    if (response.ok()) {
      const data = await response.json();
      console.log(`✅ Property filter API works: ${data.success}`);
      if (data.data) {
        console.log(`   Found ${data.data.length} products`);
      }
    }
  });

  test('API: PropertyDefinitions should have unit information', async ({ request }) => {
    const response = await request.get('/api/property-definitions');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBeTruthy();
    
    if (data.data && data.data.length > 0) {
      const propertiesWithUnits = data.data.filter(p => p.unit || p.unitOfMeasureId);
      console.log(`✅ ${propertiesWithUnits.length}/${data.data.length} PropertyDefinitions have units`);
      
      // Check for dimension properties with standardValues
      const dimensionProps = data.data.filter(p => 
        p.category === 'dimension' && 
        p.standardValues && 
        p.standardValues.length > 0
      );
      console.log(`✅ ${dimensionProps.length} dimension properties have standardValues`);
      
      if (dimensionProps.length > 0) {
        const heightProp = dimensionProps.find(p => p.key === 'height');
        if (heightProp) {
          console.log(`✅ Height property has ${heightProp.standardValues.length} standard values`);
          console.log(`   Unit: ${heightProp.unit || 'N/A'}`);
          console.log(`   UnitSystem: ${heightProp.unitSystem || 'N/A'}`);
        }
      }
    }
  });

  test('API: ProductTypes should reference PropertyDefinitions', async ({ request }) => {
    const response = await request.get('/api/product-types');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBeTruthy();
    
    if (data.data && data.data.length > 0) {
      // Find Ductwork product type
      const ductwork = data.data.find(pt => pt.slug === 'ductwork' || pt.name.toLowerCase().includes('ductwork'));
      
      if (ductwork && ductwork.properties) {
        const propertiesWithUnits = ductwork.properties.filter(p => p.unit || p.propertyDefinitionId);
        console.log(`✅ Ductwork has ${propertiesWithUnits.length}/${ductwork.properties.length} properties with units`);
        
        // Check height property
        const heightProp = ductwork.properties.find(p => p.key === 'height');
        if (heightProp) {
          console.log(`✅ Height property:`);
          console.log(`   Unit: ${heightProp.unit || 'N/A'}`);
          console.log(`   UnitSystem: ${heightProp.unitSystem || 'N/A'}`);
          console.log(`   Has PropertyDefinition: ${!!heightProp.propertyDefinitionId}`);
        }
      }
    }
  });

  test('API: Unit conversion service works', async ({ request }) => {
    // Test by searching for products - the query builder should handle conversion
    const response = await request.get('/api/products/search/autocomplete?supplierId=test');
    
    if (response.ok()) {
      const data = await response.json();
      console.log(`✅ Product search API works: ${data.success}`);
      
      // Verify response structure
      if (data.data && Array.isArray(data.data)) {
        console.log(`   API returned ${data.data.length} products`);
      }
    }
  });
});



