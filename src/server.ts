import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';
import { initializePassport } from './config/passportConfig';
import authRoutes from './routes/auth';
import githubRoutes from './routes/github';
import webhookRoutes from './routes/webhooks';
import projectRoutes from './routes/projects';
import { authenticateToken } from './middleware/authMiddleware';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-system';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
initializePassport();
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Protected route example (for testing auth middleware)
app.get(
  '/api/protected',
  authenticateToken,
  (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'You have access to this protected route',
      user: req.authUser,
    });
  }
);

// Mount auth routes
app.use('/auth', authRoutes);

// Mount GitHub routes (all require JWT authentication)
app.use('/github', authenticateToken, githubRoutes);

// Mount project routes (all require JWT authentication)
app.use('/projects', authenticateToken, projectRoutes);

// Mount webhook routes (PUBLIC - signature verified in route)
app.use('/webhook', webhookRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use(
  (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Global error handler:', err);

    res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }
);

// Database connection and server startup
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Start the server
startServer();

export default app;
