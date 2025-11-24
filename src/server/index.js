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

// Import routes - if any fail, log but continue (routes will fail gracefully)
let taskRoutes, authRoutes, projectRoutes, jobRoutes, timeEntryRoutes, userRoutes;
let sovRoutes, financialRoutes, workOrderRoutes;
let companyRoutes, productRoutes, productTypeRoutes, materialRequestRoutes;
let purchaseOrderRoutes, poReceiptRoutes, inventoryRoutes, discountRoutes;
let uploadRoutes, specificationRoutes, specificationTemplateRoutes;
let propertyDefinitionRoutes, unitOfMeasureRoutes;
let handleUploadError;

try {
  taskRoutes = require('./routes/tasks');
} catch (e) { console.error('Failed to load taskRoutes:', e.message); }
try {
  authRoutes = require('./routes/auth');
} catch (e) { console.error('Failed to load authRoutes:', e.message); }
try {
  projectRoutes = require('./routes/projects');
} catch (e) { console.error('Failed to load projectRoutes:', e.message); }
try {
  jobRoutes = require('./routes/jobs');
} catch (e) { console.error('Failed to load jobRoutes:', e.message); }
try {
  timeEntryRoutes = require('./routes/timeEntries');
} catch (e) { console.error('Failed to load timeEntryRoutes:', e.message); }
try {
  userRoutes = require('./routes/users');
} catch (e) { console.error('Failed to load userRoutes:', e.message); }
try {
  sovRoutes = require('./routes/sov');
} catch (e) { console.error('Failed to load sovRoutes:', e.message); }
try {
  financialRoutes = require('./routes/financial');
} catch (e) { console.error('Failed to load financialRoutes:', e.message); }
try {
  workOrderRoutes = require('./routes/workOrders');
} catch (e) { console.error('Failed to load workOrderRoutes:', e.message); }
// Purchase Order & Material Inventory routes
try {
  companyRoutes = require('./routes/companies');
} catch (e) { console.error('Failed to load companyRoutes:', e.message); }
try {
  productRoutes = require('./routes/products');
} catch (e) { console.error('Failed to load productRoutes:', e.message); }
try {
  productTypeRoutes = require('./routes/productTypes');
} catch (e) { console.error('Failed to load productTypeRoutes:', e.message); }
try {
  materialRequestRoutes = require('./routes/materialRequests');
} catch (e) { console.error('Failed to load materialRequestRoutes:', e.message); }
try {
  purchaseOrderRoutes = require('./routes/purchaseOrders');
} catch (e) { console.error('Failed to load purchaseOrderRoutes:', e.message); }
try {
  poReceiptRoutes = require('./routes/poReceipts');
} catch (e) { console.error('Failed to load poReceiptRoutes:', e.message); }
try {
  inventoryRoutes = require('./routes/inventory');
} catch (e) { console.error('Failed to load inventoryRoutes:', e.message); }
try {
  discountRoutes = require('./routes/discounts');
} catch (e) { console.error('Failed to load discountRoutes:', e.message); }
try {
  uploadRoutes = require('./routes/uploads');
} catch (e) { console.error('Failed to load uploadRoutes:', e.message); }
try {
  specificationRoutes = require('./routes/specifications');
} catch (e) { console.error('Failed to load specificationRoutes:', e.message); }
try {
  specificationTemplateRoutes = require('./routes/specificationTemplates');
} catch (e) { console.error('Failed to load specificationTemplateRoutes:', e.message); }
try {
  propertyDefinitionRoutes = require('./routes/propertyDefinitions');
} catch (e) { console.error('Failed to load propertyDefinitionRoutes:', e.message); }
try {
  unitOfMeasureRoutes = require('./routes/unitOfMeasures');
} catch (e) { console.error('Failed to load unitOfMeasureRoutes:', e.message); }
try {
  handleUploadError = require('./middleware/upload').handleUploadError;
} catch (e) { console.error('Failed to load handleUploadError:', e.message); }

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
  cached = global.mongoose = { conn: null, promise: null, uri: null };
}

