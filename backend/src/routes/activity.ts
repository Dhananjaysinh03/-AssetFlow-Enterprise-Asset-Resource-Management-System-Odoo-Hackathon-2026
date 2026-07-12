import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// Retrieve notifications for current user
router.get('/notifications', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notifications as read
router.put('/notifications/read', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: 'Notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full system audit logs (Admin and Asset Manager only)
router.get('/logs', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
