require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const Company = require('../src/server/models/Company');

async function checkSuppliers() {
  try {
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const suppliers = await Company.find({ companyType: 'supplier' }).select('name _id').sort({ name: 1 });
    
    console.log(`Found ${suppliers.length} suppliers:\n`);
    suppliers.forEach((supplier, index) => {
      console.log(`${index + 1}. ${supplier.name} (ID: ${supplier._id})`);
    });

    // Check for variations of "Crossroads"
    const crossroadsVariations = suppliers.filter(s => 
      /crossroads?/i.test(s.name)
    );
    
    if (crossroadsVariations.length > 0) {
      console.log('\n✅ Found Crossroads variations:');
      crossroadsVariations.forEach(s => {
        console.log(`   - ${s.name} (ID: ${s._id})`);
      });
    } else {
      console.log('\n⚠️  No supplier found matching "Crossroads"');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSuppliers();

