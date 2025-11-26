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

// Request interceptor - add auth token and logging
api.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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

// Response interceptor - handle auth errors and enhanced error logging
api.interceptors.response.use(
  (response) => {
    // Store token if provided in response (login/register)
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response
  },
  (error) => {
    // Handle 401 Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      // Don't redirect if already on login page or if it's a public route
      const isPublicRoute = error.config?.url?.includes('/auth/login') || 
                           error.config?.url?.includes('/auth/register') ||
                           error.config?.url?.includes('/auth/google/callback');
      if (!isPublicRoute && window.location.pathname !== '/login') {
        // Redirect to login page
        window.location.href = '/login';
      }
    }

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
    const errorData = error.response?.data
    
    // Handle specific error types
    if (error.response?.status === 503) {
      // Database connection unavailable
      if (errorData?.message?.includes('Database connection') || errorData?.message?.includes('connection unavailable')) {
        toast.error('Database connection unavailable. Please check your database configuration.')
      } else {
        toast.error('Service temporarily unavailable. Please try again later.')
      }
    } else if (error.response?.status >= 500) {
      toast.error(message || 'Server error. Please try again later.')
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

  // Get tasks with timesheet data
  getTasksWithTimesheetData: (params = {}) => {
    return api.get('/api/tasks/with-timesheet-data', { params })
  },

  // Get task timesheet summary
  getTaskTimesheetSummary: (id) => {
    return api.get(`/api/tasks/${id}/timesheet-summary`)
  },
}

// Work Order API functions
export const workOrderAPI = {
  // Get all work orders with filters
  getWorkOrders: (params = {}) => {
    return api.get('/api/work-orders', { params })
  },

  // Get single work order
  getWorkOrder: (id) => {
    return api.get(`/api/work-orders/${id}`)
  },

  // Create work order
  createWorkOrder: (data) => {
    return api.post('/api/work-orders', data)
  },

  // Update work order
  updateWorkOrder: (id, data) => {
    return api.put(`/api/work-orders/${id}`, data)
  },

  // Delete work order
  deleteWorkOrder: (id) => {
    return api.delete(`/api/work-orders/${id}`)
  },

  // Get tasks for a work order
  getWorkOrderTasks: (id) => {
    return api.get(`/api/work-orders/${id}/tasks`)
  },

  // Add task to work order
  addTaskToWorkOrder: (id, taskId) => {
    return api.post(`/api/work-orders/${id}/add-task`, { taskId })
  },

  // Remove task from work order
  removeTaskFromWorkOrder: (id, taskId) => {
    return api.post(`/api/work-orders/${id}/remove-task`, { taskId })
  },

  // Update work order status
  updateStatus: (id, status, completionPercentage) => {
    return api.post(`/api/work-orders/${id}/update-status`, { status, completionPercentage })
  },

  // Add field note
  addFieldNote: (id, note) => {
    return api.post(`/api/work-orders/${id}/add-field-note`, { note })
  },
}

// Job API functions (updated to include cost codes)
export const jobAPI = {
  // Get all jobs
  getJobs: (params = {}) => {
    return api.get('/api/jobs', { params })
  },

  // Get single job
  getJob: (id) => {
    return api.get(`/api/jobs/${id}`)
  },

  // Get job cost codes
  getJobCostCodes: (id) => {
    return api.get(`/api/jobs/${id}/cost-codes`)
  },

  // Get approved products for job
  getApprovedProducts: (id) => {
    return api.get(`/api/jobs/${id}/approved-products`)
  },

  // Add approved product to job
  addApprovedProduct: (id, productId, variantId) => {
    return api.post(`/api/jobs/${id}/approved-products`, { productId, variantId })
  },

  // Remove approved product from job
  removeApprovedProduct: (id, productId, variantId) => {
    const params = variantId ? { variantId } : {}
    return api.delete(`/api/jobs/${id}/approved-products/${productId}`, { params })
  },

  // Update spec settings
  updateSpecSettings: (id, settings) => {
    return api.patch(`/api/jobs/${id}/spec-settings`, settings)
  },
}

// AI API functions
export const aiAPI = {
  // Chat with AI
  chat: (message, context = {}) => {
    return api.post('/api/ai/chat', { message, context })
  },
  
  // Get job analytics
  getJobAnalytics: (jobId) => {
    return api.get(`/api/ai/jobs/${jobId}/analytics`)
  },
  
  // Get job forecast
  getJobForecast: (jobId, type = 'completion') => {
    return api.get(`/api/ai/jobs/${jobId}/forecast`, { params: { type } })
  },
  
  // Get available models
  getAvailableModels: () => {
    return api.get('/api/ai/models')
  }
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

// Company/Supplier API functions
export const companyAPI = {
  // Get all companies
  getCompanies: (params = {}) => {
    return api.get('/api/companies', { params })
  },

  // Get single company
  getCompany: (id) => {
    return api.get(`/api/companies/${id}`)
  },

  // Create company
  createCompany: (data) => {
    return api.post('/api/companies', data)
  },

  // Update company
  updateCompany: (id, data) => {
    return api.patch(`/api/companies/${id}`, data)
  },

  // Delete company
  deleteCompany: (id) => {
    return api.delete(`/api/companies/${id}`)
  },

  // Search companies (autocomplete)
  searchCompanies: (query, companyType) => {
    return api.get('/api/companies/search/autocomplete', {
      params: { q: query, companyType }
    })
  },

  // Get products for a supplier
  getCompanyProducts: (companyId) => {
    return api.get(`/api/companies/${companyId}/products`)
  },

  // Get all distributors
  getDistributors: () => {
    return api.get('/api/companies/distributors')
  },

  // Get all manufacturers
  getManufacturers: () => {
    return api.get('/api/companies/manufacturers')
  },

  // Get manufacturers for a distributor
  getDistributorManufacturers: (distributorId) => {
    return api.get(`/api/companies/${distributorId}/manufacturers`)
  },

  // Get distributors for a manufacturer
  getManufacturerDistributors: (manufacturerId) => {
    return api.get(`/api/companies/${manufacturerId}/distributors`)
  },

  // Get suppliers for a distributor
  getDistributorSuppliers: (distributorId) => {
    return api.get(`/api/companies/${distributorId}/distributor-suppliers`)
  },

  // Get distributors for a supplier
  getSupplierDistributors: (supplierId) => {
    return api.get(`/api/companies/${supplierId}/supplier-distributors`)
  },

  // Add supplier to distributor
  addDistributorSupplier: (distributorId, supplierId, notes) => {
    return api.post(`/api/companies/${distributorId}/distributor-suppliers`, {
      supplierId,
      notes
    })
  },

  // Remove supplier from distributor
  removeDistributorSupplier: (distributorId, supplierId) => {
    return api.delete(`/api/companies/${distributorId}/distributor-suppliers/${supplierId}`)
  },
}

// Product API functions
export const productAPI = {
  // Get all products
  getProducts: (params = {}) => {
    return api.get('/api/products', { params })
  },

  // Get products by distributor
  getProductsByDistributor: (distributorId) => {
    return api.get(`/api/products/by-distributor/${distributorId}`)
  },

  // Get products by manufacturer
  getProductsByManufacturer: (manufacturerId) => {
    return api.get(`/api/products/by-manufacturer/${manufacturerId}`)
  },

  // Get single product
  getProduct: (id) => {
    return api.get(`/api/products/${id}`)
  },

  // Create product
  createProduct: (data) => {
    return api.post('/api/products', data)
  },

  // Update product
  updateProduct: (id, data) => {
    return api.patch(`/api/products/${id}`, data)
  },

  // Search products (autocomplete) - enhanced with filters
  searchProducts: (query, supplierId, additionalParams = {}) => {
    return api.get('/api/products/search/autocomplete', {
      params: { 
        q: query || '', // Send empty string instead of undefined
        supplierId: supplierId || undefined,
        ...additionalParams
      }
    })
  },

  // Import CSV
  importCSV: (csvData, columnMapping) => {
    return api.post('/api/products/import-csv', { csvData, columnMapping })
  },

  // Get suppliers for a product
  getProductSuppliers: (productId) => {
    return api.get(`/api/products/${productId}/suppliers`)
  },

  // Variant management
  createVariant: (productId, data) => {
    return api.post(`/api/products/${productId}/variants`, data)
  },
  updateVariant: (productId, variantId, data) => {
    return api.patch(`/api/products/${productId}/variants/${variantId}`, data)
  },
  deleteVariant: (productId, variantId) => {
    return api.delete(`/api/products/${productId}/variants/${variantId}`)
  },
}

// Product Type API functions
export const productTypeAPI = {
  // Get all product types
  getProductTypes: (params = {}) => {
    return api.get('/api/product-types', { params })
  },

  // Get single product type
  getProductType: (id) => {
    return api.get(`/api/product-types/${id}`)
  },

  // Create product type
  createProductType: (data) => {
    return api.post('/api/product-types', data)
  },

  // Update product type
  updateProductType: (id, data) => {
    return api.patch(`/api/product-types/${id}`, data)
  },

  // Delete product type
  deleteProductType: (id) => {
    return api.delete(`/api/product-types/${id}`)
  },

  // Get products by type
  getProductsByType: (typeId) => {
    return api.get(`/api/product-types/${typeId}/products`)
  },
}

// Material Request API functions
export const materialRequestAPI = {
  // Get all material requests
  getMaterialRequests: (params = {}) => {
    return api.get('/api/material-requests', { params })
  },

  // Get single material request
  getMaterialRequest: (id) => {
    return api.get(`/api/material-requests/${id}`)
  },

  // Create material request
  createMaterialRequest: (data) => {
    return api.post('/api/material-requests', data)
  },

  // Update material request
  updateMaterialRequest: (id, data) => {
    return api.patch(`/api/material-requests/${id}`, data)
  },

  // Approve material request
  approveRequest: (id, notes) => {
    return api.post(`/api/material-requests/${id}/approve`, { approvalNotes: notes })
  },

  // Reject material request
  rejectRequest: (id, reason) => {
    return api.post(`/api/material-requests/${id}/reject`, { rejectionReason: reason })
  },

  // Fulfill material request
  fulfillRequest: (id, lineItemFulfillments) => {
    return api.post(`/api/material-requests/${id}/fulfill`, { lineItemFulfillments })
  },

  // Convert to PO (legacy - single PO)
  convertToPO: (id, supplierId, defaultCostCode) => {
    return api.post(`/api/material-requests/${id}/convert-to-po`, { supplierId, defaultCostCode })
  },

  // Convert to multiple POs (one per supplier)
  convertToPOs: (id, conversions) => {
    return api.post(`/api/material-requests/${id}/convert-to-pos`, { conversions })
  },

  // Batch generate POs from multiple material requests
  batchGeneratePOs: (materialRequestIds) => {
    return api.post('/api/material-requests/batch-generate-pos', { materialRequestIds })
  },

  // Get shop printout PDF
  getShopPrintout: (id) => {
    return api.get(`/api/material-requests/${id}/shop-printout`, { responseType: 'blob' })
  },

  // AI text-to-material request
  createFromText: (text, jobId) => {
    return api.post('/api/material-requests/ai-create', { text, jobId })
  },
  // Get all material requests
  getMaterialRequests: (params = {}) => {
    return api.get('/api/material-requests', { params })
  },

  // Get single material request
  getMaterialRequest: (id) => {
    return api.get(`/api/material-requests/${id}`)
  },

  // Create material request
  createMaterialRequest: (data) => {
    return api.post('/api/material-requests', data)
  },

  // Update material request
  updateMaterialRequest: (id, data) => {
    return api.patch(`/api/material-requests/${id}`, data)
  },

  // Approve material request
  approveRequest: (id, approvalNotes) => {
    return api.post(`/api/material-requests/${id}/approve`, { approvalNotes })
  },

  // Reject material request
  rejectRequest: (id, rejectionReason) => {
    return api.post(`/api/material-requests/${id}/reject`, { rejectionReason })
  },

  // Convert material request to PO
  convertToPO: (id, supplierId, defaultCostCode) => {
    return api.post(`/api/material-requests/${id}/convert-to-po`, {
      supplierId,
      defaultCostCode
    })
  },

  // Fulfill material request
  fulfillRequest: (id, lineItemFulfillments) => {
    return api.post(`/api/material-requests/${id}/fulfill`, { lineItemFulfillments })
  },

  // Batch generate POs from multiple material requests
  batchGeneratePOs: (materialRequestIds) => {
    return api.post('/api/material-requests/batch-generate-pos', { materialRequestIds })
  },

  // Get shop printout PDF
  getShopPrintout: (id) => {
    return api.get(`/api/material-requests/${id}/shop-printout`, { responseType: 'blob' })
  },

  // AI text-to-material request
  createFromText: (text, jobId) => {
    return api.post('/api/material-requests/ai-create', { text, jobId })
  },
}

// Purchase Order API functions
export const purchaseOrderAPI = {
  // Get all purchase orders
  getPurchaseOrders: (params = {}) => {
    return api.get('/api/purchase-orders', { params })
  },

  // Get single purchase order
  getPurchaseOrder: (id) => {
    return api.get(`/api/purchase-orders/${id}`)
  },

  // Create purchase order
  createPurchaseOrder: (data) => {
    return api.post('/api/purchase-orders', data)
  },

  // Update purchase order
  updatePurchaseOrder: (id, data) => {
    return api.patch(`/api/purchase-orders/${id}`, data)
  },

  // Submit for approval
  submitForApproval: (id) => {
    return api.post(`/api/purchase-orders/${id}/submit-for-approval`)
  },

  // Approve PO
  approvePO: (id) => {
    return api.post(`/api/purchase-orders/${id}/approve`)
  },

  // Reject PO
  rejectPO: (id, rejectionReason) => {
    return api.post(`/api/purchase-orders/${id}/reject`, { rejectionReason })
  },

  // Issue PO
  issuePO: (id) => {
    return api.post(`/api/purchase-orders/${id}/issue`)
  },

  // Cancel PO
  cancelPO: (id) => {
    return api.post(`/api/purchase-orders/${id}/cancel`)
  },

  // Download PO PDF
  downloadPOPDF: (id) => {
    return api.get(`/api/purchase-orders/${id}/pdf`, {
      responseType: 'blob'
    })
  },

  // Send PO via Email
  sendPOEmail: (id, toEmail) => {
    return api.post(`/api/purchase-orders/${id}/send-email`, {
      toEmail
    })
  },
}

// PO Receipt API functions
export const poReceiptAPI = {
  // Get all receipts
  getReceipts: (params = {}) => {
    return api.get('/api/po-receipts', { params })
  },

  // Get single receipt
  getReceipt: (id) => {
    return api.get(`/api/po-receipts/${id}`)
  },

  // Get open POs for job
  getOpenPOsForJob: (jobId) => {
    return api.get(`/api/po-receipts/job/${jobId}/open-pos`)
  },

  // Create receipt
  createReceipt: (data) => {
    return api.post('/api/po-receipts', data)
  },

  // Sync offline receipts
  syncOfflineReceipts: (receipts) => {
    return api.post('/api/po-receipts/sync-offline', { receipts })
  },

  // Approve over-receipt
  approveOverReceipt: (id) => {
    return api.post(`/api/po-receipts/${id}/approve-over-receipt`)
  },

  // Update receipt
  updateReceipt: (id, data) => {
    return api.put(`/api/po-receipts/${id}`, data)
  },
}

// Google OAuth API functions
export const googleAuthAPI = {
  // Get OAuth connection URL
  // redirectUri is optional - backend handles it automatically
  getAuthUrl: (redirectUri) => {
    const params = redirectUri ? { redirectUri } : {};
    return api.get('/api/auth/google/connect', { params })
  },

  // Get connection status
  getConnectionStatus: () => {
    return api.get('/api/auth/google/status')
  },

  // Disconnect Google account
  disconnect: () => {
    return api.post('/api/auth/google/disconnect')
  },
}

// Upload API functions
export const uploadAPI = {
  // Upload single photo
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/api/uploads/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Upload multiple photos
  uploadPhotos: (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    return api.post('/api/uploads/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
}

// Specification API functions
export const specificationAPI = {
  // Get all specifications for a job
  getSpecifications: (jobId, params = {}) => {
    return api.get(`/api/jobs/${jobId}/specifications`, { params })
  },

  // Get single specification
  getSpecification: (id) => {
    return api.get(`/api/specifications/${id}`)
  },

  // Create specification
  createSpecification: (jobId, data) => {
    return api.post(`/api/jobs/${jobId}/specifications`, data)
  },

  // Update specification
  updateSpecification: (id, data) => {
    return api.patch(`/api/specifications/${id}`, data)
  },

  // Delete specification
  deleteSpecification: (id) => {
    return api.delete(`/api/specifications/${id}`)
  },

  // Match specifications for context
  matchSpecifications: (context) => {
    return api.post('/api/specifications/match', context)
  },

  // Apply template to job
  applyTemplate: (jobId, templateId, systems, areas) => {
    return api.post(`/api/jobs/${jobId}/specifications/apply-template`, {
      templateId,
      systems,
      areas
    })
  }
}

// Specification Template API functions
export const specificationTemplateAPI = {
  // Get all templates
  getTemplates: (params = {}) => {
    return api.get('/api/specification-templates', { params })
  },

  // Get single template
  getTemplate: (id) => {
    return api.get(`/api/specification-templates/${id}`)
  },

  // Create template
  createTemplate: (data) => {
    return api.post('/api/specification-templates', data)
  },

  // Update template
  updateTemplate: (id, data) => {
    return api.patch(`/api/specification-templates/${id}`, data)
  },

  // Delete template
  deleteTemplate: (id) => {
    return api.delete(`/api/specification-templates/${id}`)
  }
}

// Property Definition API functions
export const propertyDefinitionAPI = {
  // Get all property definitions
  getPropertyDefinitions: (params = {}) => {
    return api.get('/api/property-definitions', { params })
  },

  // Get property definitions grouped by category
  getPropertyDefinitionsByCategory: () => {
    return api.get('/api/property-definitions/by-category')
  },

  // Get single property definition
  getPropertyDefinition: (id) => {
    return api.get(`/api/property-definitions/${id}`)
  },

  // Create property definition
  createPropertyDefinition: (data) => {
    return api.post('/api/property-definitions', data)
  },

  // Update property definition
  updatePropertyDefinition: (id, data) => {
    return api.patch(`/api/property-definitions/${id}`, data)
  },

  // Delete property definition
  deletePropertyDefinition: (id) => {
    return api.delete(`/api/property-definitions/${id}`)
  },

  // Get property definition categories
  getPropertyDefinitionCategories: () => {
    return api.get('/api/property-definitions/categories')
  }
}

// Unit of Measure API functions
export const unitOfMeasureAPI = {
  // Get all units of measure
  getUnitsOfMeasure: (params = {}) => {
    return api.get('/api/units-of-measure', { params })
  },

  // Get single unit of measure
  getUnitOfMeasure: (id) => {
    return api.get(`/api/units-of-measure/${id}`)
  },

  // Create unit of measure
  createUnitOfMeasure: (data) => {
    return api.post('/api/units-of-measure', data)
  },

  // Update unit of measure
  updateUnitOfMeasure: (id, data) => {
    return api.patch(`/api/units-of-measure/${id}`, data)
  },

  // Delete unit of measure
  deleteUnitOfMeasure: (id) => {
    return api.delete(`/api/units-of-measure/${id}`)
  },

  // Get unit categories
  getUnitCategories: () => {
    return api.get('/api/units-of-measure/categories')
  }
}

export const inventoryAPI = {
  // Get all inventory
  getAllInventory: (params = {}) => {
    return api.get('/api/inventory', { params })
  },

  // Get inventory by product/variant
  getInventoryByProduct: (productId, variantId = null) => {
    const url = variantId 
      ? `/api/inventory/product/${productId}/${variantId}`
      : `/api/inventory/product/${productId}`;
    return api.get(url)
  },

  // Get single inventory record
  getInventoryById: (id) => {
    return api.get(`/api/inventory/${id}`)
  },

  // Get transactions for an inventory item
  getInventoryTransactions: (id) => {
    return api.get(`/api/inventory/${id}/transactions`)
  },

  // Create or update inventory
  createOrUpdateInventory: (data) => {
    return api.post('/api/inventory', data)
  },

  // Add transaction
  addTransaction: (inventoryId, transactionData) => {
    return api.post(`/api/inventory/${inventoryId}/transaction`, transactionData)
  },

  // Add serialized units
  addSerializedUnits: (inventoryId, data) => {
    return api.post(`/api/inventory/${inventoryId}/serialized-units`, data)
  },

  // Update serialized unit
  updateSerializedUnit: (inventoryId, serialNumber, data) => {
    return api.put(`/api/inventory/${inventoryId}/serialized-units/${serialNumber}`, data)
  },
}

// Location API functions
export const locationAPI = {
  // Get all locations
  getLocations: (params = {}) => {
    return api.get('/api/locations', { params })
  },

  // Get single location
  getLocation: (id) => {
    return api.get(`/api/locations/${id}`)
  },

  // Create location
  createLocation: (data) => {
    return api.post('/api/locations', data)
  },

  // Update location
  updateLocation: (id, data) => {
    return api.put(`/api/locations/${id}`, data)
  },

  // Delete location
  deleteLocation: (id) => {
    return api.delete(`/api/locations/${id}`)
  },

  // Get inventory at a location
  getInventoryByLocation: (locationId) => {
    return api.get(`/api/locations/${locationId}/inventory`)
  },
}

export default api
