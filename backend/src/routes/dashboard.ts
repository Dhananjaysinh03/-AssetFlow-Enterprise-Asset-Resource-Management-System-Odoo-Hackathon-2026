import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// KPI Snapshots
router.get('/kpi', authenticateToken as any, async (req, res) => {
  try {
    const [
      availableAssets,
      allocatedAssets,
      maintenanceToday,
      activeBookings,
      pendingTransfers
    ] = await Promise.all([
      prisma.asset.count({ where: { status: 'Available' } }),
      prisma.asset.count({ where: { status: 'Allocated' } }),
      prisma.maintenanceRequest.count({
        where: {
          status: { in: ['Approved', 'Technician_Assigned', 'In_Progress'] }
        }
      }),
      prisma.resourceBooking.count({
        where: { status: 'Ongoing' }
      }),
      prisma.transferRequest.count({
        where: { status: 'Requested' }
      })
    ]);

    // Overdue allocations: expectedReturnDate is in the past and returnedDate is null
    const overdueAllocationsCount = await prisma.assetAllocation.count({
      where: {
        isActive: true,
        returnedDate: null,
        expectedReturnDate: {
          lt: new Date()
        }
      }
    });

    // Upcoming allocations: expectedReturnDate is in the future
    const upcomingReturnsCount = await prisma.assetAllocation.count({
      where: {
        isActive: true,
        returnedDate: null,
        expectedReturnDate: {
          gte: new Date()
        }
      }
    });

    res.json({
      assetsAvailable: availableAssets,
      assetsAllocated: allocatedAssets,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns: upcomingReturnsCount,
      overdueReturns: overdueAllocationsCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reports and Analytics
router.get('/reports', authenticateToken as any, async (req, res) => {
  try {
    // 1. Department Allocation Breakdown
    const depts = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            allocations: {
              where: { isActive: true }
            }
          }
        }
      }
    });
    const departmentAllocations = depts.map(d => ({
      department: d.name,
      allocatedCount: d._count.allocations
    }));

    // 2. Maintenance Frequency by Category
    const maintenanceCounts = await prisma.maintenanceRequest.groupBy({
      by: ['assetId'],
      _count: {
        _all: true
      }
    });

    const assets = await prisma.asset.findMany({
      where: { id: { in: maintenanceCounts.map(m => m.assetId) } },
      include: { category: true }
    });

    const categoryMaintenanceFreq: Record<string, number> = {};
    for (const mCount of maintenanceCounts) {
      const assetObj = assets.find(a => a.id === mCount.assetId);
      if (assetObj) {
        const catName = assetObj.category.name;
        categoryMaintenanceFreq[catName] = (categoryMaintenanceFreq[catName] || 0) + mCount._count._all;
      }
    }

    // 3. Most Used Resources (Bookings counts)
    const bookingCounts = await prisma.resourceBooking.groupBy({
      by: ['assetId'],
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          assetId: 'desc'
        }
      },
      take: 5
    });

    const bookableAssets = await prisma.asset.findMany({
      where: { id: { in: bookingCounts.map(b => b.assetId) } },
      select: { id: true, name: true, assetTag: true }
    });

    const mostUsedAssets = bookingCounts.map(b => {
      const assetObj = bookableAssets.find(a => a.id === b.assetId);
      return {
        assetName: assetObj ? `${assetObj.name} (${assetObj.assetTag})` : 'Unknown',
        bookingsCount: b._count._all
      };
    });

    res.json({
      departmentAllocations,
      categoryMaintenanceFrequency: Object.entries(categoryMaintenanceFreq).map(([category, count]) => ({ category, count })),
      mostUsedAssets
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
