const nodemailer = require('nodemailer');

/**
 * Create Gmail transporter
 */
function createTransporter() {
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // For Gmail, you may need to use an App Password instead of regular password
  // See: https://support.google.com/accounts/answer/185833

  return nodemailer.createTransport(smtpConfig);
}

/**
 * Send Purchase Order via Email
 * @param {Object} options - Email options
 * @param {Object} options.po - Purchase Order document
 * @param {Object} options.supplier - Supplier Company document
 * @param {Buffer} options.pdfBuffer - PDF buffer (optional)
 * @param {String} options.toEmail - Recipient email (defaults to supplier email)
 * @param {String} options.fromEmail - Sender email (defaults to SMTP_USER)
 * @returns {Promise<Object>} Email result
 */
async function sendPOEmail({ po, supplier, pdfBuffer, toEmail, fromEmail }) {
  try {
    const transporter = createTransporter();

    const recipientEmail = toEmail || supplier?.email || supplier?.contactPerson?.email;
    if (!recipientEmail) {
      throw new Error('No recipient email address found');
    }

    const senderEmail = fromEmail || process.env.SMTP_USER || 'noreply@appello.com';
    const senderName = process.env.SMTP_FROM_NAME || 'Appello Inc.';

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      cc: supplier?.contactPerson?.email !== recipientEmail ? supplier?.contactPerson?.email : undefined,
      subject: `Purchase Order ${po.poNumber} - ${supplier?.name || 'Order'}`,
      html: generatePOEmailHTML(po, supplier),
      text: generatePOEmailText(po, supplier),
      attachments: pdfBuffer ? [
        {
          filename: `PO-${po.poNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ] : []
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('Error sending PO email:', error);
    throw error;
  }
}

/**
 * Generate HTML email template for PO
 */
function generatePOEmailHTML(po, supplier) {
  const poDate = new Date(po.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const requiredBy = po.requiredByDate ? new Date(po.requiredByDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  let lineItemsHTML = '';
  if (po.lineItems && po.lineItems.length > 0) {
    lineItemsHTML = po.lineItems.map((item, index) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName || item.description || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.unit || 'EA'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.extendedCost || 0).toFixed(2)}</td>
      </tr>
    `).join('');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .po-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; }
        th { background-color: #2563eb; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        .total { text-align: right; font-weight: bold; font-size: 1.1em; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PURCHASE ORDER</h1>
          <h2>PO Number: ${po.poNumber}</h2>
        </div>
        
        <div class="content">
          <div class="po-details">
            <p><strong>Date:</strong> ${poDate}</p>
            <p><strong>Required By:</strong> ${requiredBy}</p>
            ${supplier ? `<p><strong>Supplier:</strong> ${supplier.name}</p>` : ''}
          </div>

          <h3>Line Items</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th style="text-align: right;">Qty</th>
                <th>Unit</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Extended</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHTML || '<tr><td colspan="6" style="text-align: center;">No line items</td></tr>'}
            </tbody>
          </table>

          <div class="po-details">
            <p><strong>Subtotal:</strong> $${(po.subtotal || 0).toFixed(2)}</p>
            ${po.taxAmount > 0 ? `<p><strong>Tax:</strong> $${po.taxAmount.toFixed(2)}</p>` : ''}
            ${po.freightAmount > 0 ? `<p><strong>Freight:</strong> $${po.freightAmount.toFixed(2)}</p>` : ''}
            <p class="total"><strong>TOTAL: $${(po.total || 0).toFixed(2)}</strong></p>
          </div>

          ${po.supplierNotes ? `
            <div class="po-details">
              <h4>Notes:</h4>
              <p>${po.supplierNotes.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}

          ${po.deliveryInstructions ? `
            <div class="po-details">
              <h4>Delivery Instructions:</h4>
              <p>${po.deliveryInstructions.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>This is a computer-generated purchase order. Please confirm receipt.</p>
          <p>Appello Inc. | ${process.env.SMTP_USER || 'noreply@appello.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email for PO
 */
function generatePOEmailText(po, supplier) {
  const poDate = new Date(po.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const requiredBy = po.requiredByDate ? new Date(po.requiredByDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  let text = `PURCHASE ORDER\n`;
  text += `PO Number: ${po.poNumber}\n`;
  text += `Date: ${poDate}\n`;
  text += `Required By: ${requiredBy}\n`;
  if (supplier) {
    text += `Supplier: ${supplier.name}\n`;
  }
  text += `\nLINE ITEMS:\n`;
  
  if (po.lineItems && po.lineItems.length > 0) {
    po.lineItems.forEach((item, index) => {
      text += `${index + 1}. ${item.productName || item.description || 'N/A'}\n`;
      text += `   Quantity: ${item.quantity || 0} ${item.unit || 'EA'}\n`;
      text += `   Unit Price: $${(item.unitPrice || 0).toFixed(2)}\n`;
      text += `   Extended: $${(item.extendedCost || 0).toFixed(2)}\n\n`;
    });
  }

  text += `\nTOTALS:\n`;
  text += `Subtotal: $${(po.subtotal || 0).toFixed(2)}\n`;
  if (po.taxAmount > 0) text += `Tax: $${po.taxAmount.toFixed(2)}\n`;
  if (po.freightAmount > 0) text += `Freight: $${po.freightAmount.toFixed(2)}\n`;
  text += `TOTAL: $${(po.total || 0).toFixed(2)}\n`;

  if (po.supplierNotes) {
    text += `\nNOTES:\n${po.supplierNotes}\n`;
  }

  if (po.deliveryInstructions) {
    text += `\nDELIVERY INSTRUCTIONS:\n${po.deliveryInstructions}\n`;
  }

  text += `\n\nThis is a computer-generated purchase order. Please confirm receipt.`;

  return text;
}

module.exports = {
  createTransporter,
  sendPOEmail,
  generatePOEmailHTML,
  generatePOEmailText
};

