import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { PropertyType, NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';

export class UserService {
  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const isMatch = await verifyPassword(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new ValidationError('Current password provided is incorrect');
    }

    const newPasswordHash = await hashPassword(newPass);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      // Revoke active sessions except current
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
      prisma.userSession.updateMany({
        where: { userId },
        data: { isValid: false },
      }),
    ]);

    return { success: true, message: 'Password updated successfully. Other sessions invalidated.' };
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      bio?: string;
    }
  ) {
    // Strictly sanitize update data
    const allowedUpdates = {
      ...(data.firstName ? { firstName: data.firstName } : {}),
      ...(data.lastName ? { lastName: data.lastName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
    };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: allowedUpdates,
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      role: updated.role,
      isEmailVerified: updated.isEmailVerified,
    };
  }

  async applyForHost(
    userId: string,
    data: {
      businessName?: string;
      experienceYears?: number;
      propertyType?: PropertyType;
      notes?: string;
    }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    if (user.role === 'HOST') {
      throw new ConflictError('User is already a registered Host');
    }

    const existingApp = await prisma.hostApplication.findFirst({
      where: { userId, status: 'PENDING' },
    });

    if (existingApp) {
      throw new ConflictError('You already have a pending Host onboarding application under review');
    }

    const application = await prisma.hostApplication.create({
      data: {
        userId,
        businessName: data.businessName || null,
        experienceYears: data.experienceYears || null,
        propertyType: data.propertyType || null,
        notes: data.notes || null,
      },
    });

    // Notify platform admins in real time
    const notificationService = new NotificationService();
    await notificationService.notifyAdmins({
      type: NotificationType.HOST_APPLICATION_SUBMITTED,
      title: '🔔 New Host Application',
      message: `${user.firstName} ${user.lastName} has requested to become a host.`,
      data: { applicationId: application.id, applicantId: user.id },
      priority: NotificationPriority.HIGH,
      actionUrl: '/admin/hosts',
    });

    return application;
  }

  async getUserSessions(userId: string) {
    return prisma.userSession.findMany({
      where: { userId, isValid: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session');
    if (session.userId !== userId) throw new ForbiddenError('Access denied to session');

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isValid: false },
    });

    return { success: true, message: 'Session revoked' };
  }

  async deactivateAccount(userId: string) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
      prisma.userSession.updateMany({
        where: { userId },
        data: { isValid: false },
      }),
    ]);

    return { success: true, message: 'Account deactivated' };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) throw new NotFoundError('User');

    return {
      ...user,
      roles: [user.role],
    };
  }
}

