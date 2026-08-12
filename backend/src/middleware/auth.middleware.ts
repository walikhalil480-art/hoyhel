import { Request, Response, NextFunction } from 'express';
import { AuthError, ForbiddenError } from '../utils/errors';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { UserRoleType } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new AuthError('Authentication token missing'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (err) {
    return next(new AuthError('Invalid or expired authentication token', 'TOKEN_EXPIRED'));
  }
}

export function requireRoles(...allowedRoles: (UserRoleType | string)[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthError('Authentication required'));
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new ForbiddenError(`Access denied: requires one of the following roles: ${allowedRoles.join(', ')}`));
    }

    return next();
  };
}

export const authorize = requireRoles;
