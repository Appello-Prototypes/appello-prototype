# Gmail Setup Instructions for PO Email Integration

## Overview

The Purchase Order system now supports sending POs via email using Gmail. This guide will help you configure Gmail SMTP settings.

## Step 1: Enable 2-Factor Authentication

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled

## Step 2: Generate App Password

Since Gmail requires app-specific passwords for SMTP access:

1. Go to: https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter a name like "Appello PO System"
5. Click **Generate**
6. **Copy the 16-character password** (you won't see it again!)

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM_NAME=Appello Inc.
```

**Important:**
- Use your **full Gmail address** for `SMTP_USER`
- Use the **16-character app password** (not your regular Gmail password) for `SMTP_PASS`
- The app password will look like: `abcd efgh ijkl mnop` (remove spaces when adding to .env)

## Step 4: Test Email Configuration

Once configured, you can test by:

1. Navigate to a Purchase Order detail page
2. Click **"Send Email"** button
3. Enter the supplier's email address
4. The system will:
   - Generate a PDF of the PO
   - Send an email with the PDF attached
   - Update the PO status to show email was sent

## Troubleshooting

### Error: "Invalid login credentials"
- Make sure you're using the **app password**, not your regular Gmail password
- Verify 2-factor authentication is enabled
- Check that the app password was copied correctly (no spaces)

### Error: "Email service not configured"
- Verify all SMTP environment variables are set in `.env.local`
- Restart the server after adding environment variables
- Check that `.env.local` is in the root directory

### Error: "Less secure app access"
- Gmail no longer supports "less secure apps"
- You **must** use an app password (see Step 2)
- Regular passwords will not work

## Production Deployment (Vercel)

For production on Vercel:

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add the same SMTP variables:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASS=your-app-password`
   - `SMTP_FROM_NAME=Appello Inc.`

## Security Best Practices

1. **Never commit `.env.local` to git** - it contains sensitive credentials
2. **Use a dedicated Gmail account** for production (not a personal account)
3. **Rotate app passwords regularly** (every 90 days recommended)
4. **Monitor email sending** for unusual activity
5. **Use environment-specific accounts** (dev vs production)

## Alternative: Gmail API (Future Enhancement)

For higher volume or more advanced features, consider using Gmail API instead of SMTP:
- Higher sending limits
- Better tracking and analytics
- OAuth2 authentication (more secure)
- Can be implemented in Phase 2

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify environment variables are loaded correctly
3. Test SMTP connection using a tool like `nodemailer` directly
4. Check Gmail account for security alerts

