import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();
const version = process.env.npm_package_version || '1.0.0';

router.get('/', async (req: Request, res: Response) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    if (dbStatus === 'disconnected') {
      res.status(503).json({
        status: 'error',
        message: 'Database is not connected',
        timestamp: new Date().toISOString(),
        version,
        database: dbStatus,
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
      database: dbStatus,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      version,
    });
  }
});

export default router;
