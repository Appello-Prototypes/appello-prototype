import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance with production-first configuration
const getBaseURL = () => {
  // Check if we're running in production (Vercel deployment)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const url = window.location.origin;
    console.log('🚀 Production API URL:', url);
    return url;
  }
  // Development: Use direct connection to backend (CORS is configured)
  // This is more reliable than relying on Vite proxy
  const devUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  console.log('🛠️ Development API URL:', devUrl);
  return devUrl;
};

const baseURL = getBaseURL();
console.log('📡 Final API Base URL:', baseURL);

export const api = axios.create({
  baseURL: baseURL || undefined, // Use undefined instead of empty string for better axios handling
  timeout: 30000, // Increased timeout for Atlas connections
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure requests work with Vite proxy
  withCredentials: false,
})

// Request interceptor - with logging for debugging
api.interceptors.request.use(
  (config) => {
    // Log request details in development
    if (import.meta.env.DEV) {
      const fullURL = config.baseURL 
        ? `${config.baseURL}${config.url}` 
        : config.url;
      console.log(`🔵 API Request: ${config.method?.toUpperCase()} ${fullURL}`);
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error)
  }
)

// Response interceptor - enhanced error logging
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Enhanced error logging for debugging
    console.error('API Error Details:', {
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
    })
    
    const message = error.response?.data?.message || error.message || 'An error occurred'
    
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.response?.status >= 400) {
      toast.error(message)
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      toast.error('Cannot connect to server. Make sure the backend is running on port 3001.')
    }

    return Promise.reject(error)
  }
)

// Task API functions
export const taskAPI = {
  // Get all tasks with filters
  getTasks: (params = {}) => {
    return api.get('/api/tasks', { params })
  },

  // Get single task
  getTask: (id) => {
    return api.get(`/api/tasks/${id}`)
  },

  // Create task
  createTask: (data) => {
    return api.post('/api/tasks', data)
  },

  // Update task
  updateTask: (id, data) => {
    return api.put(`/api/tasks/${id}`, data)
  },

  // Update task status
  updateTaskStatus: (id, status, completionPercentage) => {
    return api.put(`/api/tasks/${id}/status`, { status, completionPercentage })
  },

  // Delete task
  deleteTask: (id) => {
    return api.delete(`/api/tasks/${id}`)
  },

  // Get my tasks
  getMyTasks: (params = {}) => {
    return api.get('/api/tasks/my-tasks', { params })
  },

  // Get overdue tasks
  getOverdueTasks: () => {
    return api.get('/api/tasks/overdue')
  },

  // Get dashboard stats - optimized for demo
  getDashboardStats: () => {
    return api.get('/api/fast-stats')
  },
}

// User API functions
export const userAPI = {
  // Get all users
  getUsers: () => {
    return api.get('/api/users')
  },

  // Get users by role
  getUsersByRole: (role) => {
    return api.get(`/api/users/role/${role}`)
  },

  // Get current user
  getCurrentUser: () => {
    return api.get('/api/auth/me')
  },
}

// Auth API functions - removed for demo simplicity

// File upload API functions
export const fileAPI = {
  uploadTaskAttachment: (taskId, files) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    
    return api.post(`/api/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  deleteTaskAttachment: (taskId, attachmentId) => {
    return api.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
  },
}

// Version API functions
export const versionAPI = {
  getVersion: () => {
    return api.get('/api/version')
  },
}

export default api
