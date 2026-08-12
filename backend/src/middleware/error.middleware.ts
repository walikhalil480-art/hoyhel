import { Request, Response, NextFunction } from 'express';
import { AppError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { Prisma } from '@prisma/client';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Handle Prisma Unique Constraint Errors (P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = (err.meta?.target as string[]) || [];
    const fieldName = target.length > 0 ? target.join(', ') : 'field';
    const conflictError = new ConflictError(`An account or resource with this ${fieldName} already exists`, 'EMAIL_ALREADY_EXISTS');

    logger.warn(`Prisma Unique Constraint Violation [P2002]: ${conflictError.message}`, { path: req.path, target });
    return res.status(conflictError.statusCode).json({
      success: false,
      message: conflictError.message,
      code: conflictError.errorCode,
    });
  }

  // Handle Typed Application Errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`AppError [${err.errorCode}]: ${err.message}`, { stack: err.stack, path: req.path });
    } else {
      logger.warn(`ClientError [${err.errorCode}]: ${err.message}`, { path: req.path });
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.errorCode,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Handle unexpected operational or system errors
  logger.error(`Unhandled Exception: ${err.message}`, { stack: err.stack, path: req.path });

  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'An unexpected internal server error occurred' : err.message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
}
