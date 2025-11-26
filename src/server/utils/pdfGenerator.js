const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF for Purchase Order
 * @param {Object} po - Purchase Order document
 * @param {Object} company - Company/Supplier document
 * @param {Object} job - Job document
 * @param {Object} buyer - Buyer User document
 * @param {Array} products - Optional array of populated products for package quantities
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePOPDF(po, company, job, buyer, products = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('PURCHASE ORDER', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text(`PO Number: ${po.poNumber}`, { align: 'center' });
      doc.moveDown(1);

      // Company Info (Left)
      doc.fontSize(10).font('Helvetica-Bold').text('FROM:', 50, 120);
      doc.font('Helvetica').fontSize(9);
      doc.text('Appello Inc.', 50, 140);
      doc.text('123 Business Street', 50, 155);
      doc.text('Calgary, AB T2P 1J4', 50, 170);
      doc.text('Canada', 50, 185);
      if (buyer) {
        doc.moveDown(0.5);
        doc.text(`Buyer: ${buyer.name}`, 50, 200);
        if (buyer.email) {
          doc.text(`Email: ${buyer.email}`, 50, 215);
        }
      }

      // Supplier Info (Right)
      const rightX = 350;
      doc.font('Helvetica-Bold').fontSize(10).text('TO:', rightX, 120);
      doc.font('Helvetica').fontSize(9);
      if (company) {
        doc.text(company.name || 'N/A', rightX, 140);
        if (company.address) {
          const addr = company.address;
          if (addr.street) doc.text(addr.street, rightX, 155);
          const cityLine = [addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ');
          if (cityLine) doc.text(cityLine, rightX, 170);
          if (addr.country) doc.text(addr.country, rightX, 185);
        }
        if (company.contactPerson) {
          doc.moveDown(0.5);
          doc.text(`Contact: ${company.contactPerson}`, rightX, 200);
        }
        if (company.email) {
          doc.text(`Email: ${company.email}`, rightX, 215);
        }
      }

      // PO Details
      let yPos = 250;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 15;

      doc.font('Helvetica-Bold').fontSize(10).text('PO DETAILS', 50, yPos);
      yPos += 20;

      doc.font('Helvetica').fontSize(9);
      doc.text(`PO Number: ${po.poNumber}`, 50, yPos);
      doc.text(`Date: ${new Date(po.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, yPos + 15);
      
      if (job) {
        doc.text(`Job: ${job.jobNumber || job.name || 'N/A'}`, 50, yPos + 30);
        doc.text(`Project: ${job.projectId?.name || 'N/A'}`, 50, yPos + 45);
      }
      
      doc.text(`Required By: ${po.requiredByDate ? new Date(po.requiredByDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`, 50, yPos + 60);

      if (po.shipToAddress) {
        yPos += 75;
        doc.font('Helvetica-Bold').text('Ship To:', 50, yPos);
        doc.font('Helvetica');
        if (typeof po.shipToAddress === 'string') {
          doc.text(po.shipToAddress, 50, yPos + 15);
        } else {
          const addr = po.shipToAddress;
          if (addr.street) doc.text(addr.street, 50, yPos + 15);
          const cityLine = [addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ');
          if (cityLine) doc.text(cityLine, 50, yPos + 30);
          if (addr.country) doc.text(addr.country, 50, yPos + 45);
        }
      }

      // Line Items Table
      yPos = 400;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 15;

      // Table Header
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Item', 50, yPos);
      doc.text('Description', 120, yPos);
      doc.text('Qty', 350, yPos);
      doc.text('Unit', 380, yPos);
      doc.text('Unit Price', 420, yPos);
      doc.text('Extended', 480, yPos);

      yPos += 15;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 10;

      // Line Items
      doc.font('Helvetica').fontSize(8);
      if (po.lineItems && po.lineItems.length > 0) {
        po.lineItems.forEach((item, index) => {
          const itemY = yPos;
          
          // Item number
          doc.text(`${index + 1}`, 50, itemY);
          
          // Description (wrap if needed)
          let desc = item.productName || item.description || 'N/A';
          // Add variant name if present
          if (item.variantName) {
            desc = `${desc} - ${item.variantName}`;
          }
          
          // Add package quantity if available
          let packageInfo = '';
          if (products && item.productId) {
            const product = products.find(p => p._id.toString() === item.productId.toString());
            if (product) {
              if (item.variantId && product.variants) {
                const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
                if (variant && variant.packageQuantity) {
                  packageInfo = ` (Package: ${variant.packageQuantity} ${variant.packageUnit || 'EA'})`;
                }
              } else if (product.packageQuantity) {
                packageInfo = ` (Package: ${product.packageQuantity} ${product.packageUnit || 'EA'})`;
              }
            }
          }
          
          desc = desc + packageInfo;
          const descLines = doc.heightOfString(desc, { width: 220 });
          doc.text(desc, 120, itemY, { width: 220 });
          
          // Quantity
          doc.text(String(item.quantity || 0), 350, itemY);
          
          // Unit
          doc.text(item.unit || 'EA', 380, itemY);
          
          // Unit Price
          doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, 420, itemY);
          
          // Extended Cost
          doc.text(`$${(item.extendedCost || 0).toFixed(2)}`, 480, itemY);
          
          yPos = itemY + Math.max(descLines, 15) + 5;
          
          // Add cost code if present
          if (item.costCode) {
            doc.fontSize(7).font('Helvetica-Oblique');
            doc.text(`Cost Code: ${item.costCode}`, 120, yPos);
            doc.font('Helvetica').fontSize(8);
            yPos += 12;
          }
        });
      } else {
        doc.text('No line items', 50, yPos);
        yPos += 15;
      }

      yPos += 10;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 15;

      // Totals (Right aligned)
      const totalsX = 400;
      doc.font('Helvetica').fontSize(9);
      doc.text('Subtotal:', totalsX, yPos);
      doc.text(`$${(po.subtotal || 0).toFixed(2)}`, 480, yPos);
      yPos += 15;

      if (po.taxAmount && po.taxAmount > 0) {
        doc.text('Tax:', totalsX, yPos);
        doc.text(`$${po.taxAmount.toFixed(2)}`, 480, yPos);
        yPos += 15;
      }

      if (po.freightAmount && po.freightAmount > 0) {
        doc.text('Freight:', totalsX, yPos);
        doc.text(`$${po.freightAmount.toFixed(2)}`, 480, yPos);
        yPos += 15;
      }

      doc.moveTo(totalsX, yPos).lineTo(550, yPos).stroke();
      yPos += 15;

      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('TOTAL:', totalsX, yPos);
      doc.text(`$${(po.total || 0).toFixed(2)}`, 480, yPos);

      // Notes
      if (po.supplierNotes) {
        yPos += 40;
        doc.font('Helvetica-Bold').fontSize(9).text('NOTES:', 50, yPos);
        yPos += 15;
        doc.font('Helvetica').fontSize(8);
        doc.text(po.supplierNotes, 50, yPos, { width: 500 });
      }

      if (po.deliveryInstructions) {
        yPos += 30;
        doc.font('Helvetica-Bold').fontSize(9).text('DELIVERY INSTRUCTIONS:', 50, yPos);
        yPos += 15;
        doc.font('Helvetica').fontSize(8);
        doc.text(po.deliveryInstructions, 50, yPos, { width: 500 });
      }

      // Footer
      const pageHeight = doc.page.height;
      const footerY = pageHeight - 50;
      doc.fontSize(7).font('Helvetica-Oblique');
      doc.text('This is a computer-generated purchase order. Please confirm receipt.', 50, footerY, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Shop Printout PDF for Material Request
 * @param {Object} materialRequest - Material Request document
 * @param {Object} job - Job document
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateShopPrintoutPDF(materialRequest, job) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('SHOP PICK LIST', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text(`MR Number: ${materialRequest.requestNumber}`, { align: 'center' });
      doc.moveDown(1);

      // Job Information
      doc.fontSize(10).font('Helvetica-Bold').text('JOB INFORMATION', 50, 120);
      doc.font('Helvetica').fontSize(9);
      if (job) {
        doc.text(`Job: ${job.jobNumber || job.name || 'N/A'}`, 50, 140);
        doc.text(`Project: ${job.name || 'N/A'}`, 50, 155);
        if (job.location) {
          const location = typeof job.location === 'string' 
            ? job.location 
            : [job.location.address, job.location.city, job.location.province].filter(Boolean).join(', ');
          doc.text(`Location: ${location}`, 50, 170);
        }
      }
      
      // Request Details
      let yPos = 200;
      doc.font('Helvetica-Bold').fontSize(10).text('REQUEST DETAILS', 50, yPos);
      yPos += 20;
      doc.font('Helvetica').fontSize(9);
      doc.text(`Required By: ${new Date(materialRequest.requiredByDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, yPos);
      doc.text(`Priority: ${materialRequest.priority.charAt(0).toUpperCase() + materialRequest.priority.slice(1)}`, 50, yPos + 15);
      doc.text(`Delivery Location: ${materialRequest.deliveryLocation.charAt(0).toUpperCase() + materialRequest.deliveryLocation.slice(1)}`, 50, yPos + 30);
      
      if (materialRequest.deliveryAddress) {
        doc.text(`Delivery Address: ${materialRequest.deliveryAddress}`, 50, yPos + 45);
        yPos += 15;
      }
      
      if (materialRequest.deliveryNotes) {
        yPos += 15;
        doc.text(`Delivery Notes: ${materialRequest.deliveryNotes}`, 50, yPos, { width: 500 });
        yPos += 30;
      } else {
        yPos += 60;
      }

      // Line Items Table
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 15;

      // Table Header
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Item', 50, yPos);
      doc.text('Product', 120, yPos);
      doc.text('Qty', 350, yPos);
      doc.text('Unit', 380, yPos);
      doc.text('Notes', 420, yPos);

      yPos += 15;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 10;

      // Line Items
      doc.font('Helvetica').fontSize(8);
      if (materialRequest.lineItems && materialRequest.lineItems.length > 0) {
        materialRequest.lineItems.forEach((item, index) => {
          const itemY = yPos;
          
          // Item number
          doc.text(`${index + 1}`, 50, itemY);
          
          // Product name and description
          let productText = item.productName || 'N/A';
          if (item.variantName) {
            productText = `${productText} - ${item.variantName}`;
          }
          if (item.description) {
            productText = `${productText}\n${item.description}`;
          }
          const productLines = doc.heightOfString(productText, { width: 220 });
          doc.text(productText, 120, itemY, { width: 220 });
          
          // Quantity
          doc.text(String(item.quantity || 0), 350, itemY);
          
          // Unit
          doc.text(item.unit || 'EA', 380, itemY);
          
          // Notes
          if (item.notes) {
            doc.text(item.notes, 420, itemY, { width: 130 });
          }
          
          // Fulfillment source indicator
          if (item.fulfillmentSource === 'inventory') {
            doc.fontSize(7).font('Helvetica-Bold').fillColor('blue');
            doc.text('FROM INVENTORY', 120, itemY + productLines + 5);
            doc.fillColor('black').font('Helvetica').fontSize(8);
          }
          
          yPos = itemY + Math.max(productLines, 15) + (item.notes ? 10 : 5) + (item.fulfillmentSource === 'inventory' ? 10 : 0);
        });
      } else {
        doc.text('No line items', 50, yPos);
        yPos += 15;
      }

      yPos += 10;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();

      // Footer
      const pageHeight = doc.page.height;
      const footerY = pageHeight - 50;
      doc.fontSize(7).font('Helvetica-Oblique');
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 50, footerY);
      doc.text(`Request Number: ${materialRequest.requestNumber}`, 50, footerY + 10, { align: 'left' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePOPDF,
  generateShopPrintoutPDF
};

