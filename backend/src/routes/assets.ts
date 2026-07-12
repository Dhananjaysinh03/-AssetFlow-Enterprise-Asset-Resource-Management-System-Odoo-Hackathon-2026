import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest, logActivity } from '../middlewares/auth.js';

const router = Router();

const assetSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string(),
  serialNumber: z.string().nullable().optional(),
  acquisitionDate: z.string().nullable().optional(), // ISO string or date string
  acquisitionCost: z.number().nullable().optional(),
  condition: z.enum(['New', 'Good', 'Fair', 'Poor', 'Damaged']).optional(),
  location: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
  isBookable: z.boolean().optional(), // Frontend alias for isShared
  photoUrl: z.string().nullable().optional(),
  documentUrls: z.array(z.string()).optional()
});

// Helper to generate Asset Tag
async function generateAssetTag(): Promise<string> {
  const lastAsset = await prisma.asset.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  let nextNum = 1;
  if (lastAsset && lastAsset.assetTag) {
    const match = lastAsset.assetTag.match(/AF-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  return `AF-${nextNum.toString().padStart(4, '0')}`;
}

// Search and list assets (accessible to all authenticated users)
router.get('/', authenticateToken as any, async (req, res) => {
  try {
    const { search, category, status, department, location, isShared } = req.query;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { assetTag: { contains: String(search) } },
        { serialNumber: { contains: String(search) } }
      ];
    }

    if (category) {
      whereClause.categoryId = String(category);
    }

    if (status) {
      whereClause.status = String(status) as any;
    }

    if (location) {
      whereClause.location = { contains: String(location) };
    }

    if (isShared !== undefined) {
      whereClause.isShared = isShared === 'true';
    }

    if (department) {
      // Filter assets currently allocated to a specific department
      whereClause.allocations = {
        some: {
          departmentId: String(department),
          isActive: true
        }
      };
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: true,
        allocations: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { assetTag: 'asc' }
    });

    const mapped = assets.map(a => ({
      ...a,
      tag: a.assetTag,
      isBookable: a.isShared
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get asset details with history (allocations + maintenance)
router.get('/:id', authenticateToken as any, async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        allocations: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } }
          },
          orderBy: { allocatedDate: 'desc' }
        },
        maintenanceRequests: {
          include: {
            requester: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        bookings: {
          include: {
            user: { select: { id: true, name: true } }
          },
          orderBy: { startTime: 'desc' }
        }
      }
    });

    if (!asset) {
       res.status(404).json({ error: 'Asset not found' });
       return;
    }

    res.json({
      ...asset,
      tag: asset.assetTag,
      isBookable: asset.isShared
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register asset (Asset Manager / Admin only)
router.post('/', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = assetSchema.parse(req.body);
    const assetTag = await generateAssetTag();

    const { isBookable, ...rest } = data;
    const isSharedVal = data.isShared !== undefined ? data.isShared : (data.isBookable || false);

    const asset = await prisma.asset.create({
      data: {
        ...rest,
        assetTag,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
        documentUrls: JSON.stringify(data.documentUrls || []),
        isShared: isSharedVal,
        status: 'Available'
      }
    });

    await logActivity(req.user!.id, 'Register asset', `Registered asset ${asset.name} (${assetTag})`);
    res.status(201).json({
      ...asset,
      tag: asset.assetTag,
      isBookable: asset.isShared
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update asset (Asset Manager / Admin only)
router.put('/:id', authenticateToken as any, requireRole(['Admin', 'Asset_Manager']) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = assetSchema.partial().parse(req.body);

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
       res.status(404).json({ error: 'Asset not found' });
       return;
    }

    const { isBookable, ...rest } = data;
    const isSharedVal = data.isShared !== undefined ? data.isShared : data.isBookable;

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...rest,
        isShared: isSharedVal,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : undefined,
        documentUrls: data.documentUrls ? JSON.stringify(data.documentUrls) : undefined
      }
    });

    await logActivity(req.user!.id, 'Update asset', `Updated asset ${asset.assetTag}`);
    res.json({
      ...updated,
      tag: updated.assetTag,
      isBookable: updated.isShared
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
