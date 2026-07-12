import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest, logActivity, sendNotification } from '../middlewares/auth.js';

const router = Router();

const cycleSchema = z.object({
  name: z.string().min(3),
  startDate: z.string(),
  endDate: z.string(),
  auditorIds: z.array(z.string())
});

// List audit cycles
router.get('/cycles', authenticateToken as any, async (req, res) => {
  try {
    const cycles = await prisma.auditCycle.findMany({
      include: {
        auditors: { select: { id: true, name: true, email: true } },
        records: { include: { asset: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cycles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed audit cycle and discrepancy report
router.get('/cycles/:id', authenticateToken as any, async (req, res) => {
  try {
    const id = req.params.id as string;

    const cycle = (await prisma.auditCycle.findUnique({
      where: { id },
      include: {
        auditors: { select: { id: true, name: true, email: true } },
        records: { include: { asset: true } }
      }
    })) as any;

    if (!cycle) {
       res.status(404).json({ error: 'Audit cycle not found' });
       return;
    }

    // Auto-generate discrepancy report (items flagged Missing or Damaged)
    const discrepancies = cycle.records.filter((r: any) => r.status === 'Missing' || r.status === 'Damaged');

    res.json({
      cycle,
      discrepancyReport: {
        totalDiscrepancies: discrepancies.length,
        items: discrepancies
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Audit Cycle (Admin/Asset Manager only)
router.post('/cycles', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, startDate, endDate, auditorIds } = cycleSchema.parse(req.body);

    const cycle = await prisma.auditCycle.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        auditors: {
          connect: auditorIds.map(id => ({ id }))
        }
      },
      include: {
        auditors: { select: { id: true, name: true } }
      }
    });

    // Notify assigned auditors
    for (const auditorId of auditorIds) {
      await sendNotification(auditorId, `You have been assigned as an auditor for cycle: ${name}`);
    }

    await logActivity(req.user!.id, 'Create audit cycle', `Created audit cycle ${name}`);
    res.status(201).json(cycle);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Record Audit Check (Assigned Auditors only)
router.post(['/cycles/:id/verify', '/cycles/:id/records'], authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycleId = req.params.id as string;
    const verifySchema = z.object({
      assetId: z.string(),
      status: z.enum(['Verified', 'Missing', 'Damaged']),
      notes: z.string().optional()
    });

    const { assetId, status, notes } = verifySchema.parse(req.body);

    const cycle = (await prisma.auditCycle.findUnique({
      where: { id: cycleId },
      include: { auditors: true }
    })) as any;

    if (!cycle || cycle.isClosed) {
       res.status(400).json({ error: 'Audit cycle not found or is already closed' });
       return;
    }

    // Verify current user is an assigned auditor
    const isAuditor = cycle.auditors.some((a: any) => a.id === req.user!.id);
    if (!isAuditor && req.user!.role !== 'Admin') {
       res.status(403).json({ error: 'You are not assigned as an auditor for this cycle' });
       return;
    }

    // Create or update verification record
    const record = await prisma.auditRecord.upsert({
      where: {
        id: (await prisma.auditRecord.findFirst({ where: { cycleId, assetId } }))?.id || 'new-record'
      },
      update: {
        status,
        notes
      },
      create: {
        cycleId,
        assetId,
        status,
        notes
      }
    });

    await logActivity(req.user!.id, 'Record asset audit check', `Audited asset ${assetId} as ${status}`);
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Close Audit Cycle (Admin/Asset Manager only)
router.post('/cycles/:id/close', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const cycle = (await prisma.auditCycle.findUnique({
      where: { id },
      include: { records: { include: { asset: true } } }
    })) as any;

    if (!cycle || cycle.isClosed) {
       res.status(400).json({ error: 'Audit cycle not found or already closed' });
       return;
    }

    // Lock cycle and update affected asset statuses
    const closed = await prisma.$transaction(async (tx) => {
      // 1. Lock cycle
      const updatedCycle = await tx.auditCycle.update({
        where: { id },
        data: { isClosed: true, isActive: false }
      });

      // 2. Process records: If Missing -> Lost. If Damaged -> Under_Maintenance.
      for (const record of cycle.records) {
        if (record.status === 'Missing') {
          await tx.asset.update({
            where: { id: record.assetId },
            data: { status: 'Lost' }
          });
        } else if (record.status === 'Damaged') {
          await tx.asset.update({
            where: { id: record.assetId },
            data: { status: 'Under_Maintenance' }
          });
        }
      }

      return updatedCycle;
    });

    await logActivity(req.user!.id, 'Close audit cycle', `Closed audit cycle ${cycle.name}. Asset statuses updated.`);
    res.json(closed);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
