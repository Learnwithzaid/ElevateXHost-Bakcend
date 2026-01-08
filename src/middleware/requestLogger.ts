import { Request, Response, NextFunction } from 'express';
import { info } from '../utils/logger';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') {
    return next();
  }

  req.requestId = crypto.randomUUID();
  req.startTime = Date.now();

  const userId = req.authUser?.id;

  info(`Incoming request`, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
  }, userId);

  const originalSend = res.json;
  res.json = function (body: any): Response {
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    
    info(`Outgoing response`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    }, userId);

    return originalSend.call(this, body);
  };

  next();
}
