import crypto from 'crypto';

/**
 * Verifies a GitHub webhook signature using HMAC-SHA256.
 * 
 * @param payload - The request body as a string.
 * @param signature - The signature from the X-Hub-Signature-256 header.
 * @param secret - The webhook secret.
 * @returns true if the signature is valid, false otherwise.
 */
export function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    const sigBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (sigBuffer.length !== digestBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(sigBuffer, digestBuffer);
  } catch (error) {
    return false;
  }
}
