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
