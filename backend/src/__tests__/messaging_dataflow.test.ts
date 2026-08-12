import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';
import { signAccessToken } from '../utils/jwt';

describe('LUXEHAVEN — MESSAGING COMPLETE DATA FLOW INTEGRATION TEST', () => {
  let guestElena: any;
  let hostSarah: any;
  let guestToken: string;
  let hostToken: string;
  let luxuryProperty: any;
  let createdConvId: string;

  beforeAll(async () => {
    // 1. Create real database records: Guest Elena & Host Sarah
    guestElena = await prisma.user.create({
      data: {
        email: `dataflow_elena_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed_elena_pass',
        firstName: 'Elena',
        lastName: 'Rostova',
        role: 'GUEST',
      },
    });

    hostSarah = await prisma.user.create({
      data: {
        email: `dataflow_sarah_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed_sarah_pass',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'HOST',
      },
    });

    guestToken = signAccessToken({ userId: guestElena.id, email: guestElena.email, roles: ['GUEST'] });
    hostToken = signAccessToken({ userId: hostSarah.id, email: hostSarah.email, roles: ['HOST'] });

    // 2. Create published property owned by Sarah
    luxuryProperty = await prisma.property.create({
      data: {
        title: 'Penthouse Villa',
        description: 'Exclusive penthouse with panoramic views',
        propertyType: 'VILLA',
        address: '100 Beachfront Blvd',
        city: 'Malindi',
        country: 'Kenya',
        latitude: -3.2192,
        longitude: 40.1169,
        bedrooms: 4,
        bathrooms: 4,
        maxGuests: 8,
        basePrice: 800,
        status: 'PUBLISHED',
        hostId: hostSarah.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup database records cleanly
    await prisma.notification.deleteMany({
      where: { userId: { in: [guestElena.id, hostSarah.id] } },
    });
    await prisma.message.deleteMany({
      where: { senderId: { in: [guestElena.id, hostSarah.id] } },
    });
    await prisma.conversation.deleteMany({
      where: { OR: [{ guestId: guestElena.id }, { hostId: hostSarah.id }] },
    });
    if (luxuryProperty) {
      await prisma.property.delete({ where: { id: luxuryProperty.id } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [guestElena.id, hostSarah.id] } },
    });
  });

  describe('Flow 1: Contact Host Property Fallback & Creation', () => {
    it('Guest Elena clicks Contact Host passing only propertyId (backend resolves hostId)', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ propertyId: luxuryProperty.id }); // hostId omitted to test automatic property host lookup

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.guestId).toBe(guestElena.id);
      expect(res.body.data.hostId).toBe(hostSarah.id);
      expect(res.body.data.propertyId).toBe(luxuryProperty.id);

      createdConvId = res.body.data.id;
    });

    it('Guest Elena clicking Contact Host again returns existing conversation (no duplicate)', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ propertyId: luxuryProperty.id });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(createdConvId);

      const dbCount = await prisma.conversation.count({
        where: { guestId: guestElena.id, hostId: hostSarah.id },
      });
      expect(dbCount).toBe(1);
    });

    it('Host Sarah attempting to start conversation with self throws 400 ValidationError', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ propertyId: luxuryProperty.id }); // Host owns property

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('You cannot start a conversation with yourself');
    });
  });

  describe('Flow 2: Dual-Role Conversation Listing & Retrieval', () => {
    it('GET /api/v1/messaging/conversations for Guest Elena returns conversation with Host Sarah details', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(createdConvId);
      expect(res.body.data[0].host.firstName).toBe('Sarah');
      expect(res.body.data[0].property.title).toBe('Penthouse Villa');
    });

    it('GET /api/v1/messaging/conversations for Host Sarah returns SAME conversation with Guest Elena details', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(createdConvId);
      expect(res.body.data[0].guest.firstName).toBe('Elena');
      expect(res.body.data[0].property.title).toBe('Penthouse Villa');
    });

    it('GET /api/v1/messaging/conversations/:id allows direct fetching by conversationId for auto-selection', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${createdConvId}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdConvId);
      expect(res.body.data.guest.id).toBe(guestElena.id);
    });
  });

  describe('Flow 3: Message Transmission, Database Sync & Notifications', () => {
    it('Guest Elena sends first message: "Hello Sarah, is early check-in possible?"', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${createdConvId}/messages`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ text: 'Hello Sarah, is early check-in possible?' });

      expect(res.status).toBe(201);
      expect(res.body.data.text).toBe('Hello Sarah, is early check-in possible?');
      expect(res.body.data.senderId).toBe(guestElena.id);
      expect(res.body.data.isRead).toBe(false);

      // Verify PostgreSQL database insertion
      const msgInDb = await prisma.message.findUnique({ where: { id: res.body.data.id } });
      expect(msgInDb).not.toBeNull();
      expect(msgInDb?.text).toBe('Hello Sarah, is early check-in possible?');
    });

    it('Host Sarah sees unread count = 1 and received NEW_MESSAGE notification', async () => {
      const unreadRes = await request(app)
        .get('/api/v1/messaging/conversations/unread-count')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(unreadRes.status).toBe(200);
      expect(unreadRes.body.data.unreadCount).toBe(1);

      const notifs = await prisma.notification.findMany({
        where: { userId: hostSarah.id, type: 'NEW_MESSAGE' },
      });
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].title).toContain('New message from Elena');
    });

    it('Host Sarah opens conversation -> messages become read and unread count decreases to 0', async () => {
      const messagesRes = await request(app)
        .get(`/api/v1/messaging/conversations/${createdConvId}/messages`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(messagesRes.status).toBe(200);
      expect(messagesRes.body.data.length).toBe(1);
      expect(messagesRes.body.data[0].isRead).toBe(true);

      const unreadRes = await request(app)
        .get('/api/v1/messaging/conversations/unread-count')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(unreadRes.body.data.unreadCount).toBe(0);
    });

    it('Host Sarah replies: "Yes, early check-in is possible at 1 PM."', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${createdConvId}/messages`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ text: 'Yes, early check-in is possible at 1 PM.' });

      expect(res.status).toBe(201);
      expect(res.body.data.senderId).toBe(hostSarah.id);
      expect(res.body.data.text).toBe('Yes, early check-in is possible at 1 PM.');
    });

    it('Guest Elena opens conversation and sees Host Sarah reply in order', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${createdConvId}/messages`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].text).toBe('Hello Sarah, is early check-in possible?');
      expect(res.body.data[1].text).toBe('Yes, early check-in is possible at 1 PM.');
    });
  });
});
