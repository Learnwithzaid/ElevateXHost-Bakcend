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
}
