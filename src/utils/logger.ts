const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'apiKey', 'githubToken'];

function shouldLog(level: string): boolean {
  const currentLevel = LOG_LEVELS[logLevel as keyof typeof LOG_LEVELS] || LOG_LEVELS.info;
  const messageLevel = LOG_LEVELS[level as keyof typeof LOG_LEVELS] || LOG_LEVELS.info;
  return messageLevel >= currentLevel;
}

function sanitizeData(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'object') {
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = sanitizeData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }
    return sanitized;
  }
  
  return data;
}

function formatLog(level: string, message: string, data?: any, userId?: string): string {
/**
 * Log webhook events for debugging and audit trail.
 */
export function logWebhook(projectId: string, eventType: string, status: string, signature: string): void {
  console.log(`[${new Date().toISOString()}] WEBHOOK: Project=${projectId}, Event=${eventType}, Status=${status}, Signature=${signature.substring(0, 10)}...`);
}

/**
 * Log redeployment events.
 */
export function logRedeploy(projectId: string, branch: string, status: string): void {
  console.log(`[${new Date().toISOString()}] REDEPLOY: Project=${projectId}, Branch=${branch}, Status=${status}`);
export function logRequest(method: string, path: string, userId?: string): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(userId && { userId }),
    ...(data && { data: sanitizeData(data) }),
  };

  if (isProduction) {
    return JSON.stringify(entry);
  } else {
    const color = {
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    }[level] || '\x1b[0m';
    const reset = '\x1b[0m';
    return `${color}[${level.toUpperCase()}]${reset} ${entry.timestamp} ${message}${data ? ' ' + JSON.stringify(sanitizeData(data), null, 2) : ''}${userId ? ` (userId: ${userId})` : ''}`;
  }
}

export function debug(message: string, data?: any): void {
  if (!shouldLog('debug')) return;
  console.log(formatLog('debug', message, data));
}

export function info(message: string, data?: any, userId?: string): void {
  if (!shouldLog('info')) return;
  console.log(formatLog('info', message, data, userId));
}

export function warn(message: string, data?: any): void {
  if (!shouldLog('warn')) return;
  console.warn(formatLog('warn', message, data));
}

export function error(message: string, err?: Error | any, userId?: string): void {
  if (!shouldLog('error')) return;
  const errorData = err instanceof Error ? {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  } : err;
  console.error(formatLog('error', message, errorData, userId));
}

export function logRequest(method: string, path: string, userId?: string): void {
  info(`${method} ${path}`, undefined, userId);
}

export function logDeploymentEvent(
  projectId: string,
  event: string,
  status: string
): void {
  info('Deployment event', { projectId, event, status });
}
