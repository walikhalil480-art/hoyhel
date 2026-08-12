import { prisma } from '../../config/database';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { emitToUser, emitToAdmins } from '../../websocket/socket';

export class NotificationService {
  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    priority?: NotificationPriority;
    actionUrl?: string;
  }) {
    const { userId, type, title, message, data, priority = NotificationPriority.NORMAL, actionUrl } = params;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        priority,
        actionUrl: actionUrl || null,
        data: data || null,
      },
    });

    // Emit real-time Socket.IO notification to user
    emitToUser(userId, 'notification', notification);

    return notification;
  }

  async notifyAdmins(params: {
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    priority?: NotificationPriority;
    actionUrl?: string;
  }) {
    const { type, title, message, data, priority = NotificationPriority.HIGH, actionUrl } = params;

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    if (admins.length === 0) return [];

    const notifications = await prisma.$transaction(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type,
            title,
            message,
            priority,
            actionUrl: actionUrl || null,
            data: data || null,
          },
        })
      )
    );

    // Emit real-time Socket.IO notification to admin channel
    emitToAdmins('notification', notifications[0] || { type, title, message, priority, actionUrl });

    return notifications;
  }

  async getUserNotifications(userId: string, params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (params?.unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string) {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return { success: true };
  }
}

