#!/usr/bin/env node

/**
 * Realistic Inventory, PO, and Material Request Seeding
 * 
 * Seeds realistic data for existing jobs in the system:
 * - Inventory records (bulk and serialized items)
 * - Material Requests (various statuses, tied to jobs)
 * - Purchase Orders (various statuses, tied to jobs and material requests)
 * - Inventory transactions (receipts, issues, adjustments)
 * 
 * This script works with EXISTING jobs, products, suppliers, and users.
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const Product = require('../src/server/models/Product');
const ProductType = require('../src/server/models/ProductType');
const Company = require('../src/server/models/Company');
const User = require('../src/server/models/User');
const MaterialRequest = require('../src/server/models/MaterialRequest');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const POReceipt = require('../src/server/models/POReceipt');
const Inventory = require('../src/server/models/Inventory');

// Helper function to get random element from array
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper function to get random number in range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper function to get random date in range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper function to add days to date
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

async function seedRealisticData() {
  try {
    console.log('🌱 Starting Realistic Inventory, PO & Material Request Seed...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get existing data
    console.log('📊 Fetching existing data...');
    const jobs = await Job.find().populate('projectId').lean();
    const products = await Product.find().lean();
    const suppliers = await Company.find({ companyType: 'supplier' }).lean();
    const users = await User.find().lean();
    const projects = await Project.find().lean();

    if (jobs.length === 0) {
      throw new Error('No jobs found in database. Please seed jobs first.');
    }
    if (products.length === 0) {
      throw new Error('No products found in database. Please seed products first.');
    }
    if (suppliers.length === 0) {
      throw new Error('No suppliers found in database. Please seed suppliers first.');
    }
    if (users.length === 0) {
      throw new Error('No users found in database. Please seed users first.');
    }

    console.log(`   Found ${jobs.length} jobs`);
    console.log(`   Found ${products.length} products`);
    console.log(`   Found ${suppliers.length} suppliers`);
    console.log(`   Found ${users.length} users\n`);

    // Filter users by role
    const fieldWorkers = users.filter(u => ['field_worker', 'field_supervisor', 'foreman'].includes(u.role));
    const officeStaff = users.filter(u => ['office_staff', 'project_manager', 'admin'].includes(u.role));
    const projectManagers = users.filter(u => ['project_manager', 'admin'].includes(u.role));

    if (fieldWorkers.length === 0) {
      console.warn('⚠️  No field workers found, using all users');
      fieldWorkers.push(...users);
    }
    if (officeStaff.length === 0) {
      console.warn('⚠️  No office staff found, using all users');
      officeStaff.push(...users);
    }
    if (projectManagers.length === 0) {
      console.warn('⚠️  No project managers found, using all users');
      projectManagers.push(...users);
    }

    // Clear existing PO/Material/Inventory data (but keep products, suppliers, jobs)
    console.log('🧹 Clearing existing PO/Material/Inventory data...');
    await Promise.all([
      Inventory.deleteMany({}),
      MaterialRequest.deleteMany({}),
      PurchaseOrder.deleteMany({})
    ]);
    console.log('✅ Cleared existing data\n');

    // Step 1: Create Inventory Records
    console.log('📦 Creating Inventory Records...');
    const inventoryRecords = [];
    
    // Select products for inventory tracking (about 30% of products)
    const productsForInventory = products.slice(0, Math.min(25, Math.floor(products.length * 0.3)));
    
    for (const product of productsForInventory) {
      // Intelligently determine if bulk or serialized based on product characteristics
      const productName = (product.name || '').toLowerCase();
      const productTypeName = (product.productTypeId?.name || '').toLowerCase();
      
      // Products that should ALWAYS be bulk (small consumables, fasteners, materials)
      const bulkKeywords = [
        'screw', 'bolt', 'nail', 'fastener', 'rivet', 'pin', 'clip', 'bracket',
        'tape', 'adhesive', 'glue', 'sealant', 'caulk', 'foam', 'batt', 'board',
        'liner', 'wrap', 'fabric', 'cloth', 'mesh', 'wire', 'cable', 'rope',
        'paint', 'primer', 'coating', 'sheet', 'roll', 'bag', 'box', 'tube',
        'cartridge', 'can', 'bottle', 'gallon', 'quart', 'pound', 'ounce'
      ];
      
      // Products that should ALWAYS be serialized (equipment, tools, large items)
      const serializedKeywords = [
        'equipment', 'tool', 'machine', 'generator', 'compressor', 'pump',
        'motor', 'engine', 'vehicle', 'truck', 'forklift', 'crane', 'lift',
        'scaffold', 'ladder', 'welder', 'saw', 'drill', 'grinder'
      ];
      
      const isBulkKeyword = bulkKeywords.some(keyword => 
        productName.includes(keyword) || productTypeName.includes(keyword)
      );
      const isSerializedKeyword = serializedKeywords.some(keyword => 
        productName.includes(keyword) || productTypeName.includes(keyword)
      );
      
      // Determine inventory type
      let inventoryType = 'bulk'; // Default to bulk
      if (isSerializedKeyword) {
        inventoryType = 'serialized';
      } else if (isBulkKeyword) {
        inventoryType = 'bulk';
      } else {
        // For ambiguous products, use size/unit hints
        // If unit is EA (each) and product name suggests large item, might be serialized
        // Otherwise default to bulk
        const unit = product.unitOfMeasure || '';
        if (unit === 'EA' && (productName.includes('unit') || productName.includes('piece'))) {
          // Could be either, but default to bulk unless explicitly serialized
          inventoryType = Math.random() < 0.1 ? 'serialized' : 'bulk'; // Only 10% chance
        } else {
          inventoryType = 'bulk'; // Most items are bulk
        }
      }
      
      // Get product pricing
      const listPrice = product.lastPrice || 
                       (product.variants?.[0]?.pricing?.listPrice) || 
                       (product.suppliers?.[0]?.listPrice) || 
                       10;
      
      let inventoryData = {
        productId: product._id,
        variantId: product.variants?.[0]?._id || null,
        inventoryType,
        isActive: true,
        primaryLocation: randomElement(['Warehouse A', 'Warehouse B', 'Jobsite Storage', 'Main Yard']),
        costMethod: 'fifo',
        averageCost: listPrice * 0.85, // Average cost is typically 85% of list price
        createdBy: randomElement(users)._id
      };

      if (inventoryType === 'bulk') {
        // Bulk items: random quantity on hand
        const quantityOnHand = randomInt(50, 5000);
        const quantityReserved = randomInt(0, Math.floor(quantityOnHand * 0.3));
        
        inventoryData.quantityOnHand = quantityOnHand;
        inventoryData.quantityReserved = quantityReserved;
        inventoryData.quantityAvailable = quantityOnHand - quantityReserved;
        inventoryData.reorderPoint = Math.floor(quantityOnHand * 0.2);
        inventoryData.reorderQuantity = Math.floor(quantityOnHand * 0.4);
        
        // Add location tracking
        inventoryData.locations = [{
          location: inventoryData.primaryLocation,
          quantity: quantityOnHand
        }];
      } else {
        // Serialized items: create individual units
        const unitCount = randomInt(5, 50);
        const serializedUnits = [];
        
        for (let i = 1; i <= unitCount; i++) {
          const receivedDate = randomDate(new Date(2024, 0, 1), new Date());
          const status = randomElement(['available', 'available', 'available', 'assigned', 'in_use']); // Mostly available
          
          serializedUnits.push({
            serialNumber: `${product.name.substring(0, 3).toUpperCase()}-${String(i).padStart(6, '0')}`,
            status,
            location: inventoryData.primaryLocation,
            receivedDate,
            createdAt: receivedDate
          });
        }
        
        inventoryData.serializedUnits = serializedUnits;
        inventoryData.quantityOnHand = unitCount;
        inventoryData.quantityAvailable = serializedUnits.filter(u => u.status === 'available').length;
      }

      // Add some transaction history
      const transactionCount = randomInt(3, 10);
      const transactions = [];
      const startDate = new Date(2024, 0, 1);
      
      for (let i = 0; i < transactionCount; i++) {
        const transactionDate = randomDate(startDate, new Date());
        const transactionType = randomElement(['receipt', 'receipt', 'issue', 'adjustment']);
        
        if (inventoryType === 'bulk') {
          const quantity = randomInt(10, 200);
          transactions.push({
            type: transactionType,
            quantity: transactionType === 'issue' ? -quantity : quantity,
            unitCost: inventoryData.averageCost,
            totalCost: quantity * inventoryData.averageCost,
            referenceType: transactionType === 'receipt' ? 'purchase_order' : 'work_order',
            performedBy: randomElement(users)._id,
            performedAt: transactionDate,
            notes: `${transactionType === 'receipt' ? 'Received' : transactionType === 'issue' ? 'Issued' : 'Adjusted'} ${quantity} units`
          });
          } else {
            // For serialized items, track individual units
            // Get serialized units from inventoryData if available
            const serializedUnitsArray = inventoryData.serializedUnits || [];
            const serialNumbers = serializedUnitsArray.slice(0, Math.min(5, serializedUnitsArray.length))
              .map(u => u.serialNumber || `${inventoryData.productId.toString().substring(0, 3)}-${String(Math.floor(Math.random() * 10000)).padStart(6, '0')}`);
            transactions.push({
              type: transactionType,
              quantity: serialNumbers.length,
              serialNumbers: serialNumbers.length > 0 ? serialNumbers : [`SN-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`],
              referenceType: transactionType === 'receipt' ? 'purchase_order' : 'work_order',
              performedBy: randomElement(users)._id,
              performedAt: transactionDate,
              notes: `${transactionType === 'receipt' ? 'Received' : 'Issued'} ${serialNumbers.length} units`
            });
          }
      }
      
      inventoryData.transactions = transactions;
      
      const inventory = await Inventory.create(inventoryData);
      inventoryRecords.push(inventory);
    }
    
    console.log(`✅ Created ${inventoryRecords.length} inventory records\n`);

    // Step 2: Create Material Requests
    console.log('📋 Creating Material Requests...');
    const materialRequests = [];
    
    // Create 3-5 material requests per job
    for (const job of jobs) {
      const requestCount = randomInt(3, 5);
      const project = projects.find(p => p._id.toString() === job.projectId?.toString()) || projects[0];
      
      for (let i = 0; i < requestCount; i++) {
        const requestedBy = randomElement(fieldWorkers);
        const requiredByDate = randomDate(new Date(), addDays(new Date(), 30));
        const priority = randomElement(['urgent', 'standard', 'standard', 'standard', 'low']);
        const deliveryLocation = randomElement(['jobsite', 'warehouse', 'pick_up']);
        
        // Select 2-5 products for this request
        const selectedProducts = [];
        const productCount = randomInt(2, 5);
        const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
        
        for (let j = 0; j < productCount && j < shuffledProducts.length; j++) {
          const product = shuffledProducts[j];
          const variant = product.variants?.[0] || null;
          
          // Determine quantity based on unit of measure
          let quantity;
          const unit = product.unitOfMeasure || 'EA';
          switch (unit) {
            case 'FT':
            case 'M':
              quantity = randomInt(100, 2000);
              break;
            case 'SQ_FT':
              quantity = randomInt(500, 5000);
              break;
            case 'EA':
            default:
              quantity = randomInt(10, 500);
              break;
          }
          
          selectedProducts.push({
            productId: product._id,
            variantId: variant?._id || null,
            productName: product.name,
            variantName: variant?.name || null,
            description: product.description || `${product.name} for ${job.name}`,
            quantity,
            unit,
            notes: priority === 'urgent' ? 'Urgent - needed ASAP' : '',
            costCode: randomElement(['01-100', '02-200', '03-300', '04-400', '05-500']) || null
          });
        }
        
        // Determine status (realistic distribution)
        const statusRoll = Math.random();
        let status, reviewedBy, reviewedAt, approvalNotes, purchaseOrderId;
        
        if (statusRoll < 0.2) {
          // 20% submitted (awaiting approval)
          status = 'submitted';
        } else if (statusRoll < 0.4) {
          // 20% approved (ready for PO)
          status = 'approved';
          reviewedBy = randomElement(officeStaff)._id;
          reviewedAt = randomDate(addDays(new Date(), -7), new Date());
          approvalNotes = 'Approved for purchase';
        } else if (statusRoll < 0.6) {
          // 20% po_issued
          status = 'po_issued';
          reviewedBy = randomElement(officeStaff)._id;
          reviewedAt = randomDate(addDays(new Date(), -14), addDays(new Date(), -7));
          approvalNotes = 'Converted to PO';
        } else if (statusRoll < 0.85) {
          // 25% delivered
          status = 'delivered';
          reviewedBy = randomElement(officeStaff)._id;
          reviewedAt = randomDate(addDays(new Date(), -21), addDays(new Date(), -14));
          approvalNotes = 'Delivered to jobsite';
        } else {
          // 15% closed
          status = 'closed';
          reviewedBy = randomElement(officeStaff)._id;
          reviewedAt = randomDate(addDays(new Date(), -30), addDays(new Date(), -21));
          approvalNotes = 'Completed';
        }
        
        const materialRequest = await MaterialRequest.create({
          jobId: job._id,
          projectId: project._id,
          requestedBy: requestedBy._id,
          requiredByDate,
          priority,
          deliveryLocation,
          deliveryAddress: job.location?.address || 'Jobsite',
          deliveryNotes: deliveryLocation === 'jobsite' ? 'Call foreman on arrival' : '',
          lineItems: selectedProducts,
          status,
          reviewedBy,
          reviewedAt,
          approvalNotes
        });
        
        materialRequests.push(materialRequest);
      }
    }
    
    console.log(`✅ Created ${materialRequests.length} material requests\n`);

    // Step 3: Create Purchase Orders
    console.log('📄 Creating Purchase Orders...');
    const purchaseOrders = [];
    
    // Create POs from approved material requests and some standalone POs
    const approvedRequests = materialRequests.filter(mr => ['approved', 'po_issued', 'delivered', 'closed'].includes(mr.status));
    
    for (const materialRequest of approvedRequests) {
      // Select a supplier for this PO
      const supplier = randomElement(suppliers);
      const buyer = randomElement(officeStaff);
      const job = jobs.find(j => j._id.toString() === materialRequest.jobId.toString());
      const project = projects.find(p => p._id.toString() === materialRequest.projectId.toString());
      
      // Convert line items to PO line items with pricing
      const poLineItems = materialRequest.lineItems.map(item => {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        const variant = product?.variants?.find(v => v._id.toString() === item.variantId?.toString());
        
        // Get pricing
        let unitPrice = variant?.pricing?.netPrice || 
                       variant?.pricing?.listPrice || 
                       product?.lastPrice || 
                       (product?.suppliers?.find(s => s.supplierId.toString() === supplier._id.toString())?.netPrice) ||
                       (product?.suppliers?.find(s => s.supplierId.toString() === supplier._id.toString())?.listPrice) ||
                       10;
        
        // Apply random discount (0-30%)
        const discount = Math.random() * 0.3;
        unitPrice = unitPrice * (1 - discount);
        
        return {
          productId: item.productId,
          variantId: item.variantId || null,
          productName: item.productName,
          variantName: item.variantName || null,
          sku: variant?.sku || product?.internalPartNumber || null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice,
          extendedCost: item.quantity * unitPrice,
          costCode: item.costCode || randomElement(['01-100', '02-200', '03-300', '04-400', '05-500']),
          quantityOrdered: item.quantity,
          quantityReceived: materialRequest.status === 'delivered' || materialRequest.status === 'closed' 
            ? item.quantity 
            : materialRequest.status === 'po_issued' 
              ? randomInt(0, Math.floor(item.quantity * 0.5))
              : 0,
          quantityBackordered: 0,
          status: materialRequest.status === 'delivered' || materialRequest.status === 'closed'
            ? 'fully_received'
            : materialRequest.status === 'po_issued'
              ? 'partially_received'
              : 'pending'
        };
      });
      
      // Calculate totals
      const subtotal = poLineItems.reduce((sum, item) => sum + item.extendedCost, 0);
      const taxAmount = subtotal * 0.05; // 5% tax
      const freightAmount = subtotal * 0.02; // 2% freight
      const total = subtotal + taxAmount + freightAmount;
      
      // Determine PO status based on material request status
      let poStatus, approvedBy, approvedAt, issuedBy, issuedAt;
      
      if (materialRequest.status === 'approved') {
        poStatus = 'pending_approval';
      } else if (materialRequest.status === 'po_issued') {
        poStatus = 'sent';
        approvedBy = randomElement(projectManagers)._id;
        approvedAt = randomDate(addDays(new Date(), -14), addDays(new Date(), -7));
        issuedBy = buyer._id;
        issuedAt = randomDate(addDays(new Date(), -7), new Date());
      } else if (materialRequest.status === 'delivered' || materialRequest.status === 'closed') {
        poStatus = 'partially_received'; // Some items fully received
        approvedBy = randomElement(projectManagers)._id;
        approvedAt = randomDate(addDays(new Date(), -21), addDays(new Date(), -14));
        issuedBy = buyer._id;
        issuedAt = randomDate(addDays(new Date(), -14), addDays(new Date(), -7));
      }
      
      const purchaseOrder = await PurchaseOrder.create({
        supplierId: supplier._id,
        jobId: job._id,
        projectId: project._id,
        buyerId: buyer._id,
        defaultCostCode: randomElement(['01-100', '02-200', '03-300', '04-400', '05-500']),
        requiredByDate: materialRequest.requiredByDate,
        shipToAddress: {
          street: job.location?.address || 'Jobsite',
          city: job.location?.city || 'Calgary',
          province: job.location?.province || 'AB',
          postalCode: job.location?.postalCode || 'T2P 1J4',
          country: 'Canada'
        },
        deliveryInstructions: materialRequest.deliveryNotes || 'Call foreman on arrival',
        lineItems: poLineItems,
        subtotal,
        taxAmount,
        freightAmount,
        total,
        status: poStatus,
        approvalRequired: poStatus === 'pending_approval',
        approvedBy,
        approvedAt,
        issuedBy,
        issuedAt,
        materialRequestId: materialRequest._id,
        internalNotes: `Created from ${materialRequest.requestNumber || 'Material Request'}`
      });
      
      purchaseOrders.push(purchaseOrder);
      
      // Link PO back to material request
      materialRequest.purchaseOrderId = purchaseOrder._id;
      await materialRequest.save();
    }
    
    // Create some standalone POs (not from material requests)
    const standalonePOCount = Math.floor(jobs.length * 2);
    for (let i = 0; i < standalonePOCount; i++) {
      const job = randomElement(jobs);
      const project = projects.find(p => p._id.toString() === job.projectId?.toString()) || projects[0];
      const supplier = randomElement(suppliers);
      const buyer = randomElement(officeStaff);
      
      // Select 2-4 products
      const selectedProducts = [];
      const productCount = randomInt(2, 4);
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
      
      for (let j = 0; j < productCount && j < shuffledProducts.length; j++) {
        const product = shuffledProducts[j];
        const variant = product.variants?.[0] || null;
        
        let quantity;
        const unit = product.unitOfMeasure || 'EA';
        switch (unit) {
          case 'FT':
          case 'M':
            quantity = randomInt(200, 3000);
            break;
          case 'SQ_FT':
            quantity = randomInt(1000, 8000);
            break;
          case 'EA':
          default:
            quantity = randomInt(50, 1000);
            break;
        }
        
        let unitPrice = variant?.pricing?.netPrice || 
                       variant?.pricing?.listPrice || 
                       product?.lastPrice || 
                       (product?.suppliers?.find(s => s.supplierId.toString() === supplier._id.toString())?.netPrice) ||
                       10;
        unitPrice = unitPrice * (1 - Math.random() * 0.3); // Apply discount
        
        selectedProducts.push({
          productId: product._id,
          variantId: variant?._id || null,
          productName: product.name,
          variantName: variant?.name || null,
          sku: variant?.sku || product?.internalPartNumber || null,
          description: product.description || `${product.name} for ${job.name}`,
          quantity,
          unit,
          unitPrice,
          extendedCost: quantity * unitPrice,
          costCode: randomElement(['01-100', '02-200', '03-300', '04-400', '05-500']),
          quantityOrdered: quantity,
          quantityReceived: Math.random() < 0.3 ? quantity : randomInt(0, Math.floor(quantity * 0.7)),
          quantityBackordered: 0,
          status: Math.random() < 0.3 ? 'fully_received' : Math.random() < 0.6 ? 'partially_received' : 'pending'
        });
      }
      
      const subtotal = selectedProducts.reduce((sum, item) => sum + item.extendedCost, 0);
      const taxAmount = subtotal * 0.05;
      const freightAmount = subtotal * 0.02;
      const total = subtotal + taxAmount + freightAmount;
      
      const statusRoll = Math.random();
      let poStatus, approvedBy, approvedAt, issuedBy, issuedAt;
      
      if (statusRoll < 0.2) {
        poStatus = 'draft';
      } else if (statusRoll < 0.4) {
        poStatus = 'pending_approval';
      } else if (statusRoll < 0.6) {
        poStatus = 'approved';
        approvedBy = randomElement(projectManagers)._id;
        approvedAt = randomDate(addDays(new Date(), -7), new Date());
      } else if (statusRoll < 0.8) {
        poStatus = 'sent';
        approvedBy = randomElement(projectManagers)._id;
        approvedAt = randomDate(addDays(new Date(), -14), addDays(new Date(), -7));
        issuedBy = buyer._id;
        issuedAt = randomDate(addDays(new Date(), -7), new Date());
      } else {
        poStatus = 'partially_received';
        approvedBy = randomElement(projectManagers)._id;
        approvedAt = randomDate(addDays(new Date(), -21), addDays(new Date(), -14));
        issuedBy = buyer._id;
        issuedAt = randomDate(addDays(new Date(), -14), addDays(new Date(), -7));
      }
      
      const purchaseOrder = await PurchaseOrder.create({
        supplierId: supplier._id,
        jobId: job._id,
        projectId: project._id,
        buyerId: buyer._id,
        defaultCostCode: randomElement(['01-100', '02-200', '03-300', '04-400', '05-500']),
        requiredByDate: randomDate(new Date(), addDays(new Date(), 30)),
        shipToAddress: {
          street: job.location?.address || 'Jobsite',
          city: job.location?.city || 'Calgary',
          province: job.location?.province || 'AB',
          postalCode: job.location?.postalCode || 'T2P 1J4',
          country: 'Canada'
        },
        deliveryInstructions: 'Call foreman on arrival',
        lineItems: selectedProducts,
        subtotal,
        taxAmount,
        freightAmount,
        total,
        status: poStatus,
        approvalRequired: poStatus !== 'draft',
        approvedBy,
        approvedAt,
        issuedBy,
        issuedAt,
        internalNotes: `Standalone PO for ${job.name}`
      });
      
      purchaseOrders.push(purchaseOrder);
    }
    
    console.log(`✅ Created ${purchaseOrders.length} purchase orders\n`);

    // Step 4: Create PO Receipts and Update Inventory
    console.log('🔄 Creating PO Receipts and Updating Inventory...');
    const poReceipts = [];
    let inventoryUpdates = 0;
    
    // Group POs by job for creating receipts
    for (const po of purchaseOrders.filter(p => ['sent', 'partially_received', 'fully_received'].includes(p.status))) {
      // Get received line items
      const receivedItems = po.lineItems.filter(item => item.quantityReceived > 0);
      
      if (receivedItems.length === 0) continue;
      
      const job = jobs.find(j => j._id.toString() === po.jobId.toString());
      const project = projects.find(p => p._id.toString() === po.projectId.toString());
      const receivedBy = randomElement(users);
      const deliveryDate = po.issuedAt || randomDate(addDays(new Date(), -14), new Date());
      const locationPlaced = randomElement(['Warehouse A', 'Warehouse B', 'Jobsite Storage', 'Main Yard']);
      
      // Create receipt items from PO line items
      const receiptItems = receivedItems.map((lineItem, index) => ({
        poLineItemIndex: index,
        productId: lineItem.productId,
        productName: lineItem.productName,
        quantityOrdered: lineItem.quantityOrdered,
        quantityReceived: lineItem.quantityReceived,
        unit: lineItem.unit,
        unitPrice: lineItem.unitPrice,
        extendedCost: lineItem.quantityReceived * lineItem.unitPrice,
        condition: randomElement(['good', 'good', 'good', 'damaged']), // Mostly good
        conditionNotes: randomElement(['good', 'good', 'good', 'damaged']) === 'damaged' ? 'Minor damage noted' : '',
        costCode: lineItem.costCode
      }));
      
      const totalReceived = receiptItems.reduce((sum, item) => sum + item.extendedCost, 0);
      
      // Create PO Receipt
      const receipt = await POReceipt.create({
        purchaseOrderId: po._id,
        jobId: po.jobId,
        projectId: po.projectId,
        receivedBy: receivedBy._id,
        receivedAt: deliveryDate,
        deliveryDate: deliveryDate,
        locationPlaced: locationPlaced,
        receiptItems: receiptItems,
        totalReceived: totalReceived,
        status: 'approved',
        notes: `Received materials for ${job?.name || 'job'}`
      });
      
      poReceipts.push(receipt);
      
      // Update inventory for each received item
      for (const receiptItem of receiptItems) {
        // Find or create inventory record
        let inventory = await Inventory.findOne({
          productId: receiptItem.productId,
          variantId: null // Base product
        });
        
        if (!inventory) {
          // Create new inventory record
          const product = products.find(p => p._id.toString() === receiptItem.productId.toString());
          if (!product) continue;
          
          // Use intelligent inventory type assignment
          const productName = (product.name || '').toLowerCase();
          const bulkKeywords = ['screw', 'bolt', 'nail', 'fastener', 'rivet', 'pin', 'clip', 'bracket', 'tape', 'adhesive', 'glue', 'sealant', 'caulk', 'foam', 'batt', 'board', 'liner', 'wrap', 'fabric', 'cloth', 'mesh', 'wire', 'cable', 'rope', 'paint', 'primer', 'coating', 'sheet', 'roll', 'bag', 'box', 'tube', 'cartridge', 'can', 'bottle', 'gallon', 'quart', 'pound', 'ounce'];
          const serializedKeywords = ['equipment', 'tool', 'machine', 'generator', 'compressor', 'pump', 'motor', 'engine', 'vehicle', 'truck', 'forklift', 'crane', 'lift', 'scaffold', 'ladder', 'welder', 'saw', 'drill', 'grinder'];
          
          const isBulkKeyword = bulkKeywords.some(keyword => productName.includes(keyword));
          const isSerializedKeyword = serializedKeywords.some(keyword => productName.includes(keyword));
          
          const inventoryType = isSerializedKeyword ? 'serialized' : 'bulk';
          
          inventory = await Inventory.create({
            productId: receiptItem.productId,
            variantId: null,
            inventoryType: inventoryType,
            isActive: true,
            primaryLocation: locationPlaced,
            costMethod: 'fifo',
            averageCost: receiptItem.unitPrice,
            createdBy: receivedBy._id
          });
          inventoryRecords.push(inventory);
        }
        
        // Add receipt transaction
        if (inventory.inventoryType === 'bulk') {
          inventory.quantityOnHand += receiptItem.quantityReceived;
          inventory.quantityAvailable = inventory.quantityOnHand - inventory.quantityReserved;
          
          // Update average cost (weighted average)
          const currentValue = (inventory.quantityOnHand - receiptItem.quantityReceived) * inventory.averageCost;
          const receiptValue = receiptItem.quantityReceived * receiptItem.unitPrice;
          inventory.averageCost = inventory.quantityOnHand > 0 ? (currentValue + receiptValue) / inventory.quantityOnHand : receiptItem.unitPrice;
          
          // Update location
          const location = inventory.locations.find(l => l.location === locationPlaced);
          if (location) {
            location.quantity += receiptItem.quantityReceived;
          } else {
            inventory.locations.push({
              location: locationPlaced,
              quantity: receiptItem.quantityReceived
            });
          }
        } else {
          // Add serialized units
          for (let i = 0; i < receiptItem.quantityReceived; i++) {
            inventory.serializedUnits.push({
              serialNumber: `${receiptItem.productName.substring(0, 3).toUpperCase()}-${String(inventory.serializedUnits.length + 1).padStart(6, '0')}`,
              status: 'available',
              location: locationPlaced,
              receivedDate: deliveryDate,
              createdAt: deliveryDate
            });
          }
          inventory.quantityOnHand = inventory.serializedUnits.length;
          inventory.quantityAvailable = inventory.serializedUnits.filter(u => u.status === 'available').length;
        }
        
        // Add transaction with receipt reference
        inventory.transactions.push({
          type: 'receipt',
          quantity: receiptItem.quantityReceived,
          unitCost: receiptItem.unitPrice,
          totalCost: receiptItem.quantityReceived * receiptItem.unitPrice,
          referenceType: 'purchase_order',
          referenceId: po._id,
          receiptId: receipt._id, // Link to PO Receipt
          receiptNumber: receipt.receiptNumber, // Store receipt number
          condition: receiptItem.condition, // Store condition
          toLocation: locationPlaced,
          notes: receiptItem.conditionNotes || `Received from ${receipt.receiptNumber}`,
          performedBy: receivedBy._id,
          performedAt: deliveryDate
        });
        
        await inventory.save();
        inventoryUpdates++;
      }
    }
    
    console.log(`✅ Created ${poReceipts.length} PO receipts`);
    console.log(`✅ Updated ${inventoryUpdates} inventory records with PO receipts\n`);

    // Summary
    console.log('📊 Seed Summary:');
    console.log(`   Jobs Used: ${jobs.length}`);
    console.log(`   Products Used: ${products.length}`);
    console.log(`   Suppliers Used: ${suppliers.length}`);
    console.log(`   Inventory Records: ${inventoryRecords.length}`);
    console.log(`   Material Requests: ${materialRequests.length}`);
    console.log(`   Purchase Orders: ${purchaseOrders.length}`);
    console.log(`   PO Receipts: ${poReceipts.length}`);
    console.log(`   Inventory Updates: ${inventoryUpdates}`);
    
    // Status breakdown
    const mrStatusBreakdown = materialRequests.reduce((acc, mr) => {
      acc[mr.status] = (acc[mr.status] || 0) + 1;
      return acc;
    }, {});
    console.log('\n   Material Request Status Breakdown:');
    Object.entries(mrStatusBreakdown).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    
    const poStatusBreakdown = purchaseOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {});
    console.log('\n   Purchase Order Status Breakdown:');
    Object.entries(poStatusBreakdown).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    
    const inventoryTypeBreakdown = inventoryRecords.reduce((acc, inv) => {
      acc[inv.inventoryType] = (acc[inv.inventoryType] || 0) + 1;
      return acc;
    }, {});
    console.log('\n   Inventory Type Breakdown:');
    Object.entries(inventoryTypeBreakdown).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });

    console.log('\n✅ Realistic Inventory, PO & Material Request seed completed successfully!');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedRealisticData();
}

module.exports = seedRealisticData;

