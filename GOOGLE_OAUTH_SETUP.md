# Google OAuth2 SSO Setup Guide

## Overview

This system now supports Google Single Sign-On (SSO) for Gmail integration, similar to how HubSpot handles it. Users can connect their Google accounts to send Purchase Orders via Gmail without needing SMTP configuration.

## Benefits

- ✅ **No App Passwords Required** - Uses OAuth2 instead of SMTP passwords
- ✅ **More Secure** - Tokens are encrypted and stored securely
- ✅ **Better UX** - Simple "Connect Google" button, just like HubSpot
- ✅ **Automatic Token Refresh** - System handles token expiration automatically
- ✅ **Fallback Support** - Falls back to SMTP if Google not connected

---

## Step 1: Create Google OAuth2 Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Gmail API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

3. **Create OAuth2 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     - User Type: External (or Internal if using Google Workspace)
     - App name: "Appello Task Management"
     - User support email: Your email
     - Developer contact: Your email
     - Scopes: Add `https://www.googleapis.com/auth/gmail.send`
     - Save and continue

4. **Configure OAuth Client**
   - Application type: **Web application**
   - Name: "Appello Task Management"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `https://your-production-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (for local)
     - `https://your-production-domain.com/auth/google/callback` (for production)
     - `http://localhost:3001/api/auth/google/callback` (backend callback)
     - `https://your-api-domain.com/api/auth/google/callback` (production backend)
   - Click "Create"
   - **Copy the Client ID and Client Secret**

---

## Step 2: Configure Environment Variables

Add to your `.env.local` file:

```env
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Client URL (for redirects)
CLIENT_URL=http://localhost:3000
```

**For Production (Vercel):**
Add these same variables to Vercel environment variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (your production callback URL)
- `CLIENT_URL` (your production frontend URL)

---

## Step 3: How It Works

### User Flow

1. **User clicks "Connect Google"** on Settings page
2. **Popup window opens** with Google OAuth consent screen
3. **User grants permissions** (Gmail send access)
4. **System receives authorization code**
5. **Backend exchanges code for tokens** (access + refresh)
6. **Tokens stored securely** in user's database record
7. **Popup closes**, user sees "Connected" status

### Sending Emails

1. **User clicks "Send Email"** on PO detail page
2. **System checks** if user has Google connected
3. **If connected:**
   - Uses Gmail API with OAuth tokens
   - Automatically refreshes token if expired
   - Sends email via Gmail API
4. **If not connected:**
   - Falls back to SMTP (if configured)
   - Or shows error asking to connect Google

---

## Step 4: Testing

### Local Development

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Settings:**
   - Go to `http://localhost:3000/settings`
   - Click "Connect Google"
   - Complete OAuth flow in popup

3. **Test Email Sending:**
   - Go to a Purchase Order detail page
   - Click "Send Email"
   - Verify email is sent via Gmail API

### Production

1. **Set environment variables** in Vercel
2. **Update redirect URIs** in Google Cloud Console
3. **Test OAuth flow** on production domain
4. **Verify email sending** works

---

## API Endpoints

### `GET /api/auth/google/connect`
Initiates OAuth flow, returns authorization URL.

**Query Parameters:**
- `redirectUri` (optional) - Custom redirect URI

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "redirectUri": "http://localhost:3000/auth/google/callback"
}
```

### `GET /api/auth/google/callback`
Handles OAuth callback, exchanges code for tokens.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - User ID (for security)

**Response:**
- Redirects to frontend with success/error status

### `GET /api/auth/google/status`
Check if user has Google account connected.

**Response:**
```json
{
  "success": true,
  "connected": true,
  "email": "user@gmail.com",
  "connectedAt": "2025-11-20T10:00:00.000Z"
}
```

### `POST /api/auth/google/disconnect`
Disconnect Google account, revoke tokens.

**Response:**
```json
{
  "success": true,
  "message": "Google account disconnected successfully"
}
```

---

## Security Considerations

1. **Token Storage**
   - Refresh tokens stored encrypted in database
   - Access tokens refreshed automatically
   - Tokens never exposed to frontend

2. **OAuth State Parameter**
   - User ID passed in state for security
   - Prevents CSRF attacks

3. **Token Revocation**
   - Tokens revoked when user disconnects
   - Expired tokens automatically refreshed

4. **Scope Limitation**
   - Only requests `gmail.send` scope
   - Cannot read emails, only send

---

## Troubleshooting

### "Invalid redirect URI"
- Check that redirect URI in Google Console matches exactly
- Include both frontend and backend callback URLs
- Verify protocol (http vs https)

### "Access denied"
- User may have denied permissions
- Check OAuth consent screen configuration
- Verify scopes are requested correctly

### "Token expired"
- System should auto-refresh, but if it fails:
- User needs to reconnect Google account
- Check refresh token is stored correctly

### "Failed to send email"
- Check if user has Google connected
- Verify Gmail API is enabled in Google Cloud Console
- Check server logs for detailed error

---

## Migration from SMTP

If you're currently using SMTP:

1. **Keep SMTP configured** as fallback
2. **Users can connect Google** for better experience
3. **System automatically uses Gmail API** if available
4. **Falls back to SMTP** if Google not connected

No breaking changes - existing SMTP setup continues to work!

---

## Future Enhancements

- [ ] Google Workspace domain-wide delegation
- [ ] Multiple Google accounts per user
- [ ] Email tracking (opened, clicked)
- [ ] Gmail API for reading emails
- [ ] Calendar integration

---

## Support

For issues:
1. Check server logs for detailed errors
2. Verify Google Cloud Console configuration
3. Test OAuth flow in browser console
4. Check network tab for API calls

