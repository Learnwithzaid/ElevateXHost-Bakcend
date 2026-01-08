import { Router, Request, Response } from 'express';
import Project from '../models/Project';
import { logWebhook } from '../utils/logger';
import { WEBHOOK_SIGNATURE_INVALID, REDEPLOY_TRIGGERED } from '../constants/errors';

const router = Router();

// POST /webhook/github
router.post('/github', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const eventType = req.headers['x-github-event'] as string;
    const payload = req.body;

    if (eventType !== 'push') {
      res.status(200).json({ success: true, message: 'Event ignored' });
      return;
    }

    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) {
      res.status(400).json({ status: 'error', message: 'Invalid payload' });
      return;
    }

    const project = await Project.findOne({ githubRepo: repoFullName });
    if (!project) {
      // Return 404 silently for security
      res.status(404).end();
      return;
    }

    // Verify signature
    // In Express, req.body is already parsed. We use JSON.stringify but 
    // ideally we should use the raw body for signature verification.
    const isValid = project.verifyWebhookSignature(signature, JSON.stringify(payload));
    if (!isValid) {
      logWebhook(project._id.toString(), eventType, 'invalid_signature', signature || '');
      res.status(401).json({ status: 'error', message: WEBHOOK_SIGNATURE_INVALID });
      return;
    }

    const ref = payload.ref; // 'refs/heads/main'
    if (!ref) {
      res.status(400).json({ status: 'error', message: 'Missing ref in payload' });
      return;
    }
    
    const branch = ref.replace('refs/heads/', '');

    if (branch !== project.defaultBranch) {
      logWebhook(project._id.toString(), eventType, 'skipped_branch', signature);
      res.status(200).json({ success: true, message: 'Branch skipped' });
      return;
    }

    // Trigger redeployment
    await project.triggerRedeploy();
    project.status = 'deploying';
    project.lastDeploymentTime = new Date();
    await project.save();
    
    logWebhook(project._id.toString(), eventType, 'triggered', signature);
    
    res.status(200).json({ 
      success: true, 
      message: REDEPLOY_TRIGGERED 
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
