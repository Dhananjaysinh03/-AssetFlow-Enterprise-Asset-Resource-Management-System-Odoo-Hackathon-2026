import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest, logActivity, sendNotification } from '../middlewares/auth.js';

const router = Router();

const allocateSchema = z.object({
  assetId: z.string(),
  userId: z.string().nullable().optional(), // Employee
  departmentId: z.string().nullable().optional(), // Department
  expectedReturnDate: z.string().nullable().optional()
});

// List allocations
router.get('/', authenticateToken as any, async (req, res) => {
  try {
    const allocations = await prisma.assetAllocation.findMany({
      include: {
        asset: true,
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } }
      },
      orderBy: { allocatedDate: 'desc' }
    });
    res.json(allocations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Allocate an asset
router.post('/', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assetId, userId, departmentId, expectedReturnDate } = allocateSchema.parse(req.body);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        allocations: {
          where: { isActive: true },
          include: { user: true, department: true }
        }
      }
    });

    if (!asset) {
       res.status(404).json({ error: 'Asset not found' });
       return;
    }

    if (asset.status !== 'Available') {
      const activeAlloc = asset.allocations[0];
      const currentHolderName = activeAlloc
        ? (activeAlloc.user?.name || activeAlloc.department?.name || 'Unknown')
        : 'Unknown';
      res.status(400).json({
        error: `Asset is not Available. Current status: ${asset.status}`,
        currentlyHeldBy: currentHolderName,
        allocationId: activeAlloc?.id || null,
        canRequestTransfer: true
      });
      return;
    }

    // Perform allocation
    const allocation = await prisma.$transaction(async (tx) => {
      const alloc = await tx.assetAllocation.create({
        data: {
          assetId,
          userId: userId || null,
          departmentId: departmentId || null,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          isActive: true
        }
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'Allocated' }
      });

      return alloc;
    });

    // Notify user
    if (userId) {
      await sendNotification(userId, `Asset ${asset.name} (${asset.assetTag}) has been allocated to you.`);
    }

    await logActivity(req.user!.id, 'Allocate asset', `Allocated asset ${asset.assetTag}`);
    res.status(201).json(allocation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Create a Transfer Request
router.post('/transfers/request', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transferRequestSchema = z.object({
      allocationId: z.string(),
      notes: z.string().optional()
    });

    const { allocationId, notes } = transferRequestSchema.parse(req.body);

    const allocation = await prisma.assetAllocation.findUnique({
      where: { id: allocationId },
      include: { asset: true, user: true }
    });

    if (!allocation || !allocation.isActive) {
       res.status(400).json({ error: 'No active allocation found to transfer' });
       return;
    }

    const transfer = await prisma.transferRequest.create({
      data: {
        allocationId,
        requestedById: req.user!.id,
        status: 'Requested',
        notes
      }
    });

    // Notify managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ['Admin', 'Asset_Manager'] } }
    });
    for (const mgr of managers) {
      await sendNotification(mgr.id, `New transfer request for asset ${allocation.asset.assetTag} from ${req.user!.name}`);
    }

    await logActivity(req.user!.id, 'Request asset transfer', `Requested transfer of asset ${allocation.asset.assetTag}`);
    res.status(201).json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Approve / Reject a Transfer Request
router.post('/transfers/:id/action', authenticateToken as any, requireRole(['Admin', 'Asset_Manager', 'Department_Head']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const actionSchema = z.object({
      action: z.enum(['Approved', 'Rejected'])
    });

    const { action } = actionSchema.parse(req.body);

    const transfer = (await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        allocation: { include: { asset: true } },
        requestedBy: true
      }
    })) as any;

    if (!transfer || transfer.status !== 'Requested') {
       res.status(400).json({ error: 'Transfer request not found or already processed' });
       return;
    }

    if (action === 'Rejected') {
      const updated = await prisma.transferRequest.update({
        where: { id },
        data: { status: 'Rejected', approvedById: req.user!.id }
      });
      await sendNotification(transfer.requestedById, `Your transfer request for asset ${transfer.allocation.asset.assetTag} was rejected.`);
      res.json(updated);
      return;
    }

    // Approve: update allocation history, create new allocation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Terminate current allocation
      await tx.assetAllocation.update({
        where: { id: transfer.allocationId },
        data: { isActive: false, returnedDate: new Date(), checkinNotes: 'Transferred' }
      });

      // 2. Create new allocation for requester
      const newAlloc = await tx.assetAllocation.create({
        data: {
          assetId: transfer.allocation.assetId,
          userId: transfer.requestedById,
          isActive: true
        }
      });

      // 3. Mark transfer as approved
      const updatedTransfer = await tx.transferRequest.update({
        where: { id },
        data: { status: 'Approved', approvedById: req.user!.id }
      });

      return { updatedTransfer, newAlloc };
    });

    await sendNotification(transfer.requestedById, `Your transfer request for asset ${transfer.allocation.asset.assetTag} was approved.`);
    await logActivity(req.user!.id, 'Approve asset transfer', `Approved transfer for asset ${transfer.allocation.asset.assetTag}`);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Return an Asset
router.post('/returns', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const returnSchema = z.object({
      assetId: z.string(),
      condition: z.enum(['New', 'Good', 'Fair', 'Poor', 'Damaged']).optional(),
      checkinNotes: z.string().optional()
    });

    const { assetId, condition, checkinNotes } = returnSchema.parse(req.body);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { allocations: { where: { isActive: true } } }
    });

    if (!asset || asset.status !== 'Allocated') {
       res.status(400).json({ error: 'Asset is not currently allocated or does not exist' });
       return;
    }

    const activeAlloc = asset.allocations[0];
    if (!activeAlloc) {
       res.status(400).json({ error: 'Active allocation record not found' });
       return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Complete allocation record
      const completedAlloc = await tx.assetAllocation.update({
        where: { id: activeAlloc.id },
        data: {
          isActive: false,
          returnedDate: new Date(),
          checkinNotes: checkinNotes || 'Returned'
        }
      });

      // Update asset back to Available and optionally update condition
      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: 'Available',
          ...(condition && { condition })
        }
      });

      return completedAlloc;
    });

    if (activeAlloc.userId) {
      await sendNotification(activeAlloc.userId, `Asset ${asset.assetTag} return was successfully checked in.`);
    }

    await logActivity(req.user!.id, 'Return asset', `Checked in asset ${asset.assetTag}`);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
