import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticateToken, AuthenticatedRequest, logActivity, sendNotification } from '../middlewares/auth.js';

const router = Router();

const bookingSchema = z.object({
  assetId: z.string(),
  startTime: z.string(), // ISO String
  endTime: z.string(), // ISO String
  notes: z.string().optional()
});

// Get bookings (filter by asset, date ranges, etc.)
router.get('/', authenticateToken as any, async (req, res) => {
  try {
    const { assetId, start, end } = req.query;
    const whereClause: any = {
      status: { in: ['Upcoming', 'Ongoing', 'Completed'] }
    };

    if (assetId) {
      whereClause.assetId = String(assetId);
    }

    if (start && end) {
      whereClause.OR = [
        {
          startTime: {
            gte: new Date(String(start)),
            lt: new Date(String(end))
          }
        },
        {
          endTime: {
            gt: new Date(String(start)),
            lte: new Date(String(end))
          }
        }
      ];
    }

    const bookings = await prisma.resourceBooking.findMany({
      where: whereClause,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Book a resource (with overlap validation)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assetId, startTime, endTime, notes } = bookingSchema.parse(req.body);

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
       res.status(400).json({ error: 'Start time must be before end time' });
       return;
    }

    // Verify asset is shared / bookable
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
       res.status(404).json({ error: 'Asset not found' });
       return;
    }

    if (!asset.isShared) {
       res.status(400).json({ error: 'This asset is not configured as a shared bookable resource' });
       return;
    }

    // Overlap validation: S1 < E2 AND S2 < E1
    const overlapping = await prisma.resourceBooking.findFirst({
      where: {
        assetId,
        status: { in: ['Upcoming', 'Ongoing'] },
        startTime: { lt: end },
        endTime: { gt: start }
      },
      include: {
        user: { select: { name: true } }
      }
    });

    if (overlapping) {
       res.status(400).json({
        error: 'Booking overlap detected',
        overlappingBooking: {
          bookedBy: overlapping.user.name,
          startTime: overlapping.startTime,
          endTime: overlapping.endTime
        }
      });
       return;
    }

    const booking = await prisma.resourceBooking.create({
      data: {
        assetId,
        userId: req.user!.id,
        startTime: start,
        endTime: end,
        notes,
        status: 'Upcoming'
      }
    });

    await logActivity(req.user!.id, 'Book resource', `Booked resource ${asset.assetTag} from ${startTime} to ${endTime}`);
    await sendNotification(req.user!.id, `Booking confirmed for ${asset.name} on ${start.toLocaleString()}`);

    res.status(201).json(booking);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel a booking
router.put('/:id/cancel', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const booking = (await prisma.resourceBooking.findUnique({
      where: { id },
      include: { asset: true }
    })) as any;

    if (!booking) {
       res.status(404).json({ error: 'Booking not found' });
       return;
    }

    // Only creator or Admin/Asset Manager can cancel
    if (booking.userId !== req.user!.id && !['Admin', 'Asset_Manager'].includes(req.user!.role)) {
       res.status(403).json({ error: 'You are not authorized to cancel this booking' });
       return;
    }

    const updated = await prisma.resourceBooking.update({
      where: { id },
      data: { status: 'Cancelled' }
    });

    await logActivity(req.user!.id, 'Cancel booking', `Cancelled booking for asset ${booking.asset.assetTag}`);
    await sendNotification(booking.userId, `Booking for ${booking.asset.name} was cancelled.`);

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
