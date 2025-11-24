const { google } = require('googleapis');
const oauth2Client = require('./oauth2Client');

/**
 * Get OAuth2 authorization URL
 * @param {String} state - State parameter (userId for email connection, 'login' for initial login)
 * @param {String} redirectUri - OAuth redirect URI
 * @returns {String} Authorization URL
 */
function getAuthUrl(state, redirectUri) {
  const client = oauth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const url = client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
    state: state || 'login', // Pass state for security
    redirect_uri: redirectUri
  });

  return url;
}

/**
 * Exchange authorization code for tokens
 * @param {String} code - Authorization code from Google
 * @param {String} redirectUri - OAuth redirect URI
 * @returns {Promise<Object>} Tokens and user info
 */
async function getTokensFromCode(code, redirectUri) {
  const client = oauth2Client();
  client.redirectUri = redirectUri;

  try {
    const { tokens } = await client.getToken(code);
    
    // Get user info
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      email: userInfo.email,
      scope: tokens.scope
    };
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

/**
 * Get valid access token (refresh if needed)
 * @param {Object} user - User document with googleOAuth
 * @returns {Promise<String>} Valid access token
 */
async function getValidAccessToken(user) {
  if (!user.googleOAuth || !user.googleOAuth.refreshToken) {
    throw new Error('Google account not connected');
  }

  const client = oauth2Client();
  
  // Check if token is expired or expires soon (within 5 minutes)
  const expiresSoon = user.googleOAuth.tokenExpiry && 
    new Date(user.googleOAuth.tokenExpiry) < new Date(Date.now() + 5 * 60 * 1000);

  if (!user.googleOAuth.accessToken || expiresSoon) {
    // Refresh the token
    client.setCredentials({
      refresh_token: user.googleOAuth.refreshToken
    });

    try {
      const { credentials } = await client.refreshAccessToken();
      
      // Update user's tokens
      user.googleOAuth.accessToken = credentials.access_token;
      if (credentials.refresh_token) {
        user.googleOAuth.refreshToken = credentials.refresh_token;
      }
      user.googleOAuth.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
      await user.save();

      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh access token. Please reconnect your Google account.');
    }
  }

  return user.googleOAuth.accessToken;
}

/**
 * Revoke access token
 * @param {String} refreshToken - Refresh token to revoke
 */
async function revokeToken(refreshToken) {
  const client = oauth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  
  try {
    await client.revokeCredentials();
  } catch (error) {
    console.error('Error revoking token:', error);
    // Don't throw - token might already be revoked
  }
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  getValidAccessToken,
  revokeToken
};

