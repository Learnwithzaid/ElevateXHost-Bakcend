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
