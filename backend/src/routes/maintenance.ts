import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest, logActivity, sendNotification } from '../middlewares/auth.js';

const router = Router();

const requestSchema = z.object({
  assetId: z.string(),
  issueDescription: z.string().min(5),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  photoUrl: z.string().nullable().optional()
});

// List maintenance requests
router.get('/', authenticateToken as any, async (req, res) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      include: {
        asset: true,
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Raise request
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assetId, issueDescription, priority, photoUrl } = requestSchema.parse(req.body);

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
       res.status(404).json({ error: 'Asset not found' });
       return;
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId,
        requesterId: req.user!.id,
        issueDescription,
        priority: priority || 'Medium',
        photoUrl: photoUrl || null,
        status: 'Pending'
      }
    });

    // Notify asset managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ['Admin', 'Asset_Manager'] } }
    });
    for (const mgr of managers) {
      await sendNotification(mgr.id, `New maintenance request raised for ${asset.assetTag} by ${req.user!.name}`);
    }

    await logActivity(req.user!.id, 'Raise maintenance request', `Raised request for asset ${asset.assetTag}`);
    res.status(201).json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Approve or Reject request (Asset Manager / Admin)
router.put('/:id/approval', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const approvalSchema = z.object({
      status: z.enum(['Approved', 'Rejected'])
    });

    const { status } = approvalSchema.parse(req.body);

    const mReq = (await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true }
    })) as any;

    if (!mReq || mReq.status !== 'Pending') {
       res.status(400).json({ error: 'Request not found or not in Pending state' });
       return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.maintenanceRequest.update({
        where: { id },
        data: { status }
      });

      if (status === 'Approved') {
        // Change asset status to Under_Maintenance
        await tx.asset.update({
          where: { id: mReq.assetId },
          data: { status: 'Under_Maintenance' }
        });
      }

      return updatedReq;
    });

    await sendNotification(mReq.requesterId, `Your maintenance request for asset ${mReq.asset.assetTag} was ${status.toLowerCase()}.`);
    await logActivity(req.user!.id, 'Approve/Reject maintenance', `${status} maintenance for asset ${mReq.asset.assetTag}`);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Assign Technician (Asset Manager / Admin)
router.put('/:id/assign', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const assignSchema = z.object({
      assignedToId: z.string()
    });

    const { assignedToId } = assignSchema.parse(req.body);

    const mReq = (await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true }
    })) as any;

    if (!mReq || mReq.status === 'Pending' || mReq.status === 'Rejected' || mReq.status === 'Resolved') {
       res.status(400).json({ error: 'Cannot assign technician in this state' });
       return;
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'Technician_Assigned',
        assignedToId
      }
    });

    await sendNotification(assignedToId, `You have been assigned to repair asset ${mReq.asset.assetTag}.`);
    await sendNotification(mReq.requesterId, `Technician has been assigned to your maintenance request for ${mReq.asset.assetTag}.`);
    await logActivity(req.user!.id, 'Assign maintenance technician', `Assigned technician to request ${id}`);

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Progress (Technician / Asset Manager / Admin)
router.put('/:id/progress', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const progressSchema = z.object({
      status: z.enum(['In_Progress', 'Resolved']),
      resolutionNotes: z.string().optional()
    });

    const { status, resolutionNotes } = progressSchema.parse(req.body);

    const mReq = (await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true }
    })) as any;

    if (!mReq) {
       res.status(404).json({ error: 'Request not found' });
       return;
    }

    // Only assigned technician, Asset Manager, or Admin can update progress
    const isTech = mReq.assignedToId === req.user!.id;
    const isMgr = ['Admin', 'Asset_Manager'].includes(req.user!.role);
    if (!isTech && !isMgr) {
       res.status(403).json({ error: 'Unauthorized to update progress on this request' });
       return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status,
          ...(resolutionNotes && { resolutionNotes })
        }
      });

      if (status === 'Resolved') {
        // Change asset status back to Available
        await tx.asset.update({
          where: { id: mReq.assetId },
          data: { status: 'Available' }
        });
      }

      return updatedReq;
    });

    await sendNotification(mReq.requesterId, `Your maintenance request for asset ${mReq.asset.assetTag} status updated to ${status.toLowerCase()}.`);
    await logActivity(req.user!.id, 'Update maintenance status', `Updated maintenance request ${id} to ${status}`);

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
