import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';
import { emitToConversation } from '../../websocket/socket';

export class MessagingService {
  async getOrCreateConversation(userAId: string, targetUserId?: string, propertyId?: string, bookingId?: string) {
    let userBId = targetUserId;

    if (!userBId && propertyId) {
      const property = await prisma.property.findUnique({ where: { id: propertyId } });
      if (!property) throw new NotFoundError('Property not found');
      userBId = property.hostId;
    }

    if (!userBId) {
      throw new ValidationError('A recipient host or property must be specified to start a conversation');
    }

    if (userAId === userBId) {
      throw new ValidationError('You cannot start a conversation with yourself');
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { guestId: userAId, hostId: userBId },
          { guestId: userBId, hostId: userAId },
        ],
        ...(propertyId ? { propertyId } : {}),
      },
      include: {
        property: { select: { id: true, title: true, images: { take: 1 } } },
        guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        booking: { select: { id: true, bookingNumber: true, checkIn: true, checkOut: true, status: true } },
      },
    });

    if (!conversation) {
      const userA = await prisma.user.findUnique({ where: { id: userAId } });
      const userB = await prisma.user.findUnique({ where: { id: userBId } });
      if (!userA || !userB) throw new NotFoundError('User participant not found');

      // Assign guestId and hostId correctly based on role
      const isAHost = userA.role === 'HOST';
      const guestId = isAHost ? userBId : userAId;
      const hostId = isAHost ? userAId : userBId;

      conversation = await prisma.conversation.create({
        data: {
          guestId,
          hostId,
          propertyId: propertyId || null,
          bookingId: bookingId || null,
        },
        include: {
          property: { select: { id: true, title: true, images: { take: 1 } } },
          guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          booking: { select: { id: true, bookingNumber: true, checkIn: true, checkOut: true, status: true } },
        },
      });
    }

    return conversation;
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        property: { select: { id: true, title: true, images: { take: 1 } } },
        guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        booking: { select: { id: true, bookingNumber: true, checkIn: true, checkOut: true, status: true } },
      },
    });

    if (!conversation) throw new NotFoundError('Conversation');
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (conversation.guestId !== userId && conversation.hostId !== userId && requestingUser?.role !== 'ADMIN') {
      throw new ForbiddenError('Access denied to conversation');
    }

    const unreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        isRead: false,
      },
    });

    return { ...conversation, unreadCount };
  }

  async getUserConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ guestId: userId }, { hostId: userId }],
      },
      include: {
        property: { select: { id: true, title: true, images: { take: 1 } } },
        guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        booking: { select: { id: true, bookingNumber: true, checkIn: true, checkOut: true, status: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Add unread count per conversation for user
    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });
        return { ...conv, unreadCount };
      })
    );

    return withUnread;
  }

  async getUserUnreadMessageCount(userId: string) {
    const count = await prisma.message.count({
      where: {
        conversation: {
          OR: [{ guestId: userId }, { hostId: userId }],
        },
        senderId: { not: userId },
        isRead: false,
      },
    });
    return { unreadCount: count };
  }

  async getConversationMessages(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundError('Conversation');
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = requestingUser?.role === 'ADMIN';

    if (conversation.guestId !== userId && conversation.hostId !== userId && !isAdmin) {
      throw new ForbiddenError('Access denied to conversation');
    }

    // Auto mark received messages as read
    await this.markConversationAsRead(conversationId, userId);

    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    const updated = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    if (updated.count > 0) {
      emitToConversation(conversationId, 'messages_read', { conversationId, readByUserId: userId });
    }

    return { success: true, count: updated.count };
  }

  async sendMessage(conversationId: string, senderId: string, text: string) {
    if (!text || text.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { title: true } },
      },
    });

    if (!conversation) throw new NotFoundError('Conversation');
    if (conversation.guestId !== senderId && conversation.hostId !== senderId) {
      throw new ForbiddenError('You are not a participant in this conversation');
    }

    const recipientId = conversation.guestId === senderId ? conversation.hostId : conversation.guestId;
    const senderUser = conversation.guestId === senderId ? conversation.guest : conversation.host;

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId,
          text: text.trim(),
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      return msg;
    });

    // Real-time socket emission to conversation room
    emitToConversation(conversationId, 'new_message', message);

    // Notification to recipient
    const notificationService = new NotificationService();
    await notificationService.createNotification({
      userId: recipientId,
      type: NotificationType.NEW_MESSAGE,
      title: `💬 New message from ${senderUser.firstName}`,
      message: `"${text.trim().substring(0, 80)}${text.trim().length > 80 ? '...' : ''}"`,
      data: { conversationId, senderId },
      actionUrl: '/messages',
    });

    return message;
  }
}

