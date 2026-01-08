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
import User from '../models/User';
import Project from '../models/Project';
import CloudflareService, { CloudflareError } from '../services/cloudflareService';
import NetlifyService, { NetlifyError } from '../services/netlifyService';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../schemas/validation';
import {
  DEPLOYMENT_FAILED,
  INSUFFICIENT_PERMISSIONS,
  INVALID_GITHUB_REPO,
  PROJECT_NAME_EXISTS,
  PROJECT_NOT_FOUND,
} from '../constants/errors';
import { logDeploymentEvent, logRequest } from '../utils/logger';

const router = Router();

function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): void {
  const payload: any = {
    status: 'error',
    code,
    message,
  };

  if (details) {
    payload.details = details;
  }

  res.status(statusCode).json(payload);
}

function serializeProject(project: any): any {
  return {
    id: project._id.toString(),
    userId: project.userId.toString(),
    name: project.name,
    description: project.description || '',
    githubRepo: project.githubRepo,
    deploymentProvider: project.deploymentProvider,
    deploymentId: project.deploymentId,
    deploymentUrl: project.deploymentUrl,
    status: project.status,
    lastDeploymentTime: project.lastDeploymentTime || null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function parseGithubRepo(repo: string): { owner: string; repo: string } | null {
  const parts = repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { owner: parts[0], repo: parts[1] };
}

function getDeploymentService(provider: string): CloudflareService | NetlifyService {
  return provider === 'cloudflare' ? new CloudflareService() : new NetlifyService();
}

async function getUserGitHubToken(userId: string): Promise<string> {
  const user = await User.findById(userId).select('+githubAccessToken');
  if (!user) {
    return '';
  }
  return user.getGitHubToken();
}

/**
 * POST /projects
 * Create a project and trigger initial deployment
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  logRequest(req.method, req.path, req.authUser?.id);

  if (!req.authUser) {
    sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const validationResult = createProjectSchema.safeParse(req.body);
  if (!validationResult.success) {
    sendErrorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid input data',
      validationResult.error.flatten().fieldErrors
    );
    return;
  }

  const { name, description, githubRepo, deploymentProvider } =
    validationResult.data;

  if (!parseGithubRepo(githubRepo)) {
    sendErrorResponse(res, 400, 'INVALID_GITHUB_REPO', INVALID_GITHUB_REPO);
    return;
  }

  try {
    const existing = await Project.findOne({ userId: req.authUser.id, name });
    if (existing) {
      sendErrorResponse(res, 409, 'PROJECT_NAME_EXISTS', PROJECT_NAME_EXISTS);
      return;
    }

    const gitHubToken = await getUserGitHubToken(req.authUser.id);
    if (!gitHubToken) {
      sendErrorResponse(
        res,
        401,
        'GITHUB_NOT_CONNECTED',
        'GitHub account not connected. Please authenticate via OAuth.'
      );
      return;
    }

    const deploymentService = getDeploymentService(deploymentProvider) as any;

    const deployment = await deploymentService.createDeployment(
      name,
      githubRepo,
      gitHubToken
    );

    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const project = new Project({
      userId: req.authUser.id,
      name,
      description,
      githubRepo,
      deploymentProvider,
      deploymentId: deployment.deploymentId,
      status: 'deploying',
      deploymentUrl: deployment.url,
      webhookSecret,
      lastDeploymentTime: deployment.createdAt,
    });

    await project.save();

    logDeploymentEvent(project._id.toString(), 'create', 'deploying');

    res.status(201).json({
      status: 'success',
      data: {
        project: serializeProject(project),
      },
    });
  } catch (error) {
    if (error && typeof error === 'object') {
      if (error instanceof CloudflareError || error instanceof NetlifyError) {
        sendErrorResponse(
          res,
          502,
          'DEPLOYMENT_FAILED',
          `${DEPLOYMENT_FAILED}: ${error.message}`
        );
        return;
      }

      if ((error as any).code === 11000) {
        sendErrorResponse(res, 409, 'PROJECT_NAME_EXISTS', PROJECT_NAME_EXISTS);
        return;
      }
    }

    console.error('Error creating project:', error);
    sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to create project');
  }
});

/**
 * GET /projects
 * List user's projects
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  logRequest(req.method, req.path, req.authUser?.id);

  if (!req.authUser) {
    sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const projects = await Project.find({ userId: req.authUser.id }).sort({
      createdAt: -1,
    });

    await Promise.allSettled(
      projects.map(async (p) => {
        try {
          await p.getDeploymentStatus();
          logDeploymentEvent(p._id.toString(), 'status_refresh', p.status);
        } catch {
          // best-effort refresh
        }
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        projects: projects.map(serializeProject),
      },
    });
  } catch (error) {
    console.error('Error listing projects:', error);
    sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to fetch projects');
  }
});

/**
 * GET /projects/:projectId
 * Get a single project and live deployment status
 */
router.get('/:projectId', async (req: Request, res: Response): Promise<void> => {
  logRequest(req.method, req.path, req.authUser?.id);

  if (!req.authUser) {
    sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
      return;
    }

    if (project.userId.toString() !== req.authUser.id) {
      sendErrorResponse(
        res,
        403,
        'INSUFFICIENT_PERMISSIONS',
        INSUFFICIENT_PERMISSIONS
      );
      return;
    }

    try {
      const deploymentStatus = await project.getDeploymentStatus();
      logDeploymentEvent(project._id.toString(), 'status_refresh', project.status);

      res.status(200).json({
        status: 'success',
        data: {
          project: serializeProject(project),
          deploymentStatus,
        },
      });
    } catch (error) {
      if (error instanceof CloudflareError || error instanceof NetlifyError) {
        sendErrorResponse(
          res,
          502,
          'DEPLOYMENT_FAILED',
          `${DEPLOYMENT_FAILED}: ${error.message}`
        );
        return;
      }

      console.error('Error fetching deployment status:', error);
      sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to fetch project status');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'CastError') {
      sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
      return;
    }

    console.error('Error fetching project:', error);
    sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to fetch project');
  }
});

/**
 * GET /projects/:projectId/logs
 * Get deployment logs (paginated)
 */
router.get(
  '/:projectId/logs',
  async (req: Request, res: Response): Promise<void> => {
    logRequest(req.method, req.path, req.authUser?.id);

    if (!req.authUser) {
      sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const rawLimit = req.query.limit as string | undefined;
    const rawOffset = req.query.offset as string | undefined;

    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 50;
    const parsedOffset = rawOffset ? parseInt(rawOffset, 10) : 0;

    const limitBase = Number.isFinite(parsedLimit) ? parsedLimit : 50;
    const offsetBase = Number.isFinite(parsedOffset) ? parsedOffset : 0;

    const limit = Math.min(200, Math.max(1, limitBase));
    const offset = Math.max(0, offsetBase);

    try {
      const project = await Project.findById(req.params.projectId);

      if (!project) {
        sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
        return;
      }

      if (project.userId.toString() !== req.authUser.id) {
        sendErrorResponse(
          res,
          403,
          'INSUFFICIENT_PERMISSIONS',
          INSUFFICIENT_PERMISSIONS
        );
        return;
      }

      try {
        const service = project.getDeploymentService() as any;
        const allLogs = await service.getDeploymentLogs(project.deploymentId);
        const logs = allLogs.slice(offset, offset + limit);

        res.status(200).json({
          status: 'success',
          data: {
            logs,
            status: project.status,
            lastUpdated: new Date(),
            pagination: {
              limit,
              offset,
              returned: logs.length,
              total: allLogs.length,
            },
          },
        });
      } catch (error) {
        if (error instanceof CloudflareError || error instanceof NetlifyError) {
          sendErrorResponse(
            res,
            502,
            'DEPLOYMENT_FAILED',
            `${DEPLOYMENT_FAILED}: ${error.message}`
          );
          return;
        }

        console.error('Error fetching deployment logs:', error);
        sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to fetch deployment logs');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'CastError') {
        sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
        return;
      }

      console.error('Error fetching project logs:', error);
      sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to fetch deployment logs');
    }
  }
);

/**
 * PATCH /projects/:projectId
 * Update project metadata
 */
router.patch('/:projectId', async (req: Request, res: Response): Promise<void> => {
  logRequest(req.method, req.path, req.authUser?.id);

  if (!req.authUser) {
    sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const validationResult = updateProjectSchema.safeParse(req.body);
  if (!validationResult.success) {
    sendErrorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid input data',
      validationResult.error.flatten().fieldErrors
    );
    return;
  }

  const { name, description } = validationResult.data;
  if (typeof name === 'undefined' && typeof description === 'undefined') {
    sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'No fields to update');
    return;
  }

  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
      return;
    }

    if (project.userId.toString() !== req.authUser.id) {
      sendErrorResponse(
        res,
        403,
        'INSUFFICIENT_PERMISSIONS',
        INSUFFICIENT_PERMISSIONS
      );
      return;
    }

    if (name && name !== project.name) {
      const existing = await Project.findOne({
        userId: req.authUser.id,
        name,
        _id: { $ne: project._id },
      });
      if (existing) {
        sendErrorResponse(res, 409, 'PROJECT_NAME_EXISTS', PROJECT_NAME_EXISTS);
        return;
      }
      project.name = name;
    }

    if (typeof description !== 'undefined') {
      project.description = description;
    }

    await project.save();

    res.status(200).json({
      status: 'success',
      data: {
        project: serializeProject(project),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'CastError') {
      sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
      return;
    }

    console.error('Error updating project:', error);
    sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to update project');
  }
});

/**
 * DELETE /projects/:projectId
 * Delete project from provider and DB
 */
router.delete(
  '/:projectId',
  async (req: Request, res: Response): Promise<void> => {
    logRequest(req.method, req.path, req.authUser?.id);

    if (!req.authUser) {
      sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    try {
      const project = await Project.findById(req.params.projectId);

      if (!project) {
        sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
        return;
      }

      if (project.userId.toString() !== req.authUser.id) {
        sendErrorResponse(
          res,
          403,
          'INSUFFICIENT_PERMISSIONS',
          INSUFFICIENT_PERMISSIONS
        );
        return;
      }

      try {
        const service = project.getDeploymentService() as any;
        await service.deleteDeployment(project.deploymentId);
      } catch (error) {
        if (error instanceof CloudflareError || error instanceof NetlifyError) {
          sendErrorResponse(
            res,
            502,
            'DEPLOYMENT_FAILED',
            `${DEPLOYMENT_FAILED}: ${error.message}`
          );
          return;
        }

        console.error('Error deleting provider deployment:', error);
        sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to delete deployment');
        return;
      }

      await project.deleteOne();

      logDeploymentEvent(project._id.toString(), 'delete', 'deleted');

      res.status(200).json({
        status: 'success',
        data: {
          success: true,
          message: 'Project deleted',
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'CastError') {
        sendErrorResponse(res, 404, 'PROJECT_NOT_FOUND', PROJECT_NOT_FOUND);
        return;
      }

      console.error('Error deleting project:', error);
      sendErrorResponse(res, 500, 'SERVER_ERROR', 'Failed to delete project');
    }
  }
);

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Project route error:', err);
  sendErrorResponse(res, 500, 'SERVER_ERROR', 'An unexpected error occurred');
});

export default router;
