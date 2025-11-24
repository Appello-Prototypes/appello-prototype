const { google } = require('googleapis');
const oauth2Client = require('./oauth2Client');
const { getValidAccessToken } = require('./googleOAuth');
const { generatePOEmailHTML, generatePOEmailText } = require('./emailService');

/**
 * Send email using Gmail API
 * @param {Object} options - Email options
 * @param {Object} options.user - User document with googleOAuth
 * @param {Object} options.po - Purchase Order document
 * @param {Object} options.supplier - Supplier Company document
 * @param {Buffer} options.pdfBuffer - PDF buffer (optional)
 * @param {String} options.toEmail - Recipient email (defaults to supplier email)
 * @returns {Promise<Object>} Email result
 */
async function sendPOEmailViaGmail({ user, po, supplier, pdfBuffer, toEmail }) {
  try {
    // Get valid access token
    const accessToken = await getValidAccessToken(user);

    // Create Gmail client
    const client = oauth2Client();
    client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: client });

    const recipientEmail = toEmail || supplier?.email || supplier?.contactPerson?.email;
    if (!recipientEmail) {
      throw new Error('No recipient email address found');
    }

    const senderEmail = user.googleOAuth.email || process.env.SMTP_USER || 'noreply@appello.com';
    const senderName = process.env.SMTP_FROM_NAME || 'Appello Inc.';

    // Create email message
    const subject = `Purchase Order ${po.poNumber} - ${supplier?.name || 'Order'}`;
    const htmlBody = generatePOEmailHTML(po, supplier);
    const textBody = generatePOEmailText(po, supplier);

    // Build email message
    const messageParts = [
      `From: "${senderName}" <${senderEmail}>`,
      `To: ${recipientEmail}`,
      `Subject: ${subject}`,
      'Content-Type: multipart/alternative; boundary="boundary123"',
      '',
      '--boundary123',
      'Content-Type: text/plain; charset=utf-8',
      '',
      textBody,
      '',
      '--boundary123',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ];

    // Add PDF attachment if provided
    if (pdfBuffer) {
      const pdfBase64 = pdfBuffer.toString('base64');
      messageParts.push(
        '',
        '--boundary123',
        `Content-Type: application/pdf; name="PO-${po.poNumber}.pdf"`,
        'Content-Disposition: attachment; filename="PO-' + po.poNumber + '.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        pdfBase64,
        '--boundary123--'
      );
    } else {
      messageParts.push('--boundary123--');
    }

    const email = messageParts.join('\r\n');
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    };
  } catch (error) {
    console.error('Error sending email via Gmail API:', error);
    
    // Provide helpful error messages
    if (error.message.includes('Invalid Credentials') || error.message.includes('invalid_grant')) {
      throw new Error('Google account access expired. Please reconnect your Google account.');
    }
    
    throw error;
  }
}

module.exports = {
  sendPOEmailViaGmail
};

