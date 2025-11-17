# Appello Task Management System - Quick Start Guide

## 🎯 What We Built

A **complete ICI (Industrial, Commercial, Institutional) contractor task management system** with full financial integration, demonstrating real-world construction project workflows.

## 🏗️ System Architecture

### **Frontend**: React + Vite (http://localhost:3000)
- Modern, responsive UI with Tailwind CSS
- Real-time updates via Socket.io
- Mobile-optimized for field workers

### **Backend**: Node.js + Express (http://localhost:3001) 
- RESTful API with comprehensive endpoints
- Serverless-compatible (Vercel deployment)
- Real-time WebSocket integration

### **Database**: MongoDB Atlas (Production)
- **Connection**: `mongodb+srv://Vercel-Admin-appello-prototype-db:...@appello-prototype-db.nrral5a.mongodb.net/appello-tasks-prod`
- **Shared Database**: Both local and production use the same MongoDB Atlas instance
- **Real-time Sync**: Changes in local appear in production immediately

## 🚀 Deployment Status

### **Production (Live)**: 
- **URL**: https://task-management-kappa-plum.vercel.app
- **Status**: ✅ Fully functional
- **API**: Working with proper serverless configuration
- **Database**: Connected to MongoDB Atlas

### **Local Development**:
- **Frontend**: http://localhost:3000 (with hot reload)
- **Backend**: http://localhost:3001 (with nodemon)
- **Database**: Same production MongoDB Atlas
- **Startup**: `./start-local.sh` or `npm run dev`

## 📊 Sample Dataset - Comprehensive & Realistic

### **8 Team Members** (Realistic ICI Contractor Roles):
- **Sarah Mitchell** (Admin/Operations Director)
- **Marcus Rodriguez** (Senior Project Manager)
- **Tony Castellano** (Lead Foreman/Field Supervisor)
- **Jake Thompson** (HVAC Technician Level 3)
- **Maria Santos** (Insulation Specialist)
- **David Kim** (Mechanical Technician)
- **Lisa Chen** (Project Coordinator/Office Staff)
- **Roberto Silva** (Site Supervisor)

### **5 Diverse Projects** ($13.65M Total):
1. **Metropolitan Tower HVAC Retrofit** ($2.85M) - Office building
2. **Regional Medical Center - OR Suite Expansion** ($3.2M) - Healthcare
3. **University Research Facility - Clean Room Installation** ($1.95M) - Laboratory
4. **Industrial Manufacturing Plant - Process HVAC** ($4.1M) - Industrial
5. **Luxury Hotel Renovation** ($1.65M) - Hospitality (completed)

### **8 Comprehensive Jobs** with realistic ICI contractor breakdowns:
- Chiller Plant Replacement, VAV Terminal Installation, Building Automation
- OR Suite HVAC, Medical Gas Systems, Clean Room HVAC
- Contamination Control Systems

## 🎯 Showcase Job: VAV Terminal Installation (JOB-2024-001-B)

**This job demonstrates COMPLETE ICI contractor functionality:**

### **Contract Value**: $680,000
### **Timeline**: 4 months (March-June 2024)
### **Status**: 3 months into project

### **📋 Schedule of Values (SOV) - 4 Line Items**:
1. **VAV-UNITS-001**: Standard Pressure Units (48 EA @ $2,850) = $171,000
2. **VAV-UNITS-002**: High Pressure Units (36 EA @ $3,200) = $144,000  
3. **VAV-DUCT-001**: Ductwork Modifications (2,400 LF @ $45) = $140,400
4. **VAV-CTRL-001**: Control Systems (84 EA @ $850) = $96,390

### **🏗️ SOV Setup - Complete Hierarchy**:
- **Systems (3)**: VAV Air Distribution, Ductwork, Control System
- **Areas (2)**: Lower Floors (1-6), Upper Floors (7-12)
- **Phases (2)**: Installation Phase, Testing Phase
- **Modules (5)**: SP-VAV, HP-VAV, SUP-DUCT, RET-DUCT, VAV-CTRL
- **Components (4)**: VAV-STD, VAV-HP, SUP-CONN, VAV-CTL-UNIT

### **📄 AP Register - 18 Invoices ($508,284)**:
**✅ CRITICAL**: All invoices use **ONLY the 4 SOV cost codes**
- **VAV-UNITS-001**: $132,210 (5 invoices)
- **VAV-UNITS-002**: $160,524 (4 invoices)
- **VAV-DUCT-001**: $119,610 (5 invoices)
- **VAV-CTRL-001**: $95,940 (4 invoices)

**Vendors**: Johnson Controls, Metro Ductwork, Advanced Building Controls, Skilled Trades Staffing, Heavy Lift Services, Industrial Mechanical Supply, etc.

### **⏰ Timelog Register - 156 Entries + 120 Time Entries**:
**✅ CRITICAL**: All time entries use **ONLY the 4 SOV cost codes**
- **Perfect cost code alignment** for financial rollup
- **3-month progression**: Realistic work phases
- **Multiple workers**: Tony, Jake, Maria, David
- **Total Hours**: 1,302+ hours tracked

### **📈 Financial Integration - Perfect Rollup**:
- **Earned vs Burned**: Real-time variance analysis
- **Cost Code Traceability**: Click from summary to detail
- **Budget Tracking**: 117.5% utilization with detailed breakdown
- **Vendor Management**: Payment status and retention tracking

