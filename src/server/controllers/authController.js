const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const generateToken = (userId) => {
  // Validate and sanitize JWT_EXPIRES_IN to ensure it's a valid value
  // Handle all edge cases: undefined, null, empty string, whitespace-only, string 'undefined'
  let jwtExpiresIn = process.env.JWT_EXPIRES_IN;
  
  // Always default to '7d' - only use env var if it's a valid non-empty string
  let validExpiresIn = '7d'; // Default fallback
  
  if (jwtExpiresIn && typeof jwtExpiresIn === 'string') {
    jwtExpiresIn = jwtExpiresIn.trim();
    // Only use if it's not empty and not the string 'undefined'
    if (jwtExpiresIn.length > 0 && jwtExpiresIn !== 'undefined' && jwtExpiresIn !== 'null') {
      validExpiresIn = jwtExpiresIn;
    }
  }
  
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: validExpiresIn,
  });
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
