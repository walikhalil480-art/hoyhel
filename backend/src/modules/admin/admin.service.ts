import { prisma } from '../../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { BookingStatus, PaymentStatus, PropertyStatus, UserRoleType, HostApplicationStatus, NotificationType, NotificationPriority, Prisma } from '@prisma/client';
import { emitToUser } from '../../websocket/socket';

export class AdminService {
  private async updateExpiredBookings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.booking.updateMany({
      where: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        checkOut: { lt: today },
      },
      data: {
        status: BookingStatus.COMPLETED,
      },
    });
  }

  async getDashboardAnalytics() {
    await this.updateExpiredBookings();

    const [
      totalUsers,
      totalHosts,
      totalProperties,
      pendingProperties,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      refundedBookings,
      grossStats,
      refundedStats,
      auditLogsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRoleType.HOST } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: PropertyStatus.PENDING_APPROVAL } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } } }),
      prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      prisma.booking.count({ where: { status: BookingStatus.REFUNDED } }),
      prisma.booking.aggregate({
        where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] } },
        _sum: { totalPrice: true, serviceFee: true },
      }),
      prisma.booking.aggregate({
        _sum: { refundedAmount: true },
      }),
      prisma.auditLog.count(),
    ]);

    const grossRevenue = grossStats._sum.totalPrice || 0;
    const platformFees = grossStats._sum.serviceFee || 0;
    const refundedAmount = refundedStats._sum.refundedAmount || 0;
    const hostEarnings = Math.max(0, grossRevenue - platformFees - refundedAmount);
    const netPlatformRevenue = Math.max(0, platformFees - refundedAmount);

    return {
      totalUsers,
      totalHosts,
      totalProperties,
      pendingProperties,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      refundedBookings,
      totalRevenue: Math.round(grossRevenue * 100) / 100,
      platformFees: Math.round(platformFees * 100) / 100,
      hostEarnings: Math.round(hostEarnings * 100) / 100,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
      netPlatformRevenue: Math.round(netPlatformRevenue * 100) / 100,
      auditLogsCount,
    };
  }

  async getAdminBookings(params: {
    search?: string;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
    page?: number;
    limit?: number;
  }) {
    await this.updateExpiredBookings();

    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { bookingNumber: { contains: q, mode: 'insensitive' } },
        { guest: { email: { contains: q, mode: 'insensitive' } } },
        { guest: { firstName: { contains: q, mode: 'insensitive' } } },
        { guest: { lastName: { contains: q, mode: 'insensitive' } } },
        { property: { title: { contains: q, mode: 'insensitive' } } },
        { property: { host: { firstName: { contains: q, mode: 'insensitive' } } } },
        { property: { host: { lastName: { contains: q, mode: 'insensitive' } } } },
        { property: { host: { email: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.paymentStatus) {
      where.payment = { status: params.paymentStatus };
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          guest: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
          },
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              country: true,
              host: {
                select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
              },
              images: { take: 1, select: { url: true } },
            },
          },
          payment: true,
          refunds: true,
        },
      }),
    ]);

    return { bookings, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAdminBookingById(id: string) {
    await this.updateExpiredBookings();

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, createdAt: true },
        },
        property: {
          include: {
            host: {
              select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
            },
            images: { take: 3 },
          },
        },
        payment: true,
        refunds: true,
        review: true,
      },
    });

    if (!booking) throw new NotFoundError('Booking');
    return booking;
  }

  async cancelBookingByAdmin(bookingId: string, adminUserId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundError('Booking');

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
      throw new ValidationError(`Booking is already in ${booking.status} state`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason || 'Cancelled by System Administrator',
          cancelledAt: new Date(),
          refundedAmount: booking.totalPrice,
        },
      });

      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });

        await tx.refund.create({
          data: {
            bookingId,
            paymentId: booking.payment.id,
            amount: booking.totalPrice,
            status: 'COMPLETED',
            reason: reason || 'Full administrative refund',
          },
        });
      }

      return b;
    });

    return updated;
  }

  async getUsers(params: { search?: string; role?: UserRoleType; isSuspended?: boolean; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.role) where.role = params.role;
    if (params.isSuspended !== undefined) where.isSuspended = params.isSuspended;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isEmailVerified: true,
          isActive: true,
          isSuspended: true,
          suspensionReason: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        properties: { take: 5 },
        bookings: { take: 5 },
        hostApplications: true,
        auditLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) throw new NotFoundError('User');
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async updateUserStatus(userId: string, data: { isActive?: boolean; isSuspended?: boolean; suspensionReason?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.isSuspended !== undefined ? { isSuspended: data.isSuspended } : {}),
        ...(data.suspensionReason !== undefined ? { suspensionReason: data.suspensionReason } : {}),
      },
    });

    // If suspended or deactivated, invalidate sessions
    if (data.isSuspended || data.isActive === false) {
      await Promise.all([
        prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } }),
        prisma.userSession.updateMany({ where: { userId }, data: { isValid: false } }),
      ]);
    }

    return { id: updated.id, email: updated.email, isActive: updated.isActive, isSuspended: updated.isSuspended };
  }

  async updateUserRole(adminUserId: string, targetUserId: string, newRole: UserRoleType) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundError('User');

    // CRITICAL GUARD: Prevent removing the last active Administrator!
    if (targetUser.role === UserRoleType.ADMIN && newRole !== UserRoleType.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: UserRoleType.ADMIN, isActive: true, isSuspended: false },
      });

      if (adminCount <= 1) {
        throw new ForbiddenError('Cannot demote the last active Administrator on the platform');
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    return { id: updated.id, email: updated.email, role: updated.role };
  }

  async deleteUser(adminUserId: string, targetUserId: string) {
    if (adminUserId === targetUserId) {
      throw new ForbiddenError('You cannot delete your own admin account');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundError('User');

    if (targetUser.role === UserRoleType.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: UserRoleType.ADMIN } });
      if (adminCount <= 1) {
        throw new ForbiddenError('Cannot delete the last Administrator on the platform');
      }
    }

    await prisma.user.delete({ where: { id: targetUserId } });
    return { success: true, message: 'User permanently deleted' };
  }

  async getHostApplications(status?: HostApplicationStatus) {
    return prisma.hostApplication.findMany({
      where: status ? { status } : {},
      include: {
        applicant: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewHostApplication(adminUserId: string, applicationId: string, isApproved: boolean, rejectionReason?: string) {
    const app = await prisma.hostApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError('HostApplication');

    const status = isApproved ? HostApplicationStatus.APPROVED : HostApplicationStatus.REJECTED;

    return await prisma.$transaction(async (tx) => {
      const updatedApp = await tx.hostApplication.update({
        where: { id: applicationId },
        data: {
          status,
          rejectionReason: rejectionReason || null,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      if (isApproved) {
        // Upgrade User role to HOST
        await tx.user.update({
          where: { id: app.userId },
          data: { role: UserRoleType.HOST },
        });

        await tx.notification.create({
          data: {
            userId: app.userId,
            type: NotificationType.HOST_APPLICATION_APPROVED,
            priority: NotificationPriority.HIGH,
            title: '🎉 Your host application was approved',
            message: 'You can now create and manage luxury properties on LuxeHaven.',
            actionUrl: '/host/dashboard',
          },
        });
      } else {
        await tx.notification.create({
          data: {
            userId: app.userId,
            type: NotificationType.HOST_APPLICATION_REJECTED,
            priority: NotificationPriority.HIGH,
            title: 'Host Application Update',
            message: `Your host application was not approved: ${rejectionReason || 'Please provide additional verification information.'}`,
            actionUrl: '/become-a-host',
          },
        });
      }

      return updatedApp;
    });
  }

  async approveProperty(adminUserId: string, propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });
    if (!property) throw new NotFoundError('Property');

    if (property.images.length === 0) {
      throw new ValidationError('Cannot approve and publish a property that has no uploaded images');
    }

    const prevStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.PUBLISHED,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: prevStatus,
          newStatus: PropertyStatus.PUBLISHED,
          changedBy: adminUserId,
          reason: 'Approved by Administrator',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROPERTY_APPROVED',
          resource: 'Property',
          resourceId: propertyId,
        },
      });

      // Send host notification
      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: NotificationType.PROPERTY_APPROVED,
          priority: NotificationPriority.HIGH,
          title: 'Property Listing Approved',
          message: `Your property "${property.title}" has been approved and is now live on LuxeHaven!`,
          actionUrl: '/host/properties',
          data: { propertyId: property.id },
        },
      });

      return p;
    });

    // Real-time socket emission
    const notif = await prisma.notification.findFirst({
      where: { userId: property.hostId, type: NotificationType.PROPERTY_APPROVED },
      orderBy: { createdAt: 'desc' },
    });
    if (notif) emitToUser(property.hostId, 'notification', notif);

    return updated;
  }

  async rejectProperty(adminUserId: string, propertyId: string, reason: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('A reason must be provided when rejecting a property listing');
    }

    const prevStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.REJECTED,
          rejectionReason: reason.trim(),
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: prevStatus,
          newStatus: PropertyStatus.REJECTED,
          changedBy: adminUserId,
          reason: `Rejected by Admin: ${reason.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROPERTY_REJECTED',
          resource: 'Property',
          resourceId: propertyId,
          details: { reason: reason.trim() },
        },
      });

      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: NotificationType.PROPERTY_REJECTED,
          priority: NotificationPriority.HIGH,
          title: 'Property Listing Requires Modifications',
          message: `Your property "${property.title}" requires changes before publishing: ${reason.trim()}`,
          actionUrl: '/host/properties',
          data: { propertyId: property.id, reason: reason.trim() },
        },
      });

      return p;
    });

    const notif = await prisma.notification.findFirst({
      where: { userId: property.hostId, type: NotificationType.PROPERTY_REJECTED },
      orderBy: { createdAt: 'desc' },
    });
    if (notif) emitToUser(property.hostId, 'notification', notif);

    return updated;
  }

  async getRemovalRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.PropertyWhereInput = { status: PropertyStatus.REMOVAL_REQUESTED };

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { removalRequestedAt: 'desc' },
        include: {
          host: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
          images: { take: 1 },
          bookings: {
            select: { id: true, status: true, totalPrice: true, checkIn: true, checkOut: true },
          },
        },
      }),
    ]);

    const formatted = properties.map((p) => {
      const upcomingBookings = p.bookings.filter(
        (b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && new Date(b.checkOut) >= new Date()
      );
      const completedBookings = p.bookings.filter((b) => b.status === 'COMPLETED');
      const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

      return {
        ...p,
        upcomingBookingsCount: upcomingBookings.length,
        completedBookingsCount: completedBookings.length,
        totalRevenue,
      };
    });

    return { properties: formatted, total, page, totalPages: Math.ceil(total / limit) };
  }

  async approveRemovalRequest(adminUserId: string, propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    if (property.status !== PropertyStatus.REMOVAL_REQUESTED) {
      throw new ValidationError('Property is not currently in REMOVAL_REQUESTED state');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.ARCHIVED,
        },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: PropertyStatus.REMOVAL_REQUESTED,
          newStatus: PropertyStatus.ARCHIVED,
          changedBy: adminUserId,
          reason: 'Removal Request Approved by Administrator',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROPERTY_REMOVAL_APPROVED',
          resource: 'Property',
          resourceId: propertyId,
        },
      });

      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: NotificationType.PROPERTY_REMOVAL_APPROVED,
          priority: NotificationPriority.HIGH,
          title: 'Property Removal Approved',
          message: `Your removal request for property "${property.title}" has been approved. The property has been archived.`,
          actionUrl: '/host/properties',
          data: { propertyId: property.id },
        },
      });

      return p;
    });

    const notifApproved = await prisma.notification.findFirst({
      where: { userId: property.hostId, type: NotificationType.PROPERTY_REMOVAL_APPROVED },
      orderBy: { createdAt: 'desc' },
    });
    if (notifApproved) emitToUser(property.hostId, 'notification', notifApproved);

    return updated;
  }

  async rejectRemovalRequest(adminUserId: string, propertyId: string, reason: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    if (property.status !== PropertyStatus.REMOVAL_REQUESTED) {
      throw new ValidationError('Property is not currently in REMOVAL_REQUESTED state');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('A reason must be provided when rejecting a property removal request');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.PUBLISHED,
          removalReason: null,
          removalRequestedAt: null,
          removalRequestedBy: null,
        },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: PropertyStatus.REMOVAL_REQUESTED,
          newStatus: PropertyStatus.PUBLISHED,
          changedBy: adminUserId,
          reason: `Removal Request Rejected by Admin: ${reason.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROPERTY_REMOVAL_REJECTED',
          resource: 'Property',
          resourceId: propertyId,
          details: { reason: reason.trim() },
        },
      });

      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: NotificationType.PROPERTY_REMOVAL_REJECTED,
          priority: NotificationPriority.HIGH,
          title: 'Property Removal Request Declined',
          message: `Your removal request for "${property.title}" was declined: ${reason.trim()}`,
          actionUrl: '/host/properties',
          data: { propertyId: property.id, reason: reason.trim() },
        },
      });

      return p;
    });

    const notifRejected = await prisma.notification.findFirst({
      where: { userId: property.hostId, type: NotificationType.PROPERTY_REMOVAL_REJECTED },
      orderBy: { createdAt: 'desc' },
    });
    if (notifRejected) emitToUser(property.hostId, 'notification', notifRejected);

    return updated;
  }

  async archiveProperty(adminUserId: string, propertyId: string, reason?: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    const prevStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.ARCHIVED },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: prevStatus,
          newStatus: PropertyStatus.ARCHIVED,
          changedBy: adminUserId,
          reason: reason || 'Archived by Administrator',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROPERTY_ARCHIVED',
          resource: 'Property',
          resourceId: propertyId,
          details: { reason: reason || null },
        },
      });

      return p;
    });

    return updated;
  }

  async restoreProperty(adminUserId: string, propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    const prevStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.DRAFT },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: prevStatus,
          newStatus: PropertyStatus.DRAFT,
          changedBy: adminUserId,
          reason: 'Restored from archive by Administrator (Set to DRAFT for review)',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROPERTY_RESTORED',
          resource: 'Property',
          resourceId: propertyId,
        },
      });

      return p;
    });

    return updated;
  }

  async hardDeleteProperty(adminUserId: string, propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    const [bookingCount, reviewCount] = await Promise.all([
      prisma.booking.count({ where: { propertyId } }),
      prisma.review.count({ where: { propertyId } }),
    ]);

    // Safeguard: Hard delete ONLY if 0 historical bookings and 0 reviews
    if (bookingCount > 0 || reviewCount > 0) {
      throw new ValidationError(
        `Cannot hard delete property "${property.title}". It has ${bookingCount} bookings and ${reviewCount} reviews. Use Archive instead to preserve historical financial records.`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.propertyImage.deleteMany({ where: { propertyId } });
      await tx.propertyAmenity.deleteMany({ where: { propertyId } });
      await tx.availability.deleteMany({ where: { propertyId } });
      await tx.propertyStatusHistory.deleteMany({ where: { propertyId } });
      await tx.property.delete({ where: { id: propertyId } });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROPERTY_HARD_DELETED',
          resource: 'Property',
          resourceId: propertyId,
          details: { title: property.title },
        },
      });
    });

    return { success: true, message: 'Property permanently deleted' };
  }

  async getAdminProperties(params: { status?: PropertyStatus; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = params.status ? { status: params.status } : {};

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          host: {
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
          },
          images: { take: 1 },
        },
      }),
    ]);

    return { properties, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAuditLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }
}
