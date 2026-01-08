// Re-export commonly used types
export { IUser } from '../models/User';
export {
  SignupInput,
  LoginInput,
  GithubAuthInput,
  CreateProjectInput,
  UpdateProjectInput,
} from '../schemas/validation';

/**
 * Deployment provider types
 */
export interface Deployment {
  deploymentId: string;
  status: 'deploying' | 'deployed' | 'failed';
  url: string;
  createdAt: Date;
}

export interface DeploymentStatus {
  status: string;
  url: string;
  lastDeployed: Date;
  deploymentUrl: string;
}

export interface Log {
  timestamp: Date;
  message: string;
  level: 'info' | 'warn' | 'error';
}

/**
 * GitHub Repository interface
 */
export interface Repository {
  id: number;
  name: string;
  description: string | null;
  url: string;
  owner: string;
  private: boolean;
  language: string | null;
  defaultBranch: string;
  stars: number;
}

/**
 * GitHub Release interface
 */
export interface Release {
  id: number;
  tagName: string;
  name: string;
  prerelease: boolean;
  publishedAt: Date;
}

export interface GitHubPushEvent {
  ref: string; // 'refs/heads/main'
  repository: {
    name: string;
    full_name: string; // 'owner/repo'
  };
  pusher: {
    name: string;
  };
  commits: Array<{
    id: string;
    message: string;
  }>;
}

export interface WebhookSignature {
  header: string; // 'X-Hub-Signature-256'
  signature: string; // 'sha256=...'
}
