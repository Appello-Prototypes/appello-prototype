const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const generateToken = (userId) => {
  // CRITICAL FIX: Ensure expiresIn is ALWAYS a valid value
  // The jsonwebtoken library throws an error if expiresIn is undefined, null, or empty string
  // We MUST guarantee it's always a valid string value
  
  let expiresInValue = '7d'; // Start with safe default - NEVER change this default
  
  // Only override if env var is truly valid
  const envExpiresIn = process.env.JWT_EXPIRES_IN;
  if (envExpiresIn && 
      typeof envExpiresIn === 'string' && 
      envExpiresIn.trim().length > 0 &&
      envExpiresIn.trim() !== 'undefined' &&
      envExpiresIn.trim() !== 'null') {
    expiresInValue = envExpiresIn.trim();
  }
  
  // Final safety check - if somehow expiresInValue is still invalid, use default
  if (!expiresInValue || 
      (typeof expiresInValue === 'string' && expiresInValue.trim().length === 0) ||
      expiresInValue === 'undefined' ||
      expiresInValue === 'null') {
    console.error('[JWT] WARNING: expiresInValue was invalid, forcing to default:', expiresInValue);
    expiresInValue = '7d';
  }
  
  // Log for debugging
  console.log('[JWT] Token creation (generateToken):', {
    envVar: process.env.JWT_EXPIRES_IN,
    envVarType: typeof process.env.JWT_EXPIRES_IN,
    finalValue: expiresInValue,
    finalValueType: typeof expiresInValue,
    finalValueLength: expiresInValue.length
  });
  
  // Create JWT options object - ensure expiresIn is explicitly set
  const jwtOptions = {
    expiresIn: expiresInValue
  };
  
  // Final validation - throw error if expiresIn is still invalid (should never happen)
  if (!jwtOptions.expiresIn || 
      (typeof jwtOptions.expiresIn === 'string' && jwtOptions.expiresIn.trim().length === 0)) {
    const errorMsg = `JWT expiresIn is invalid: ${JSON.stringify(jwtOptions.expiresIn)}. This should never happen.`;
    console.error('[JWT] CRITICAL ERROR:', errorMsg);
    throw new Error(errorMsg);
  }
  
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, jwtOptions);
};

const authController = {
  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact your administrator.'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      await user.updateLastLogin();

      // Generate token
      const token = generateToken(user._id);

      // Remove password from response
      const userResponse = user.toJSON();

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  },

  // POST /api/auth/register
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { name, email, password, role = 'field_worker' } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create new user
      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
        role
      });

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      // Remove password from response
      const userResponse = user.toJSON();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: userResponse
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  },

  // GET /api/auth/me
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get user information',
        error: error.message
      });
    }
  },

  // POST /api/auth/logout
  logout: async (req, res) => {
    try {
      // In a more sophisticated system, you might blacklist the token
      // For now, we just send a success response
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  },

  // POST /api/auth/refresh
  refreshToken: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      // Generate new token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        token,
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        error: error.message
      });
    }
  },

  // PUT /api/auth/change-password
  changePassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Password change failed',
        error: error.message
      });
    }
  },

  // PUT /api/auth/profile
  updateProfile: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { name, phone, timezone, language, notifications } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update allowed fields
      if (name) user.name = name;
      if (phone) user.phone = phone;
      if (timezone) user.timezone = timezone;
      if (language) user.language = language;
      if (notifications) user.notifications = { ...user.notifications, ...notifications };

      await user.save();

      const userResponse = user.toJSON();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: userResponse
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Profile update failed',
        error: error.message
      });
    }
  }
};

module.exports = authController;
