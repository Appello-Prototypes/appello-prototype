const mongoose = require('mongoose');
const Product = require('../models/Product');
const Company = require('../models/Company');
const ProductType = require('../models/ProductType');
const { buildPropertyQuery } = require('../services/propertyQueryBuilder');

const productController = {
  // GET /api/products
  getAllProducts: async (req, res) => {
    try {
      const { 
        supplierId, 
        category, 
        isActive, 
        search, 
        productTypeId,
        pricebookSection,
        pricebookPageNumber,
        pricebookGroupCode
      } = req.query;
      
      const filter = {};
      if (supplierId) filter.supplierId = supplierId;
      if (productTypeId) filter.productTypeId = productTypeId;
      if (category) filter.category = category;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (pricebookSection) filter.pricebookSection = pricebookSection;
      if (pricebookPageNumber) filter.pricebookPageNumber = pricebookPageNumber;
      if (pricebookGroupCode) filter.pricebookGroupCode = pricebookGroupCode;
      if (search) {
        filter.$text = { $search: search };
      }
      
      const products = await Product.find(filter)
        .populate('supplierId', 'name companyType') // Legacy
        .populate('suppliers.supplierId', 'name companyType') // New
        .populate('productTypeId', 'name slug') // Product type
        .select('name description internalPartNumber supplierId suppliers productTypeId properties variants lastPrice unitOfMeasure category pricebookSection pricebookPageNumber pricebookPageName pricebookGroupCode isActive')
        .sort({ pricebookSection: 1, pricebookPageNumber: 1, name: 1 })
        .lean();
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/products/by-pricebook
  getProductsByPricebook: async (req, res) => {
    try {
      const products = await Product.find({ isActive: true })
        .select('name description variants pricebookSection pricebookPageNumber pricebookPageName pricebookGroupCode category')
        .sort({ pricebookSection: 1, pricebookPageNumber: 1, name: 1 })
        .lean();
      
      // Organize by pricebook structure
      const pricebookStructure = {};
      
      products.forEach(product => {
        const section = product.pricebookSection || 'UNCATEGORIZED';
        const pageNumber = product.pricebookPageNumber || '0';
        const pageName = product.pricebookPageName || 'Unknown Page';
        const groupCode = product.pricebookGroupCode || '';
        
        if (!pricebookStructure[section]) {
          pricebookStructure[section] = {
            name: section,
            pages: {}
          };
        }
        
        const pageKey = `${pageNumber}|${pageName}`;
        if (!pricebookStructure[section].pages[pageKey]) {
          pricebookStructure[section].pages[pageKey] = {
            pageNumber,
            pageName,
            groupCode,
            products: []
          };
        }
        
        pricebookStructure[section].pages[pageKey].products.push({
          _id: product._id,
          name: product.name,
          description: product.description,
          variantCount: product.variants?.length || 0,
          category: product.category
        });
      });
      
      // Convert to array format
      const result = Object.values(pricebookStructure).map(section => ({
        section: section.name,
        pages: Object.values(section.pages).map(page => ({
          pageNumber: page.pageNumber,
          pageName: page.pageName,
          groupCode: page.groupCode,
          productCount: page.products.length,
          products: page.products
        }))
      }));
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in getProductsByPricebook:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products by pricebook',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/products/:id
  getProductById: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const product = await Product.findById(req.params.id)
        .populate('supplierId') // Legacy
        .populate('suppliers.supplierId') // New
        .populate('productTypeId') // Product type
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error in getProductById:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching product',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/products
  createProduct: async (req, res) => {
    try {
      const productData = {
        ...req.body,
        createdBy: req.user?.id || req.body.createdBy
      };

      // Convert properties object to Map if provided
      if (productData.properties && typeof productData.properties === 'object' && !(productData.properties instanceof Map)) {
        productData.properties = new Map(Object.entries(productData.properties));
      }

      // Convert variant properties to Maps
      if (productData.variants && Array.isArray(productData.variants)) {
        productData.variants = productData.variants.map(variant => {
          if (variant.properties && typeof variant.properties === 'object' && !(variant.properties instanceof Map)) {
            variant.properties = new Map(Object.entries(variant.properties));
          }
          return variant;
        });
      }

      // Validate supplier exists
      if (productData.supplierId) {
        const supplier = await Company.findById(productData.supplierId);
        if (!supplier) {
          return res.status(400).json({
            success: false,
            message: 'Supplier not found'
          });
        }
      }

      // Validate product type exists if provided
      if (productData.productTypeId) {
        const productType = await ProductType.findById(productData.productTypeId);
        if (!productType) {
          return res.status(400).json({
            success: false,
            message: 'Product type not found'
          });
        }
      }

      const product = await Product.create(productData);

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error in createProduct:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating product',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/products/:id
  updateProduct: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const updateData = { ...req.body };

      // Convert properties object to Map if provided
      if (updateData.properties && typeof updateData.properties === 'object' && !(updateData.properties instanceof Map)) {
        updateData.properties = new Map(Object.entries(updateData.properties));
      }

      // Convert variant properties to Maps
      if (updateData.variants && Array.isArray(updateData.variants)) {
        updateData.variants = updateData.variants.map(variant => {
          if (variant.properties && typeof variant.properties === 'object' && !(variant.properties instanceof Map)) {
            variant.properties = new Map(Object.entries(variant.properties));
          }
          return variant;
        });
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('supplierId') // Legacy
        .populate('suppliers.supplierId') // New
        .populate('productTypeId') // Product type
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error in updateProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating product',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // GET /api/products/search/autocomplete
  searchProducts: async (req, res) => {
    try {
      const { q, supplierId, filters, productTypeId, jobId, systemId, areaId, pipeType, pipeDiameter } = req.query;
      
      // Parse filters if provided as JSON string
      let propertyFilters = {};
      if (filters) {
        try {
          propertyFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
        } catch (e) {
          console.warn('Error parsing filters:', e);
        }
      }
      
      // Build filter - support both text search and supplier filtering
      const filter = {
        isActive: true
      };
      
      // Convert supplierId to ObjectId if provided
      let supplierObjectId = null;
      let supplierIdStr = null;
      if (supplierId) {
        if (mongoose.Types.ObjectId.isValid(supplierId)) {
          try {
            supplierObjectId = new mongoose.Types.ObjectId(supplierId);
            supplierIdStr = supplierObjectId.toString();
          } catch (e) {
            console.error('Error converting supplierId to ObjectId:', e);
            supplierObjectId = null;
          }
        } else {
          console.warn('Invalid supplierId format:', supplierId);
        }
      }
      
      // Validate supplierId if provided
      if (supplierId && !supplierObjectId) {
        // If supplierId was provided but is invalid, return empty results instead of error
        // This allows the UI to work even if there's a data issue
        console.warn(`Invalid supplierId provided: ${supplierId}`);
        return res.json({
          success: true,
          data: []
        });
      }
      
      // Supplier filter conditions
      const supplierConditions = [];
      if (supplierObjectId) {
        supplierConditions.push(
          { supplierId: supplierObjectId }, // Legacy
          { 'suppliers.supplierId': supplierObjectId }, // New suppliers array
          { 'variants.suppliers.supplierId': supplierObjectId } // Variant suppliers
        );
      }
      
      // Text search conditions (only if search term provided)
      const textSearchConditions = [];
      const searchTerm = q ? q.trim() : '';
      if (searchTerm.length > 0) {
        textSearchConditions.push(
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { internalPartNumber: { $regex: searchTerm, $options: 'i' } },
          { 'variants.sku': { $regex: searchTerm, $options: 'i' } },
          { 'variants.name': { $regex: searchTerm, $options: 'i' } }
        );
      }
      
      // ProductType filter
      if (productTypeId && mongoose.Types.ObjectId.isValid(productTypeId)) {
        filter.productTypeId = new mongoose.Types.ObjectId(productTypeId);
      }
      
      // Property filters (with unit conversion support) - Faceted filtering (AND logic)
      if (Object.keys(propertyFilters).length > 0) {
        try {
          const propertyQuery = await buildPropertyQuery(propertyFilters);
          if (Object.keys(propertyQuery).length > 0) {
            // Merge property query into main filter
            // If propertyQuery already has $and, we need to merge its conditions
            if (propertyQuery.$and) {
              // Flatten nested $and conditions
              if (filter.$and) {
                filter.$and.push(...propertyQuery.$and);
              } else {
                filter.$and = propertyQuery.$and;
              }
            } else {
              // Single condition, add to $and array
              if (filter.$and) {
                filter.$and.push(propertyQuery);
              } else {
                filter.$and = [propertyQuery];
              }
            }
          }
        } catch (error) {
          console.error('Error building property query:', error);
          // Continue without property filters if there's an error
        }
      }
      
      // Combine conditions - ensure we always have a valid filter
      const baseConditions = [];
      if (supplierConditions.length > 0) {
        baseConditions.push({ $or: supplierConditions });
      }
      if (textSearchConditions.length > 0) {
        baseConditions.push({ $or: textSearchConditions });
      }
      
      if (baseConditions.length > 0) {
        if (filter.$and) {
          filter.$and.push(...baseConditions);
        } else {
          filter.$and = baseConditions;
        }
      }
      // If no conditions, filter is just { isActive: true } which is fine

      // Build query - populate separately to avoid nested array issues
      const products = await Product.find(filter)
        .populate('supplierId', 'name') // Legacy
        .populate('productTypeId', 'name slug')
        .select('name description internalPartNumber supplierId suppliers productTypeId properties variants lastPrice unitOfMeasure category pricebookSection pricebookPageNumber pricebookPageName')
        .limit(500) // Increased limit to show more products (was 200)
        .sort({ name: 1 })
        .lean();
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Product search: Found ${products.length} products after MongoDB query`);
        if (supplierObjectId) {
          console.log(`   Supplier filter: ${supplierIdStr}`);
        }
        if (Object.keys(propertyFilters).length > 0) {
          console.log(`   Property filters:`, propertyFilters);
        }
      }
      
      // Debug: Check if variants are being loaded
      if (process.env.NODE_ENV === 'development' && products.length > 0) {
        const productWithVariants = products.find(p => p.variants && p.variants.length > 0);
        if (productWithVariants) {
          console.log('🔍 Found product with variants:', {
            name: productWithVariants.name,
            variantCount: productWithVariants.variants.length,
            firstVariant: productWithVariants.variants[0] ? {
              name: productWithVariants.variants[0].name,
              hasPricing: !!(productWithVariants.variants[0].pricing),
              pricing: productWithVariants.variants[0].pricing
            } : null
          });
        }
      }
      
      // Manually populate suppliers array if needed (for better error handling)
      if (products.length > 0 && products.some(p => p.suppliers && p.suppliers.length > 0)) {
        const supplierIds = new Set();
        products.forEach(product => {
          if (product.suppliers) {
            product.suppliers.forEach(s => {
              if (s.supplierId && mongoose.Types.ObjectId.isValid(s.supplierId)) {
                supplierIds.add(s.supplierId.toString());
              }
            });
          }
        });
        
        if (supplierIds.size > 0) {
          try {
            const suppliers = await Company.find({ 
              _id: { $in: Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id)) }
            }).select('name').lean();
            
            const supplierMap = {};
            suppliers.forEach(s => {
              supplierMap[s._id.toString()] = s;
            });
            
            // Attach supplier names to products
            products.forEach(product => {
              if (product.suppliers) {
                product.suppliers.forEach(s => {
                  if (s.supplierId && supplierMap[s.supplierId.toString()]) {
                    s.supplierId = { ...supplierMap[s.supplierId.toString()], _id: s.supplierId };
                  }
                });
              }
            });
          } catch (populateError) {
            console.warn('Error populating suppliers:', populateError.message);
            // Continue without populating - not critical
          }
        }
      }

      // Format results to include variants as separate options
      const results = [];
      products.forEach(product => {
        try {
          // Helper to safely get supplier ID string
          const getSupplierIdString = (supplierId) => {
            if (!supplierId) return null;
            if (typeof supplierId === 'string') return supplierId;
            if (supplierId._id) return supplierId._id.toString();
            if (supplierId.toString) return supplierId.toString();
            return null;
          };
          
          // Check if product matches supplier filter (used for both product and variants)
          const productSupplierIdStr = getSupplierIdString(product.supplierId);
          // Use the supplierIdStr from outer scope (already defined above)
          
          const hasMatchingSupplier = !supplierObjectId || 
            (productSupplierIdStr === supplierIdStr) ||
            (product.suppliers && product.suppliers.some(s => {
              const sIdStr = getSupplierIdString(s.supplierId);
              return sIdStr === supplierIdStr;
            }));
          
          const productMatchesSupplier = hasMatchingSupplier || !supplierObjectId;
          
          // Add base product (if it has suppliers matching the filter)
          // Only add base product if it has NO variants (products with variants should show variants instead)
          if (productMatchesSupplier && (!product.variants || product.variants.length === 0)) {
            // Get pricing for the selected supplier
            let unitPrice = product.lastPrice || 0;
            let supplierPartNumber = '';
            let listPrice = 0;
            let netPrice = 0;
            let discountPercent = 0;
            
            if (supplierObjectId && product.suppliers && Array.isArray(product.suppliers)) {
              const supplierInfo = product.suppliers.find(s => {
                const sIdStr = getSupplierIdString(s.supplierId);
                return sIdStr === supplierIdStr;
              });
              if (supplierInfo) {
                unitPrice = supplierInfo.netPrice || supplierInfo.listPrice || supplierInfo.lastPrice || 0;
                listPrice = supplierInfo.listPrice || supplierInfo.lastPrice || 0;
                netPrice = supplierInfo.netPrice || unitPrice;
                discountPercent = supplierInfo.discountPercent || 0;
                supplierPartNumber = supplierInfo.supplierPartNumber || '';
              }
            }
            
            results.push({
              _id: product._id,
              productId: product._id,
              variantId: null,
              name: product.name,
              variantName: null,
              sku: null,
              description: product.description,
              internalPartNumber: product.internalPartNumber,
              unitOfMeasure: product.unitOfMeasure,
              unitPrice,
              listPrice,
              netPrice,
              discountPercent,
              supplierPartNumber,
              hasVariants: false,
              variantCount: 0,
              variantProperties: product.properties instanceof Map 
                ? Object.fromEntries(product.properties) 
                : (product.properties || {})
            });
          }
          
          // Add variants if they exist
          // CRITICAL: Always include variants for products that match supplier filter
          // OR include variants that have pricing (user can configure supplier-specific pricing later)
          if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            product.variants.forEach((variant, variantIndex) => {
              try {
                // Skip if variant is not active or doesn't exist
                if (!variant || variant.isActive === false) {
                  return;
                }
                  // Check if variant has matching supplier
                  const variantHasMatchingSupplier = variant.suppliers && Array.isArray(variant.suppliers) && variant.suppliers.some(s => {
                    const sIdStr = getSupplierIdString(s.supplierId);
                    return sIdStr === supplierIdStr;
                  });
                  
                  // Check if variant has pricing (any pricing at all)
                  // Handle both number and string values, and check for truthy values > 0
                  const listPrice = variant.pricing?.listPrice;
                  const netPrice = variant.pricing?.netPrice;
                  const lastPrice = variant.pricing?.lastPrice;
                  
                  const hasVariantPricing = variant.pricing && (
                    (listPrice != null && Number(listPrice) > 0) || 
                    (netPrice != null && Number(netPrice) > 0) || 
                    (lastPrice != null && Number(lastPrice) > 0)
                  );
                  
                  // Include variant if:
                  // 1. No supplier filter (show all variants)
                  // 2. Parent product matches supplier (show all variants of matching products)  
                  // 3. Variant has matching supplier (even if product doesn't match)
                  // 4. Variant has pricing (show variants with pricing even if no supplier match)
                  // 
                  // IMPORTANT: If product matches supplier, show ALL its variants so user can configure
                  // ALSO: Always show variants that have pricing (user can configure supplier later)
                  const shouldIncludeVariant = !supplierObjectId || 
                    productMatchesSupplier ||  // Show all variants if product matches
                    variantHasMatchingSupplier || 
                    hasVariantPricing;
                  
                  if (shouldIncludeVariant) {
                    // Get variant pricing for the selected supplier
                    let variantUnitPrice = variant.pricing?.netPrice || variant.pricing?.listPrice || variant.pricing?.lastPrice || 0;
                    let variantSupplierPartNumber = '';
                    let variantSupplierInfo = null;
                    
                    if (supplierObjectId && variant.suppliers && Array.isArray(variant.suppliers)) {
                      variantSupplierInfo = variant.suppliers.find(s => {
                        const sIdStr = getSupplierIdString(s.supplierId);
                        return sIdStr === supplierIdStr;
                      });
                      if (variantSupplierInfo) {
                        variantUnitPrice = variantSupplierInfo.netPrice || variantSupplierInfo.listPrice || variantSupplierInfo.lastPrice || 0;
                        variantSupplierPartNumber = variantSupplierInfo.supplierPartNumber || '';
                      }
                    }
                    
                    // If still no price, try product-level supplier pricing as fallback
                    if (variantUnitPrice === 0 && supplierObjectId && product.suppliers && Array.isArray(product.suppliers)) {
                      const productSupplierInfo = product.suppliers.find(s => {
                        const sIdStr = getSupplierIdString(s.supplierId);
                        return sIdStr === supplierIdStr;
                      });
                      if (productSupplierInfo) {
                        variantUnitPrice = productSupplierInfo.netPrice || productSupplierInfo.listPrice || productSupplierInfo.lastPrice || 0;
                      }
                    }
                    
                    // Ensure variant._id is converted to string properly
                    if (!variant._id) {
                      console.warn('Variant missing _id:', variant);
                      return; // Skip variants without IDs
                    }
                    
                    const variantIdStr = variant._id?.toString ? variant._id.toString() : String(variant._id);
                    const productIdStr = product._id?.toString ? product._id.toString() : String(product._id);
                    
                    // Extract pricing details safely
                    const variantPricing = (variant && variant.pricing) ? variant.pricing : {};
                    const variantSupplierPricing = variantSupplierInfo || {};
                    
                    // Determine list price, net price, and discount
                    const listPrice = variantSupplierPricing.listPrice || variantSupplierPricing.lastPrice || variantPricing.listPrice || variantPricing.lastPrice || 0;
                    const netPrice = variantSupplierPricing.netPrice || variantPricing.netPrice || variantUnitPrice || listPrice;
                    const discountPercent = variantSupplierPricing.discountPercent || variantPricing.discountPercent || 0;
                    
                    const variantResult = {
                      _id: `${productIdStr}_${variantIdStr}`,
                      productId: productIdStr,
                      variantId: variantIdStr,
                      name: product.name,
                      variantName: variant.name || `${product.name} - Variant`,
                      sku: variant.sku,
                      description: product.description,
                      internalPartNumber: product.internalPartNumber,
                      unitOfMeasure: product.unitOfMeasure,
                      unitPrice: variantUnitPrice,
                      listPrice: listPrice,
                      netPrice: netPrice,
                      discountPercent: discountPercent,
                      supplierPartNumber: variantSupplierPartNumber,
                      hasVariants: false,
                      variantCount: 0,
                      variantProperties: variant.properties ? (
                        variant.properties instanceof Map 
                          ? Object.fromEntries(variant.properties) 
                          : (typeof variant.properties === 'object' && variant.properties !== null && !Array.isArray(variant.properties)
                              ? variant.properties 
                              : {})
                      ) : {}
                    };
                    
                    results.push(variantResult);
                  }
              } catch (variantError) {
                console.warn('Error processing variant:', variantError.message);
                // Continue with next variant
              }
            });
          }
        } catch (productError) {
          console.warn('Error processing product:', productError.message);
          // Continue with next product
        }
      });

      // Sort results alphabetically by name
      results.sort((a, b) => {
        const nameA = (a.variantName || a.name || '').toLowerCase();
        const nameB = (b.variantName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Product search: Returning ${results.length} results (${results.filter(r => !r.variantId).length} products, ${results.filter(r => r.variantId).length} variants)`);
      }

      res.json({
        success: true,
        data: results.slice(0, 200) // Limit total results
      });
    } catch (error) {
      console.error('❌ Error in searchProducts:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Request params:', { 
        q: req.query.q, 
        supplierId: req.query.supplierId,
        filters: req.query.filters,
        productTypeId: req.query.productTypeId
      });
      res.status(500).json({
        success: false,
        message: 'Error searching products',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // GET /api/products/:id/suppliers
  getProductSuppliers: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const product = await Product.findById(req.params.id)
        .populate('suppliers.supplierId', 'name companyType contact address')
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Format suppliers with product-specific info
      const suppliers = product.suppliers.map(supplier => ({
        supplier: supplier.supplierId,
        supplierPartNumber: supplier.supplierPartNumber,
        listPrice: supplier.listPrice,
        netPrice: supplier.netPrice,
        discountPercent: supplier.discountPercent,
        lastPrice: supplier.lastPrice && supplier.lastPrice > 0 ? supplier.lastPrice : undefined,
        lastPurchasedDate: supplier.lastPurchasedDate,
        isPreferred: supplier.isPreferred
      }));

      res.json({
        success: true,
        data: suppliers
      });
    } catch (error) {
      console.error('Error in getProductSuppliers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching product suppliers',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/products/:id/variants
  createVariant: async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Validate product has a product type with variants enabled
      if (!product.productTypeId) {
        return res.status(400).json({
          success: false,
          message: 'Product must have a product type to create variants'
        });
      }

      const productType = await ProductType.findById(product.productTypeId);
      if (!productType || !productType.variantSettings?.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Product type does not support variants'
        });
      }

      // Validate variant properties match product type variant properties
      const variantProperties = productType.variantSettings.variantProperties || [];
      const providedProperties = Object.keys(req.body.properties || {});
      
      for (const propKey of variantProperties) {
        if (!providedProperties.includes(propKey)) {
          return res.status(400).json({
            success: false,
            message: `Missing required variant property: ${propKey}`
          });
        }
      }

      // Generate variant name if not provided
      let variantName = req.body.name;
      if (!variantName && productType.variantSettings.namingTemplate) {
        const template = productType.variantSettings.namingTemplate;
        variantName = template
          .replace('{name}', product.name)
          .replace('{variant}', Object.values(req.body.properties || {}).join(' '));
      }

      const variant = {
        ...req.body,
        name: variantName || `${product.name} Variant`,
        properties: req.body.properties || {}
      };

      product.variants.push(variant);
      await product.save();

      const savedVariant = product.variants[product.variants.length - 1];

      res.status(201).json({
        success: true,
        data: savedVariant
      });
    } catch (error) {
      console.error('Error in createVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating variant',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/products/:productId/variants/:variantId
  updateVariant: async (req, res) => {
    try {
      const { productId, variantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product or variant ID format'
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      // Update variant fields
      Object.assign(variant, req.body);
      await product.save();

      res.json({
        success: true,
        data: variant
      });
    } catch (error) {
      console.error('Error in updateVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating variant',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/products/:id/discount
  updateProductDiscount: async (req, res) => {
    try {
      const { discountPercent, applyToVariants, effectiveDate } = req.body;
      const productId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Save current discount to history before updating
      if (product.productDiscount?.discountPercent !== undefined && product.productDiscount?.discountPercent !== null) {
        if (!product.discountHistory) {
          product.discountHistory = [];
        }
        
        // Create snapshot of current variant pricing
        const variantSnapshots = product.variants.map(variant => ({
          variantId: variant._id,
          variantName: variant.name,
          sku: variant.sku,
          listPrice: variant.pricing?.listPrice,
          netPrice: variant.pricing?.netPrice,
          discountPercent: variant.pricing?.discountPercent,
          properties: variant.properties instanceof Map 
            ? Object.fromEntries(variant.properties) 
            : variant.properties || {}
        }));

        product.discountHistory.push({
          discountPercent: product.productDiscount.discountPercent,
          effectiveDate: product.productDiscount.effectiveDate || new Date(),
          expiresDate: effectiveDate ? new Date(effectiveDate) : new Date(),
          appliedDate: new Date(),
          notes: product.productDiscount.notes,
          variantSnapshots
        });
      }

      // Update product-level discount
      product.productDiscount = {
        discountPercent: discountPercent || null,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date()
      };
      
      let variantsUpdated = 0;

      // Apply to all variants if requested
      if (applyToVariants && discountPercent !== undefined && discountPercent !== null && product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.pricing?.listPrice) {
            // When explicitly applying to all variants, force update all of them
            variant.pricing.discountPercent = discountPercent;
            variant.pricing.netPrice = variant.pricing.listPrice * (1 - discountPercent / 100);
            variantsUpdated++;
          }
          
          // Update variant suppliers
          if (variant.suppliers && variant.suppliers.length > 0) {
            variant.suppliers.forEach(supplier => {
              if (supplier.listPrice) {
                supplier.discountPercent = discountPercent;
                supplier.netPrice = supplier.listPrice * (1 - discountPercent / 100);
              }
            });
          }
        });
      }

      await product.save();

      res.json({
        success: true,
        data: {
          product,
          variantsUpdated
        }
      });
    } catch (error) {
      console.error('Error in updateProductDiscount:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating product discount',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // PATCH /api/products/:id/discount/selective
  updateProductDiscountSelective: async (req, res) => {
    try {
      const { discountPercent, effectiveDate, selectedVariantIds, notes } = req.body;
      const productId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      if (!discountPercent && discountPercent !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount percentage is required'
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Save current discount to history before updating
      if (product.productDiscount?.discountPercent !== undefined && product.productDiscount?.discountPercent !== null) {
        if (!product.discountHistory) {
          product.discountHistory = [];
        }
        
        // Create snapshot of current variant pricing
        const variantSnapshots = product.variants.map(variant => ({
          variantId: variant._id,
          variantName: variant.name,
          sku: variant.sku,
          listPrice: variant.pricing?.listPrice,
          netPrice: variant.pricing?.netPrice,
          discountPercent: variant.pricing?.discountPercent,
          properties: variant.properties instanceof Map 
            ? Object.fromEntries(variant.properties) 
            : variant.properties || {}
        }));

        product.discountHistory.push({
          discountPercent: product.productDiscount.discountPercent,
          effectiveDate: product.productDiscount.effectiveDate || new Date(),
          expiresDate: effectiveDate ? new Date(effectiveDate) : new Date(),
          appliedDate: new Date(),
          notes: notes || product.productDiscount.notes,
          variantSnapshots
        });
      }

      // Update product-level discount
      product.productDiscount = {
        discountPercent: discountPercent,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        notes: notes
      };
      
      let variantsUpdated = 0;
      const selectedIds = new Set(selectedVariantIds || []);

      // Apply to selected variants only
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          const variantId = variant._id.toString();
          
          // Only update if variant is in selected list
          if (selectedIds.has(variantId)) {
            if (variant.pricing?.listPrice) {
              variant.pricing.discountPercent = discountPercent;
              variant.pricing.netPrice = variant.pricing.listPrice * (1 - discountPercent / 100);
              variantsUpdated++;
            }
            
            // Update variant suppliers
            if (variant.suppliers && variant.suppliers.length > 0) {
              variant.suppliers.forEach(supplier => {
                if (supplier.listPrice) {
                  supplier.discountPercent = discountPercent;
                  supplier.netPrice = supplier.listPrice * (1 - discountPercent / 100);
                }
              });
            }
          }
        });
      }

      await product.save();

      res.json({
        success: true,
        data: {
          product,
          variantsUpdated,
          totalVariants: product.variants.length,
          selectedVariants: selectedIds.size
        }
      });
    } catch (error) {
      console.error('Error in updateProductDiscountSelective:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating product discount',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // DELETE /api/products/:productId/variants/:variantId
  deleteVariant: async (req, res) => {
    try {
      const { productId, variantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product or variant ID format'
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      product.variants.pull(variantId);
      await product.save();

      res.json({
        success: true,
        message: 'Variant deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting variant',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/products/import-csv
  importCSV: async (req, res) => {
    try {
      // This is a simplified CSV import - in production, you'd handle file upload
      const { csvData, columnMapping } = req.body;
      
      if (!csvData || !columnMapping) {
        return res.status(400).json({
          success: false,
          message: 'CSV data and column mapping are required'
        });
      }

      const results = [];
      const errors = [];

      // Parse CSV data (assuming it's already parsed or is a string)
      const lines = typeof csvData === 'string' ? csvData.split('\n') : csvData;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;

        try {
          // Simple CSV parsing (in production, use proper CSV parser)
          const values = line.split(',').map(v => v.trim());
          
          const productData = {
            name: values[columnMapping.nameIndex] || '',
            description: values[columnMapping.descriptionIndex] || '',
            supplierId: columnMapping.supplierId,
            lastPrice: parseFloat(values[columnMapping.priceIndex] || 0),
            unitOfMeasure: values[columnMapping.unitIndex] || 'EA',
            category: values[columnMapping.categoryIndex] || '',
            supplierCatalogNumber: values[columnMapping.catalogIndex] || ''
          };

          if (!productData.name) {
            errors.push({ line: i + 1, error: 'Product name is required' });
            continue;
          }

          // Check if product exists (by name and supplier)
          const existing = await Product.findOne({
            name: productData.name,
            supplierId: productData.supplierId
          });

          if (existing) {
            // Update existing product
            existing.lastPrice = productData.lastPrice;
            existing.description = productData.description || existing.description;
            await existing.save();
            results.push({ action: 'updated', product: existing });
          } else {
            // Create new product
            const product = await Product.create(productData);
            results.push({ action: 'created', product });
          }
        } catch (error) {
          errors.push({ line: i + 1, error: error.message });
        }
      }

      res.json({
        success: true,
        data: {
          imported: results.length,
          errors: errors.length,
          results,
          errors
        }
      });
    } catch (error) {
      console.error('Error in importCSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error importing CSV',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

module.exports = productController;

