import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../db.js';
import { authenticateToken, AuthenticatedRequest, logActivity } from '../middlewares/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this-in-production';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
       res.status(400).json({ error: 'Email already in use' });
       return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if this is the first user
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'Admin' : 'Employee';

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role
      }
    });

    await logActivity(user.id, 'User signup', `Registered as ${role}`);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid request parameters' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
       res.status(400).json({ error: 'Invalid credentials or inactive user' });
       return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
       res.status(400).json({ error: 'Invalid credentials' });
       return;
    }

    await logActivity(user.id, 'User login', 'Successfully logged in');

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid request' });
  }
});

// Get current user (me)
router.get('/me', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
