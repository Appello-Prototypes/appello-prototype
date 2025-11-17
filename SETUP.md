# Appello Task Management - Setup Guide

## 🚀 Quick Start

This task management module is designed to integrate seamlessly with your existing Appello platform. Follow these steps to get it running:

## Prerequisites

- Node.js 18+ 
- MongoDB 6.0+
- npm or yarn
- Git

## Installation

### 1. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd src/client
npm install
cd ../..
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/appello-tasks

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@appello.com
SMTP_PASS=your-email-password

# Integration with Main Appello Platform
APPELLO_API_BASE_URL=https://api.appello.com
APPELLO_API_KEY=your-appello-api-key

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# WebSocket Configuration
SOCKET_IO_ORIGINS=http://localhost:3000,https://app.appello.com
```

### 3. Database Setup

Make sure MongoDB is running, then start the application to create initial collections:

```bash
# Start MongoDB (if not running as service)
mongod

# The application will create collections automatically
```

### 4. Create Initial Admin User

Create a seed script or manually insert an admin user:

```javascript
// You can run this in MongoDB shell or create a seed script
db.users.insertOne({
  name: "Admin User",
  email: "admin@appello.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewzSUVVSUVVSUVVSU", // password123
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## Running the Application

### Development Mode

```bash
# Run both server and client in development mode
npm run dev

# Or run them separately:
npm run dev:server  # Starts server on http://localhost:3001
npm run dev:client  # Starts client on http://localhost:3000
```

### Production Mode

```bash
# Build the client
npm run build

# Start the server
npm start
```

## 🏗️ Architecture Overview

### Backend (Node.js + Express)
- **Models**: MongoDB schemas for Tasks, Users
- **Controllers**: Business logic for task operations
- **Routes**: RESTful API endpoints
- **Middleware**: Authentication, file upload, validation
- **Services**: Real-time updates via Socket.io

### Frontend (React + Vite)
- **Pages**: Dashboard, Task List, Task Detail, Create Task
- **Components**: Reusable UI components
- **Hooks**: Custom hooks for API calls and state management
- **Services**: API client with Axios

### Key Features Implemented

✅ **Core Task Management**
- CRUD operations for tasks
- Task status tracking (Not Started, In Progress, Completed, On Hold, Cancelled)
- Priority levels (Low, Medium, High, Critical)
- Due date management

✅ **User System**
- Role-based access (Admin, Project Manager, Field Supervisor, Field Worker, Office Staff, Customer)
- JWT authentication
- User profiles and preferences

✅ **Advanced Features**
- Real-time updates via WebSocket
- File attachments
- Task filtering and search
- Dashboard with analytics
- Mobile-responsive design

✅ **ICI Contractor Specific**
- Field crew assignment
- Job site integration
- Equipment linking
- Location tracking
- Project association

## 🔌 Integration with Existing Appello Platform

### API Integration Points

1. **User Synchronization**
   ```javascript
   // Link existing Appello users
   user.appelloUserId = existingAppelloUser.id
   ```

2. **Project Integration**
   ```javascript
   // Reference existing projects
   task.projectId = appelloProject.id
   ```

3. **Job Site Integration**
   ```javascript
   // Link to job sites
   task.jobSiteId = appelloJobSite.id
   ```

### Authentication Integration

The system supports integration with your existing Appello authentication:

```javascript
// Configure in .env
APPELLO_API_BASE_URL=https://api.appello.com
APPELLO_API_KEY=your-api-key

// The auth middleware can validate tokens from main platform
```

## 📱 Mobile Considerations

The UI is fully responsive and works well on mobile devices. For native mobile apps, the API provides:

- RESTful endpoints for all operations
- WebSocket support for real-time updates
- File upload capabilities
- Offline-friendly data structure

## 🔧 Customization

### Adding Custom Task Categories

Update the Task model in `src/server/models/Task.js`:

```javascript
category: {
  type: String,
  enum: [
    'installation', 
    'maintenance', 
    'inspection', 
    'repair', 
    'administrative', 
    'safety', 
    'quality_control',
    'material_handling',
    'documentation',
    'your_custom_category'  // Add here
  ]
}
```

### Custom Fields

Add custom fields to the metadata object:

```javascript
// In task creation
task.metadata.set('customField', 'value')
```

### Integrating with Other Systems

The API is designed to be integration-friendly:

```javascript
// Webhook example
app.post('/api/webhooks/task-updated', (req, res) => {
  // Handle external system updates
  const { taskId, externalData } = req.body
  // Update task with external data
})
```

## 🚨 Next Steps

1. **Complete Authentication System** - Add registration, password reset
2. **Enhanced Task Forms** - Rich task creation/editing
3. **Mobile App** - React Native or PWA
4. **Advanced Reporting** - Charts, exports, analytics
5. **Notifications** - Email, SMS, push notifications
6. **Integration Testing** - With existing Appello platform

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **CORS Issues**
   - Update SOCKET_IO_ORIGINS in `.env`
   - Check API base URL configuration

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration settings

### Development Tips

- Use MongoDB Compass for database visualization
- Enable debug logging: `DEBUG=* npm run dev:server`
- Use React DevTools for frontend debugging

## 📞 Support

For integration with your existing Appello platform or custom development needs, the codebase is well-documented and modular for easy extension.

The task management system is designed to scale with your business and integrate seamlessly with your existing workflows.
