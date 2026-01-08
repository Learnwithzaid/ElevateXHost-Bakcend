import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Project from '../models/Project';
import { webhookConfigSchema } from '../schemas/validation';
import { VALIDATION_ERROR } from '../constants/errors';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Middleware to verify project ownership
const verifyOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Project not found'
      });
      return;
    }

    if (project.owner.toString() !== req.authUser?.id) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this project'
      });
      return;
    }

    (req as any).project = project;
    next();
  } catch (error) {
    console.error('Ownership verification error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// POST /projects/:projectId/webhook-config
router.post('/:projectId/webhook-config', authenticateToken, verifyOwnership, async (req: Request, res: Response) => {
  const validationResult = webhookConfigSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      status: 'error',
      code: VALIDATION_ERROR,
      message: 'Invalid input data',
      details: validationResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { defaultBranch } = validationResult.data;
  const project = (req as any).project;

  project.defaultBranch = defaultBranch;
  await project.save();

  res.status(200).json({
    status: 'success',
    data: project,
  });
});

// GET /projects/:projectId/webhook-secret
router.get('/:projectId/webhook-secret', authenticateToken, verifyOwnership, async (req: Request, res: Response) => {
  const project = (req as any).project;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const webhookUrl = `${frontendUrl}/webhook/github`;

  res.status(200).json({
    status: 'success',
    data: {
      webhookSecret: project.webhookSecret,
      webhookUrl,
    },
  });
});

// POST /projects/:projectId/webhook/test
router.post('/:projectId/webhook/test', authenticateToken, verifyOwnership, async (req: Request, res: Response) => {
  try {
    const project = (req as any).project;
    
    // Simulate a push event payload
    const payload = {
      ref: `refs/heads/${project.defaultBranch}`,
      repository: {
        full_name: project.githubRepo,
        name: project.githubRepo.split('/')[1] || project.githubRepo,
      },
      pusher: {
        name: 'test-user',
      },
      commits: [
        {
          id: 'test-commit-id',
          message: 'Test webhook push',
        },
      ],
    };

    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', project.webhookSecret);
    const signature = 'sha256=' + hmac.update(payloadString).digest('hex');

    const port = process.env.PORT || 3000;
    const testUrl = `http://localhost:${port}/webhook/github`;

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': signature,
        'Content-Type': 'application/json',
      },
      body: payloadString,
    });
    
    res.status(200).json({ 
      success: true, 
      statusCode: response.status 
    });
  } catch (error) {
    console.error('Webhook test failed:', error);
    res.status(500).json({ status: 'error', message: 'Test failed' });
  }
});

export default router;
