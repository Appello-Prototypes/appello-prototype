# Testing Google OAuth2 SSO

## Quick Test Guide

Now that you've configured your `.env.local` file with Google OAuth credentials, follow these steps to test:

---

## Step 1: Start the Development Server

```bash
npm run dev
```

This will start both the backend (port 3001) and frontend (port 3000).

---

## Step 2: Navigate to Settings Page

1. Open your browser to `http://localhost:3000`
2. Log in (if required)
3. Click the **Settings** icon (⚙️) in the top-right corner, or navigate to `/settings`

---

## Step 3: Connect Google Account

1. On the Settings page, you should see the **"Email Integration"** section
2. Click the **"Connect Google"** button
3. A popup window should open with Google's OAuth consent screen
4. Select your Google account
5. Review the permissions (Gmail send access)
6. Click **"Allow"**

---

## Step 4: Verify Connection

After clicking "Allow":
- The popup should close automatically
- You should see a success toast: "Google account connected successfully"
- The Settings page should show:
  - ✅ **Connected as [your-email@gmail.com]**
  - A **"Disconnect"** button instead of "Connect Google"

---

## Step 5: Test Email Sending

1. Navigate to a Purchase Order detail page
2. Make sure the PO is in **"approved"** or **"sent"** status
3. Click the **"Send Email"** button
4. Enter a recipient email address (or use the supplier's email)
5. Click **"Send"**

**Expected Result:**
- Success toast: "PO email sent successfully via GMAIL"
- Email should arrive in recipient's inbox
- Email should have PDF attachment

---

## Troubleshooting

### Issue: "Failed to initiate Google connection"

**Possible Causes:**
- Google OAuth credentials not loaded
- Server not restarted after adding env variables

**Solution:**
1. Verify `.env.local` has correct values:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   CLIENT_URL=http://localhost:3000
   ```
2. **Restart the server** (`npm run dev`)
3. Check server logs for error messages

---

### Issue: "Invalid redirect URI"

**Possible Causes:**
- Redirect URI in Google Cloud Console doesn't match
- Redirect URI in `.env.local` doesn't match

**Solution:**
1. Go to Google Cloud Console > Credentials
2. Edit your OAuth 2.0 Client ID
3. Add these **Authorized redirect URIs**:
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:3001/api/auth/google/callback`
4. Save changes
5. Wait 1-2 minutes for changes to propagate
6. Try again

---

### Issue: Popup Opens but Shows Error

**Possible Causes:**
- OAuth consent screen not configured
- Gmail API not enabled

**Solution:**
1. Go to Google Cloud Console > APIs & Services > OAuth consent screen
2. Complete the consent screen setup:
   - User Type: External
   - App name: "Appello Task Management"
   - Support email: Your email
   - Scopes: Add `https://www.googleapis.com/auth/gmail.send`
   - Save
3. Go to APIs & Services > Library
4. Search for "Gmail API"
5. Click "Enable"
6. Try again

---

### Issue: "Access denied" or "Permission denied"

**Possible Causes:**
- User denied permissions
- App is in testing mode and user not added

**Solution:**
1. If app is in testing mode:
   - Go to OAuth consent screen
   - Add your email to "Test users"
   - Or publish the app (for production)
2. Try connecting again
3. Make sure to click "Allow" on all permission screens

---

### Issue: Email Sends but Shows "SMTP" instead of "GMAIL"

**Possible Causes:**
- User doesn't have Google connected
- Gmail API call failed, fell back to SMTP

**Solution:**
1. Check Settings page - is Google connected?
2. If not connected, connect it first
3. If connected but still using SMTP:
   - Check server logs for Gmail API errors
   - Verify refresh token is stored in database
   - Try disconnecting and reconnecting

---

### Issue: "Token expired" Error

**Possible Causes:**
- Refresh token invalid or revoked
- User revoked access in Google account

**Solution:**
1. Go to Settings page
2. Click "Disconnect"
3. Click "Connect Google" again
4. Re-authorize

---

## Verification Checklist

- [ ] Server starts without errors
- [ ] Settings page loads
- [ ] "Connect Google" button visible
- [ ] Popup opens when clicking button
- [ ] Google OAuth consent screen appears
- [ ] Can select Google account
- [ ] Can grant permissions
- [ ] Popup closes after authorization
- [ ] Success toast appears
- [ ] Settings page shows "Connected"
- [ ] Can send PO email via Gmail API
- [ ] Email arrives with PDF attachment

---

## Testing Different Scenarios

### Test 1: First-Time Connection
- User has never connected Google
- Should see "Connect Google" button
- Should be able to complete OAuth flow

### Test 2: Already Connected
- User has Google connected
- Should see "Connected as [email]"
- Should see "Disconnect" button
- Should be able to send emails

### Test 3: Disconnect and Reconnect
- Click "Disconnect"
- Verify status updates
- Click "Connect Google" again
- Should work smoothly

### Test 4: Token Refresh
- Wait for token to expire (or manually expire it)
- Try sending email
- Should auto-refresh token
- Email should send successfully

### Test 5: SMTP Fallback
- Disconnect Google account
- Try sending email
- Should fall back to SMTP (if configured)
- Or show error asking to connect Google

---

## Next Steps After Testing

Once everything works:

1. **Test in Production:**
   - Add production redirect URIs to Google Console
   - Set production environment variables in Vercel
   - Test OAuth flow on production domain

2. **User Onboarding:**
   - Add Settings link to user menu
   - Create user guide for connecting Google
   - Add tooltips/help text

3. **Monitor Usage:**
   - Check server logs for OAuth errors
   - Monitor Gmail API quota usage
   - Track email sending success rates

---

## Support

If you encounter issues not covered here:

1. Check server logs (`npm run dev` terminal output)
2. Check browser console for frontend errors
3. Verify Google Cloud Console configuration
4. Review `GOOGLE_OAUTH_SETUP.md` for setup details

