import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export function recordAuditLog(action: string, resource: string, getResourceId?: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Continue request processing first
    next();

    // Asynchronously log audit event on success response
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const resourceId = getResourceId ? getResourceId(req) : req.params.id;
          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId || null,
              action,
              resource,
              resourceId: resourceId || null,
              ipAddress: req.ip || req.socket.remoteAddress || null,
              userAgent: req.headers['user-agent'] || null,
              details: {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
              },
            },
          });
        } catch (error: any) {
          logger.error('Failed to record audit log:', error.message);
        }
      }
    });
  };
}
