import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'Admin' | 'Asset_Manager' | 'Department_Head' | 'Employee';
    departmentId: string | null;
  };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, departmentId: true, isActive: true }
    });

    if (!user || !user.isActive) {
      res.status(403).json({ error: 'User is inactive or does not exist' });
      return;
    }

    req.user = user as any;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
}

export function requireRole(roles: ('Admin' | 'Asset_Manager' | 'Department_Head' | 'Employee')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
}

export async function logActivity(userId: string, action: string, details?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details
      }
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

export async function sendNotification(userId: string, message: string) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        message
      }
    });
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}
