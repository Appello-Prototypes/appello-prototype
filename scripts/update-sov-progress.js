#!/usr/bin/env node

/**
 * Update SOV progress to match the progress reports
 * This will fix the disconnect between progress reports showing progress
 * but SOV showing 0% complete
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');

const MONGODB_URI = process.env.MONGODB_URI;

// VAV Job ID
const VAV_JOB_ID = '691b6b8631b6fabe9155baad';

// Progress data from the progress reports
const PROGRESS_DATA = {
  'VAV-UNITS-001': { percentComplete: 75, quantityComplete: 36 }, // 48 total units
  'VAV-UNITS-002': { percentComplete: 43, quantityComplete: 15.5 }, // 36 total units  
  'VAV-DUCT-001': { percentComplete: 47, quantityComplete: 1128 }, // 2400 total LF
  'VAV-CTRL-001': { percentComplete: 47, quantityComplete: 39.5 } // 84 total units
};

async function updateSOVProgress() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all SOV line items for the VAV job using the specific IDs
    const sovItemIds = [
      '691b6fc8a1983f213b51cbd0', // VAV-UNITS-001
      '691b6fc8a1983f213b51cbd1', // VAV-UNITS-002
      '691b6fc8a1983f213b51cbd2', // VAV-DUCT-001
      '691b6fc8a1983f213b51cbd3'  // VAV-CTRL-001
    ];
    
    const sovItems = await ScheduleOfValues.find({ 
      _id: { $in: sovItemIds.map(id => new mongoose.Types.ObjectId(id)) }
    });
    
    console.log(`📋 Found ${sovItems.length} SOV line items to update`);

    let updatedCount = 0;

    for (const item of sovItems) {
      const progressData = PROGRESS_DATA[item.costCode];
      
      if (progressData) {
        const oldProgress = item.percentComplete;
        
        // Update progress and quantity
        item.percentComplete = progressData.percentComplete;
        item.quantityComplete = progressData.quantityComplete;
        
        // Calculate value earned based on progress
        item.valueEarned = (item.percentComplete / 100) * item.totalValue;
        
        await item.save();
        updatedCount++;
        
        console.log(`✅ Updated ${item.costCode}: ${oldProgress}% → ${item.percentComplete}% complete`);
        console.log(`   Quantity: ${item.quantityComplete}/${item.quantity} ${item.unit}`);
        console.log(`   Value Earned: $${Math.round(item.valueEarned).toLocaleString()}`);
      } else {
        console.log(`⚠️ No progress data found for ${item.costCode}`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} SOV line items!`);
    
    // Show summary
    const updatedItems = await ScheduleOfValues.find({ 
      _id: { $in: sovItemIds.map(id => new mongoose.Types.ObjectId(id)) }
    });
    const totalValue = updatedItems.reduce((sum, item) => sum + item.totalValue, 0);
    const totalEarned = updatedItems.reduce((sum, item) => sum + item.valueEarned, 0);
    const overallProgress = totalValue > 0 ? (totalEarned / totalValue) * 100 : 0;
    
    console.log('\n📊 UPDATED SOV SUMMARY:');
    updatedItems.forEach(item => {
      console.log(`${item.costCode}: ${item.percentComplete}% complete, $${Math.round(item.valueEarned).toLocaleString()} earned`);
    });
    
    console.log(`\n📈 OVERALL: ${Math.round(overallProgress)}% complete, $${Math.round(totalEarned).toLocaleString()} of $${Math.round(totalValue).toLocaleString()} earned`);

  } catch (error) {
    console.error('❌ Error updating SOV progress:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
}

updateSOVProgress();
