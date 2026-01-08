import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { error as logError } from '../utils/logger';
import { ERRORS } from '../constants/errors';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const userId = req.authUser?.id;
  
  logError('Error occurred', err, userId);

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    res.status(ERRORS.VALIDATION_ERROR.status).json({
      status: 'error',
      code: ERRORS.VALIDATION_ERROR.code,
      message: ERRORS.VALIDATION_ERROR.message,
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof TokenExpiredError) {
    res.status(ERRORS.TOKEN_EXPIRED.status).json({
      status: 'error',
      code: ERRORS.TOKEN_EXPIRED.code,
      message: ERRORS.TOKEN_EXPIRED.message,
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(ERRORS.INVALID_TOKEN.status).json({
      status: 'error',
      code: ERRORS.INVALID_TOKEN.code,
      message: ERRORS.INVALID_TOKEN.message,
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(ERRORS.VALIDATION_ERROR.status).json({
      status: 'error',
      code: ERRORS.VALIDATION_ERROR.code,
      message: 'Invalid ID format',
    });
    return;
  }

  if (err.status === 404) {
    res.status(ERRORS.NOT_FOUND.status).json({
      status: 'error',
      code: ERRORS.NOT_FOUND.code,
      message: err.message || ERRORS.NOT_FOUND.message,
    });
    return;
  }

  if (err.status === 429) {
    res.status(ERRORS.TOO_MANY_REQUESTS.status).json({
      status: 'error',
      code: ERRORS.TOO_MANY_REQUESTS.code,
      message: err.message || ERRORS.TOO_MANY_REQUESTS.message,
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || ERRORS.INTERNAL_ERROR.code;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? ERRORS.INTERNAL_ERROR.message
    : err.message || ERRORS.INTERNAL_ERROR.message;

  res.status(statusCode).json({
    status: 'error',
    code: errorCode,
    message,
    ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
  });
}