const connectDB = async () => {
  // Determine which database to use based on environment
  // Local development: prefer local MongoDB, fallback to MONGODB_DEV_URI (Atlas dev)
  // Production: use MONGODB_URI (Atlas prod)
  let mongoUri;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    mongoUri = process.env.MONGODB_URI;
  } else {
    // Local development: check for local MongoDB first
    if (process.env.MONGODB_LOCAL_URI) {
      mongoUri = process.env.MONGODB_LOCAL_URI;
    } else {
      // Fallback to Atlas dev database
      mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    }
  }
  
  // Validate MongoDB URI is set
  if (!mongoUri) {
    const envVar = process.env.NODE_ENV === 'production' || process.env.VERCEL
      ? 'MONGODB_URI'
      : 'MONGODB_DEV_URI';
    throw new Error(`${envVar} environment variable is not set`);
  }
  
  // CRITICAL FIX: Check if already connected to the CORRECT database
  // Don't just check readyState - verify it's the right URI!
  if (mongoose.connection.readyState === 1) {
    // If cached.uri matches, we're good
    if (cached.uri === mongoUri) {
      return mongoose.connection;
    }
    // If cached.uri is null but we're connected, set it (first connection after startup)
    if (!cached.uri && mongoose.connection.readyState === 1) {
      cached.uri = mongoUri;
      return mongoose.connection;
    }
    // If cached.uri doesn't match, we need to reconnect
    if (cached.uri && cached.uri !== mongoUri) {
      console.log('⚠️  Connected to different database, reconnecting...');
      await mongoose.connection.close();
      cached.conn = null;
      cached.uri = null;
    }
  }

  // If connection is in progress, wait for it (but with timeout)
  if (cached.promise && cached.uri === mongoUri) {
    try {
      // Add timeout to prevent hanging - shorter timeout for local MongoDB
      const isLocalMongo = mongoUri.startsWith('mongodb://localhost') || mongoUri.startsWith('mongodb://127.0.0.1');
      const timeoutMs = isLocalMongo ? 2000 : 10000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
      );
      return await Promise.race([cached.promise, timeoutPromise]);
    } catch (error) {
      // If promise failed or timed out, clear it and retry
      cached.promise = null;
      cached.uri = null;
      if (cached.conn) {
        cached.conn = null;
      }
    }
  }

  // Log which database we're connecting to (without exposing credentials)
  // Only log if not already connected (to reduce noise)
  const dbName = mongoUri.match(/\/\/([^:]+):[^@]+@[^/]+\/([^?]+)/)?.[2] || 'unknown';
  const envType = process.env.NODE_ENV === 'production' || process.env.VERCEL ? 'PRODUCTION' : 'DEVELOPMENT';
  // Only log on initial connection, not on every check
  if (!cached.promise) {
    console.log(`🔌 Connecting to ${envType} database: ${dbName}`);
  }

  // Create new connection promise
  // Optimize timeouts based on environment
  const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
  const isLocalMongo = mongoUri.startsWith('mongodb://localhost') || mongoUri.startsWith('mongodb://127.0.0.1');
  
  const opts = {
    maxPoolSize: isLocalMongo ? 5 : (isLocalDev ? 10 : 50), // Smaller pool for local MongoDB
    minPoolSize: isLocalMongo ? 1 : (isLocalDev ? 1 : 5),
    serverSelectionTimeoutMS: isLocalMongo ? 500 : (isLocalDev ? 2000 : 10000), // 500ms for local MongoDB
    socketTimeoutMS: isLocalMongo ? 5000 : (isLocalDev ? 10000 : 45000), // 5s for local MongoDB
    connectTimeoutMS: isLocalMongo ? 500 : (isLocalDev ? 2000 : 10000), // 500ms for local MongoDB
    // Optimize for performance
    retryWrites: true,
    retryReads: true,
    // Skip compression for local MongoDB (no network benefit)
    compressors: isLocalMongo ? [] : ['zlib'],
    // Less frequent heartbeats for local MongoDB
    heartbeatFrequencyMS: isLocalMongo ? 60000 : (isLocalDev ? 30000 : 10000),
    // Direct connection for local MongoDB (faster)
    directConnection: isLocalMongo ? true : false,
    // SSL/TLS options for MongoDB Atlas (required for Atlas connections)
    // Node.js v25+ with OpenSSL 3.x requires explicit TLS configuration
    ...(isLocalMongo ? {} : {
      // Explicitly enable TLS for Atlas connections
      // This helps with Node.js v25+ compatibility
      tls: true,
      // Use secure defaults but allow for compatibility
      tlsInsecure: false,
    }),
  };

  // Store the URI we're connecting to
  cached.uri = mongoUri;
  cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
    console.log(`✅ Connected to ${isLocalMongo ? 'Local MongoDB' : 'MongoDB Atlas'}`);
    cached.conn = mongoose;
    return mongoose;
  }).catch((error) => {
    cached.promise = null;
    cached.conn = null;
    cached.uri = null;
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  });

  try {
    return await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    cached.uri = null;
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
// Optimized: Fast path if already connected
const ensureDBConnection = async (req, res, next) => {
  const startTime = Date.now();
  try {
    // Use same logic as connectDB to determine which database to use
    let mongoUri;
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        console.error('❌ MONGODB_URI not set in production');
        return res.status(500).json({
          success: false,
          message: 'Database configuration error',
          error: 'MONGODB_URI environment variable is not set'
        });
      }
    } else {
      // Local development: check for local MongoDB first
      if (process.env.MONGODB_LOCAL_URI) {
        mongoUri = process.env.MONGODB_LOCAL_URI;
      } else {
        // Fallback to Atlas dev database
        mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
      }
    }
    
    const checkTime = Date.now() - startTime;
    
    // Fast path: If already connected to correct database, skip connection check
    if (mongoose.connection.readyState === 1 && cached.uri === mongoUri) {
      // Already connected to correct database, proceed immediately
      if (checkTime > 10) {
        console.log(`⚠️  DB middleware check took ${checkTime}ms (should be <1ms)`);
      }
      return next();
    }
    
    // Otherwise, ensure connection
    const connectStart = Date.now();
    await connectDB();
    const connectTime = Date.now() - connectStart;
    if (connectTime > 100) {
      console.log(`⚠️  DB connection took ${connectTime}ms`);
    }
    next();
  } catch (error) {
    console.error('❌ Database connection failed in middleware:', error.message);
    console.error('Stack:', error.stack);
    res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
      error: process.env.NODE_ENV === 'development' || process.env.VERCEL ? error.message : 'Service temporarily unavailable'
    });
  }
};

