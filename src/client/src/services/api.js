import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const getBaseURL = () => {
  // In production, use the same domain as the frontend
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, use the provided VITE_API_URL or default to localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - simplified for demo
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - simplified for demo
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.response?.status >= 400) {
      toast.error(message)
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

export default api
