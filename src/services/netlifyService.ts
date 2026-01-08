import { Deployment, DeploymentStatus, Log } from '../types';

export class NetlifyError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'NetlifyError';
  }
}

function coerceStatus(value: unknown): 'deploying' | 'deployed' | 'failed' {
  if (typeof value !== 'string') return 'deploying';

  const v = value.toLowerCase();
  if (v.includes('current') || v.includes('ready') || v.includes('published')) {
    return 'deployed';
  }
  if (v.includes('error') || v.includes('failed')) {
    return 'failed';
  }
  return 'deploying';
}

export default class NetlifyService {
  private apiToken: string;
  private baseUrl = 'https://api.netlify.com/api/v1';

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.NETLIFY_API_TOKEN || '';
  }

  private ensureConfigured(): void {
    if (!this.apiToken) {
      throw new NetlifyError(500, 'NETLIFY_NOT_CONFIGURED', 'Netlify API token not configured');
    }
  }

  private async request<T>(path: string, init: any): Promise<T> {
    this.ensureConfigured();

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
        ...(init.headers || {}),
      },
    });

    const text = await res.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!res.ok) {
      const message =
        payload?.message || payload?.error || (typeof payload === 'string' ? payload : 'Netlify API request failed');
      throw new NetlifyError(res.status, 'NETLIFY_API_ERROR', message);
    }

    return payload as T;
  }

  async createDeployment(
    projectName: string,
    gitHubRepo: string,
    gitHubToken: string
  ): Promise<Deployment> {
    const result = await this.request<any>('/sites', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        repo: {
          provider: 'github',
          repo: gitHubRepo,
          branch: 'main',
        },
        github_token: gitHubToken,
      }),
    });

    const createdAt = result?.created_at ? new Date(result.created_at) : new Date();

    const url =
      result?.ssl_url ||
      result?.url ||
      (result?.name ? `https://${result.name}.netlify.app` : '');

    return {
      deploymentId: result?.id,
      status: 'deploying',
      url,
      createdAt,
    };
  }

  async getDeploymentStatus(siteId: string): Promise<DeploymentStatus> {
    const site = await this.request<any>(`/sites/${encodeURIComponent(siteId)}`, {
      method: 'GET',
    });

    const url = site?.ssl_url || site?.url || (site?.name ? `https://${site.name}.netlify.app` : '');

    const publishedDeploy = site?.published_deploy;
    const status = coerceStatus(site?.state || publishedDeploy?.state);

    const lastDeployed = publishedDeploy?.published_at
      ? new Date(publishedDeploy.published_at)
      : site?.updated_at
        ? new Date(site.updated_at)
        : new Date(0);

    const deploymentUrl = publishedDeploy?.deploy_ssl_url || publishedDeploy?.url || url;

    return {
      status,
      url,
      lastDeployed,
      deploymentUrl,
    };
  }

  async triggerRedeploy(siteId: string): Promise<void> {
    await this.request<any>(`/sites/${encodeURIComponent(siteId)}/builds`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async deleteDeployment(siteId: string): Promise<void> {
    await this.request<any>(`/sites/${encodeURIComponent(siteId)}`, {
      method: 'DELETE',
    });
  }

  async getDeploymentLogs(siteId: string): Promise<Log[]> {
    const site = await this.request<any>(`/sites/${encodeURIComponent(siteId)}`, {
      method: 'GET',
    });

    const deployId = site?.published_deploy?.id;
    if (!deployId) {
      return [];
    }

    const logText = await this.request<any>(`/deploys/${encodeURIComponent(deployId)}/log`, {
      method: 'GET',
      headers: {
        Accept: 'text/plain',
      },
    });

    const lines =
      typeof logText === 'string'
        ? logText.split('\n').filter((l) => l.trim().length > 0)
        : [];

    return lines.map((message) => {
      const level = /\berror\b/i.test(message)
        ? 'error'
        : /\bwarn\b/i.test(message)
          ? 'warn'
          : 'info';

      return {
        timestamp: new Date(),
        message,
        level,
      };
    });
  }
}
