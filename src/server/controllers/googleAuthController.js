const User = require('../models/User');
const { getAuthUrl, getTokensFromCode, revokeToken } = require('../utils/googleOAuth');

const googleAuthController = {
  // GET /api/auth/google/connect
  // Initiates OAuth flow - returns authorization URL
  // Can be used for login (no auth required) or connecting email (auth required)
  initiateConnection: async (req, res) => {
    try {
      // Check if Google OAuth is configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({
          success: false,
          message: 'Google OAuth is not configured',
          error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required',
          requiresConfiguration: true
        });
      }

      // For login, use backend callback URL (Google redirects here)
      // Backend then redirects to frontend with token
      const backendCallbackUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      
      // State can be userId (for email connection) or 'login' (for initial login)
      const state = req.user ? req.user.id : (req.query.state || 'login');
      const authUrl = getAuthUrl(state, backendCallbackUri);

      res.json({
        success: true,
        authUrl,
        redirectUri: backendCallbackUri
      });
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      // Always show error message in production for debugging
      res.status(500).json({
        success: false,
        message: 'Failed to initiate Google connection',
        error: error.message || 'Internal server error',
        requiresConfiguration: error.message?.includes('not configured') || false
      });
    }
  },

  // GET /api/auth/google/callback
  // Handles OAuth callback - exchanges code for tokens
  // This is used for BOTH login and email connection
  handleCallback: async (req, res) => {
    try {
      // Check if Google OAuth is configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent('Google OAuth is not configured')}`);
      }

      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(error)}`);
      }

      if (!code) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent('Missing authorization code')}`);
      }

      // Use the redirect URI that was used in the OAuth request
      // This should match what was sent to Google
      const backendCallbackUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      const tokens = await getTokensFromCode(code, backendCallbackUri);

      // Get user info from Google
      const { google } = require('googleapis');
      const oauth2Client = require('../utils/oauth2Client')();
      oauth2Client.setCredentials({ access_token: tokens.accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: googleUserInfo } = await oauth2.userinfo.get();

      // Find or create user by Google email
      let user = await User.findOne({ email: googleUserInfo.email.toLowerCase() });

      if (!user) {
        // Create new user from Google account
        // Password is optional when Google OAuth is present
        user = new User({
          name: googleUserInfo.name || googleUserInfo.email.split('@')[0],
          email: googleUserInfo.email.toLowerCase(),
          password: 'GOOGLE_SSO_USER', // Placeholder, will be skipped by pre-save hook
          role: 'field_worker', // Default role, can be updated by admin
          isActive: true,
          googleOAuth: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiry: tokens.tokenExpiry,
            email: googleUserInfo.email,
            connectedAt: new Date(),
            scope: tokens.scope
          }
        });
        // Clear password before save (pre-save hook will skip hashing)
        user.password = undefined;
        await user.save();
      } else {
        // Update existing user with Google OAuth tokens
        user.googleOAuth = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.tokenExpiry,
          email: googleUserInfo.email,
          connectedAt: new Date(),
          scope: tokens.scope
        };
        await user.save();
      }

      // Generate JWT token for app authentication
      const jwt = require('jsonwebtoken');
      const appToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Redirect to frontend with token
      // Use the redirectUri from the request if it's a frontend URL, otherwise use default
      const frontendRedirectUri = req.query.redirect_uri || `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback`;
      
      // Extract the frontend base URL
      const frontendBase = frontendRedirectUri.includes('/auth') 
        ? frontendRedirectUri.split('/auth')[0]
        : (process.env.CLIENT_URL || 'http://localhost:3000');
      
      const redirectUrl = state && state.startsWith('settings')
        ? `${frontendBase}/settings?googleConnected=true&token=${appToken}`
        : `${frontendBase}/auth/callback?token=${appToken}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error handling Google OAuth callback:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(error.message || 'Failed to authenticate with Google')}`);
    }
  },

  // GET /api/auth/google/status
  // Check if user has Google account connected
  getConnectionStatus: async (req, res) => {
    try {
      // Check if Google OAuth is configured
      const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      
      if (!isConfigured) {
        return res.json({
          success: true,
          isConfigured: false,
          isConnected: false,
          message: 'Google OAuth is not configured'
        });
      }

      const user = await User.findById(req.user.id).select('googleOAuth email name');
      
      const isConnected = !!(user.googleOAuth && user.googleOAuth.refreshToken);
      const email = user.googleOAuth?.email || null;
      const connectedAt = user.googleOAuth?.connectedAt || null;

      res.json({
        success: true,
        isConfigured: true,
        isConnected,
        email,
        connectedAt
      });
    } catch (error) {
      console.error('Error getting Google connection status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get connection status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // POST /api/auth/google/disconnect
  // Disconnect Google account
  disconnect: async (req, res) => {
    try {
      // Check if Google OAuth is configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({
          success: false,
          message: 'Google OAuth is not configured',
          error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required'
        });
      }

      const user = await User.findById(req.user.id);

      if (user.googleOAuth && user.googleOAuth.refreshToken) {
        // Revoke token with Google
        try {
          await revokeToken(user.googleOAuth.refreshToken);
        } catch (error) {
          console.error('Error revoking token:', error);
          // Continue with disconnection even if revocation fails
        }

        // Clear OAuth data
        user.googleOAuth = undefined;
        await user.save();
      }

      res.json({
        success: true,
        message: 'Google account disconnected successfully'
      });
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect Google account',
        error: error.message || 'Internal server error'
      });
    }
  }
};

module.exports = googleAuthController;

