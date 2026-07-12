import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding AssetFlow with full demo data...');

  // Clean existing tables (order matters due to foreign keys)
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.auditRecord.deleteMany();
  await prisma.auditCycle.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.resourceBooking.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.assetAllocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // ─────────────────────────────────────────
  // 1. Departments
  // ─────────────────────────────────────────
  const eng = await prisma.department.create({ data: { name: 'Engineering', isActive: true } });
  const design = await prisma.department.create({ data: { name: 'Design', isActive: true } });
  const ops = await prisma.department.create({ data: { name: 'Operations', isActive: true } });
  const hr = await prisma.department.create({ data: { name: 'Human Resources', isActive: true } });
  const finance = await prisma.department.create({ data: { name: 'Finance', isActive: true } });
  console.log('  ✓ 5 departments created.');

  // ─────────────────────────────────────────
  // 2. Asset Categories
  // ─────────────────────────────────────────
  const electronics = await prisma.assetCategory.create({
    data: { name: 'Electronics', description: 'Laptops, Monitors, Phones, Accessories', customFields: JSON.stringify({ warranty_months: 24 }) }
  });
  const furniture = await prisma.assetCategory.create({
    data: { name: 'Furniture', description: 'Desks, Chairs, Shelves, Podiums', customFields: JSON.stringify({ material: 'Wood/Steel' }) }
  });
  const vehicles = await prisma.assetCategory.create({
    data: { name: 'Vehicles', description: 'Company cars, Delivery vans, Scooters', customFields: JSON.stringify({ insurance_expiry: '2027-12-31' }) }
  });
  const spaces = await prisma.assetCategory.create({
    data: { name: 'Shared Spaces', description: 'Conference rooms, Labs, Office spaces', customFields: JSON.stringify({ capacity: 12 }) }
  });
  const itInfra = await prisma.assetCategory.create({
    data: { name: 'IT Infrastructure', description: 'Servers, Routers, Switches, UPS', customFields: JSON.stringify({ rack_unit: '2U' }) }
  });
  console.log('  ✓ 5 asset categories created.');

  // ─────────────────────────────────────────
  // 3. Users (all roles)
  // ─────────────────────────────────────────
  const hash = await bcrypt.hash('Admin@1234', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@assetflow.com', name: 'Vikram Patel (Admin)', passwordHash: hash, role: 'Admin', isActive: true }
  });

  const manager = await prisma.user.create({
    data: { email: 'manager@assetflow.com', name: 'Sarah Khan (Asset Manager)', passwordHash: hash, role: 'Asset_Manager', isActive: true, departmentId: ops.id }
  });

  const headEng = await prisma.user.create({
    data: { email: 'head.eng@assetflow.com', name: 'Alex Sharma (Eng Head)', passwordHash: hash, role: 'Department_Head', isActive: true, departmentId: eng.id }
  });

  const headDesign = await prisma.user.create({
    data: { email: 'head.design@assetflow.com', name: 'Neha Gupta (Design Head)', passwordHash: hash, role: 'Department_Head', isActive: true, departmentId: design.id }
  });

  const priya = await prisma.user.create({
    data: { email: 'priya@assetflow.com', name: 'Priya Verma (Engineer)', passwordHash: hash, role: 'Employee', isActive: true, departmentId: eng.id }
  });

  const raj = await prisma.user.create({
    data: { email: 'raj@assetflow.com', name: 'Raj Mehta (Designer)', passwordHash: hash, role: 'Employee', isActive: true, departmentId: design.id }
  });

  const amit = await prisma.user.create({
    data: { email: 'amit@assetflow.com', name: 'Amit Singh (Engineer)', passwordHash: hash, role: 'Employee', isActive: true, departmentId: eng.id }
  });

  const sneha = await prisma.user.create({
    data: { email: 'sneha@assetflow.com', name: 'Sneha Reddy (HR)', passwordHash: hash, role: 'Employee', isActive: true, departmentId: hr.id }
  });

  // Assign department heads
  await prisma.department.update({ where: { id: eng.id }, data: { managerId: headEng.id } });
  await prisma.department.update({ where: { id: design.id }, data: { managerId: headDesign.id } });

  console.log('  ✓ 8 users created (Admin, Asset Manager, 2 Dept Heads, 4 Employees).');

  // ─────────────────────────────────────────
  // 4. Assets (12 items with varied statuses)
  // ─────────────────────────────────────────
  const laptopPriya = await prisma.asset.create({
    data: { name: 'MacBook Pro 16"', categoryId: electronics.id, assetTag: 'AF-0001', serialNumber: 'SN-MBP16001', acquisitionDate: new Date('2025-01-10'), acquisitionCost: 2500, condition: 'New', location: 'Priya\'s Desk', isShared: false, status: 'Allocated' }
  });
  const monitorRaj = await prisma.asset.create({
    data: { name: 'Dell UltraSharp 27" Monitor', categoryId: electronics.id, assetTag: 'AF-0002', serialNumber: 'SN-DELL2701', acquisitionDate: new Date('2025-03-15'), acquisitionCost: 650, condition: 'Good', location: 'Raj\'s Desk', isShared: false, status: 'Allocated' }
  });
  const iphone = await prisma.asset.create({
    data: { name: 'iPhone 15 Pro', categoryId: electronics.id, assetTag: 'AF-0003', serialNumber: 'SN-IPH15P01', acquisitionDate: new Date('2025-06-01'), acquisitionCost: 1200, condition: 'New', location: 'Warehouse', isShared: false, status: 'Available' }
  });
  const chair = await prisma.asset.create({
    data: { name: 'Ergonomic Desk Chair', categoryId: furniture.id, assetTag: 'AF-0004', serialNumber: 'SN-CHAIR001', acquisitionDate: new Date('2024-08-20'), acquisitionCost: 450, condition: 'Good', location: 'Warehouse', isShared: false, status: 'Available' }
  });
  const desk = await prisma.asset.create({
    data: { name: 'Standing Desk (Electric)', categoryId: furniture.id, assetTag: 'AF-0005', serialNumber: 'SN-DESK001', acquisitionDate: new Date('2024-11-05'), acquisitionCost: 800, condition: 'Good', location: 'Warehouse', isShared: false, status: 'Available' }
  });
  const roomB2 = await prisma.asset.create({
    data: { name: 'Meeting Room B2', categoryId: spaces.id, assetTag: 'AF-0101', serialNumber: 'ROOM-B2', condition: 'Good', location: '1st Floor, Wing B', isShared: true, status: 'Available' }
  });
  const roomA1 = await prisma.asset.create({
    data: { name: 'Conference Room A1', categoryId: spaces.id, assetTag: 'AF-0102', serialNumber: 'ROOM-A1', condition: 'Good', location: 'Ground Floor, Main Bldg', isShared: true, status: 'Available' }
  });
  const projector = await prisma.asset.create({
    data: { name: '4K Conference Projector', categoryId: electronics.id, assetTag: 'AF-0103', serialNumber: 'SN-PROJ909', acquisitionDate: new Date('2025-02-14'), acquisitionCost: 900, condition: 'Good', location: 'Main Conference Room', isShared: true, status: 'Available' }
  });
  const tesla = await prisma.asset.create({
    data: { name: 'Tesla Model 3', categoryId: vehicles.id, assetTag: 'AF-0201', serialNumber: 'SN-TESLA33', acquisitionDate: new Date('2024-06-15'), acquisitionCost: 42000, condition: 'Good', location: 'Basement Parking', isShared: true, status: 'Under_Maintenance' }
  });
  const van = await prisma.asset.create({
    data: { name: 'Delivery Van (Tata Ace)', categoryId: vehicles.id, assetTag: 'AF-0202', serialNumber: 'SN-TATA001', acquisitionDate: new Date('2023-09-01'), acquisitionCost: 8500, condition: 'Fair', location: 'Basement Parking', isShared: true, status: 'Available' }
  });
  const server = await prisma.asset.create({
    data: { name: 'Rack Server (Dell R740)', categoryId: itInfra.id, assetTag: 'AF-0301', serialNumber: 'SN-SRVR740', acquisitionDate: new Date('2024-01-20'), acquisitionCost: 12000, condition: 'Good', location: 'Server Room, Rack 4', isShared: false, status: 'Available' }
  });
  const ups = await prisma.asset.create({
    data: { name: 'UPS APC Smart 3000VA', categoryId: itInfra.id, assetTag: 'AF-0302', serialNumber: 'SN-UPS3000', acquisitionDate: new Date('2024-03-10'), acquisitionCost: 1800, condition: 'Good', location: 'Server Room', isShared: false, status: 'Available' }
  });
  console.log('  ✓ 12 assets created.');

  // ─────────────────────────────────────────
  // 5. Allocations (Priya has MacBook, Raj has Monitor)
  // ─────────────────────────────────────────
  await prisma.assetAllocation.create({
    data: { assetId: laptopPriya.id, userId: priya.id, departmentId: eng.id, expectedReturnDate: new Date('2026-12-31'), isActive: true }
  });
  await prisma.assetAllocation.create({
    data: { assetId: monitorRaj.id, userId: raj.id, departmentId: design.id, expectedReturnDate: new Date('2026-06-30'), isActive: true }
  });
  // Overdue allocation (Amit borrowed server, was due last month)
  await prisma.assetAllocation.create({
    data: { assetId: server.id, userId: amit.id, departmentId: eng.id, expectedReturnDate: new Date('2026-06-01'), isActive: true }
  });
  await prisma.asset.update({ where: { id: server.id }, data: { status: 'Allocated', location: 'Amit\'s Lab' } });
  console.log('  ✓ 3 asset allocations created (1 overdue).');

  // ─────────────────────────────────────────
  // 6. Resource Bookings (Meeting rooms & vehicles)
  // ─────────────────────────────────────────
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's bookings for Room B2
  await prisma.resourceBooking.create({
    data: { assetId: roomB2.id, userId: priya.id, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0), status: 'Upcoming', notes: 'Weekly Engineering Standup' }
  });
  await prisma.resourceBooking.create({
    data: { assetId: roomB2.id, userId: raj.id, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30), status: 'Upcoming', notes: 'Design Review Session' }
  });
  // Tomorrow's booking for Conference Room A1
  await prisma.resourceBooking.create({
    data: { assetId: roomA1.id, userId: headEng.id, startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0), endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0), status: 'Upcoming', notes: 'Sprint Planning with Stakeholders' }
  });
  // Tesla booked for tomorrow
  await prisma.resourceBooking.create({
    data: { assetId: van.id, userId: sneha.id, startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 0), endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 17, 0), status: 'Upcoming', notes: 'Office supplies pickup from vendor' }
  });
  console.log('  ✓ 4 resource bookings created.');

  // ─────────────────────────────────────────
  // 7. Maintenance Requests (different workflow stages)
  // ─────────────────────────────────────────
  // Tesla: Approved maintenance (that's why it's Under_Maintenance)
  await prisma.maintenanceRequest.create({
    data: { assetId: tesla.id, requesterId: raj.id, issueDescription: 'Battery cooling alert appearing on dashboard screen. Needs immediate check.', priority: 'High', status: 'Approved' }
  });
  // Pending request for projector
  await prisma.maintenanceRequest.create({
    data: { assetId: projector.id, requesterId: priya.id, issueDescription: 'Projector lens has visible dust spots. Image quality degraded during presentations.', priority: 'Medium', status: 'Pending' }
  });
  // Resolved request for chair (history)
  await prisma.maintenanceRequest.create({
    data: { assetId: chair.id, requesterId: amit.id, issueDescription: 'Armrest bolt loose, wobbles when leaning.', priority: 'Low', status: 'Resolved', assignedToId: manager.id, resolutionNotes: 'Replaced armrest bolts and tightened. Chair is back in service.' }
  });
  console.log('  ✓ 3 maintenance requests created (Pending, Approved, Resolved).');

  // ─────────────────────────────────────────
  // 8. Audit Cycle
  // ─────────────────────────────────────────
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const auditCycle = await prisma.auditCycle.create({
    data: {
      name: 'Q3 2026 Hardware Audit - Engineering',
      startDate: new Date(),
      endDate: nextWeek,
      isActive: true,
      auditors: { connect: [{ id: manager.id }] }
    }
  });
  // Pre-fill some audit records
  await prisma.auditRecord.create({
    data: { cycleId: auditCycle.id, assetId: laptopPriya.id, status: 'Verified', notes: 'Asset found at Priya\'s desk, condition matches records.' }
  });
  await prisma.auditRecord.create({
    data: { cycleId: auditCycle.id, assetId: iphone.id, status: 'Missing', notes: 'Could not locate in warehouse. Last seen 2 weeks ago.' }
  });
  console.log('  ✓ 1 audit cycle with 2 records (1 Verified, 1 Missing).');

  // ─────────────────────────────────────────
  // 9. Transfer Request
  // ─────────────────────────────────────────
  await prisma.transferRequest.create({
    data: { allocationId: (await prisma.assetAllocation.findFirst({ where: { assetId: monitorRaj.id } }))!.id, requestedById: amit.id, status: 'Pending', notes: 'Need a high-res monitor for ML model visualization work.' }
  });
  console.log('  ✓ 1 pending transfer request (Amit wants Raj\'s monitor).');

  // ─────────────────────────────────────────
  // 10. Notifications
  // ─────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: priya.id, message: 'Your laptop (AF-0001) has been allocated to you.' },
      { userId: raj.id, message: 'Your monitor (AF-0002) has been allocated to you.' },
      { userId: manager.id, message: 'New maintenance request: Tesla Model 3 (AF-0201) battery alert.' },
      { userId: manager.id, message: 'Pending maintenance request: 4K Projector (AF-0103) lens cleaning.' },
      { userId: headEng.id, message: 'Transfer request: Amit wants Dell Monitor (AF-0002) from Raj.' },
      { userId: amit.id, message: 'Overdue return: Rack Server (AF-0301) was due on June 1, 2026.' },
      { userId: admin.id, message: 'Q3 Hardware Audit cycle has been created. 1 item flagged as Missing.' },
      { userId: sneha.id, message: 'Your booking for Delivery Van tomorrow 8:00 AM - 5:00 PM is confirmed.' },
    ]
  });
  console.log('  ✓ 8 notifications created.');

  // ─────────────────────────────────────────
  // 11. Activity Logs
  // ─────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: 'System Setup', details: 'Created departments: Engineering, Design, Operations, HR, Finance.' },
      { userId: admin.id, action: 'Role Assignment', details: 'Promoted Alex Sharma to Engineering Department Head.' },
      { userId: admin.id, action: 'Role Assignment', details: 'Promoted Neha Gupta to Design Department Head.' },
      { userId: manager.id, action: 'Asset Registration', details: 'Registered 12 assets across all categories.' },
      { userId: manager.id, action: 'Asset Allocation', details: 'Allocated MacBook Pro (AF-0001) to Priya Verma.' },
      { userId: manager.id, action: 'Asset Allocation', details: 'Allocated Dell Monitor (AF-0002) to Raj Mehta.' },
      { userId: raj.id, action: 'Maintenance Request', details: 'Raised maintenance for Tesla Model 3 (AF-0201) - Battery alert.' },
      { userId: priya.id, action: 'Booking Created', details: 'Booked Meeting Room B2 for 9:00 - 10:00 today.' },
      { userId: manager.id, action: 'Maintenance Approved', details: 'Approved maintenance for Tesla Model 3 (AF-0201).' },
      { userId: manager.id, action: 'Audit Created', details: 'Started Q3 2026 Hardware Audit for Engineering.' },
    ]
  });
  console.log('  ✓ 10 activity logs created.');

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Seeding complete!  Password for ALL accounts: Admin@1234');
  console.log('');
  console.log('  ACCOUNTS:');
  console.log('  ┌─────────────────────────────┬───────────────────┐');
  console.log('  │ admin@assetflow.com          │ Admin             │');
  console.log('  │ manager@assetflow.com         │ Asset Manager     │');
  console.log('  │ head.eng@assetflow.com        │ Dept Head (Eng)   │');
  console.log('  │ head.design@assetflow.com     │ Dept Head (Design)│');
  console.log('  │ priya@assetflow.com           │ Employee (Eng)    │');
  console.log('  │ raj@assetflow.com             │ Employee (Design) │');
  console.log('  │ amit@assetflow.com            │ Employee (Eng)    │');
  console.log('  │ sneha@assetflow.com           │ Employee (HR)     │');
  console.log('  └─────────────────────────────┴───────────────────┘');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