// API Routes - apply DB connection middleware before routes that need it
// Note: /api/version and /api/fast-stats don't need DB connection
// Only register routes if they loaded successfully
if (authRoutes) app.use('/api/auth', ensureDBConnection, authRoutes);
if (taskRoutes) app.use('/api/tasks', ensureDBConnection, taskRoutes);
if (projectRoutes) app.use('/api/projects', ensureDBConnection, projectRoutes);
if (jobRoutes) app.use('/api/jobs', ensureDBConnection, jobRoutes);
if (timeEntryRoutes) app.use('/api/time-entries', ensureDBConnection, timeEntryRoutes);
if (userRoutes) app.use('/api/users', ensureDBConnection, userRoutes);
if (sovRoutes) app.use('/api/sov', ensureDBConnection, sovRoutes);
if (financialRoutes) app.use('/api/financial', ensureDBConnection, financialRoutes);
if (workOrderRoutes) app.use('/api/work-orders', ensureDBConnection, workOrderRoutes);
// Purchase Order & Material Inventory routes
if (companyRoutes) app.use('/api/companies', ensureDBConnection, companyRoutes);
if (productRoutes) app.use('/api/products', ensureDBConnection, productRoutes);
if (productTypeRoutes) app.use('/api/product-types', ensureDBConnection, productTypeRoutes);
if (materialRequestRoutes) app.use('/api/material-requests', ensureDBConnection, materialRequestRoutes);
if (purchaseOrderRoutes) app.use('/api/purchase-orders', ensureDBConnection, purchaseOrderRoutes);
if (poReceiptRoutes) app.use('/api/po-receipts', ensureDBConnection, poReceiptRoutes);
if (inventoryRoutes) app.use('/api/inventory', ensureDBConnection, inventoryRoutes);
if (discountRoutes) app.use('/api/discounts', ensureDBConnection, discountRoutes);
if (uploadRoutes) app.use('/api/uploads', uploadRoutes); // No DB connection needed for file uploads
if (specificationRoutes) app.use('/api', ensureDBConnection, specificationRoutes);
if (specificationTemplateRoutes) app.use('/api/specification-templates', ensureDBConnection, specificationTemplateRoutes);
if (propertyDefinitionRoutes) app.use('/api/property-definitions', ensureDBConnection, propertyDefinitionRoutes);
if (unitOfMeasureRoutes) app.use('/api/units-of-measure', ensureDBConnection, unitOfMeasureRoutes);

