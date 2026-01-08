import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { authenticateToken } from '../middleware/authMiddleware';
import githubService, { GitHubError } from '../services/githubService';

const router = Router();

/**
 * Helper function to send error response
 */
function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  res.status(statusCode).json({
    status: 'error',
    code,
    message,
  });
}

/**
 * GET /github/repos
 * Get user's GitHub repositories
 * Requires JWT authentication
 */
router.get(
  '/repos',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.authUser) {
        sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      // Find user and get GitHub token
      const user = await User.findById(req.authUser.id).select(
        '+githubAccessToken'
      );

      if (!user) {
        sendErrorResponse(res, 401, 'USER_NOT_FOUND', 'User not found');
        return;
      }

      // Get decrypted GitHub token
      const accessToken = await user.getGitHubToken();

      if (!accessToken) {
        sendErrorResponse(
          res,
          401,
          'GITHUB_NOT_CONNECTED',
          'GitHub account not connected. Please authenticate via OAuth.'
        );
        return;
      }

      // Fetch repositories from GitHub
      const repos = await githubService.getRepositories(accessToken);

      res.status(200).json({
        status: 'success',
        data: {
          repos,
        },
      });
    } catch (error) {
      if (error instanceof GitHubError) {
        sendErrorResponse(res, error.statusCode, error.code, error.message);
        return;
      }

      console.error('Error fetching repositories:', error);
      sendErrorResponse(
        res,
        500,
        'SERVER_ERROR',
        'Failed to fetch repositories'
      );
    }
  }
);

/**
 * GET /github/repos/:owner/:repo/content
 * Get repository content (file or directory)
 * Requires JWT authentication
 */
router.get(
  '/repos/:owner/:repo/content',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.authUser) {
        sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const { owner, repo } = req.params;
      const path = (req.query.path as string) || '';

      // Find user and get GitHub token
      const user = await User.findById(req.authUser.id).select(
        '+githubAccessToken'
      );

      if (!user) {
        sendErrorResponse(res, 401, 'USER_NOT_FOUND', 'User not found');
        return;
      }

      // Get decrypted GitHub token
      const accessToken = await user.getGitHubToken();

      if (!accessToken) {
        sendErrorResponse(
          res,
          401,
          'GITHUB_NOT_CONNECTED',
          'GitHub account not connected. Please authenticate via OAuth.'
        );
        return;
      }

      // Fetch content from GitHub
      const content = await githubService.getRepoContent(
        accessToken,
        owner,
        repo,
        path
      );

      res.status(200).json({
        status: 'success',
        data: {
          content,
        },
      });
    } catch (error) {
      if (error instanceof GitHubError) {
        sendErrorResponse(res, error.statusCode, error.code, error.message);
        return;
      }

      console.error('Error fetching repository content:', error);
      sendErrorResponse(
        res,
        500,
        'SERVER_ERROR',
        'Failed to fetch repository content'
      );
    }
  }
);

/**
 * GET /github/repos/:owner/:repo/raw/*
 * Get raw file content from repository
 * Requires JWT authentication
 */
router.get(
  '/repos/:owner/:repo/raw/:path(*)',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.authUser) {
        sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const { owner, repo, path } = req.params;

      // Find user and get GitHub token
      const user = await User.findById(req.authUser.id).select(
        '+githubAccessToken'
      );

      if (!user) {
        sendErrorResponse(res, 401, 'USER_NOT_FOUND', 'User not found');
        return;
      }

      // Get decrypted GitHub token
      const accessToken = await user.getGitHubToken();

      if (!accessToken) {
        sendErrorResponse(
          res,
          401,
          'GITHUB_NOT_CONNECTED',
          'GitHub account not connected. Please authenticate via OAuth.'
        );
        return;
      }

      // Fetch raw file from GitHub
      const content = await githubService.getRawFile(
        accessToken,
        owner,
        repo,
        path
      );

      res.status(200).json({
        status: 'success',
        data: {
          content,
          path,
        },
      });
    } catch (error) {
      if (error instanceof GitHubError) {
        sendErrorResponse(res, error.statusCode, error.code, error.message);
        return;
      }

      console.error('Error fetching raw file:', error);
      sendErrorResponse(
        res,
        500,
        'SERVER_ERROR',
        'Failed to fetch raw file'
      );
    }
  }
);

/**
 * GET /github/repos/:owner/:repo/release
 * Get latest release for a repository
 * Requires JWT authentication
 */
router.get(
  '/repos/:owner/:repo/release',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.authUser) {
        sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const { owner, repo } = req.params;

      // Find user and get GitHub token
      const user = await User.findById(req.authUser.id).select(
        '+githubAccessToken'
      );

      if (!user) {
        sendErrorResponse(res, 401, 'USER_NOT_FOUND', 'User not found');
        return;
      }

      // Get decrypted GitHub token
      const accessToken = await user.getGitHubToken();

      if (!accessToken) {
        sendErrorResponse(
          res,
          401,
          'GITHUB_NOT_CONNECTED',
          'GitHub account not connected. Please authenticate via OAuth.'
        );
        return;
      }

      // Fetch latest release from GitHub
      const release = await githubService.getLatestRelease(
        accessToken,
        owner,
        repo
      );

      res.status(200).json({
        status: 'success',
        data: {
          release,
        },
      });
    } catch (error) {
      if (error instanceof GitHubError) {
        sendErrorResponse(res, error.statusCode, error.code, error.message);
        return;
      }

      console.error('Error fetching latest release:', error);
      sendErrorResponse(
        res,
        500,
        'SERVER_ERROR',
        'Failed to fetch latest release'
      );
    }
  }
);

/**
 * POST /github/repos/:owner/:repo/dispatch
 * Trigger repository dispatch event
 * Requires JWT authentication
 */
router.post(
  '/repos/:owner/:repo/dispatch',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.authUser) {
        sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const { owner, repo } = req.params;
      const { eventType } = req.body;

      if (!eventType || typeof eventType !== 'string') {
        sendErrorResponse(
          res,
          400,
          'VALIDATION_ERROR',
          'eventType is required and must be a string'
        );
        return;
      }

      // Find user and get GitHub token
      const user = await User.findById(req.authUser.id).select(
        '+githubAccessToken'
      );

      if (!user) {
        sendErrorResponse(res, 401, 'USER_NOT_FOUND', 'User not found');
        return;
      }

      // Get decrypted GitHub token
      const accessToken = await user.getGitHubToken();

      if (!accessToken) {
        sendErrorResponse(
          res,
          401,
          'GITHUB_NOT_CONNECTED',
          'GitHub account not connected. Please authenticate via OAuth.'
        );
        return;
      }

      // Trigger repository dispatch
      await githubService.triggerRepositoryDispatch(
        accessToken,
        owner,
        repo,
        eventType
      );

      res.status(200).json({
        status: 'success',
        message: 'Repository dispatch triggered successfully',
      });
    } catch (error) {
      if (error instanceof GitHubError) {
        sendErrorResponse(res, error.statusCode, error.code, error.message);
        return;
      }

      console.error('Error triggering repository dispatch:', error);
      sendErrorResponse(
        res,
        500,
        'SERVER_ERROR',
        'Failed to trigger repository dispatch'
      );
    }
  }
);

// Error handling middleware for GitHub routes
router.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('GitHub route error:', err);

  sendErrorResponse(
    res,
    500,
    'SERVER_ERROR',
    'An unexpected error occurred'
  );
});

export default router;