## 🔑 Critical Design Principles

### **1. SOV Cost Code Governance**:
- **RULE**: AP Register and Timelog can ONLY use cost codes established in SOV
- **WHY**: Ensures perfect financial rollup and reporting
- **RESULT**: Complete traceability from detailed transactions to summary reports

### **2. Hierarchical SOV Structure**:
- **Systems** → **Areas** → **Modules** → **Components**
- **Purpose**: Organize complex ICI contractor work breakdown
- **Benefit**: Scalable from simple jobs to complex multi-million dollar projects

### **3. Real-time Financial Integration**:
- **AP costs** automatically roll up to SOV cost codes
- **Labor hours** automatically roll up to SOV cost codes
- **Earned vs Burned** analysis updates in real-time
- **Variance tracking** at cost code and overall project level

## 🧪 Testing Credentials

**Login Credentials** (when authentication is implemented):
- **Admin**: sarah.mitchell@appello.com / password123
- **Project Manager**: marcus.rodriguez@appello.com / password123  
- **Field Supervisor**: tony.castellano@appello.com / password123
- **HVAC Technician**: jake.thompson@appello.com / password123

## 🛠️ Development Commands

```bash
# Start local development
./start-local.sh
# OR
npm run dev

# Stop all processes
Ctrl+C

# Deploy to production
git add . && git commit -m "Update" && git push
vercel --prod

# Create sample data
node scripts/create-robust-dataset.js
node scripts/vav-expanded-complete.js
node scripts/fix-cost-code-alignment.js
```

## 📁 Key Navigation Paths

### **Main Application**:
- **Dashboard**: http://localhost:3000/dashboard
- **Projects**: http://localhost:3000/projects  
- **Jobs**: http://localhost:3000/jobs
- **Tasks**: http://localhost:3000/tasks

### **VAV Job Detail** (Showcase):
- **Base**: http://localhost:3000/jobs/[VAV_JOB_ID]
- **SOV Setup**: .../sov-setup
- **Schedule of Values**: .../sov-line-items
- **AP Register**: .../ap-register
- **Timelog Register**: .../timelog-register
- **Earned vs Burned**: .../earned-vs-burned
- **Progress Report**: .../progress-report

## 🎯 What This Demonstrates

### **For ICI Contractors**:
- **Complete project lifecycle** from bidding to completion
- **Financial controls** with cost code governance
- **Team coordination** across office and field personnel
- **Real-time reporting** for project health monitoring
- **Vendor management** with payment tracking
- **Time tracking** with cost allocation

### **For Software Development**:
- **Full-stack application** with modern tech stack
- **Real-time capabilities** with WebSocket integration
- **Complex data relationships** with proper MongoDB modeling
- **Financial calculations** and rollup functionality
- **Responsive design** for desktop and mobile
- **Production deployment** with serverless architecture

## 🔧 Technical Notes

### **Database Models** (Key Relationships):
- **Projects** → **Jobs** → **Tasks** → **Time Entries**
- **Jobs** → **SOV** → **Systems/Areas/Modules/Components**
- **Jobs** → **AP Register** (cost codes must match SOV)
- **Jobs** → **Timelog Register** (cost codes must match SOV)
- **Jobs** → **Progress Reports** (rollup from SOV line items)

### **Critical Validations**:
- **Cost Code Governance**: AP and Time entries MUST use SOV cost codes
- **Financial Rollup**: All costs must trace back to SOV line items
- **Hierarchical Structure**: SOV components properly linked
- **User Permissions**: Role-based access (admin, PM, supervisor, worker)

### **API Endpoints** (Key):
- `/api/projects` - Project management
- `/api/jobs` - Job management and details
- `/api/tasks` - Task tracking and assignment
- `/api/time-entries` - Time tracking
- `/api/sov` - Schedule of Values management
- `/api/financial` - Financial reporting and analysis

## 🚨 Important Notes for AI

### **When Working with This System**:
1. **Always respect SOV cost code governance** - never create AP or time entries with cost codes not in SOV
2. **Understand the hierarchy** - Projects contain Jobs, Jobs contain Tasks, everything rolls up financially
3. **Use realistic ICI contractor data** - this is a specialized industry with specific workflows
4. **Test financial integration** - ensure changes maintain proper rollup functionality
5. **Consider both office and field user perspectives** - different roles have different needs

### **Database Connection**:
- **Production MongoDB Atlas** is used for both local and production
- **Changes are immediately shared** between environments
- **No local MongoDB required** - everything uses the cloud database

### **Deployment**:
- **GitHub**: https://github.com/Appello-Prototypes/appello-prototype.git
- **Vercel**: Automatic deployment from main branch
- **Environment Variables**: Already configured in Vercel

---

## 🎉 Success Metrics

**This system successfully demonstrates**:
- ✅ Complete ICI contractor project management workflow
- ✅ Perfect financial integration and cost code governance  
- ✅ Real-time collaboration capabilities
- ✅ Comprehensive reporting and analytics
- ✅ Production-ready deployment with realistic data
- ✅ Mobile-responsive design for field operations
- ✅ Scalable architecture for enterprise use

**Ready for team testing and client demonstrations!** 🚀
