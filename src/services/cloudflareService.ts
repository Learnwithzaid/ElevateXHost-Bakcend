import { Deployment, DeploymentStatus, Log } from '../types';

export class CloudflareError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CloudflareError';
  }
}

type CloudflareResponse<T> = {
  success: boolean;
  errors?: Array<{ message?: string; code?: number }>;
  messages?: Array<{ message?: string; code?: number }>;
  result: T;
};

function getErrorMessage(payload: any): string {
  const msg =
    payload?.errors?.[0]?.message ||
    payload?.messages?.[0]?.message ||
    payload?.error ||
    payload?.message;
  return typeof msg === 'string' && msg.length > 0
    ? msg
    : 'Cloudflare API request failed';
}

function coerceStatus(value: unknown): 'deploying' | 'deployed' | 'failed' {
  if (typeof value !== 'string') return 'deploying';

  const v = value.toLowerCase();
  if (v.includes('success') || v.includes('active') || v.includes('ready')) {
    return 'deployed';
  }
  if (v.includes('fail') || v.includes('error')) {
    return 'failed';
  }
  return 'deploying';
}

export default class CloudflareService {
  private apiToken: string;
  private accountId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(apiToken?: string, accountId?: string) {
    this.apiToken = apiToken || process.env.CLOUDFLARE_API_TOKEN || '';
    this.accountId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID || '';
  }

  private ensureConfigured(): void {
    if (!this.apiToken || !this.accountId) {
      throw new CloudflareError(
        500,
        'CLOUDFLARE_NOT_CONFIGURED',
        'Cloudflare API token/account ID not configured'
      );
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
      throw new CloudflareError(
        res.status,
        'CLOUDFLARE_API_ERROR',
        typeof payload === 'string' ? payload : getErrorMessage(payload)
      );
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      const cf = payload as CloudflareResponse<T>;
      if (!cf.success) {
        throw new CloudflareError(500, 'CLOUDFLARE_API_ERROR', getErrorMessage(cf));
      }
      return cf.result;
    }

    return payload as T;
  }

  async createDeployment(
    projectName: string,
    gitHubRepo: string,
    gitHubToken: string
  ): Promise<Deployment> {
    void gitHubToken;

    const [owner, repo] = gitHubRepo.split('/');
    if (!owner || !repo) {
      throw new CloudflareError(400, 'INVALID_GITHUB_REPO', 'Invalid GitHub repository format');
    }

    const result = await this.request<any>(
      `/accounts/${this.accountId}/pages/projects`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          production_branch: 'main',
          source: {
            type: 'github',
            config: {
              owner,
              repo_name: repo,
              production_branch: 'main',
              deployments_enabled: true,
              pr_comments_enabled: false,
            },
          },
        }),
      }
    );

    const createdAt = result?.created_on ? new Date(result.created_on) : new Date();
    const subdomain = result?.subdomain || projectName;
    const url = `https://${subdomain}.pages.dev`;

    return {
      deploymentId: result?.name || projectName,
      status: 'deploying',
      url,
      createdAt,
    };
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    const result = await this.request<any>(
      `/accounts/${this.accountId}/pages/projects/${encodeURIComponent(deploymentId)}`,
      { method: 'GET' }
    );

    const subdomain = result?.subdomain || deploymentId;
    const url = `https://${subdomain}.pages.dev`;

    const latest = result?.latest_deployment;
    const stageName =
      latest?.latest_stage?.name ||
      latest?.deployment_trigger?.type ||
      latest?.stage?.name ||
      latest?.status ||
      latest?.state;

    const status = coerceStatus(stageName);

    const lastDeployed = latest?.created_on
      ? new Date(latest.created_on)
      : result?.created_on
        ? new Date(result.created_on)
        : new Date(0);

    const deploymentUrl = latest?.url || url;

    return {
      status,
      url,
      lastDeployed,
      deploymentUrl,
    };
  }

  async triggerRedeploy(deploymentId: string): Promise<void> {
    await this.request<any>(
      `/accounts/${this.accountId}/pages/projects/${encodeURIComponent(deploymentId)}/deployments`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
  }

  async deleteDeployment(deploymentId: string): Promise<void> {
    await this.request<any>(
      `/accounts/${this.accountId}/pages/projects/${encodeURIComponent(deploymentId)}`,
      { method: 'DELETE' }
    );
  }

  async getDeploymentLogs(deploymentId: string): Promise<Log[]> {
    const project = await this.request<any>(
      `/accounts/${this.accountId}/pages/projects/${encodeURIComponent(deploymentId)}`,
      { method: 'GET' }
    );

    const latestDeploymentId = project?.latest_deployment?.id;
    if (!latestDeploymentId) {
      return [];
    }

    const logsPayload = await this.request<any>(
      `/accounts/${this.accountId}/pages/projects/${encodeURIComponent(deploymentId)}/deployments/${encodeURIComponent(latestDeploymentId)}/logs`,
      { method: 'GET' }
    );

    const logs: any[] = Array.isArray(logsPayload)
      ? logsPayload
      : typeof logsPayload === 'string'
        ? logsPayload
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        : logsPayload?.logs || [];

    return logs.map((l: any) => {
      const message = typeof l === 'string' ? l : l?.message || JSON.stringify(l);
      const levelRaw = typeof l === 'object' ? l?.level : undefined;
      const level =
        levelRaw === 'warn' || levelRaw === 'error' || levelRaw === 'info'
          ? levelRaw
          : /\berror\b/i.test(message)
            ? 'error'
            : /\bwarn\b/i.test(message)
              ? 'warn'
              : 'info';

      const timestamp =
        typeof l === 'object' && l?.timestamp
          ? new Date(l.timestamp)
          : new Date();

      return {
        timestamp,
        message,
        level,
      };
    });
  }
}
