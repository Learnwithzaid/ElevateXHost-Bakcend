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
    type: 'request',
    method,
    path,
    userId: userId || null,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(entry));
}

export function logDeploymentEvent(
  projectId: string,
  event: string,
  status: string
): void {
  const entry = {
    type: 'deployment',
    projectId,
    event,
    status,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(entry));
}
