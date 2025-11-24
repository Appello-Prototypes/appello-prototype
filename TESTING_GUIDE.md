# Testing Guide - PO & Material Inventory with Google SSO

**Status:** ✅ Google SSO Working - Ready for Full Testing

---

## 🎯 Quick Test Checklist

### 1. Verify Google Connection ✅
- [x] Google SSO login works
- [ ] Go to Settings page (`/settings`)
- [ ] Verify "Google Connected" status shows ✅
- [ ] Check that Gmail is ready for sending emails

### 2. Test Material Request Workflow

**Step 1: Create Material Request**
1. Navigate to **Material Requests** (`/material-requests`)
2. Click **"New Request"**
3. Fill out form:
   - Select a Job
   - Add line items (products)
   - Set delivery address
   - Add notes if needed
4. Click **"Submit Request"**
5. ✅ Verify request appears in list with status "pending"

**Step 2: Approve Request**
1. Click on the request to view details
2. Click **"Approve"** button
3. ✅ Verify status changes to "approved"

**Step 3: Convert to PO**
1. On approved request, click **"Convert to PO"**
2. Select supplier (or create one)
3. Review PO details
4. Click **"Create PO"**
5. ✅ Verify PO is created and appears in Purchase Orders list

### 3. Test Purchase Order Workflow

**Step 1: View PO**
1. Navigate to **Purchase Orders** (`/purchase-orders`)
2. Click on the newly created PO
3. ✅ Verify all details display correctly

**Step 2: Approve PO** (if required)
1. If PO needs approval, click **"Approve"**
2. ✅ Verify status changes to "approved"

**Step 3: Issue PO (PDF + Email)**
1. Click **"Issue PO"** button
2. ✅ Verify:
   - PDF is generated (check browser downloads)
   - Email is sent via Gmail API
   - Status changes to "sent"
   - Email sent timestamp appears

**Step 4: Download PDF**
1. Click **"Download PDF"** button
2. ✅ Verify PDF downloads with correct format:
   - Company header
   - Supplier info
   - Line items table
   - Totals
   - PO number

**Step 5: Send Email**
1. Click **"Send Email"** button
2. Enter recipient email (or use default supplier email)
3. Click **"Send"**
4. ✅ Verify:
   - Success message appears
   - Email sent via Gmail API (check Gmail sent folder)
   - PDF attachment included
   - Email status updated

### 4. Test Material Receiving

**Step 1: Navigate to Receiving**
1. Go to **Receiving** page (`/receiving`)
2. Select the PO from dropdown
3. ✅ Verify PO details load

**Step 2: Receive Materials**
1. Fill in received quantities for each line item
2. Upload **Bill of Lading** photo:
   - Click "Upload BOL Photo"
   - Select image file
   - ✅ Verify upload succeeds
3. Upload **Material Photos** (optional):
   - Click "Upload Material Photos"
   - Select one or more images
   - ✅ Verify uploads succeed
4. Add condition notes if needed
5. Click **"Submit Receipt"**
6. ✅ Verify:
   - Receipt created successfully
   - Photos are stored
   - Status updates correctly

### 5. Test Inventory (Optional)

**Step 1: View Inventory**
1. Navigate to **Inventory** (if page exists)
2. ✅ Verify inventory items show correct quantities

**Step 2: Issue from Inventory**
1. Select an inventory item
2. Enter quantity to issue
3. Select job/cost code
4. Submit
5. ✅ Verify transaction recorded

---

## 🔍 What to Check

### Gmail Integration
- ✅ Emails sent via Gmail API (not SMTP)
- ✅ PDF attachments included
- ✅ Email appears in Gmail sent folder
- ✅ No authentication errors

### PDF Generation
- ✅ Professional formatting
- ✅ All line items included
- ✅ Totals calculated correctly
- ✅ Company/supplier info correct

### Photo Uploads
- ✅ Files upload successfully
- ✅ Photos display in receipt details
- ✅ File paths stored correctly
- ✅ Multiple photos supported

### Data Flow
- ✅ Material Request → PO conversion works
- ✅ PO → Receipt linking works
- ✅ Inventory updates correctly
- ✅ Job cost codes tracked

---

## 🐛 Common Issues to Watch For

1. **Gmail API Errors**
   - Check Google OAuth tokens are valid
   - Verify refresh token exists
   - Check Gmail API scope is granted

2. **PDF Generation Errors**
   - Check all required fields present
   - Verify company/supplier data exists
   - Check file permissions

3. **Photo Upload Errors**
   - Check uploads directory exists
   - Verify file size limits
   - Check MIME types allowed

4. **Permission Errors**
   - Verify user roles allow actions
   - Check job/project access
   - Verify supplier access

---

## 📊 Success Criteria

✅ **All workflows complete without errors**
✅ **Gmail emails sent successfully**
✅ **PDFs generate correctly**
✅ **Photos upload and display**
✅ **Data persists correctly**
✅ **UI is responsive and intuitive**

---

## 🚀 Next Steps After Testing

Once testing is complete:
1. Fix any bugs found
2. Add missing features
3. Improve error handling
4. Add more validation
5. Deploy to production
6. Add more test coverage

