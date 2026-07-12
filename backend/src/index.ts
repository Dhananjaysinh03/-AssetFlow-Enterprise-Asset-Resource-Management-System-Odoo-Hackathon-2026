import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import orgRouter from './routes/org.js';
import assetsRouter from './routes/assets.js';
import allocationsRouter from './routes/allocations.js';
import bookingsRouter from './routes/bookings.js';
import maintenanceRouter from './routes/maintenance.js';
import auditsRouter from './routes/audits.js';
import dashboardRouter from './routes/dashboard.js';
import activityRouter from './routes/activity.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/org', orgRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/audits', auditsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/activity', activityRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Catch-all route to serve the React SPA for any unmatched routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  } else {
    next();
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`AssetFlow Backend Server is running on port ${PORT}`);
});
