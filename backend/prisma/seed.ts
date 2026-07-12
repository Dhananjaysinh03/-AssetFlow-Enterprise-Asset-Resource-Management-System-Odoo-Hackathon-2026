import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with realistic records...');

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

  // 1. Create categories
  const electronics = await prisma.assetCategory.create({
    data: {
      name: 'Electronics',
      description: 'Laptops, Monitors, Phones, etc.',
      customFields: JSON.stringify({ warranty_months: 24 })
    }
  });

  const furniture = await prisma.assetCategory.create({
    data: {
      name: 'Furniture',
      description: 'Desks, Chairs, Podiums',
      customFields: JSON.stringify({ material: 'Wood/Steel' })
    }
  });

  const vehicles = await prisma.assetCategory.create({
    data: {
      name: 'Vehicles',
      description: 'Company cars, Delivery vans',
      customFields: JSON.stringify({ insurance_expiry: '2027-12-31' })
    }
  });

  const spaces = await prisma.assetCategory.create({
    data: {
      name: 'Shared Spaces',
      description: 'Conference rooms, Labs, Office spaces',
      customFields: JSON.stringify({ capacity: 12 })
    }
  });

  // 2. Create Departments
  const eng = await prisma.department.create({
    data: { name: 'Engineering', isActive: true }
  });

  const design = await prisma.department.create({
    data: { name: 'Design', isActive: true }
  });

  const ops = await prisma.department.create({
    data: { name: 'Operations', isActive: true }
  });

  // 3. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@assetflow.com',
      name: 'Admin User',
      passwordHash,
      role: 'Admin',
      isActive: true
    }
  });

  // Asset Manager
  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@assetflow.com',
      name: 'Sarah (Asset Manager)',
      passwordHash,
      role: 'Asset_Manager',
      isActive: true
    }
  });

  // Department Head
  const headUser = await prisma.user.create({
    data: {
      email: 'head@assetflow.com',
      name: 'Alex (Dept Head)',
      passwordHash,
      role: 'Department_Head',
      isActive: true,
      departmentId: eng.id
    }
  });

  // Update Eng managerId to Alex
  await prisma.department.update({
    where: { id: eng.id },
    data: { managerId: headUser.id }
  });

  // Priya (Employee)
  const priya = await prisma.user.create({
    data: {
      email: 'priya@assetflow.com',
      name: 'Priya (Engineer)',
      passwordHash,
      role: 'Employee',
      isActive: true,
      departmentId: eng.id
    }
  });

  // Raj (Employee)
  const raj = await prisma.user.create({
    data: {
      email: 'raj@assetflow.com',
      name: 'Raj (Designer)',
      passwordHash,
      role: 'Employee',
      isActive: true,
      departmentId: design.id
    }
  });

  console.log('Users created.');

  // 4. Create Assets
  // Laptop Priya has
  const laptopPriya = await prisma.asset.create({
    data: {
      name: 'MacBook Pro 16"',
      categoryId: electronics.id,
      assetTag: 'AF-0114',
      serialNumber: 'SN-MBP16001',
      acquisitionDate: new Date('2025-01-10'),
      acquisitionCost: 2500,
      condition: 'New',
      location: 'Bangalore Office',
      isShared: false,
      status: 'Allocated'
    }
  });

  // Allocate laptop to Priya
  await prisma.assetAllocation.create({
    data: {
      assetId: laptopPriya.id,
      userId: priya.id,
      expectedReturnDate: new Date('2026-12-31'),
      isActive: true
    }
  });

  // Room B2 (Shared bookable Space)
  const roomB2 = await prisma.asset.create({
    data: {
      name: 'Meeting Room B2',
      categoryId: spaces.id,
      assetTag: 'AF-0201',
      serialNumber: 'ROOM-B2',
      condition: 'Good',
      location: '1st Floor, Wing B',
      isShared: true,
      status: 'Available'
    }
  });

  // Create an ongoing booking for Room B2 today 9:00 - 10:00
  const today = new Date();
  const startBook = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
  const endBook = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);

  await prisma.resourceBooking.create({
    data: {
      assetId: roomB2.id,
      userId: priya.id,
      startTime: startBook,
      endTime: endBook,
      status: 'Upcoming',
      notes: 'Weekly Engineering Sync'
    }
  });

  // Other assets
  const chair1 = await prisma.asset.create({
    data: {
      name: 'Ergonomic Desk Chair',
      categoryId: furniture.id,
      assetTag: 'AF-0002',
      serialNumber: 'SN-CHAIR002',
      condition: 'Good',
      location: 'Warehouse',
      isShared: false,
      status: 'Available'
    }
  });

  const projector = await prisma.asset.create({
    data: {
      name: '4K Conference Projector',
      categoryId: electronics.id,
      assetTag: 'AF-0003',
      serialNumber: 'SN-PROJ909',
      condition: 'Good',
      location: 'Main Conference Room',
      isShared: true,
      status: 'Available'
    }
  });

  const testCar = await prisma.asset.create({
    data: {
      name: 'Tesla Model 3',
      categoryId: vehicles.id,
      assetTag: 'AF-0004',
      serialNumber: 'SN-TESLA33',
      condition: 'Good',
      location: 'Basement Parking',
      isShared: true,
      status: 'Under_Maintenance'
    }
  });

  // Create maintenance request for the car
  await prisma.maintenanceRequest.create({
    data: {
      assetId: testCar.id,
      requesterId: raj.id,
      issueDescription: 'Battery cooling alert appearing on screen.',
      priority: 'High',
      status: 'Approved'
    }
  });

  // Audit Cycle setup
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const auditCycle = await prisma.auditCycle.create({
    data: {
      name: 'Q3 Hardware Audit',
      startDate: new Date(),
      endDate: nextWeek,
      isActive: true,
      auditors: {
        connect: [{ id: managerUser.id }]
      }
    }
  });

  // Pre-seed some logs and notifications
  await prisma.notification.createMany({
    data: [
      { userId: priya.id, message: 'Welcome to AssetFlow! Your laptop (AF-0114) has been assigned.' },
      { userId: managerUser.id, message: 'New maintenance request raised for AF-0004.' }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: adminUser.id, action: 'Initial Seed', details: 'Pre-populated core hackathon database entries.' }
    ]
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
