// Re-export commonly used types
export { IUser } from '../models/User';
export { SignupInput, LoginInput, GithubAuthInput } from '../schemas/validation';

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
