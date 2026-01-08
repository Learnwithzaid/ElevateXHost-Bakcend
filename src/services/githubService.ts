import { Octokit } from 'octokit';
import { Repository, Release } from '../types';

/**
 * GitHub API service using Octokit
 * Handles all GitHub API operations with proper error handling
 */

/**
 * Custom error class for GitHub API errors
 */
export class GitHubError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

/**
 * Initialize Octokit client with access token
 */
export function createOctokitClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

/**
 * Get user's repositories
 * @param accessToken - GitHub access token
 * @returns Array of repositories
 * @throws GitHubError for API errors
 */
export async function getRepositories(
  accessToken: string
): Promise<Repository[]> {
  try {
    const octokit = createOctokitClient(accessToken);
    const repos: Repository[] = [];

    // Handle pagination
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc',
      });

      if (response.status === 200) {
        for (const repo of response.data) {
          repos.push({
            id: repo.id,
            name: repo.name,
            description: repo.description,
            url: repo.html_url,
            owner: repo.owner.login,
            private: repo.private,
            language: repo.language,
            defaultBranch: repo.default_branch || 'main',
            stars: repo.stargazers_count,
          });
        }

        // Check if there are more pages
        const linkHeader = response.headers['link'];
        hasMore = linkHeader ? linkHeader.includes('rel="next"') : false;
        page++;
      } else {
        throw new GitHubError(
          response.status,
          'GITHUB_API_ERROR',
          'Failed to fetch repositories'
        );
      }
    }

    return repos;
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error;
    }

    // Handle Octokit errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;

      if (status === 401) {
        throw new GitHubError(
          401,
          'GITHUB_UNAUTHORIZED',
          'GitHub authentication token invalid or expired. Please re-authenticate via OAuth.'
        );
      }

      if (status === 403) {
        const message =
          (error as any).response?.data?.message ||
          'GitHub API rate limit exceeded or insufficient permissions';
        throw new GitHubError(403, 'GITHUB_FORBIDDEN', message);
      }
    }

    console.error('Error fetching repositories:', error);
    throw new GitHubError(
      500,
      'SERVER_ERROR',
      'Failed to fetch repositories from GitHub'
    );
  }
}

/**
 * Get repository content (file or directory)
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - Path to file or directory (default: '')
 * @returns Content metadata
 * @throws GitHubError for API errors
 */
export async function getRepoContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string = ''
): Promise<any> {
  try {
    const octokit = createOctokitClient(accessToken);

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (response.status === 200) {
      return response.data;
    }

    throw new GitHubError(
      response.status,
      'GITHUB_API_ERROR',
      'Failed to fetch repository content'
    );
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error;
    }

    // Handle Octokit errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;

      if (status === 401) {
        throw new GitHubError(
          401,
          'GITHUB_UNAUTHORIZED',
          'GitHub authentication token invalid or expired. Please re-authenticate via OAuth.'
        );
      }

      if (status === 403) {
        const message =
          (error as any).response?.data?.message ||
          'GitHub API rate limit exceeded or insufficient permissions';
        throw new GitHubError(403, 'GITHUB_FORBIDDEN', message);
      }

      if (status === 404) {
        throw new GitHubError(
          404,
          'GITHUB_NOT_FOUND',
          'GitHub repository or file not found'
        );
      }
    }

    console.error('Error fetching repository content:', error);
    throw new GitHubError(
      500,
      'SERVER_ERROR',
      'Failed to fetch repository content from GitHub'
    );
  }
}

/**
 * Get raw file content
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - Path to file
 * @returns Raw file content as string
 * @throws GitHubError for API errors
 */
