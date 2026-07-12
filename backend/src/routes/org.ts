import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest, logActivity } from '../middlewares/auth.js';

const router = Router();

// ==========================================
// Department Management
// ==========================================

const departmentSchema = z.object({
  name: z.string().min(2),
  parentDepartmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

// List departments (with hierarchies and manager details)
router.get('/departments', authenticateToken as any, async (req, res) => {
  try {
    const depts = await prisma.department.findMany({
      include: {
        parentDepartment: { select: { id: true, name: true } },
        members: { select: { id: true, name: true, role: true } },
        subDepartments: { select: { id: true, name: true } }
      }
    });

    // Populate manager details manually to avoid recursive nested query issues
    const managerIds = depts.map(d => d.managerId).filter(Boolean) as string[];
    const managers = await prisma.user.findMany({
      where: { id: { in: managerIds } },
      select: { id: true, name: true, email: true }
    });

    const managerMap = new Map(managers.map(m => [m.id, m]));
    const result = depts.map(dept => ({
      ...dept,
      manager: dept.managerId ? managerMap.get(dept.managerId) || null : null
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create department (Admin only)
router.post('/departments', authenticateToken as any, requireRole(['Admin']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, parentDepartmentId, managerId } = departmentSchema.parse(req.body);

    const dept = await prisma.department.create({
      data: {
        name,
        parentDepartmentId: parentDepartmentId || null,
        managerId: managerId || null
      }
    });

    if (managerId) {
      // Set the manager's role to Department_Head automatically
      await prisma.user.update({
        where: { id: managerId },
        data: { role: 'Department_Head', departmentId: dept.id }
      });
    }

    await logActivity(req.user!.id, 'Create department', `Created department ${name}`);
    res.status(201).json(dept);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update department (Admin only)
router.put('/departments/:id', authenticateToken as any, requireRole(['Admin']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, parentDepartmentId, managerId, isActive } = departmentSchema.partial().parse(req.body);

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(parentDepartmentId !== undefined && { parentDepartmentId }),
        ...(managerId !== undefined && { managerId }),
        ...(isActive !== undefined && { isActive })
      }
    });

    if (managerId) {
      await prisma.user.update({
        where: { id: managerId },
        data: { role: 'Department_Head', departmentId: updated.id }
      });
    }

    await logActivity(req.user!.id, 'Update department', `Updated department ${id}`);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Asset Category Management
// ==========================================

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional() // e.g. {"warranty_months": 24}
});

// List categories
router.get('/categories', authenticateToken as any, async (req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create category (Admin/Asset Manager only)
router.post('/categories', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, customFields } = categorySchema.parse(req.body);

    const category = await prisma.assetCategory.create({
      data: {
        name,
        description,
        customFields: (customFields || {}) as any
      }
    });

    await logActivity(req.user!.id, 'Create category', `Created category ${name}`);
    res.status(201).json(category);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Employee Directory
// ==========================================

// List employees (Admin/Asset Manager / Department Head can see all, employees too)
router.get('/employees', authenticateToken as any, async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        createdAt: true
      }
    });
    res.json(employees);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update employee (Admin only - promote/demote/assign department/deactivate)
router.put('/employees/:id', authenticateToken as any, requireRole(['Admin']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const employeeUpdateSchema = z.object({
      role: z.enum(['Admin', 'Asset_Manager', 'Department_Head', 'Employee']),
      departmentId: z.string().nullable(),
      isActive: z.boolean()
    }).partial();

    const data = employeeUpdateSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        departmentId: true
      }
    });

    await logActivity(req.user!.id, 'Update employee role/status', `Updated user ${updated.email} profile.`);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
