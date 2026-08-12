import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';
import { signAccessToken } from '../utils/jwt';

describe('HOYHEL — GUEST MY RESERVATIONS SYSTEM INTEGRATION TEST', () => {
  let guestElena: any;
  let guestOther: any;
  let hostSarah: any;
  let elenaToken: string;
  let otherToken: string;
  let testProperty: any;
  let elenaBooking: any;

  beforeAll(async () => {
    // 1. Create real database test users (Elena & Unauthorized Guest Other)
    guestElena = await prisma.user.create({
      data: {
        email: `res_elena_${Date.now()}@hoyhel.test`,
        passwordHash: 'hashed_pass_elena',
        firstName: 'Elena',
        lastName: 'Rostova',
        role: 'GUEST',
      },
    });

    guestOther = await prisma.user.create({
      data: {
        email: `res_other_${Date.now()}@hoyhel.test`,
        passwordHash: 'hashed_pass_other',
        firstName: 'OtherGuest',
        lastName: 'Stranger',
        role: 'GUEST',
      },
    });

    hostSarah = await prisma.user.create({
      data: {
        email: `res_sarah_${Date.now()}@hoyhel.test`,
        passwordHash: 'hashed_pass_sarah',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'HOST',
      },
    });

    elenaToken = signAccessToken({ userId: guestElena.id, email: guestElena.email, roles: ['GUEST'] });
    otherToken = signAccessToken({ userId: guestOther.id, email: guestOther.email, roles: ['GUEST'] });

    // 2. Create property & booking for Elena
    testProperty = await prisma.property.create({
      data: {
        title: 'Mombasa Beach Villa',
        description: 'Luxury oceanfront villa in Nyali Beach',
        propertyType: 'VILLA',
        address: '88 Coastal Highway',
        city: 'Mombasa',
        country: 'Kenya',
        latitude: -4.0435,
        longitude: 39.6983,
        bedrooms: 3,
        bathrooms: 3,
        maxGuests: 6,
        basePrice: 300,
        status: 'PUBLISHED',
        hostId: hostSarah.id,
      },
    });

    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 10);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 15);

    elenaBooking = await prisma.booking.create({
      data: {
        bookingNumber: `HOY-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        propertyId: testProperty.id,
        guestId: guestElena.id,
        checkIn,
        checkOut,
        guestsCount: 4,
        nights: 5,
        nightlyPrice: 300,
        subtotal: 1500,
        cleaningFee: 100,
        serviceFee: 150,
        taxes: 120,
        discount: 0,
        totalPrice: 1870,
        status: 'CONFIRMED',
        payment: {
          create: {
            userId: guestElena.id,
            amount: 1870,
            currency: 'USD',
            status: 'SUCCESS',
            paymentMethod: 'CREDIT_CARD',
            transactionId: 'TXN-HOY-1870',
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Clean created database records
    await prisma.notification.deleteMany({
      where: { userId: { in: [guestElena.id, guestOther.id, hostSarah.id] } },
    });
    if (elenaBooking) {
      await prisma.payment.deleteMany({ where: { bookingId: elenaBooking.id } });
      await prisma.booking.delete({ where: { id: elenaBooking.id } });
    }
    if (testProperty) {
      await prisma.property.delete({ where: { id: testProperty.id } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [guestElena.id, guestOther.id, hostSarah.id] } },
    });
  });

  describe('1. My Reservations Listing (GET /api/v1/bookings/my & /user)', () => {
    it('Guest Elena fetches her reservations and receives complete property context', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/my')
        .set('Authorization', `Bearer ${elenaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const found = res.body.data.find((b: any) => b.id === elenaBooking.id);
      expect(found).toBeDefined();
      expect(found.bookingNumber).toBe(elenaBooking.bookingNumber);
      expect(found.totalPrice).toBe(1870);
      expect(found.property.title).toBe('Mombasa Beach Villa');
      expect(found.property.city).toBe('Mombasa');
    });

    it('Guest Other fetching reservations does NOT see Guest Elena\'s reservation', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/my')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((b: any) => b.id === elenaBooking.id)).toBe(false);
    });
  });

  describe('2. Reservation Details & Security (GET /api/v1/bookings/:id)', () => {
    it('Guest Elena fetches detailed reservation information by booking ID', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${elenaBooking.id}`)
        .set('Authorization', `Bearer ${elenaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(elenaBooking.id);
      expect(res.body.data.guestId).toBe(guestElena.id);
      expect(res.body.data.subtotal).toBe(1500);
      expect(res.body.data.cleaningFee).toBe(100);
      expect(res.body.data.serviceFee).toBe(150);
      expect(res.body.data.taxes).toBe(120);
      expect(res.body.data.totalPrice).toBe(1870);
      expect(res.body.data.payment.status).toBe('SUCCESS');
      expect(res.body.data.property.host.firstName).toBe('Sarah');
    });

    it('Guest Other attempting to fetch Guest Elena\'s reservation details gets 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${elenaBooking.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You are not authorized to view this booking');
    });

    it('Unauthenticated request without token gets 401 Unauthorized', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${elenaBooking.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('3. Role-Based Endpoint Protection (Guest / Host / Admin)', () => {
    it('Host Sarah fetches bookings for her properties via role=host', async () => {
      const sarahToken = signAccessToken({ userId: hostSarah.id, email: hostSarah.email, roles: ['HOST'] });
      const res = await request(app)
        .get('/api/v1/bookings/my?role=host')
        .set('Authorization', `Bearer ${sarahToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((b: any) => b.id === elenaBooking.id)).toBe(true);
    });

    it('Guest Elena trying to access host property bookings gets 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/my?role=host')
        .set('Authorization', `Bearer ${elenaToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only registered hosts can view property bookings');
    });

    it('Guest Elena trying to access Admin reservations endpoint gets 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/bookings')
        .set('Authorization', `Bearer ${elenaToken}`);

      expect(res.status).toBe(403);
    });
  });
});
