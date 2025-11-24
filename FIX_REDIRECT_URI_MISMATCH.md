# Fix: redirect_uri_mismatch Error

## Problem

You're seeing: **"Error 400: redirect_uri_mismatch"**

This means the redirect URI in the OAuth request doesn't match what's configured in Google Cloud Console.

## Solution

### Step 1: Check What Redirect URI We're Using

The backend callback URL is:
```
http://localhost:3001/api/auth/google/callback
```

**This is the URL Google redirects to after authorization.**

### Step 2: Add to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your **OAuth 2.0 Client ID**
4. Under **Authorized redirect URIs**, add this **EXACT** URL:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
5. Click **Save**
6. Wait 1-2 minutes for changes to propagate

### Step 3: Verify Configuration

Make sure you have **BOTH** of these redirect URIs added:

1. **Backend Callback** (Required):
   ```
   http://localhost:3001/api/auth/google/callback
   ```
   - This is where Google redirects after OAuth
   - Backend exchanges code for tokens here
   - Backend then redirects to frontend with token

2. **Frontend Callback** (Optional, for direct redirects):
   ```
   http://localhost:3000/auth/callback
   ```
   - This is where backend redirects user after successful auth
   - Not required for popup flow, but good to have

### Step 4: Test Again

1. Wait 1-2 minutes after saving
2. Refresh your browser
3. Try "Sign in with Google" again

## Important Notes

- **Exact Match Required**: The redirect URI must match **EXACTLY** (including `http://` vs `https://`, port numbers, trailing slashes)
- **Case Sensitive**: URLs are case-sensitive
- **No Trailing Slash**: Don't add trailing slashes unless the URL has one
- **Wait Time**: Changes can take 1-2 minutes to propagate

## Common Mistakes

❌ **Wrong:**
- `http://localhost:3000/api/auth/google/callback` (wrong port)
- `https://localhost:3001/api/auth/google/callback` (wrong protocol)
- `http://localhost:3001/api/auth/google/callback/` (trailing slash)

✅ **Correct:**
- `http://localhost:3001/api/auth/google/callback` (exact match)

## For Production

When deploying to production, add your production backend callback URL:

```
https://your-api-domain.com/api/auth/google/callback
```

Make sure to:
1. Use `https://` (not `http://`)
2. Use your actual domain
3. Match the exact path

## Still Having Issues?

1. **Double-check the URL** - Copy/paste from the error or server logs
2. **Check Google Cloud Console** - Verify the URL is saved correctly
3. **Wait 2 minutes** - Changes need time to propagate
4. **Check server logs** - See what redirect URI is being sent
5. **Try incognito mode** - Rule out browser cache issues

