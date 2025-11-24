#!/usr/bin/env node

/**
 * Seed Script for Purchase Order & Material Inventory Data
 * Creates realistic test data for PO and Material Inventory MVP
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const MaterialRequest = require('../src/server/models/MaterialRequest');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const POReceipt = require('../src/server/models/POReceipt');
const Inventory = require('../src/server/models/Inventory');
const InventoryTransaction = require('../src/server/models/InventoryTransaction');
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');

// Realistic supplier data
const SUPPLIERS = [
  {
    name: 'ABC Building Supplies',
    companyType: 'supplier',
    contactPerson: 'Mike Johnson',
    email: 'orders@abcbuilding.com',
    phone: '403-555-0100',
    address: {
      street: '123 Industrial Blvd',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T2P 1J4',
      country: 'Canada'
    },
    paymentTerms: 'Net 30',
    notes: 'Primary supplier for lumber and building materials',
    isActive: true
  },
  {
    name: 'Western Insulation Supply',
    companyType: 'supplier',
    contactPerson: 'Sarah Chen',
    email: 'sales@westerninsulation.ca',
    phone: '403-555-0200',
    address: {
      street: '456 Manufacturing Way',
      city: 'Edmonton',
      province: 'AB',
      postalCode: 'T5J 2K5',
      country: 'Canada'
    },
    paymentTerms: 'Net 15',
    notes: 'Specializes in insulation materials and accessories',
    isActive: true
  },
  {
    name: 'Industrial Pipe & Fittings Co.',
    companyType: 'supplier',
    contactPerson: 'Robert Martinez',
    email: 'info@industrialpipe.com',
    phone: '403-555-0300',
    address: {
      street: '789 Pipeline Road',
      city: 'Red Deer',
      province: 'AB',
      postalCode: 'T4N 3M6',
      country: 'Canada'
    },
    paymentTerms: 'Net 30',
    notes: 'Pipe, fittings, and industrial supplies',
    isActive: true
  },
  {
    name: 'Safety Equipment Warehouse',
    companyType: 'supplier',
    contactPerson: 'Jennifer Lee',
    email: 'orders@safetywarehouse.ca',
    phone: '403-555-0400',
    address: {
      street: '321 Safety Drive',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T2E 4N8',
      country: 'Canada'
    },
    paymentTerms: 'Due on Receipt',
    notes: 'PPE and safety equipment',
    isActive: true
  },
  {
    name: 'Fasteners & Hardware Ltd.',
    companyType: 'supplier',
    contactPerson: 'David Thompson',
    email: 'sales@fastenersltd.ca',
    phone: '403-555-0500',
    address: {
      street: '654 Bolt Street',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T3A 2P7',
      country: 'Canada'
    },
    paymentTerms: 'Net 30',
    notes: 'Bolts, screws, and hardware',
    isActive: true
  }
];

// Realistic product data
const PRODUCTS = [
  // ABC Building Supplies products
  { name: '2x4x8 SPF Lumber', description: 'Spruce-Pine-Fir stud grade', supplierIndex: 0, supplierCatalogNumber: 'ABC-2X4-8', lastPrice: 4.25, unitOfMeasure: 'EA', category: 'Lumber' },
  { name: '2x6x12 SPF Lumber', description: 'Spruce-Pine-Fir stud grade', supplierIndex: 0, supplierCatalogNumber: 'ABC-2X6-12', lastPrice: 8.50, unitOfMeasure: 'EA', category: 'Lumber' },
  { name: 'Plywood 4x8 1/2"', description: 'CDX plywood sheathing', supplierIndex: 0, supplierCatalogNumber: 'ABC-PLY-12', lastPrice: 45.00, unitOfMeasure: 'EA', category: 'Lumber' },
  { name: 'OSB 4x8 7/16"', description: 'Oriented strand board', supplierIndex: 0, supplierCatalogNumber: 'ABC-OSB-716', lastPrice: 38.50, unitOfMeasure: 'EA', category: 'Lumber' },
  
  // Western Insulation Supply products
  { name: 'Fiberglass Batts R-20', description: '15" x 93" fiberglass insulation', supplierIndex: 1, supplierCatalogNumber: 'WIS-FG-R20', lastPrice: 42.00, unitOfMeasure: 'EA', category: 'Insulation' },
  { name: 'Fiberglass Batts R-30', description: '15" x 93" fiberglass insulation', supplierIndex: 1, supplierCatalogNumber: 'WIS-FG-R30', lastPrice: 58.00, unitOfMeasure: 'EA', category: 'Insulation' },
  { name: 'Rigid Insulation 2"', description: '2" thick rigid foam board', supplierIndex: 1, supplierCatalogNumber: 'WIS-RIG-2', lastPrice: 28.50, unitOfMeasure: 'SQ_FT', category: 'Insulation' },
  { name: 'Vapor Barrier 6 mil', description: 'Polyethylene vapor barrier', supplierIndex: 1, supplierCatalogNumber: 'WIS-VB-6', lastPrice: 0.35, unitOfMeasure: 'SQ_FT', category: 'Insulation' },
  { name: 'Insulation Tape', description: 'Sealing tape for vapor barrier', supplierIndex: 1, supplierCatalogNumber: 'WIS-TAPE', lastPrice: 12.50, unitOfMeasure: 'ROLL', category: 'Insulation' },
  
  // Industrial Pipe & Fittings products
  { name: 'Steel Pipe 2" Schedule 40', description: 'Black steel pipe', supplierIndex: 2, supplierCatalogNumber: 'IPF-PIPE-2-40', lastPrice: 18.50, unitOfMeasure: 'FT', category: 'Pipe' },
  { name: 'Steel Pipe 4" Schedule 40', description: 'Black steel pipe', supplierIndex: 2, supplierCatalogNumber: 'IPF-PIPE-4-40', lastPrice: 32.00, unitOfMeasure: 'FT', category: 'Pipe' },
  { name: '90 Degree Elbow 2"', description: 'Welded steel elbow', supplierIndex: 2, supplierCatalogNumber: 'IPF-ELB-2-90', lastPrice: 24.75, unitOfMeasure: 'EA', category: 'Fittings' },
  { name: 'Tee Fitting 2"', description: 'Welded steel tee', supplierIndex: 2, supplierCatalogNumber: 'IPF-TEE-2', lastPrice: 28.50, unitOfMeasure: 'EA', category: 'Fittings' },
  { name: 'Pipe Flange 2"', description: 'Steel pipe flange', supplierIndex: 2, supplierCatalogNumber: 'IPF-FLG-2', lastPrice: 45.00, unitOfMeasure: 'EA', category: 'Fittings' },
  
  // Safety Equipment Warehouse products
  { name: 'Hard Hat', description: 'Type 1 Class E hard hat', supplierIndex: 3, supplierCatalogNumber: 'SEW-HH-001', lastPrice: 28.00, unitOfMeasure: 'EA', category: 'PPE' },
  { name: 'Safety Glasses', description: 'ANSI Z87.1 approved', supplierIndex: 3, supplierCatalogNumber: 'SEW-SG-001', lastPrice: 8.50, unitOfMeasure: 'EA', category: 'PPE' },
  { name: 'Work Gloves', description: 'Leather palm work gloves', supplierIndex: 3, supplierCatalogNumber: 'SEW-WG-001', lastPrice: 15.00, unitOfMeasure: 'EA', category: 'PPE' },
  { name: 'Safety Vest', description: 'ANSI Class 2 reflective vest', supplierIndex: 3, supplierCatalogNumber: 'SEW-SV-001', lastPrice: 22.00, unitOfMeasure: 'EA', category: 'PPE' },
  
  // Fasteners & Hardware products
  { name: 'Lag Screws 1/2" x 4"', description: 'Hex head lag screws', supplierIndex: 4, supplierCatalogNumber: 'FHL-LAG-12-4', lastPrice: 1.25, unitOfMeasure: 'EA', category: 'Fasteners' },
  { name: 'Carriage Bolts 3/8" x 4"', description: 'Zinc plated carriage bolts', supplierIndex: 4, supplierCatalogNumber: 'FHL-CB-38-4', lastPrice: 0.85, unitOfMeasure: 'EA', category: 'Fasteners' },
  { name: 'Washers 3/8"', description: 'Flat washers', supplierIndex: 4, supplierCatalogNumber: 'FHL-WAS-38', lastPrice: 0.15, unitOfMeasure: 'EA', category: 'Fasteners' },
  { name: 'Nuts 3/8"', description: 'Hex nuts', supplierIndex: 4, supplierCatalogNumber: 'FHL-NUT-38', lastPrice: 0.20, unitOfMeasure: 'EA', category: 'Fasteners' }
];

async function seedPOMaterialInventory() {
  try {
    console.log('🌱 Starting PO & Material Inventory seed...\n');

    // Connect to MongoDB - use dev URI for local seeding
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get or create users
    console.log('\n👥 Getting/Creating users...');
    let fieldWorker = await User.findOne({ email: 'field@appello.com' });
    if (!fieldWorker) {
      fieldWorker = await User.create({
        name: 'Field Worker',
        email: 'field@appello.com',
        password: 'password123',
        role: 'field_worker',
        phone: '555-1001'
      });
    }

    let officeStaff = await User.findOne({ email: 'office@appello.com' });
    if (!officeStaff) {
      officeStaff = await User.create({
        name: 'Office Staff',
        email: 'office@appello.com',
        password: 'password123',
        role: 'office_staff',
        phone: '555-1002'
      });
    }

    let projectManager = await User.findOne({ email: 'pm@appello.com' });
    if (!projectManager) {
      projectManager = await User.create({
        name: 'Project Manager',
        email: 'pm@appello.com',
        password: 'password123',
        role: 'project_manager',
        phone: '555-1003'
      });
    }

    let accounting = await User.findOne({ email: 'accounting@appello.com' });
    if (!accounting) {
      accounting = await User.create({
        name: 'Accounting Staff',
        email: 'accounting@appello.com',
        password: 'password123',
        role: 'office_staff',
        phone: '555-1004'
      });
    }
    console.log(`✅ Users ready`);

    // Get or create project and job
    console.log('\n📁 Getting/Creating project and job...');
    let project = await Project.findOne();
    if (!project) {
      project = await Project.create({
        name: 'Industrial Plant Insulation Project',
        projectNumber: 'PROJ-2024-001',
        client: {
          name: 'Industrial Corp',
          contact: 'John Client',
          email: 'john@industrialcorp.com',
          phone: '555-2001'
        },
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        totalContractValue: 5000000,
        status: 'active',
        projectManager: projectManager._id
      });
    }

    let job = await Job.findOne({ projectId: project._id });
    if (!job) {
      job = await Job.create({
        name: 'Building A Insulation',
        jobNumber: 'JOB-2024-001',
        projectId: project._id,
        client: {
          name: project.client.name,
          contact: project.client.contact,
          email: project.client.email,
          phone: project.client.phone
        },
        plannedStartDate: new Date('2024-02-01'),
        plannedEndDate: new Date('2024-08-31'),
        contractValue: 1500000,
        status: 'in_progress',
        jobManager: projectManager._id,
        location: {
          address: '123 Industrial Way',
          city: 'Calgary',
          province: 'AB',
          postalCode: 'T2P 1J4'
        }
      });
    }
    console.log(`✅ Project: ${project.projectNumber}, Job: ${job.jobNumber}`);

    // Clear existing PO & Material Inventory data
    console.log('\n🧹 Clearing existing PO & Material Inventory data...');
    await Promise.all([
      InventoryTransaction.deleteMany({}),
      Inventory.deleteMany({}),
      POReceipt.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      MaterialRequest.deleteMany({}),
      Product.deleteMany({}),
      Company.deleteMany({})
    ]);
    console.log('✅ Existing data cleared');

    // Create companies/suppliers
    console.log('\n🏢 Creating suppliers...');
    const suppliers = await Company.insertMany(SUPPLIERS);
    console.log(`✅ Created ${suppliers.length} suppliers`);

    // Create products
    console.log('\n📦 Creating products...');
    const products = [];
    for (const productData of PRODUCTS) {
      const supplier = suppliers[productData.supplierIndex];
      const product = await Product.create({
        name: productData.name,
        description: productData.description,
        supplierId: supplier._id,
        supplierCatalogNumber: productData.supplierCatalogNumber,
        lastPrice: productData.lastPrice,
        unitOfMeasure: productData.unitOfMeasure,
        category: productData.category,
        isActive: true
      });
      products.push(product);
    }
    console.log(`✅ Created ${products.length} products`);

    // Create material requests
    console.log('\n📋 Creating material requests...');
    const materialRequests = [];
    
    // Request 1: Submitted (awaiting approval)
    const mr1 = await MaterialRequest.create({
      jobId: job._id,
      projectId: project._id,
      requestedBy: fieldWorker._id,
      requiredByDate: new Date('2024-03-15'),
      priority: 'urgent',
      deliveryLocation: 'jobsite',
      deliveryAddress: job.location.address,
      deliveryNotes: 'Deliver to main gate, call foreman on arrival',
      lineItems: [
        {
          productName: '2x4x8 SPF Lumber',
          description: 'For framing work',
          quantity: 200,
          unit: 'EA',
          notes: 'Need by Monday'
        },
        {
          productName: 'Plywood 4x8 1/2"',
          description: 'For sheathing',
          quantity: 50,
          unit: 'EA',
          notes: ''
        }
      ],
      status: 'submitted'
    });
    materialRequests.push(mr1);

    // Request 2: Approved (ready to convert to PO)
    const mr2 = await MaterialRequest.create({
      jobId: job._id,
      projectId: project._id,
      requestedBy: fieldWorker._id,
      requiredByDate: new Date('2024-03-20'),
      priority: 'standard',
      deliveryLocation: 'jobsite',
      deliveryAddress: job.location.address,
      lineItems: [
        {
          productName: 'Fiberglass Batts R-20',
          description: 'Wall insulation',
          quantity: 100,
          unit: 'EA',
          notes: ''
        },
        {
          productName: 'Vapor Barrier 6 mil',
          description: 'Vapor barrier for walls',
          quantity: 500,
          unit: 'SQ_FT',
          notes: ''
        }
      ],
      status: 'approved',
      reviewedBy: officeStaff._id,
      reviewedAt: new Date('2024-03-01'),
      approvalNotes: 'Approved for purchase'
    });
    materialRequests.push(mr2);

    // Request 3: PO Issued
    const mr3 = await MaterialRequest.create({
      jobId: job._id,
      projectId: project._id,
      requestedBy: fieldWorker._id,
      requiredByDate: new Date('2024-02-28'),
      priority: 'standard',
      deliveryLocation: 'warehouse',
      lineItems: [
        {
          productName: 'Hard Hat',
          description: 'Safety equipment',
          quantity: 20,
          unit: 'EA',
          notes: ''
        },
        {
          productName: 'Safety Glasses',
          description: 'ANSI approved',
          quantity: 30,
          unit: 'EA',
          notes: ''
        }
      ],
      status: 'po_issued',
      reviewedBy: officeStaff._id,
      reviewedAt: new Date('2024-02-15')
    });
    materialRequests.push(mr3);

    console.log(`✅ Created ${materialRequests.length} material requests`);

    // Create purchase orders
    console.log('\n📄 Creating purchase orders...');
    const purchaseOrders = [];

    // PO 1: Draft
    const po1 = await PurchaseOrder.create({
      poNumber: 'PO-2024-0001', // Will be auto-generated if not set, but set explicitly for seed
      supplierId: suppliers[0]._id, // ABC Building Supplies
      jobId: job._id,
      projectId: project._id,
      buyerId: officeStaff._id,
      defaultCostCode: '01-100',
      requiredByDate: new Date('2024-03-15'),
      shipToAddress: {
        street: job.location.address,
        city: job.location.city,
        province: job.location.province,
        postalCode: job.location.postalCode,
        country: 'Canada'
      },
      deliveryInstructions: 'Call foreman on arrival',
      internalNotes: 'Urgent request from field',
      supplierNotes: 'Please confirm delivery date',
      lineItems: [
        {
          productName: '2x4x8 SPF Lumber',
          description: 'For framing work',
          quantity: 200,
          unit: 'EA',
          unitPrice: 4.25,
          extendedCost: 850.00,
          costCode: '01-100'
        },
        {
          productName: 'Plywood 4x8 1/2"',
          description: 'For sheathing',
          quantity: 50,
          unit: 'EA',
          unitPrice: 45.00,
          extendedCost: 2250.00,
          costCode: '01-100'
        }
      ],
      subtotal: 3100.00,
      taxAmount: 155.00,
      freightAmount: 200.00,
      total: 3455.00,
      status: 'draft'
    });
    purchaseOrders.push(po1);

    // PO 2: Pending Approval
    const po2 = await PurchaseOrder.create({
      poNumber: 'PO-2024-0002',
      supplierId: suppliers[1]._id, // Western Insulation Supply
      jobId: job._id,
      projectId: project._id,
      buyerId: officeStaff._id,
      defaultCostCode: '02-200',
      requiredByDate: new Date('2024-03-20'),
      shipToAddress: {
        street: job.location.address,
        city: job.location.city,
        province: job.location.province,
        postalCode: job.location.postalCode,
        country: 'Canada'
      },
      lineItems: [
        {
          productName: 'Fiberglass Batts R-20',
          description: 'Wall insulation',
          quantity: 100,
          unit: 'EA',
          unitPrice: 42.00,
          extendedCost: 4200.00,
          costCode: '02-200'
        },
        {
          productName: 'Vapor Barrier 6 mil',
          description: 'Vapor barrier for walls',
          quantity: 500,
          unit: 'SQ_FT',
          unitPrice: 0.35,
          extendedCost: 175.00,
          costCode: '02-200'
        }
      ],
      subtotal: 4375.00,
      taxAmount: 218.75,
      freightAmount: 150.00,
      total: 4743.75,
      status: 'pending_approval'
    });
    purchaseOrders.push(po2);

    // PO 3: Approved
    const po3 = await PurchaseOrder.create({
      poNumber: 'PO-2024-0003',
      supplierId: suppliers[3]._id, // Safety Equipment Warehouse
      jobId: job._id,
      projectId: project._id,
      buyerId: officeStaff._id,
      defaultCostCode: '03-300',
      requiredByDate: new Date('2024-02-28'),
      shipToAddress: {
        street: '456 Storage St',
        city: 'Calgary',
        province: 'AB',
        postalCode: 'T2P 1J4',
        country: 'Canada'
      },
      deliveryInstructions: 'Deliver to warehouse',
      lineItems: [
        {
          productName: 'Hard Hat',
          description: 'Safety equipment',
          quantity: 20,
          unit: 'EA',
          unitPrice: 28.00,
          extendedCost: 560.00,
          costCode: '03-300'
        },
        {
          productName: 'Safety Glasses',
          description: 'ANSI approved',
          quantity: 30,
          unit: 'EA',
          unitPrice: 8.50,
          extendedCost: 255.00,
          costCode: '03-300'
        }
      ],
      subtotal: 815.00,
      taxAmount: 40.75,
      freightAmount: 50.00,
      total: 905.75,
      status: 'approved',
      approvedBy: projectManager._id,
      approvedAt: new Date('2024-02-16')
    });
    purchaseOrders.push(po3);

    // PO 4: Sent
    const po4 = await PurchaseOrder.create({
      supplierId: suppliers[2]._id, // Industrial Pipe & Fittings
      jobId: job._id,
      projectId: project._id,
      buyerId: officeStaff._id,
      defaultCostCode: '04-400',
      requiredByDate: new Date('2024-03-10'),
      shipToAddress: {
        street: job.location.address,
        city: job.location.city,
        province: job.location.province,
        postalCode: job.location.postalCode,
        country: 'Canada'
      },
      lineItems: [
        {
          productName: 'Steel Pipe 2" Schedule 40',
          description: 'Black steel pipe',
          quantity: 500,
          unit: 'FT',
          unitPrice: 18.50,
          extendedCost: 9250.00,
          costCode: '04-400'
        },
        {
          productName: '90 Degree Elbow 2"',
          description: 'Welded steel elbow',
          quantity: 50,
          unit: 'EA',
          unitPrice: 24.75,
          extendedCost: 1237.50,
          costCode: '04-400'
        }
      ],
      subtotal: 10487.50,
      taxAmount: 524.38,
      freightAmount: 300.00,
      total: 11311.88,
      status: 'sent',
      approvedBy: projectManager._id,
      approvedAt: new Date('2024-02-20'),
      issuedBy: officeStaff._id,
      issuedAt: new Date('2024-02-21'),
      poNumber: 'PO-2024-001'
    });
    purchaseOrders.push(po4);

    // Link PO 3 to material request 3
    mr3.purchaseOrderId = po3._id;
    await mr3.save();

    console.log(`✅ Created ${purchaseOrders.length} purchase orders`);

    // Create receipts
    console.log('\n📦 Creating receipts...');
    const receipts = [];

    // Receipt 1: Partial receipt for PO 3
    const receipt1 = await POReceipt.create({
      purchaseOrderId: po3._id,
      jobId: job._id,
      projectId: project._id,
      deliveryDate: new Date('2024-02-25'),
      locationPlaced: 'Warehouse - Shelf A-12',
      receiptItems: [
        {
          poLineItemIndex: 0,
          productName: po3.lineItems[0].productName,
          quantityOrdered: po3.lineItems[0].quantity,
          quantityReceived: 20,
          unit: 'EA',
          unitPrice: po3.lineItems[0].unitPrice,
          extendedCost: 20 * po3.lineItems[0].unitPrice,
          condition: 'good',
          conditionNotes: 'All items in good condition'
        },
        {
          poLineItemIndex: 1,
          productName: po3.lineItems[1].productName,
          quantityOrdered: po3.lineItems[1].quantity,
          quantityReceived: 25,
          unit: 'EA',
          unitPrice: po3.lineItems[1].unitPrice,
          extendedCost: 25 * po3.lineItems[1].unitPrice,
          condition: 'good',
          conditionNotes: '5 units backordered'
        }
      ],
      totalReceived: 20 * po3.lineItems[0].unitPrice + 25 * po3.lineItems[1].unitPrice,
      receivedBy: fieldWorker._id,
      receivedAt: new Date('2024-02-25'),
      status: 'approved'
    });
    receipts.push(receipt1);

    // Receipt 2: Complete receipt for PO 4
    const receipt2 = await POReceipt.create({
      purchaseOrderId: po4._id,
      jobId: job._id,
      projectId: project._id,
      deliveryDate: new Date('2024-03-05'),
      locationPlaced: 'Jobsite - Material Storage Area',
      receiptItems: [
        {
          poLineItemIndex: 0,
          productName: po4.lineItems[0].productName,
          quantityOrdered: po4.lineItems[0].quantity,
          quantityReceived: 500,
          unit: 'FT',
          unitPrice: po4.lineItems[0].unitPrice,
          extendedCost: 500 * po4.lineItems[0].unitPrice,
          condition: 'good',
          conditionNotes: 'Delivered on time'
        },
        {
          poLineItemIndex: 1,
          productName: po4.lineItems[1].productName,
          quantityOrdered: po4.lineItems[1].quantity,
          quantityReceived: 50,
          unit: 'EA',
          unitPrice: po4.lineItems[1].unitPrice,
          extendedCost: 50 * po4.lineItems[1].unitPrice,
          condition: 'good',
          conditionNotes: ''
        }
      ],
      totalReceived: 500 * po4.lineItems[0].unitPrice + 50 * po4.lineItems[1].unitPrice,
      receivedBy: fieldWorker._id,
      receivedAt: new Date('2024-03-05'),
      status: 'approved'
    });
    receipts.push(receipt2);

    // Update PO statuses based on receipts
    po3.status = 'partially_received';
    await po3.save();

    po4.status = 'fully_received';
    await po4.save();

    console.log(`✅ Created ${receipts.length} receipts`);

    // Create inventory records
    console.log('\n📊 Creating inventory records...');
    const inventoryRecords = [];

    // Inventory for received items
    const inv1 = await Inventory.create({
      productId: products[14]._id, // Hard Hat
      location: 'Warehouse - Shelf A-12',
      onHandQuantity: 20,
      unitOfMeasure: 'EA',
      averageCost: 28.00,
      lastCost: 28.00,
      isActive: true
    });
    inventoryRecords.push(inv1);

    const inv2 = await Inventory.create({
      productId: products[15]._id, // Safety Glasses
      location: 'Warehouse - Shelf A-12',
      onHandQuantity: 25,
      unitOfMeasure: 'EA',
      averageCost: 8.50,
      lastCost: 8.50,
      isActive: true
    });
    inventoryRecords.push(inv2);

    // Create inventory transactions
    console.log('\n📝 Creating inventory transactions...');
    const transactions = [];

    // Receipt transaction for Hard Hats
    const trans1 = await InventoryTransaction.create({
      inventoryId: inv1._id,
      productId: products[14]._id,
      transactionType: 'receipt',
      quantity: 20,
      unitOfMeasure: 'EA',
      unitCost: 28.00,
      totalCost: 560.00,
      location: 'Warehouse - Shelf A-12',
      performedBy: fieldWorker._id,
      referenceType: 'po_receipt',
      referenceId: receipt1._id,
      notes: 'Received from PO-2024-001',
      transactionDate: new Date('2024-02-25')
    });
    transactions.push(trans1);

    // Receipt transaction for Safety Glasses
    const trans2 = await InventoryTransaction.create({
      inventoryId: inv2._id,
      productId: products[15]._id,
      transactionType: 'receipt',
      quantity: 25,
      unitOfMeasure: 'EA',
      unitCost: 8.50,
      totalCost: 212.50,
      location: 'Warehouse - Shelf A-12',
      performedBy: fieldWorker._id,
      referenceType: 'po_receipt',
      referenceId: receipt1._id,
      notes: 'Received from PO-2024-001',
      transactionDate: new Date('2024-02-25')
    });
    transactions.push(trans2);

    console.log(`✅ Created ${inventoryRecords.length} inventory records`);
    console.log(`✅ Created ${transactions.length} inventory transactions`);

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`   Suppliers: ${suppliers.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Material Requests: ${materialRequests.length}`);
    console.log(`   Purchase Orders: ${purchaseOrders.length}`);
    console.log(`   Receipts: ${receipts.length}`);
    console.log(`   Inventory Records: ${inventoryRecords.length}`);
    console.log(`   Inventory Transactions: ${transactions.length}`);

    console.log('\n✅ PO & Material Inventory seed completed successfully!');
    console.log('\n📋 Sample Data:');
    console.log(`   Material Request #1: ${mr1.requestNumber || 'MR-' + mr1._id.toString().slice(-6)} - Status: ${mr1.status}`);
    console.log(`   Material Request #2: ${mr2.requestNumber || 'MR-' + mr2._id.toString().slice(-6)} - Status: ${mr2.status}`);
    console.log(`   Purchase Order #1: ${po1.poNumber || 'PO-' + po1._id.toString().slice(-6)} - Status: ${po1.status}`);
    console.log(`   Purchase Order #2: ${po2.poNumber || 'PO-' + po2._id.toString().slice(-6)} - Status: ${po2.status}`);
    console.log(`   Purchase Order #3: ${po3.poNumber || 'PO-' + po3._id.toString().slice(-6)} - Status: ${po3.status}`);
    console.log(`   Purchase Order #4: ${po4.poNumber} - Status: ${po4.status}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('\n❌ Error seeding PO & Material Inventory data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedPOMaterialInventory();
}

module.exports = seedPOMaterialInventory;

