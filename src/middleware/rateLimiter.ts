import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { warn } from '../utils/logger';
import { ERRORS } from '../constants/errors';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10);
const WEBHOOK_RATE_LIMIT_MAX = parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '50', 10);
const GITHUB_RATE_LIMIT_MAX = parseInt(process.env.GITHUB_RATE_LIMIT_MAX || '30', 10);

function rateLimitHandler(req: Request, res: Response): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  warn(`Rate limit exceeded`, {
    ip,
    path: req.path,
    method: req.method,
  });

  res.status(ERRORS.TOO_MANY_REQUESTS.status).json({
    status: 'error',
    code: ERRORS.TOO_MANY_REQUESTS.code,
    message: ERRORS.TOO_MANY_REQUESTS.message,
  });
}

export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: ERRORS.TOO_MANY_REQUESTS.message,
  skip: (req: Request) => {
    return req.path === '/health';
  },
});

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
});

export const webhookLimiter = rateLimit({
  windowMs: 60000,
  max: WEBHOOK_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many webhook requests',
});

export const githubLimiter = rateLimit({
  windowMs: 60000,
  max: GITHUB_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many GitHub API requests',
});
