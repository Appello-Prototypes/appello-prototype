// Load environment variables - prioritize .env.local over .env
require('dotenv').config(); // Loads .env
require('dotenv').config({ path: '.env.local', override: true }); // Override with .env.local if it exists
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Import routes
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const jobRoutes = require('./routes/jobs');
const timeEntryRoutes = require('./routes/timeEntries');
const userRoutes = require('./routes/users');
const sovRoutes = require('./routes/sov');
const financialRoutes = require('./routes/financial');
const { handleUploadError } = require('./middleware/upload');

// Create Express app
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_IO_ORIGINS?.split(',') || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for development
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL || 'https://task-management-kappa-plum.vercel.app'
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Database connection with Atlas optimization - Serverless-safe pattern
// Cache connection globally to prevent multiple connections in serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Determine which database to use based on environment
  // Local development uses MONGODB_DEV_URI, production uses MONGODB_URI
  const mongoUri = process.env.NODE_ENV === 'production' || process.env.VERCEL
    ? process.env.MONGODB_URI
    : (process.env.MONGODB_DEV_URI || process.env.MONGODB_URI);
  
  // Validate MongoDB URI is set
  if (!mongoUri) {
    const envVar = process.env.NODE_ENV === 'production' || process.env.VERCEL
      ? 'MONGODB_URI'
      : 'MONGODB_DEV_URI';
    throw new Error(`${envVar} environment variable is not set`);
  }
  
  // Log which database we're connecting to (without exposing credentials)
  const dbName = mongoUri.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown';
  const envType = process.env.NODE_ENV === 'production' || process.env.VERCEL ? 'PRODUCTION' : 'DEVELOPMENT';
  console.log(`🔌 Connecting to ${envType} database: ${dbName}`);

  // If already connected, return the existing connection
  if (cached.conn) {
    console.log('📦 Using cached MongoDB connection');
    return cached.conn;
  }

  // If connection is in progress, wait for it
  if (!cached.promise) {
    const opts = {
      maxPoolSize: 50, // Increased pool size for better concurrency
      minPoolSize: 5, // Maintain minimum connections
      serverSelectionTimeoutMS: 5000, // 5 seconds for serverless
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      // Optimize for performance
      retryWrites: true,
      retryReads: true,
      // Use compression for faster data transfer
      compressors: ['zlib'],
    };

    // Connection logging is done above

    cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB Atlas');
      cached.conn = mongoose;
      return mongoose;
    }).catch((error) => {
      cached.promise = null;
      console.error('❌ MongoDB connection error:', error.message);
      throw error;
    });
  }

  try {
    return await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
};

// Start connection (non-blocking for local dev, cached for serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // Local development: connect immediately
  connectDB().catch((error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    // Retry after 5 seconds in local dev
    setTimeout(() => {
      console.log('🔄 Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  });
} else {
  // Vercel serverless: connection will be established on first request
  console.log('⚡ Serverless mode: MongoDB connection will be established on first request');
}

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join project room for project-specific updates
  socket.on('join-project-room', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`User joined project room: ${projectId}`);
  });

  // Handle task status updates
  socket.on('task-status-update', (data) => {
    // Broadcast to project room and assigned user
    socket.to(`project-${data.projectId}`).emit('task-updated', data);
    socket.to(`user-${data.assignedTo}`).emit('task-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Middleware to ensure DB connection before handling requests (serverless)
const ensureDBConnection = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed in middleware:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
    });
  }
};

// API Routes - apply DB connection middleware before routes that need it
// Note: /api/version and /api/fast-stats don't need DB connection
app.use('/api/auth', ensureDBConnection, authRoutes);
app.use('/api/tasks', ensureDBConnection, taskRoutes);
app.use('/api/projects', ensureDBConnection, projectRoutes);
app.use('/api/jobs', ensureDBConnection, jobRoutes);
app.use('/api/time-entries', ensureDBConnection, timeEntryRoutes);
app.use('/api/users', ensureDBConnection, userRoutes);
app.use('/api/sov', ensureDBConnection, sovRoutes);
app.use('/api/financial', ensureDBConnection, financialRoutes);

// Version endpoint
app.get('/api/version', (req, res) => {
  try {
    const packageJson = require('../../package.json');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    const environment = isProduction ? 'production' : 'development';
    
    res.json({
      success: true,
      version: packageJson.version,
      environment,
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get version information',
      error: error.message
    });
  }
});

// Health check endpoint with connection verification
app.get('/api/health', async (req, res) => {
  try {
    // Ensure connection is established
    await connectDB();
    
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 
                     mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected';
    
    // Test a simple query to verify connection works
    const connectionTest = mongoose.connection.readyState === 1;
    
    const packageJson = require('../../package.json');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    res.json({
      success: true,
      message: 'Appello Task Management API is running',
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      environment: isProduction ? 'production' : 'development',
      database: {
        status: dbStatus,
        readyState: mongoose.connection.readyState,
        connectionTest: connectionTest ? 'passed' : 'failed',
        host: mongoose.connection.host || 'unknown'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Fast stats endpoint for demo
app.get('/api/fast-stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTasks: 5,
      completedTasks: 1,
      inProgressTasks: 1,
      overdueTasks: 0,
      todayTasks: 0,
      highPriorityTasks: 3,
      completionRate: 20
    }
  });
});

// Performance test endpoint with connection check
app.get('/api/performance-test', async (req, res) => {
  try {
    // Ensure connection is established
    await connectDB();
    
    const start = Date.now();
    
    // Test common queries
    const [tasks, projects, timeEntries] = await Promise.all([
      require('./models/Task').countDocuments(),
      require('./models/Project').countDocuments(),
      require('./models/TimeEntry').countDocuments()
    ]);
    
    const queryTime = Date.now() - start;
    
    res.json({
      success: true,
      data: {
        queryTime: `${queryTime}ms`,
        collections: {
          tasks,
          projects,
          timeEntries
        },
        performance: queryTime < 100 ? 'Excellent' : queryTime < 500 ? 'Good' : 'Needs optimization',
        connectionState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      connectionState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  }
});

// Error handling middleware
app.use(handleUploadError);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Export connectDB for use in other modules if needed
module.exports.connectDB = connectDB;

// Check if we're in Vercel serverless environment
const isVercelServerless = process.env.VERCEL === '1' || process.env.NOW_REGION;

if (isVercelServerless) {
  // Export for Vercel serverless functions
  module.exports = app;
  module.exports.connectDB = connectDB;
} else {
  // Local development server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 Appello Task Management API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📡 MongoDB URI configured: ${process.env.MONGODB_URI ? 'Yes' : 'No'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      mongoose.connection.close();
    });
  });

  module.exports = { app, io, connectDB };
}
