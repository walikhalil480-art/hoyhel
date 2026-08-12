import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AuthError, ConflictError, NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { UserRoleType } from '@prisma/client';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRoleType;
    phone?: string;
  }) {
    // 1. Public self-registration must ONLY allow GUEST role.
    if (data.role && data.role !== UserRoleType.GUEST) {
      throw new ForbiddenError('Self-registration is restricted to GUEST. Host accounts must go through onboarding.');
    }

    const emailNormalized = data.email.toLowerCase().trim();

    // 2. Explicit duplicate email check returning clean ConflictError
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    }).catch(() => null);

    if (existingUser) {
      throw new ConflictError('An account with this email address already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(data.password);
    const emailVerifyToken = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 3. Execute User & Verification Token creation inside an atomic Prisma Transaction
    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email: emailNormalized,
          passwordHash,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone || null,
          role: UserRoleType.GUEST,
          emailVerificationTokens: {
            create: {
              token: emailVerifyToken,
              expiresAt: tokenExpiresAt,
            },
          },
        },
      });
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, roles: [user.role] });
    const refreshToken = signRefreshToken({ userId: user.id });

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roles: [user.role],
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
      emailVerifyToken,
    };
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const emailNormalized = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (!user) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AuthError('Account is deactivated. Please contact support.', 'ACCOUNT_DEACTIVATED');
    }

    if (user.isSuspended) {
      throw new AuthError(`Account suspended: ${user.suspensionReason || 'Contact administration'}`, 'ACCOUNT_SUSPENDED');
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = [user.role];
    const accessToken = signAccessToken({ userId: user.id, email: user.email, roles });
    const refreshToken = signRefreshToken({ userId: user.id });

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token & session record
    await Promise.all([
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: refreshExpiresAt,
        },
      }),
      prisma.userSession.create({
        data: {
          userId: user.id,
          token: refreshToken,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          expiresAt: refreshExpiresAt,
        },
      }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        roles,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshTokenStr: string) {
    if (!refreshTokenStr) {
      throw new AuthError('Refresh token required', 'MISSING_REFRESH_TOKEN');
    }

    let decoded: { userId: string };
    try {
      decoded = verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new AuthError('Invalid or expired refresh token', 'REFRESH_TOKEN_EXPIRED');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new AuthError('Refresh token revoked or expired', 'INVALID_REFRESH_TOKEN');
    }

    const user = storedToken.user;
    if (!user.isActive || user.isSuspended) {
      throw new AuthError('Account inactive or suspended', 'ACCOUNT_INACTIVE');
    }

    // Token Rotation: revoke used refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email, roles: [user.role] });
    const newRefreshToken = signRefreshToken({ userId: user.id });

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshTokenStr?: string) {
    if (refreshTokenStr) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenStr },
        data: { isRevoked: true },
      });
      await prisma.userSession.updateMany({
        where: { token: refreshTokenStr },
        data: { isValid: false },
      });
    }
    return { success: true };
  }

  async logoutAll(userId: string) {
    await Promise.all([
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
      prisma.userSession.updateMany({
        where: { userId },
        data: { isValid: false },
      }),
    ]);

    return { success: true };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundError('User');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      roles: [user.role],
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async verifyEmail(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.isUsed || record.expiresAt < new Date()) {
      throw new ValidationError('Invalid, used, or expired email verification token');
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { isUsed: true },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      }),
    ]);

    return { success: true, message: 'Email address verified successfully' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.isEmailVerified) throw new ValidationError('Email is already verified');

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return { success: true, message: 'Verification email resent', token };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } }).catch(() => null);

    // SECURITY: Always return generic message to prevent email enumeration!
    if (!user) {
      return { success: true, message: 'If the account exists, a password reset email has been sent.' };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return {
      success: true,
      message: 'If the account exists, a password reset email has been sent.',
      resetToken: process.env.NODE_ENV === 'development' ? token : undefined,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.isUsed || record.expiresAt < new Date()) {
      throw new ValidationError('Invalid, used, or expired password reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { isUsed: true },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoke all active sessions upon password reset
      prisma.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { isRevoked: true },
      }),
      prisma.userSession.updateMany({
        where: { userId: record.userId },
        data: { isValid: false },
      }),
    ]);

    return { success: true, message: 'Password has been reset successfully' };
  }
}
