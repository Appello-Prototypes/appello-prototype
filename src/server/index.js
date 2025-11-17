require('dotenv').config();
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
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sov', sovRoutes);
app.use('/api/financial', financialRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Appello Task Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
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

// Performance test endpoint
app.get('/api/performance-test', async (req, res) => {
  try {
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
        performance: queryTime < 100 ? 'Excellent' : queryTime < 500 ? 'Good' : 'Needs optimization'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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

// Check if we're in Vercel serverless environment
const isVercelServerless = process.env.VERCEL === '1' || process.env.NOW_REGION;

if (isVercelServerless) {
  // Export for Vercel serverless functions
  module.exports = app;
} else {
  // Local development server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 Appello Task Management API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      mongoose.connection.close();
    });
  });

  module.exports = { app, io };
}
