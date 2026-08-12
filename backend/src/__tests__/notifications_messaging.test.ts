import { NotificationService } from '../modules/notifications/notifications.service';
import { MessagingService } from '../modules/messaging/messaging.service';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { prisma } from '../config/database';

describe('Notifications & Messaging System Test Suite', () => {
  let notificationService: NotificationService;
  let messagingService: MessagingService;
  let guestUser: any;
  let hostUser: any;
  let adminUser: any;
  let testProperty: any;

  beforeAll(async () => {
    notificationService = new NotificationService();
    messagingService = new MessagingService();

    // Create test users
    guestUser = await prisma.user.create({
      data: {
        email: `guest_notif_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed',
        firstName: 'GuestNotif',
        lastName: 'Test',
        role: 'GUEST',
      },
    });

    hostUser = await prisma.user.create({
      data: {
        email: `host_notif_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed',
        firstName: 'HostNotif',
        lastName: 'Test',
        role: 'HOST',
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_notif_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed',
        firstName: 'AdminNotif',
        lastName: 'Test',
        role: 'ADMIN',
      },
    });

    testProperty = await prisma.property.create({
      data: {
        title: 'Notification Villa',
        description: 'Luxury villa for notification testing',
        propertyType: 'VILLA',
        address: '123 Luxury Way',
        city: 'Miami',
        country: 'USA',
        latitude: 25.7617,
        longitude: -80.1918,
        bedrooms: 3,
        bathrooms: 3,
        maxGuests: 6,
        basePrice: 500,
        hostId: hostUser.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.notification.deleteMany({
      where: { userId: { in: [guestUser.id, hostUser.id, adminUser.id] } },
    });
    await prisma.message.deleteMany({
      where: { senderId: { in: [guestUser.id, hostUser.id] } },
    });
    await prisma.conversation.deleteMany({
      where: { OR: [{ guestId: guestUser.id }, { hostId: hostUser.id }] },
    });
    await prisma.property.delete({ where: { id: testProperty.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [guestUser.id, hostUser.id, adminUser.id] } },
    });
  });

  describe('Notification Management', () => {
    it('should create notification with priority and actionUrl', async () => {
      const notif = await notificationService.createNotification({
        userId: guestUser.id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        message: 'Your stay at Notification Villa is confirmed!',
        priority: NotificationPriority.HIGH,
        actionUrl: '/dashboard',
      });

      expect(notif.id).toBeDefined();
      expect(notif.priority).toBe('HIGH');
      expect(notif.actionUrl).toBe('/dashboard');
      expect(notif.isRead).toBe(false);
    });

    it('should notify all admin users', async () => {
      const notifications = await notificationService.notifyAdmins({
        type: NotificationType.HOST_APPLICATION_SUBMITTED,
        title: 'New Host Application',
        message: 'A new user applied to become a host',
        priority: NotificationPriority.HIGH,
        actionUrl: '/admin/hosts',
      });

      expect(notifications.length).toBeGreaterThan(0);
      const adminNotif = notifications.find((n) => n.userId === adminUser.id);
      expect(adminNotif).toBeDefined();
      expect(adminNotif?.title).toBe('New Host Application');
    });

    it('should return unread count and paginated user notifications', async () => {
      const res = await notificationService.getUserNotifications(guestUser.id, { page: 1, limit: 10 });
      expect(res.notifications.length).toBeGreaterThan(0);
      expect(res.unreadCount).toBeGreaterThan(0);
    });

    it('should mark single notification as read', async () => {
      const notifs = await notificationService.getUserNotifications(guestUser.id);
      const target = notifs.notifications[0];

      await notificationService.markAsRead(target.id, guestUser.id);

      const unreadRes = await notificationService.getUnreadCount(guestUser.id);
      expect(unreadRes.unreadCount).toBe(notifs.unreadCount - 1);
    });

    it('should delete notification', async () => {
      const notif = await notificationService.createNotification({
        userId: guestUser.id,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Temporary Alert',
        message: 'This will be deleted',
      });

      await notificationService.deleteNotification(notif.id, guestUser.id);
      const notifs = await notificationService.getUserNotifications(guestUser.id);
      expect(notifs.notifications.some((n) => n.id === notif.id)).toBe(false);
    });

    it('should trigger admin notification when host requests property removal', async () => {
      const PropertyService = (await import('../modules/properties/properties.service')).PropertyService;
      const propertyService = new PropertyService();

      await propertyService.requestPropertyRemoval(hostUser.id, testProperty.id, 'Selling property');

      const adminNotifs = await notificationService.getUserNotifications(adminUser.id);
      const removalNotif = adminNotifs.notifications.find(
        (n) => n.type === NotificationType.PROPERTY_REMOVAL_REQUESTED
      );

      expect(removalNotif).toBeDefined();
      expect(removalNotif?.actionUrl).toBe('/admin/properties?tab=removal-requests');
      expect(removalNotif?.priority).toBe('HIGH');
    });

    it('should trigger host notification when admin approves property removal', async () => {
      const AdminService = (await import('../modules/admin/admin.service')).AdminService;
      const adminService = new AdminService();

      await adminService.approveRemovalRequest(adminUser.id, testProperty.id);

      const hostNotifs = await notificationService.getUserNotifications(hostUser.id);
      const approvedNotif = hostNotifs.notifications.find(
        (n) => n.type === NotificationType.PROPERTY_REMOVAL_APPROVED
      );

      expect(approvedNotif).toBeDefined();
      expect(approvedNotif?.actionUrl).toBe('/host/properties');
    });
  });

  describe('Messaging & Conversations', () => {
    let conversation: any;

    it('should create conversation between guest and host', async () => {
      conversation = await messagingService.getOrCreateConversation(
        guestUser.id,
        hostUser.id,
        testProperty.id
      );

      expect(conversation.id).toBeDefined();
      expect(conversation.guestId).toBe(guestUser.id);
      expect(conversation.hostId).toBe(hostUser.id);
    });

    it('should send real-time message and trigger recipient notification', async () => {
      const msg = await messagingService.sendMessage(
        conversation.id,
        guestUser.id,
        'Hello Host, is early check-in available?'
      );

      expect(msg.id).toBeDefined();
      expect(msg.text).toBe('Hello Host, is early check-in available?');
      expect(msg.senderId).toBe(guestUser.id);

      // Verify recipient host received unread message count
      const hostUnread = await messagingService.getUserUnreadMessageCount(hostUser.id);
      expect(hostUnread.unreadCount).toBeGreaterThan(0);
    });

    it('should fail sending empty message', async () => {
      await expect(
        messagingService.sendMessage(conversation.id, guestUser.id, '   ')
      ).rejects.toThrow('Message content cannot be empty');
    });

    it('should deny message access to unauthorized user', async () => {
      const unauthorizedId = '00000000-0000-0000-0000-000000000000';
      await expect(
        messagingService.getConversationMessages(conversation.id, unauthorizedId)
      ).rejects.toThrow('Access denied to conversation');
    });

    it('should auto-mark messages as read when recipient opens conversation', async () => {
      await messagingService.getConversationMessages(conversation.id, hostUser.id);

      const hostUnread = await messagingService.getUserUnreadMessageCount(hostUser.id);
      expect(hostUnread.unreadCount).toBe(0);
    });
  });
});
