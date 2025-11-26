/**
 * Setup Vanos Shop Supplier
 * 
 * Creates or updates the "Vanos Shop" supplier for internal inventory fulfillment
 * 
 * Usage:
 *   node scripts/setup-vanos-shop-supplier.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Company = require('../src/server/models/Company');

async function setupVanosShop() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_DEV_URI or MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Check if Vanos Shop already exists
    let vanosShop = await Company.findOne({ 
      name: { $regex: /vanos.*shop/i },
      companyType: 'supplier'
    });

    if (vanosShop) {
      console.log('📦 Found existing Vanos Shop supplier');
      // Update to ensure it's properly configured
      vanosShop.companyType = 'supplier';
      vanosShop.name = 'Vanos Shop';
      await vanosShop.save();
      console.log('✅ Updated Vanos Shop supplier');
    } else {
      // Create new Vanos Shop supplier
      vanosShop = await Company.create({
        name: 'Vanos Shop',
        companyType: 'supplier',
        contact: {
          name: 'Vanos Insulation',
          email: 'shop@vanos.com',
          phone: ''
        },
        address: {
          street: 'Vanos Shop',
          city: '',
          province: '',
          postalCode: '',
          country: 'Canada'
        },
        paymentTerms: 'Internal',
        notes: 'Internal inventory supplier for Vanos Shop fulfillment'
      });
      console.log('✅ Created Vanos Shop supplier');
    }

    console.log(`\n📋 Vanos Shop Supplier Details:`);
    console.log(`   ID: ${vanosShop._id}`);
    console.log(`   Name: ${vanosShop.name}`);
    console.log(`   Type: ${vanosShop.companyType}`);
    console.log(`\n✅ Setup complete!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up Vanos Shop:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

setupVanosShop();

