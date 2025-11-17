const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload directory for serverless environment
const uploadDir = process.env.UPLOAD_PATH || '/tmp/uploads';

// Ensure upload directory exists (use /tmp in serverless environment)
const ensureUploadDir = () => {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn('Could not create upload directory:', error.message);
    // In serverless environments, we'll handle uploads differently
    return false;
  }
};

// Don't initialize on module load - do it when needed

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure upload directory exists first
    if (!ensureUploadDir()) {
      return cb(new Error('Upload directory not available in serverless environment'), null);
    }
    
    // Create subdirectory based on upload type
    const subDir = path.join(uploadDir, 'tasks');
    try {
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
      cb(null, subDir);
    } catch (error) {
      console.warn('Could not create subdirectory:', error.message);
      // Fallback to main upload directory
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `task-${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files per upload.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: error.message
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  upload,
  handleUploadError,
  single: upload.single('file'),
  multiple: upload.array('files', 5)
};
