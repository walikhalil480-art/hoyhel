import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';
import { signAccessToken } from '../utils/jwt';

describe('LUXEHAVEN — MESSAGING SYSTEM END-TO-END DIAGNOSTIC & INTEGRATION TEST', () => {
  let guestElena: any;
  let hostSarah: any;
  let guestOther: any;
  let elenaToken: string;
  let sarahToken: string;
  let otherToken: string;
  let nairobiApartment: any;
  let testConversationId: string;

  beforeAll(async () => {
    // 1. Create real database test users (Elena, Sarah, Unauthorized Guest)
    guestElena = await prisma.user.create({
      data: {
        email: `elena_guest_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed_pass_elena',
        firstName: 'Elena',
        lastName: 'Rostova',
        role: 'GUEST',
      },
    });

    hostSarah = await prisma.user.create({
      data: {
        email: `sarah_host_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed_pass_sarah',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'HOST',
      },
    });

    guestOther = await prisma.user.create({
      data: {
        email: `unauthorized_guest_${Date.now()}@luxehaven.test`,
        passwordHash: 'hashed_pass_other',
        firstName: 'OtherGuest',
        lastName: 'Stranger',
        role: 'GUEST',
      },
    });

    elenaToken = signAccessToken({ userId: guestElena.id, email: guestElena.email, roles: ['GUEST'] });
    sarahToken = signAccessToken({ userId: hostSarah.id, email: hostSarah.email, roles: ['HOST'] });
    otherToken = signAccessToken({ userId: guestOther.id, email: guestOther.email, roles: ['GUEST'] });

    // 2. Create published property: Luxury Nairobi Apartment
    nairobiApartment = await prisma.property.create({
      data: {
        title: 'Luxury Nairobi Apartment',
        description: 'Prime apartment in Nairobi city center',
        propertyType: 'APARTMENT',
        address: '45 Kilimani Road',
        city: 'Nairobi',
        country: 'Kenya',
        latitude: -1.2921,
        longitude: 36.8219,
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        basePrice: 250,
        status: 'PUBLISHED',
        hostId: hostSarah.id,
      },
    });
  });

  afterAll(async () => {
    // Clean database records cleanly
    await prisma.notification.deleteMany({
      where: { userId: { in: [guestElena.id, hostSarah.id, guestOther.id] } },
    });
    await prisma.message.deleteMany({
      where: { senderId: { in: [guestElena.id, hostSarah.id, guestOther.id] } },
    });
    await prisma.conversation.deleteMany({
      where: { OR: [{ guestId: guestElena.id }, { hostId: hostSarah.id }, { guestId: guestOther.id }] },
    });
    if (nairobiApartment) {
      await prisma.property.delete({ where: { id: nairobiApartment.id } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [guestElena.id, hostSarah.id, guestOther.id] } },
    });
  });

  describe('1. Health Probe Diagnostic', () => {
    it('GET /api/v1/messaging/health should return UP status for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/health')
        .set('Authorization', `Bearer ${elenaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messaging).toBe(true);
      expect(res.body.database).toBe(true);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user.id).toBe(guestElena.id);
    });
  });

  describe('2. Conversation Creation & Deduplication (Contact Host Flow)', () => {
    it('Guest Elena clicks Contact Host on Luxury Nairobi Apartment property page', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${elenaToken}`)
        .send({
          hostId: hostSarah.id,
          propertyId: nairobiApartment.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.guestId).toBe(guestElena.id);
      expect(res.body.data.hostId).toBe(hostSarah.id);
      expect(res.body.data.propertyId).toBe(nairobiApartment.id);

      testConversationId = res.body.data.id;
    });

    it('Clicking Contact Host again should reuse existing conversation (no duplicate created)', async () => {
      const res = await request(app)
        .post('/api/v1/messaging/conversations')
        .set('Authorization', `Bearer ${elenaToken}`)
        .send({
          hostId: hostSarah.id,
          propertyId: nairobiApartment.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(testConversationId);

      // Verify total conversations in DB for Elena is exactly 1
      const count = await prisma.conversation.count({
        where: { guestId: guestElena.id, hostId: hostSarah.id },
      });
      expect(count).toBe(1);
    });
  });

  describe('3. Message Transmission, Validation & Security', () => {
    it('Sending whitespace/empty message should fail with 400 Validation Error', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${elenaToken}`)
        .send({ text: '    ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Message content cannot be empty');
    });

    it('Guest Elena sends message: "Hello Sarah, is early check-in possible?"', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${elenaToken}`)
        .send({
          text: 'Hello Sarah, is early check-in possible?',
          senderId: 'FORGED_ID_ATTEMPT', // Payload senderId should be ignored by backend
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.text).toBe('Hello Sarah, is early check-in possible?');
      expect(res.body.data.senderId).toBe(guestElena.id); // Must equal authenticated user ID!
      expect(res.body.data.isRead).toBe(false);

      // Verify PostgreSQL database contains exact Message record
      const dbMsg = await prisma.message.findUnique({ where: { id: res.body.data.id } });
      expect(dbMsg).not.toBeNull();
      expect(dbMsg?.senderId).toBe(guestElena.id);
      expect(dbMsg?.isRead).toBe(false);
    });

    it('Host Sarah unread message count should be 1', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/conversations/unread-count')
        .set('Authorization', `Bearer ${sarahToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBe(1);
    });

    it('Host Sarah receives NEW_MESSAGE notification in database', async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId: hostSarah.id, type: 'NEW_MESSAGE' },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].title).toContain('New message from Elena');
    });

    it('Host Sarah opens conversation -> messages become read and unread count decreases to 0', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${sarahToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify unread count is now 0 for Sarah
      const unreadRes = await request(app)
        .get('/api/v1/messaging/conversations/unread-count')
        .set('Authorization', `Bearer ${sarahToken}`);

      expect(unreadRes.body.data.unreadCount).toBe(0);
    });

    it('Host Sarah replies: "Yes, early check-in is possible."', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${sarahToken}`)
        .send({ text: 'Yes, early check-in is possible.' });

      expect(res.status).toBe(201);
      expect(res.body.data.senderId).toBe(hostSarah.id);
      expect(res.body.data.text).toBe('Yes, early check-in is possible.');
    });

    it('Guest Elena opens conversation and sees Host Sarah reply', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${elenaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[1].text).toBe('Yes, early check-in is possible.');
    });
  });

  describe('4. Security & Authorization Safeguards', () => {
    it('Unauthorized Guest Other cannot access Elena & Sarah conversation (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied to conversation');
    });

    it('Unauthorized Guest Other cannot post message into Elena & Sarah conversation (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/messaging/conversations/${testConversationId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ text: 'Malicious intrusion attempt' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You are not a participant in this conversation');
    });

    it('Unauthenticated user without token gets 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/messaging/conversations');

      expect(res.status).toBe(401);
    });
  });
});
