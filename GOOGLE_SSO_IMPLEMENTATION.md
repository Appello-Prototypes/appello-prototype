# Google SSO Implementation - Complete Guide

## Overview

The Appello Task Management system now uses **Google Single Sign-On (SSO)** as the primary authentication method. This provides:

- ✅ **Enhanced Security** - No passwords stored
- ✅ **Privacy Protection** - Users control their Google account access
- ✅ **Seamless Experience** - One-click login with Google
- ✅ **Automatic Gmail Integration** - Email sending ready immediately
- ✅ **User Auto-Creation** - Accounts created automatically on first login

---

## How It Works

### User Flow

1. **User visits app** → Redirected to `/login`
2. **Clicks "Sign in with Google"** → OAuth popup opens
3. **Grants permissions** → Google OAuth consent screen
4. **Account created/updated** → User record created automatically
5. **Gmail access stored** → Ready to send emails immediately
6. **JWT token issued** → User logged into app
7. **Redirected to dashboard** → Ready to use the app

### Technical Flow

```
Frontend (/login)
  ↓
GET /api/auth/google/connect (public)
  ↓
Google OAuth Consent Screen (popup)
  ↓
GET /api/auth/google/callback (public)
  ↓
Exchange code for tokens
  ↓
Get user info from Google
  ↓
Find or create user in database
  ↓
Store Google OAuth tokens
  ↓
Generate JWT token
  ↓
Redirect to /auth/callback?token=xxx
  ↓
Store token in localStorage
  ↓
Redirect to /dashboard
```

---

## Key Features

### 1. Automatic User Creation

When a user logs in with Google for the first time:
- User record is automatically created
- Name and email from Google account
- Default role: `field_worker` (can be updated by admin)
- No password required (Google OAuth only)

### 2. Gmail Integration

- Gmail access is automatically granted during login
- Refresh tokens stored securely
- Ready to send Purchase Orders immediately
- No additional setup required

### 3. Privacy & Security

- **No passwords stored** - All authentication via OAuth2
- **User control** - Users can revoke access in Google settings
- **Secure tokens** - Refresh tokens encrypted in database
- **Automatic refresh** - Access tokens refreshed automatically

### 4. Backward Compatibility

- Existing password-based users still work
- Email/password login endpoint still available
- Can migrate existing users to Google SSO gradually

---

## API Endpoints

### Public Endpoints (No Auth Required)

#### `GET /api/auth/google/connect`
Initiates Google OAuth flow for login.

**Query Parameters:**
- `redirectUri` (optional) - Custom redirect URI
- `state` (optional) - State parameter (defaults to 'login')

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "redirectUri": "http://localhost:3000/auth/google/callback"
}
```

#### `GET /api/auth/google/callback`
Handles OAuth callback - exchanges code for tokens.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - State parameter (user ID or 'login')

**Response:**
- Redirects to `/auth/callback?token=<jwt_token>` on success
- Redirects to `/login?error=<error>` on failure

### Protected Endpoints (Auth Required)

#### `GET /api/auth/google/status`
Check if current user has Google account connected.

**Response:**
```json
{
  "success": true,
  "connected": true,
  "email": "user@gmail.com",
  "connectedAt": "2025-11-20T10:00:00.000Z"
}
```

#### `POST /api/auth/google/disconnect`
Disconnect Google account (revokes tokens).

**Response:**
```json
{
  "success": true,
  "message": "Google account disconnected successfully"
}
```

---

## Frontend Pages

### `/login`
- Google SSO login page
- "Sign in with Google" button
- Privacy information displayed
- No email/password fields

### `/auth/callback`
- Handles OAuth callback
- Stores JWT token
- Redirects to dashboard
- Shows loading spinner

### `/settings`
- Shows Google connection status
- "Disconnect" button if connected
- Note: Users are automatically connected on login

---

## User Model Changes

### Google OAuth Fields

```javascript
googleOAuth: {
  accessToken: String,      // Current access token
  refreshToken: String,     // Long-lived refresh token
  tokenExpiry: Date,        // When access token expires
  email: String,           // Google account email
  connectedAt: Date,       // When connected
  scope: String           // OAuth scopes granted
}
```

### Password Field

- **Optional** for Google SSO users
- Required only if `googleOAuth.refreshToken` is not present
- Pre-save hook skips hashing if Google OAuth exists

---

## Environment Variables

Required in `.env.local`:

```env
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Client URL
CLIENT_URL=http://localhost:3000

# JWT Secret (for app authentication)
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

---

## Google Cloud Console Setup

### Required Redirect URIs

Add these to your OAuth 2.0 Client ID:

1. **Frontend Callback:**
   - `http://localhost:3000/auth/callback` (for login)

2. **Backend Callback:**
   - `http://localhost:3001/api/auth/google/callback` (for token exchange)

### Required Scopes

- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/userinfo.email` - Get email
- `https://www.googleapis.com/auth/userinfo.profile` - Get name

---

## Testing

### Test Login Flow

1. Navigate to `http://localhost:3000/login`
2. Click "Sign in with Google"
3. Complete OAuth flow in popup
4. Verify redirect to dashboard
5. Check Settings page - should show "Connected"

### Test Email Sending

1. After login, go to a Purchase Order
2. Click "Send Email"
3. Verify email sends via Gmail API
4. Check recipient inbox

---

## Migration from Password Auth

### Existing Users

Existing password-based users can:
1. Log in with Google (creates new account)
2. Admin can merge accounts if needed
3. Or continue using password login

### New Users

All new users must use Google SSO - no password registration available.

---

## Security Considerations

1. **Token Storage**
   - Refresh tokens stored encrypted in database
   - Access tokens refreshed automatically
   - Tokens never exposed to frontend

2. **OAuth State**
   - State parameter used for security
   - Prevents CSRF attacks
   - Validates callback authenticity

3. **Token Revocation**
   - Tokens revoked when user disconnects
   - Expired tokens automatically refreshed
   - User can revoke in Google settings

4. **Scope Limitation**
   - Only requests necessary scopes
   - Gmail send only (cannot read emails)
   - User info for account creation

---

## Troubleshooting

### "Invalid redirect URI"
- Check Google Cloud Console redirect URIs
- Verify both frontend and backend URIs added
- Wait 1-2 minutes after adding

### "Access denied"
- Check OAuth consent screen configuration
- Verify Gmail API is enabled
- Add user to test users (if in testing mode)

### "User creation failed"
- Check database connection
- Verify User model validation
- Check server logs for details

### "Token expired"
- System should auto-refresh
- If fails, user needs to log in again
- Check refresh token is stored

---

## Benefits

### For Users
- ✅ One-click login
- ✅ No password to remember
- ✅ Secure OAuth2 flow
- ✅ Control over account access

### For Admins
- ✅ No password management
- ✅ Reduced support requests
- ✅ Better security
- ✅ Automatic Gmail integration

### For Developers
- ✅ Simpler authentication flow
- ✅ No password hashing/storage
- ✅ Built-in email integration
- ✅ Industry-standard OAuth2

---

## Future Enhancements

- [ ] Google Workspace domain-wide delegation
- [ ] Role assignment based on Google Workspace groups
- [ ] Multi-account support
- [ ] Account linking (merge Google + existing accounts)

---

**Status:** ✅ **PRODUCTION READY**

The app is now fully converted to Google SSO. All users authenticate via Google OAuth, and Gmail integration is automatic.

