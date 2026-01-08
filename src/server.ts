import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import passport from 'passport';
import { initializePassport } from './config/passportConfig';
import { corsMiddleware } from './middleware/corsMiddleware';
import { requestLogger } from './middleware/requestLogger';
import { validateContentType } from './middleware/validateContentType';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter, authLimiter, githubLimiter } from './middleware/rateLimiter';
import { authenticateToken } from './middleware/authMiddleware';
import { info, error as logError } from './utils/logger';
import { ERRORS } from './constants/errors';

import authRoutes from './routes/auth';
import githubRoutes from './routes/github';
import projectsRoutes from './routes/projects';
import healthRoutes from './routes/health';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-system';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

app.use(corsMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

initializePassport();
app.use(passport.initialize());

app.use(requestLogger);
app.use(validateContentType);

app.use('/health', healthRoutes);

app.get('/api/protected', authenticateToken, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'You have access to this protected route',
    user: req.authUser,
  });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/github', githubLimiter, authenticateToken, githubRoutes);
app.use('/projects', generalLimiter, authenticateToken, projectsRoutes);

app.use((req: Request, res: Response) => {
  res.status(ERRORS.NOT_FOUND.status).json({
    status: 'error',
    code: ERRORS.NOT_FOUND.code,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    info('Connected to MongoDB', { uri: MONGODB_URI.replace(/\/\/.*@/, '//***@') });

    const server = app.listen(PORT, () => {
      info(`Server is running`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
      });
    });

    const gracefulShutdown = async (signal: string) => {
      info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        info('HTTP server closed');
        
        try {
          await mongoose.connection.close();
          info('MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          logError('Error during shutdown', error as Error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logError('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logError('Failed to start server', error as Error);
    process.exit(1);
  }
}

startServer();

export default app;