export async function getRawFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  try {
    const octokit = createOctokitClient(accessToken);

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (response.status === 200) {
      const data = response.data as any;

      // Check if it's a file (not a directory or symlink)
      if (data.type !== 'file') {
        throw new GitHubError(
          400,
          'INVALID_PATH',
          'Path does not point to a file'
        );
      }

      // Decode base64 content
      if (data.encoding === 'base64' && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      throw new GitHubError(
        500,
        'SERVER_ERROR',
        'Failed to decode file content'
      );
    }

    throw new GitHubError(
      response.status,
      'GITHUB_API_ERROR',
      'Failed to fetch raw file'
    );
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error;
    }

    // Handle Octokit errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;

      if (status === 401) {
        throw new GitHubError(
          401,
          'GITHUB_UNAUTHORIZED',
          'GitHub authentication token invalid or expired. Please re-authenticate via OAuth.'
        );
      }

      if (status === 403) {
        const message =
          (error as any).response?.data?.message ||
          'GitHub API rate limit exceeded or insufficient permissions';
        throw new GitHubError(403, 'GITHUB_FORBIDDEN', message);
      }

      if (status === 404) {
        throw new GitHubError(
          404,
          'GITHUB_NOT_FOUND',
          'GitHub repository or file not found'
        );
      }
    }

    console.error('Error fetching raw file:', error);
    throw new GitHubError(
      500,
      'SERVER_ERROR',
      'Failed to fetch raw file from GitHub'
    );
  }
}

/**
 * Trigger repository dispatch event (for GitHub Actions)
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param eventType - Event type to trigger
 * @throws GitHubError for API errors
 */
export async function triggerRepositoryDispatch(
  accessToken: string,
  owner: string,
  repo: string,
  eventType: string
): Promise<void> {
  try {
    const octokit = createOctokitClient(accessToken);

    const response = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
    });

    if (response.status === 204 || response.status === 201) {
      return;
    }

    throw new GitHubError(
      response.status,
      'GITHUB_API_ERROR',
      'Failed to trigger repository dispatch'
    );
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error;
    }

    // Handle Octokit errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;

      if (status === 401) {
        throw new GitHubError(
          401,
          'GITHUB_UNAUTHORIZED',
          'GitHub authentication token invalid or expired. Please re-authenticate via OAuth.'
        );
      }

      if (status === 403) {
        const message =
          (error as any).response?.data?.message ||
          'GitHub API rate limit exceeded or insufficient permissions';
        throw new GitHubError(403, 'GITHUB_FORBIDDEN', message);
      }

      if (status === 404) {
        throw new GitHubError(
          404,
          'GITHUB_NOT_FOUND',
          'GitHub repository not found'
        );
      }
    }

    console.error('Error triggering repository dispatch:', error);
    throw new GitHubError(
      500,
      'SERVER_ERROR',
      'Failed to trigger repository dispatch'
    );
  }
}

/**
 * Get latest release for a repository
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Release information or null if no releases
 * @throws GitHubError for API errors
 */
export async function getLatestRelease(
  accessToken: string,
  owner: string,
  repo: string
): Promise<Release | null> {
  try {
    const octokit = createOctokitClient(accessToken);

    const response = await octokit.rest.repos.getLatestRelease({
      owner,
      repo,
    });

    if (response.status === 200) {
      return {
        id: response.data.id,
        tagName: response.data.tag_name,
        name: response.data.name || response.data.tag_name,
        prerelease: response.data.prerelease,
        publishedAt: new Date(response.data.published_at),
      };
    }

    throw new GitHubError(
      response.status,
      'GITHUB_API_ERROR',
      'Failed to fetch latest release'
    );
  } catch (error) {
    if (error instanceof GitHubError) {
      throw error;
    }

    // Handle Octokit errors - 404 means no releases exist
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;

      if (status === 401) {
        throw new GitHubError(
          401,
          'GITHUB_UNAUTHORIZED',
          'GitHub authentication token invalid or expired. Please re-authenticate via OAuth.'
        );
      }

      if (status === 403) {
        const message =
          (error as any).response?.data?.message ||
          'GitHub API rate limit exceeded or insufficient permissions';
        throw new GitHubError(403, 'GITHUB_FORBIDDEN', message);
      }

      if (status === 404) {
        // No releases exist, return null
        return null;
      }
    }

    console.error('Error fetching latest release:', error);
    throw new GitHubError(
      500,
      'SERVER_ERROR',
      'Failed to fetch latest release from GitHub'
    );
  }
}

export default {
  getRepositories,
  getRepoContent,
  getRawFile,
  triggerRepositoryDispatch,
  getLatestRelease,
};
