interface ErrorDefinition {
  code: string;
  status: number;
  message: string;
}

export const ERRORS: Record<string, ErrorDefinition> = {
  // Authentication errors
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    status: 401,
    message: 'Invalid email or password',
  },
  MISSING_TOKEN: {
    code: 'MISSING_TOKEN',
    status: 401,
    message: 'Authentication token is required',
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    status: 401,
    message: 'Invalid or malformed token',
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    status: 401,
    message: 'Token has expired',
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    status: 401,
    message: 'Unauthorized access',
  },

  // Validation errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    status: 400,
    message: 'Invalid request data',
  },
  INVALID_CONTENT_TYPE: {
    code: 'INVALID_CONTENT_TYPE',
    status: 400,
    message: 'Content-Type must be application/json',
  },

  // User errors
  USER_EXISTS: {
    code: 'USER_EXISTS',
    status: 409,
    message: 'User with this email already exists',
  },
  USERNAME_EXISTS: {
    code: 'USERNAME_EXISTS',
    status: 409,
    message: 'Username is already taken',
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    status: 404,
    message: 'User not found',
  },

  // Resource errors
  NOT_FOUND: {
    code: 'NOT_FOUND',
    status: 404,
    message: 'Resource not found',
  },
  CONFLICT: {
    code: 'CONFLICT',
    status: 409,
    message: 'Resource already exists',
  },

  // Project errors
  PROJECT_NOT_FOUND: {
    code: 'PROJECT_NOT_FOUND',
    status: 404,
    message: 'Project not found',
  },
  PROJECT_NAME_EXISTS: {
    code: 'PROJECT_NAME_EXISTS',
    status: 409,
    message: 'Project name already exists',
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    status: 403,
    message: 'You do not have permission to access this project',
  },

  // GitHub errors
  GITHUB_UNAUTHORIZED: {
    code: 'GITHUB_UNAUTHORIZED',
    status: 401,
    message: 'GitHub token is invalid or expired',
  },
  GITHUB_FORBIDDEN: {
    code: 'GITHUB_FORBIDDEN',
    status: 403,
    message: 'GitHub API rate limit exceeded or insufficient permissions',
  },
  GITHUB_NOT_FOUND: {
    code: 'GITHUB_NOT_FOUND',
    status: 404,
    message: 'GitHub resource not found',
  },
  GITHUB_NOT_CONNECTED: {
    code: 'GITHUB_NOT_CONNECTED',
    status: 401,
    message: 'GitHub account not connected',
  },
  INVALID_GITHUB_REPO: {
    code: 'INVALID_GITHUB_REPO',
    status: 400,
    message: 'Invalid GitHub repository format',
  },

  // Deployment errors
  DEPLOYMENT_FAILED: {
    code: 'DEPLOYMENT_FAILED',
    status: 502,
    message: 'Deployment failed',
  },

  // Rate limiting
  TOO_MANY_REQUESTS: {
    code: 'TOO_MANY_REQUESTS',
    status: 429,
    message: 'Too many requests, please try again later',
  },

  // Server errors
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    status: 500,
    message: 'Internal server error',
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    status: 500,
    message: 'An unexpected error occurred',
  },
};

// Legacy exports for backward compatibility
export const PROJECT_NOT_FOUND = ERRORS.PROJECT_NOT_FOUND.message;
export const INVALID_GITHUB_REPO = ERRORS.INVALID_GITHUB_REPO.message;
export const DEPLOYMENT_FAILED = ERRORS.DEPLOYMENT_FAILED.message;
export const INSUFFICIENT_PERMISSIONS = ERRORS.INSUFFICIENT_PERMISSIONS.message;
export const PROJECT_NAME_EXISTS = ERRORS.PROJECT_NAME_EXISTS.message;
