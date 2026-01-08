import { Request, Response, NextFunction } from 'express';
import { ERRORS } from '../constants/errors';

export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
    const contentType = req.get('Content-Type');
    
    if (req.path === '/webhook/github') {
      return next();
    }

    if (!contentType || !contentType.includes('application/json')) {
      res.status(ERRORS.INVALID_CONTENT_TYPE.status).json({
        status: 'error',
        code: ERRORS.INVALID_CONTENT_TYPE.code,
        message: ERRORS.INVALID_CONTENT_TYPE.message,
      });
      return;
    }
  }
  
  next();
}