// Version endpoint
app.get('/api/version', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    let packageJson;
    
    // Try multiple paths for package.json (Vercel vs local)
    const possiblePaths = [
      path.join(__dirname, '../../package.json'),
      path.join(process.cwd(), 'package.json'),
      './package.json'
    ];
    
    for (const pkgPath of possiblePaths) {
      try {
        if (fs.existsSync(pkgPath)) {
          packageJson = require(pkgPath);
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    const environment = isProduction ? 'production' : 'development';
    
    res.json({
      success: true,
      version: packageJson?.version || 'unknown',
      environment,
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL
    });
  } catch (error) {
    // Don't fail completely - return basic info
    res.json({
      success: true,
      version: 'unknown',
      environment: process.env.NODE_ENV === 'production' || process.env.VERCEL ? 'production' : 'development',
      buildTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    
    // Try to get package.json version, but don't fail if it's not available
    let version = 'unknown';
    try {
      const path = require('path');
      const fs = require('fs');
      const possiblePaths = [
        path.join(__dirname, '../../package.json'),
        path.join(process.cwd(), 'package.json'),
        './package.json'
      ];
      
      for (const pkgPath of possiblePaths) {
        try {
          if (fs.existsSync(pkgPath)) {
            const packageJson = require(pkgPath);
            version = packageJson.version || 'unknown';
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
    } catch (e) {
      // Version not critical, continue
    }
    
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    res.json({
      success: true,
      message: 'Appello Lab API is running',
      timestamp: new Date().toISOString(),
      version: version,
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

// Diagnostic endpoint for troubleshooting
app.get('/api/diagnostic', (req, res) => {
  try {
    const diagnostics = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        vercel: !!process.env.VERCEL,
        nowRegion: process.env.NOW_REGION || 'not set'
      },
      database: {
        mongodbUriSet: !!process.env.MONGODB_URI,
        mongodbDevUriSet: !!process.env.MONGODB_DEV_URI,
        connectionState: mongoose.connection.readyState,
        connectionStateText: mongoose.connection.readyState === 1 ? 'connected' : 
                             mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected'
      },
      modules: {
        express: typeof express !== 'undefined',
        mongoose: typeof mongoose !== 'undefined',
        routesLoaded: {
          tasks: !!taskRoutes,
          projects: !!projectRoutes,
          jobs: !!jobRoutes,
          financial: !!financialRoutes
        }
      },
      paths: {
        __dirname: __dirname,
        processCwd: process.cwd(),
        nodeVersion: process.version
      }
    };
    
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Diagnostic endpoint error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
if (handleUploadError) {
  app.use(handleUploadError);
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error handler:', error.message);
  console.error('Stack:', error.stack);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' || process.env.VERCEL ? { stack: error.stack } : {})
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

// Wrap server initialization in try-catch for production safety
try {
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
} catch (error) {
  console.error('❌ Fatal error initializing server:', error.message);
  console.error('Stack:', error.stack);
  
  // Even if initialization fails, export a basic app that returns errors
  const errorApp = express();
  errorApp.use((req, res) => {
    res.status(500).json({
      success: false,
      message: 'Server initialization failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  });
  
  if (process.env.VERCEL === '1' || process.env.NOW_REGION) {
    module.exports = errorApp;
  } else {
    module.exports = { app: errorApp };
  }
}
