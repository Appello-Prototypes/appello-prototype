// Minimal API test - isolate the issue
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Test endpoint without any complex middleware
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Minimal API test working',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
    }
  });
});

// Test database connection endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    const ping = await mongoose.connection.db.admin().ping();
    res.json({
      success: true,
      message: 'Database connection working',
      ping: ping,
      readyState: mongoose.connection.readyState
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Test API running on port ${port}`);
});

module.exports = app;
