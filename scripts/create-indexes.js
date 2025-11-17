require('dotenv').config();
const mongoose = require('mongoose');

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Create indexes for tasks collection
    console.log('Creating indexes for tasks...');
    await db.collection('tasks').createIndex({ assignedTo: 1, status: 1 });
    await db.collection('tasks').createIndex({ projectId: 1, status: 1 });
    await db.collection('tasks').createIndex({ status: 1 });
    await db.collection('tasks').createIndex({ priority: 1 });
    await db.collection('tasks').createIndex({ dueDate: 1, status: 1 });
    await db.collection('tasks').createIndex({ createdAt: -1 });
    await db.collection('tasks').createIndex({ costCode: 1 });

    // Create indexes for projects collection
    console.log('Creating indexes for projects...');
    await db.collection('projects').createIndex({ projectNumber: 1 });
    await db.collection('projects').createIndex({ status: 1 });
    await db.collection('projects').createIndex({ projectManager: 1 });

    // Create indexes for time entries collection
    console.log('Creating indexes for timeentries...');
    await db.collection('timeentries').createIndex({ projectId: 1, status: 1 });
    await db.collection('timeentries').createIndex({ workerId: 1, date: 1 });
    await db.collection('timeentries').createIndex({ costCode: 1 });
    await db.collection('timeentries').createIndex({ date: 1 });

    // Create indexes for users collection
    console.log('Creating indexes for users...');
    await db.collection('users').createIndex({ email: 1 });
    await db.collection('users').createIndex({ role: 1, isActive: 1 });

    console.log('✅ All indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
