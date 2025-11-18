#!/usr/bin/env node

/**
 * Work Orders and Tasks Seed Script
 * Creates realistic work orders and associated tasks for the three scenario jobs
 * 
 * This script demonstrates the power of the Work Order → Tasks relationship:
 * - Work Orders are issued by clients/GCs with scope and specifications
 * - Tasks break down work orders into manageable field operations
 * - Multiple tasks can belong to one work order
 * - Tasks track progress, time, and costs at a granular level
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const WorkOrder = require('../src/server/models/WorkOrder');
const Task = require('../src/server/models/Task');
const Job = require('../src/server/models/Job');
const Project = require('../src/server/models/Project');
const User = require('../src/server/models/User');
const System = require('../src/server/models/System');
const Area = require('../src/server/models/Area');
const Phase = require('../src/server/models/Phase');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Connect to database
async function connectDB() {
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_DEV_URI or MONGODB_URI environment variable is not set');
  }
  
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  log('✅ Connected to MongoDB', colors.green);
}

// Get or create users
async function getOrCreateUsers() {
  const users = [];
  const userRoles = [
    { name: 'John Smith', email: 'john.smith@example.com', role: 'field_supervisor' },
    { name: 'Mike Johnson', email: 'mike.johnson@example.com', role: 'field_supervisor' },
    { name: 'Sarah Williams', email: 'sarah.williams@example.com', role: 'field_supervisor' },
    { name: 'Tom Brown', email: 'tom.brown@example.com', role: 'field_supervisor' },
    { name: 'Lisa Davis', email: 'lisa.davis@example.com', role: 'project_manager' },
    { name: 'Bob Wilson', email: 'bob.wilson@example.com', role: 'field_worker' },
    { name: 'Alice Martinez', email: 'alice.martinez@example.com', role: 'field_worker' },
    { name: 'Charlie Taylor', email: 'charlie.taylor@example.com', role: 'field_worker' },
  ];

  for (const userData of userRoles) {
    let user = await User.findOne({ email: userData.email });
    if (!user) {
      user = await User.create({
        ...userData,
        password: 'demo123', // Demo password
        phone: '555-0100',
      });
      log(`  Created user: ${userData.name}`, colors.cyan);
    }
    users.push(user);
  }
  return users;
}

// JOB 1: Mechanical Insulation - Petrochemical Plant
// Work Orders based on scenarios: Weather impact, Material escalation, Rework, Recovery
const job1WorkOrders = [
  {
    workOrderNumber: 'WO-2025-INS-001-001',
    title: 'Process Unit A - Hot Piping Insulation',
    description: 'Install thermal insulation on all hot process piping in Process Unit A. Includes piping from 2" to 24" diameter, operating temperatures 150°C to 400°C.',
    issuedBy: 'Suncor Energy - Project Management',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Install mineral wool and calcium silicate insulation on:
- All hot process piping (2" to 24" diameter)
- Operating temperatures: 150°C to 400°C
- Total linear feet: 8,500 LF
- Include jacketing and weatherproofing
- Comply with ASME B31.3 and client specifications`,
    specifications: 'Mineral wool density: 8 pcf minimum. Calcium silicate for temperatures above 300°C. Aluminum jacketing 0.032" thickness. All joints sealed with weatherproof tape.',
    dueDate: new Date('2025-03-15'),
    issuedDate: new Date('2025-01-05'),
    receivedDate: new Date('2025-01-06'),
    estimatedHours: 1200,
    estimatedCost: 285000,
    tasks: [
      { title: 'Install Insulation - 2" to 6" Piping', craft: 'insulation', costCode: '006', estimatedHours: 320, category: 'installation', priority: 'high' },
      { title: 'Install Insulation - 8" to 12" Piping', craft: 'insulation', costCode: '006', estimatedHours: 280, category: 'installation', priority: 'high' },
      { title: 'Install Insulation - 14" to 24" Piping', craft: 'insulation', costCode: '006', estimatedHours: 240, category: 'installation', priority: 'high' },
      { title: 'Install Aluminum Jacketing', craft: 'insulation', costCode: '006', estimatedHours: 180, category: 'jacketing', priority: 'medium' },
      { title: 'Weatherproofing and Sealing', craft: 'insulation', costCode: '006', estimatedHours: 180, category: 'installation', priority: 'medium' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-INS-001-002',
    title: 'Process Unit A - Vessel Insulation',
    description: 'Install insulation on process vessels and tanks in Process Unit A. Includes vertical and horizontal vessels.',
    issuedBy: 'Suncor Energy - Project Management',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Install insulation on:
- 4 vertical vessels (8' to 12' diameter, 20' to 40' height)
- 2 horizontal vessels (6' diameter, 30' length)
- Operating temperatures: 200°C to 350°C
- Total surface area: 4,200 SF`,
    specifications: 'Mineral wool insulation 4" thickness. Aluminum jacketing with proper support rings. All penetrations sealed.',
    dueDate: new Date('2025-03-30'),
    issuedDate: new Date('2025-01-10'),
    receivedDate: new Date('2025-01-11'),
    estimatedHours: 800,
    estimatedCost: 195000,
    tasks: [
      { title: 'Install Insulation - Vertical Vessels', craft: 'insulation', costCode: '006', estimatedHours: 320, category: 'installation', priority: 'high' },
      { title: 'Install Insulation - Horizontal Vessels', craft: 'insulation', costCode: '006', estimatedHours: 200, category: 'installation', priority: 'high' },
      { title: 'Install Support Rings and Hardware', craft: 'insulation', costCode: '006', estimatedHours: 120, category: 'installation', priority: 'medium' },
      { title: 'Install Vessel Jacketing', craft: 'insulation', costCode: '006', estimatedHours: 160, category: 'jacketing', priority: 'medium' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-INS-001-003',
    title: 'Material Escalation - Additional Insulation Materials',
    description: 'Change order for additional insulation materials due to price escalation and scope adjustments.',
    issuedBy: 'Suncor Energy - Project Management',
    priority: 'critical',
    status: 'completed',
    isChangeOrder: true,
    scopeOfWork: 'Purchase and install additional mineral wool and calcium silicate insulation materials due to 25% price escalation and scope adjustments.',
    specifications: 'Same specifications as original work orders. Materials to be procured immediately to avoid further delays.',
    dueDate: new Date('2025-04-15'),
    issuedDate: new Date('2025-03-10'),
    receivedDate: new Date('2025-03-11'),
    estimatedHours: 0,
    estimatedCost: 75000,
    tasks: [
      { title: 'Procure Additional Insulation Materials', craft: 'general', costCode: '001', estimatedHours: 40, category: 'material_handling', priority: 'critical' },
      { title: 'Material Receiving and Inspection', craft: 'general', costCode: '001', estimatedHours: 16, category: 'material_handling', priority: 'high' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-INS-001-004',
    title: 'Rework - Process Unit A Quality Issues',
    description: 'Rework required on 15% of installed insulation due to quality issues identified during inspection.',
    issuedBy: 'Suncor Energy - Quality Control',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Rework insulation on:
- Areas identified in quality inspection report
- Approximately 15% of total installed work
- Focus on weatherproofing and joint sealing
- Ensure compliance with specifications`,
    specifications: 'Remove and reinstall insulation where deficiencies found. Improve weatherproofing and sealing.',
    dueDate: new Date('2025-05-01'),
    issuedDate: new Date('2025-04-15'),
    receivedDate: new Date('2025-04-16'),
    estimatedHours: 320,
    estimatedCost: 85000,
    tasks: [
      { title: 'Remove Deficient Insulation', craft: 'insulation', costCode: '006', estimatedHours: 80, category: 'repair', priority: 'high' },
      { title: 'Reinstall Insulation - Corrected', craft: 'insulation', costCode: '006', estimatedHours: 120, category: 'installation', priority: 'high' },
      { title: 'Improve Weatherproofing and Sealing', craft: 'insulation', costCode: '006', estimatedHours: 120, category: 'installation', priority: 'high' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-INS-001-005',
    title: 'Process Unit B - Hot Piping Insulation',
    description: 'Install thermal insulation on hot process piping in Process Unit B. Accelerated schedule to meet project deadline.',
    issuedBy: 'Suncor Energy - Project Management',
    priority: 'critical',
    status: 'completed',
    scopeOfWork: `Install insulation on:
- All hot process piping in Process Unit B
- Total linear feet: 7,200 LF
- Operating temperatures: 150°C to 400°C
- Accelerated schedule with overtime`,
    specifications: 'Same specifications as Process Unit A. Work to be completed with overtime crews.',
    dueDate: new Date('2025-06-15'),
    issuedDate: new Date('2025-05-01'),
    receivedDate: new Date('2025-05-02'),
    estimatedHours: 1400,
    estimatedCost: 320000,
    tasks: [
      { title: 'Install Insulation - Small Diameter Piping', craft: 'insulation', costCode: '006', estimatedHours: 400, category: 'installation', priority: 'critical' },
      { title: 'Install Insulation - Large Diameter Piping', craft: 'insulation', costCode: '006', estimatedHours: 350, category: 'installation', priority: 'critical' },
      { title: 'Install Jacketing - Process Unit B', craft: 'insulation', costCode: '006', estimatedHours: 300, category: 'jacketing', priority: 'high' },
      { title: 'Weatherproofing and Final Inspection', craft: 'insulation', costCode: '006', estimatedHours: 350, category: 'installation', priority: 'high' },
    ]
  },
];

// JOB 2: Mechanical (Piping/HVAC) - Hospital HVAC
// Work Orders based on scenarios: Coordination delays, Change orders, Equipment delays, Overtime push
const job2WorkOrders = [
  {
    workOrderNumber: 'WO-2025-MECH-001-001',
    title: 'Main HVAC Ductwork Installation - Wing A',
    description: 'Install main HVAC ductwork for Hospital Wing A. Includes supply and return ducts, connections to air handling units.',
    issuedBy: 'Hospital Authority - General Contractor',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Install HVAC ductwork:
- Main supply ducts: 3,200 LF
- Main return ducts: 2,800 LF
- Connections to 4 air handling units
- Fire dampers and access doors
- All per architectural and mechanical drawings`,
    specifications: 'Galvanized steel ductwork per SMACNA standards. Fire dampers per NFPA 90A. All joints sealed with approved sealant.',
    dueDate: new Date('2025-04-30'),
    issuedDate: new Date('2025-02-05'),
    receivedDate: new Date('2025-02-06'),
    estimatedHours: 1600,
    estimatedCost: 420000,
    tasks: [
      { title: 'Install Main Supply Ducts', craft: 'general', costCode: '005', estimatedHours: 600, category: 'installation', priority: 'high' },
      { title: 'Install Main Return Ducts', craft: 'general', costCode: '005', estimatedHours: 500, category: 'installation', priority: 'high' },
      { title: 'Install Fire Dampers and Access Doors', craft: 'general', costCode: '005', estimatedHours: 200, category: 'installation', priority: 'medium' },
      { title: 'Ductwork Sealing and Testing', craft: 'general', costCode: '005', estimatedHours: 300, category: 'inspection', priority: 'medium' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-MECH-001-002',
    title: 'HVAC Piping Installation - Chilled Water System',
    description: 'Install chilled water piping system for HVAC. Includes supply and return lines, connections to chillers.',
    issuedBy: 'Hospital Authority - General Contractor',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Install chilled water piping:
- Supply lines: 2,400 LF (4" to 12" diameter)
- Return lines: 2,400 LF (4" to 12" diameter)
- Connections to 3 chillers
- Valves, strainers, and accessories
- Insulation included`,
    specifications: 'Schedule 40 carbon steel pipe. Welded joints per ASME B31.9. Pre-insulated pipe sections. All valves and accessories per specifications.',
    dueDate: new Date('2025-05-15'),
    issuedDate: new Date('2025-02-15'),
    receivedDate: new Date('2025-02-16'),
    estimatedHours: 1200,
    estimatedCost: 380000,
    tasks: [
      { title: 'Install Chilled Water Supply Piping', craft: 'general', costCode: '005', estimatedHours: 400, category: 'installation', priority: 'high' },
      { title: 'Install Chilled Water Return Piping', craft: 'general', costCode: '005', estimatedHours: 400, category: 'installation', priority: 'high' },
      { title: 'Install Valves and Accessories', craft: 'general', costCode: '005', estimatedHours: 200, category: 'installation', priority: 'medium' },
      { title: 'Piping Pressure Testing', craft: 'general', costCode: '005', estimatedHours: 200, category: 'inspection', priority: 'medium' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-MECH-001-003',
    title: 'Change Order - Additional Ductwork for Wing B',
    description: 'Change order to add HVAC ductwork for newly approved Hospital Wing B expansion.',
    issuedBy: 'Hospital Authority - General Contractor',
    priority: 'critical',
    status: 'completed',
    isChangeOrder: true,
    scopeOfWork: `Install additional HVAC ductwork:
- Supply ducts: 2,100 LF
- Return ducts: 1,900 LF
- Connections to existing system
- Fire dampers and accessories`,
    specifications: 'Same specifications as Wing A. Work to be coordinated with ongoing construction.',
    dueDate: new Date('2025-06-30'),
    issuedDate: new Date('2025-05-10'),
    receivedDate: new Date('2025-05-11'),
    estimatedHours: 1000,
    estimatedCost: 280000,
    tasks: [
      { title: 'Install Additional Supply Ducts - Wing B', craft: 'general', costCode: '005', estimatedHours: 400, category: 'installation', priority: 'critical' },
      { title: 'Install Additional Return Ducts - Wing B', craft: 'general', costCode: '005', estimatedHours: 350, category: 'installation', priority: 'critical' },
      { title: 'Connect to Existing System', craft: 'general', costCode: '005', estimatedHours: 150, category: 'installation', priority: 'high' },
      { title: 'Install Fire Dampers - Wing B', craft: 'general', costCode: '005', estimatedHours: 100, category: 'installation', priority: 'medium' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-MECH-001-004',
    title: 'HVAC Equipment Installation - Air Handling Units',
    description: 'Install air handling units. Work delayed due to equipment delivery delays.',
    issuedBy: 'Hospital Authority - General Contractor',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Install 4 air handling units:
- Units 1 & 2: 20,000 CFM each
- Units 3 & 4: 15,000 CFM each
- Electrical connections
- Ductwork connections
- Controls integration`,
    specifications: 'Units per manufacturer specifications. All connections per mechanical drawings. Controls per BAS specifications.',
    dueDate: new Date('2025-08-15'),
    issuedDate: new Date('2025-07-01'),
    receivedDate: new Date('2025-07-02'),
    estimatedHours: 800,
    estimatedCost: 250000,
    tasks: [
      { title: 'Receive and Inspect Air Handling Units', craft: 'equipment', costCode: '005', estimatedHours: 40, category: 'equipment_check', priority: 'high' },
      { title: 'Install Air Handling Units 1 & 2', craft: 'equipment', costCode: '005', estimatedHours: 280, category: 'installation', priority: 'high' },
      { title: 'Install Air Handling Units 3 & 4', craft: 'equipment', costCode: '005', estimatedHours: 240, category: 'installation', priority: 'high' },
      { title: 'Connect Ductwork to Units', craft: 'general', costCode: '005', estimatedHours: 120, category: 'installation', priority: 'medium' },
      { title: 'Electrical and Controls Integration', craft: 'equipment', costCode: '005', estimatedHours: 120, category: 'installation', priority: 'medium' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-MECH-001-005',
    title: 'Final Push - Complete All Remaining Work',
    description: 'Accelerated work order to complete all remaining HVAC work with overtime crews to meet project deadline.',
    issuedBy: 'Hospital Authority - General Contractor',
    priority: 'critical',
    status: 'completed',
    scopeOfWork: `Complete all remaining HVAC work:
- Finish all ductwork connections
- Complete all piping connections
- Final testing and balancing
- System commissioning
- Overtime crews authorized`,
    specifications: 'All work per original specifications. Overtime authorized to meet deadline.',
    dueDate: new Date('2025-09-15'),
    issuedDate: new Date('2025-08-20'),
    receivedDate: new Date('2025-08-21'),
    estimatedHours: 1200,
    estimatedCost: 350000,
    tasks: [
      { title: 'Complete All Ductwork Connections', craft: 'general', costCode: '005', estimatedHours: 300, category: 'installation', priority: 'critical' },
      { title: 'Complete All Piping Connections', craft: 'general', costCode: '005', estimatedHours: 250, category: 'installation', priority: 'critical' },
      { title: 'System Testing and Balancing', craft: 'general', costCode: '005', estimatedHours: 300, category: 'inspection', priority: 'high' },
      { title: 'System Commissioning', craft: 'equipment', costCode: '005', estimatedHours: 350, category: 'installation', priority: 'high' },
    ]
  },
];

// JOB 3: Electrical - Data Center
// Work Orders based on scenarios: Slow start, Material volatility, Testing delays, Subcontractor issues
const job3WorkOrders = [
  {
    workOrderNumber: 'WO-2025-ELEC-001-001',
    title: 'Main Power Distribution - Phase 1',
    description: 'Install main power distribution system for Data Center. Phase 1 includes main switchgear and primary feeders.',
    issuedBy: 'TechCorp Data Center - General Contractor',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Install main power distribution:
- Main switchgear: 4,000A, 480V
- Primary feeders: 3,500 LF
- Distribution panels: 12 panels
- All per electrical drawings`,
    specifications: 'Copper conductors per NEC. All equipment per UL listings. Coordination study required.',
    dueDate: new Date('2025-06-30'),
    issuedDate: new Date('2025-03-15'),
    receivedDate: new Date('2025-03-20'),
    estimatedHours: 1400,
    estimatedCost: 520000,
    tasks: [
      { title: 'Install Main Switchgear', craft: 'general', costCode: '004', estimatedHours: 400, category: 'installation', priority: 'high' },
      { title: 'Install Primary Feeders', craft: 'general', costCode: '004', estimatedHours: 500, category: 'installation', priority: 'high' },
      { title: 'Install Distribution Panels', craft: 'general', costCode: '004', estimatedHours: 300, category: 'installation', priority: 'medium' },
      { title: 'Electrical Testing - Phase 1', craft: 'general', costCode: '004', estimatedHours: 200, category: 'inspection', priority: 'medium' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-ELEC-001-002',
    title: 'UPS and Backup Power Systems',
    description: 'Install UPS systems and backup generators for Data Center. Critical systems requiring extensive testing.',
    issuedBy: 'TechCorp Data Center - General Contractor',
    priority: 'critical',
    status: 'completed',
    scopeOfWork: `Install backup power systems:
- 3 UPS systems: 500 kVA each
- 2 backup generators: 1,000 kW each
- Transfer switches and controls
- Fuel systems
- Extensive testing required`,
    specifications: 'All systems per manufacturer specifications. Testing per NFPA 110. Load bank testing required.',
    dueDate: new Date('2025-09-30'),
    issuedDate: new Date('2025-04-01'),
    receivedDate: new Date('2025-04-05'),
    estimatedHours: 1800,
    estimatedCost: 680000,
    tasks: [
      { title: 'Install UPS Systems', craft: 'equipment', costCode: '004', estimatedHours: 500, category: 'installation', priority: 'critical' },
      { title: 'Install Backup Generators', craft: 'equipment', costCode: '004', estimatedHours: 400, category: 'installation', priority: 'critical' },
      { title: 'Install Transfer Switches and Controls', craft: 'general', costCode: '004', estimatedHours: 300, category: 'installation', priority: 'high' },
      { title: 'Install Fuel Systems', craft: 'general', costCode: '004', estimatedHours: 200, category: 'installation', priority: 'high' },
      { title: 'Load Bank Testing and Commissioning', craft: 'equipment', costCode: '004', estimatedHours: 400, category: 'inspection', priority: 'high' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-ELEC-001-003',
    title: 'Data Center Lighting Installation',
    description: 'Install lighting systems throughout Data Center. Includes high-bay fixtures, emergency lighting, and controls.',
    issuedBy: 'TechCorp Data Center - General Contractor',
    priority: 'medium',
    status: 'completed',
    scopeOfWork: `Install lighting systems:
- High-bay LED fixtures: 240 fixtures
- Emergency lighting: 60 fixtures
- Lighting controls and dimming
- All per electrical and lighting drawings`,
    specifications: 'LED fixtures per energy code. Emergency lighting per NFPA 101. Controls per BAS integration.',
    dueDate: new Date('2025-08-15'),
    issuedDate: new Date('2025-05-01'),
    receivedDate: new Date('2025-05-05'),
    estimatedHours: 800,
    estimatedCost: 180000,
    tasks: [
      { title: 'Install High-Bay LED Fixtures', craft: 'general', costCode: '004', estimatedHours: 400, category: 'installation', priority: 'medium' },
      { title: 'Install Emergency Lighting', craft: 'general', costCode: '004', estimatedHours: 200, category: 'installation', priority: 'medium' },
      { title: 'Install Lighting Controls', craft: 'general', costCode: '004', estimatedHours: 200, category: 'installation', priority: 'low' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-ELEC-001-004',
    title: 'Fire Alarm and Life Safety Systems',
    description: 'Install fire alarm and life safety systems. Extensive testing and commissioning required.',
    issuedBy: 'TechCorp Data Center - General Contractor',
    priority: 'high',
    status: 'completed',
    scopeOfWork: `Install fire alarm systems:
- Fire alarm control panel
- Smoke detectors: 180 devices
- Heat detectors: 60 devices
- Pull stations and notification devices
- Integration with building systems
- Extensive testing required`,
    specifications: 'All per NFPA 72. UL listed equipment. Integration testing with HVAC and other systems.',
    dueDate: new Date('2025-10-30'),
    issuedDate: new Date('2025-06-01'),
    receivedDate: new Date('2025-06-05'),
    estimatedHours: 1000,
    estimatedCost: 320000,
    tasks: [
      { title: 'Install Fire Alarm Control Panel', craft: 'general', costCode: '004', estimatedHours: 120, category: 'installation', priority: 'high' },
      { title: 'Install Smoke and Heat Detectors', craft: 'general', costCode: '004', estimatedHours: 400, category: 'installation', priority: 'high' },
      { title: 'Install Notification Devices', craft: 'general', costCode: '004', estimatedHours: 200, category: 'installation', priority: 'medium' },
      { title: 'System Integration and Testing', craft: 'general', costCode: '004', estimatedHours: 280, category: 'inspection', priority: 'high' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-ELEC-001-005',
    title: 'Low-Voltage Systems - Subcontractor Work',
    description: 'Low-voltage systems installation by subcontractor. Requires oversight and coordination.',
    issuedBy: 'TechCorp Data Center - General Contractor',
    priority: 'medium',
    status: 'completed',
    scopeOfWork: `Subcontractor to install:
- Data cabling: Category 6A
- Fiber optic cabling
- Security systems
- Access control systems
- General contractor provides oversight`,
    specifications: 'All per TIA/EIA standards. Subcontractor work with GC oversight.',
    dueDate: new Date('2025-11-30'),
    issuedDate: new Date('2025-07-01'),
    receivedDate: new Date('2025-07-05'),
    estimatedHours: 600,
    estimatedCost: 220000,
    tasks: [
      { title: 'Oversee Data Cabling Installation', craft: 'general', costCode: '004', estimatedHours: 200, category: 'inspection', priority: 'medium' },
      { title: 'Oversee Fiber Optic Installation', craft: 'general', costCode: '004', estimatedHours: 150, category: 'inspection', priority: 'medium' },
      { title: 'Coordinate Security Systems', craft: 'general', costCode: '004', estimatedHours: 150, category: 'administrative', priority: 'medium' },
      { title: 'Final Testing and Acceptance', craft: 'general', costCode: '004', estimatedHours: 100, category: 'inspection', priority: 'high' },
    ]
  },
  {
    workOrderNumber: 'WO-2025-ELEC-001-006',
    title: 'Final Commissioning and Testing',
    description: 'Final commissioning and testing of all electrical systems. Extensive testing required before handover.',
    issuedBy: 'TechCorp Data Center - General Contractor',
    priority: 'critical',
    status: 'completed',
    scopeOfWork: `Final commissioning:
- Complete system testing
- Load testing
- Coordination studies
- Documentation
- Training for facility staff`,
    specifications: 'All testing per NEC and NFPA standards. Complete documentation required.',
    dueDate: new Date('2025-12-15'),
    issuedDate: new Date('2025-11-01'),
    receivedDate: new Date('2025-11-02'),
    estimatedHours: 800,
    estimatedCost: 280000,
    tasks: [
      { title: 'Complete System Testing', craft: 'general', costCode: '004', estimatedHours: 300, category: 'inspection', priority: 'critical' },
      { title: 'Load Testing and Coordination', craft: 'equipment', costCode: '004', estimatedHours: 250, category: 'inspection', priority: 'critical' },
      { title: 'Documentation and As-Builts', craft: 'general', costCode: '004', estimatedHours: 150, category: 'documentation', priority: 'high' },
      { title: 'Training for Facility Staff', craft: 'general', costCode: '004', estimatedHours: 100, category: 'administrative', priority: 'medium' },
    ]
  },
];

async function seedWorkOrdersAndTasks() {
  try {
    await connectDB();

    // Get the three jobs
    const job1 = await Job.findOne({ jobNumber: 'JOB-2025-INS-001' });
    const job2 = await Job.findOne({ jobNumber: 'JOB-2025-MECH-001' });
    const job3 = await Job.findOne({ jobNumber: 'JOB-2025-ELEC-001' });

    if (!job1 || !job2 || !job3) {
      log('❌ Could not find all three jobs. Please run seed-three-scenario-jobs.js first.', colors.red);
      process.exit(1);
    }

    log('\n📋 Seeding Work Orders and Tasks...', colors.blue);
    log('='.repeat(60), colors.blue);

    // Get or create users
    const users = await getOrCreateUsers();
    const supervisors = users.filter(u => u.role === 'field_supervisor' || u.role === 'project_manager');
    const workers = users.filter(u => u.role === 'field_worker');

    // Get projects
    const project1 = await Project.findById(job1.projectId);
    const project2 = await Project.findById(job2.projectId);
    const project3 = await Project.findById(job3.projectId);

    // Get WBS structures for each job
    const job1Systems = await System.find({ jobId: job1._id });
    const job1Areas = await Area.find({ jobId: job1._id });
    const job1Phases = await Phase.find({ jobId: job1._id });

    const job2Systems = await System.find({ jobId: job2._id });
    const job2Areas = await Area.find({ jobId: job2._id });
    const job2Phases = await Phase.find({ jobId: job2._id });

    const job3Systems = await System.find({ jobId: job3._id });
    const job3Areas = await Area.find({ jobId: job3._id });
    const job3Phases = await Phase.find({ jobId: job3._id });

    // Helper function to create work order and tasks
    async function createWorkOrderWithTasks(workOrderData, job, project, systems, areas, phases) {
      // Check if work order already exists
      const existing = await WorkOrder.findOne({ workOrderNumber: workOrderData.workOrderNumber });
      if (existing) {
        log(`  ⚠️  Work order ${workOrderData.workOrderNumber} already exists, skipping...`, colors.yellow);
        return existing;
      }

      // Assign random supervisor or project manager
      const assignedTo = supervisors[Math.floor(Math.random() * supervisors.length)];

      // Get random system, area, phase if available
      const systemId = systems.length > 0 ? systems[Math.floor(Math.random() * systems.length)]._id : null;
      const areaId = areas.length > 0 ? areas[Math.floor(Math.random() * areas.length)]._id : null;
      const phaseId = phases.length > 0 ? phases[Math.floor(Math.random() * phases.length)]._id : null;

      // Create work order
      const workOrder = await WorkOrder.create({
        ...workOrderData,
        jobId: job._id,
        projectId: project._id,
        assignedTo: assignedTo._id,
        createdBy: users[0]._id, // Use first user as creator
        systemId,
        areaId,
        phaseId,
        completionPercentage: workOrderData.status === 'completed' ? 100 : 
                              workOrderData.status === 'in_progress' ? Math.floor(Math.random() * 60) + 20 : 0,
        actualHours: workOrderData.status === 'completed' 
          ? workOrderData.estimatedHours * (0.9 + Math.random() * 0.2) // 90-110% of estimated
          : workOrderData.status === 'in_progress'
          ? workOrderData.estimatedHours * (0.3 + Math.random() * 0.4) // 30-70% of estimated
          : 0,
        actualCost: workOrderData.status === 'completed'
          ? workOrderData.estimatedCost * (0.95 + Math.random() * 0.1) // 95-105% of estimated
          : 0,
        completedDate: workOrderData.status === 'completed' ? workOrderData.dueDate : null,
      });

      log(`  ✅ Created work order: ${workOrder.workOrderNumber}`, colors.green);

      // Create tasks for this work order
      const createdTasks = [];
      for (const taskData of workOrderData.tasks) {
        // Assign random worker
        const taskAssignedTo = workers[Math.floor(Math.random() * workers.length)];

        // Determine task status based on work order status
        let taskStatus = 'not_started';
        let completionPercentage = 0;
        let actualHours = 0;

        if (workOrder.status === 'completed') {
          taskStatus = 'completed';
          completionPercentage = 100;
          actualHours = taskData.estimatedHours * (0.9 + Math.random() * 0.2);
        } else if (workOrder.status === 'in_progress') {
          taskStatus = Math.random() > 0.3 ? 'in_progress' : 'completed';
          completionPercentage = taskStatus === 'completed' ? 100 : Math.floor(Math.random() * 70) + 10;
          actualHours = taskData.estimatedHours * (completionPercentage / 100) * (0.8 + Math.random() * 0.4);
        }

        const task = await Task.create({
          title: taskData.title,
          description: `${taskData.title} for ${workOrder.title}`,
          jobId: job._id,
          projectId: project._id,
          workOrderId: workOrder._id,
          workOrderNumber: workOrder.workOrderNumber, // Legacy field
          assignedTo: taskAssignedTo._id,
          createdBy: users[0]._id,
          status: taskStatus,
          priority: taskData.priority,
          category: taskData.category,
          craft: taskData.craft,
          costCode: taskData.costCode,
          estimatedHours: taskData.estimatedHours,
          actualHours: actualHours,
          completionPercentage: completionPercentage,
          dueDate: workOrder.dueDate,
          systemId: systemId,
          areaId: areaId,
          phaseId: phaseId,
        });

        createdTasks.push(task);
      }

      log(`    ✅ Created ${createdTasks.length} tasks for ${workOrder.workOrderNumber}`, colors.cyan);
      return workOrder;
    }

    // Seed Job 1 work orders and tasks
    log('\n📦 Job 1: Mechanical Insulation - Petrochemical Plant', colors.magenta);
    const job1WorkOrdersCreated = [];
    for (const woData of job1WorkOrders) {
      const wo = await createWorkOrderWithTasks(woData, job1, project1, job1Systems, job1Areas, job1Phases);
      job1WorkOrdersCreated.push(wo);
    }
    log(`✅ Created ${job1WorkOrdersCreated.length} work orders for Job 1`, colors.green);

    // Seed Job 2 work orders and tasks
    log('\n📦 Job 2: Mechanical (Piping/HVAC) - Hospital HVAC', colors.magenta);
    const job2WorkOrdersCreated = [];
    for (const woData of job2WorkOrders) {
      const wo = await createWorkOrderWithTasks(woData, job2, project2, job2Systems, job2Areas, job2Phases);
      job2WorkOrdersCreated.push(wo);
    }
    log(`✅ Created ${job2WorkOrdersCreated.length} work orders for Job 2`, colors.green);

    // Seed Job 3 work orders and tasks
    log('\n📦 Job 3: Electrical - Data Center', colors.magenta);
    const job3WorkOrdersCreated = [];
    for (const woData of job3WorkOrders) {
      const wo = await createWorkOrderWithTasks(woData, job3, project3, job3Systems, job3Areas, job3Phases);
      job3WorkOrdersCreated.push(wo);
    }
    log(`✅ Created ${job3WorkOrdersCreated.length} work orders for Job 3`, colors.green);

    // Summary
    const totalWorkOrders = job1WorkOrdersCreated.length + job2WorkOrdersCreated.length + job3WorkOrdersCreated.length;
    const totalTasks = await Task.countDocuments({ 
      workOrderId: { $in: [...job1WorkOrdersCreated, ...job2WorkOrdersCreated, ...job3WorkOrdersCreated].map(wo => wo._id) }
    });

    log('\n' + '='.repeat(60), colors.blue);
    log('✅ WORK ORDERS AND TASKS SEED COMPLETE', colors.green);
    log('='.repeat(60), colors.blue);
    log(`\n📊 Summary:`, colors.cyan);
    log(`  • Total Work Orders Created: ${totalWorkOrders}`, colors.green);
    log(`  • Total Tasks Created: ${totalTasks}`, colors.green);
    log(`  • Job 1: ${job1WorkOrdersCreated.length} work orders`, colors.green);
    log(`  • Job 2: ${job2WorkOrdersCreated.length} work orders`, colors.green);
    log(`  • Job 3: ${job3WorkOrdersCreated.length} work orders`, colors.green);
    log(`\n🎯 You can now explore:`, colors.cyan);
    log(`  • Work orders at /jobs/:jobId/work-orders`, colors.yellow);
    log(`  • Tasks filtered by work order`, colors.yellow);
    log(`  • Work order detail pages showing associated tasks`, colors.yellow);
    log(`  • Task detail pages showing work order information`, colors.yellow);

    process.exit(0);
  } catch (error) {
    log(`\n❌ Error seeding work orders and tasks: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the seed function
seedWorkOrdersAndTasks();

