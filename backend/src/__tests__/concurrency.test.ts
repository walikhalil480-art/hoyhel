import { prisma } from '../config/database';
import { BookingService } from '../modules/bookings/booking.service';
import { AvailabilityService } from '../modules/availability/availability.service';
import { BookingStatus, PropertyType, PropertyStatus, UserRoleType } from '@prisma/client';

const bookingService = new BookingService();
const availabilityService = new AvailabilityService();

describe('Database Double-Booking & Concurrency Test Suite', () => {
  let hostId: string;
  let guestId1: string;
  let guestId2: string;
  let propertyId: string;

  beforeAll(async () => {
    // Create test host & guests
    const host = await prisma.user.create({
      data: {
        email: `concurrency.host.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Concurrency',
        lastName: 'Host',
        role: UserRoleType.HOST,
      },
    });
    hostId = host.id;

    const guest1 = await prisma.user.create({
      data: {
        email: `concurrency.guest1.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Guest',
        lastName: 'One',
        role: UserRoleType.GUEST,
      },
    });
    guestId1 = guest1.id;

    const guest2 = await prisma.user.create({
      data: {
        email: `concurrency.guest2.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Guest',
        lastName: 'Two',
        role: UserRoleType.GUEST,
      },
    });
    guestId2 = guest2.id;

    // Create test property
    const property = await prisma.property.create({
      data: {
        hostId,
        title: 'Concurrency Test Luxury Villa',
        description: 'Test villa for race condition validation',
        propertyType: PropertyType.VILLA,
        status: PropertyStatus.PUBLISHED,
        basePrice: 500,
        cleaningFee: 100,
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        address: '100 Concurrency Way',
        city: 'Malibu',
        country: 'United States',
        latitude: 34.0259,
        longitude: -118.7798,
      },
    });
    propertyId = property.id;
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.booking.deleteMany({ where: { propertyId } });
    await prisma.availability.deleteMany({ where: { propertyId } });
    await prisma.property.delete({ where: { id: propertyId } });
    await prisma.user.deleteMany({ where: { id: { in: [hostId, guestId1, guestId2] } } });
  });

  it('should prevent double booking under 10 concurrent requests for exact same dates', async () => {
    const checkIn = '2026-11-10';
    const checkOut = '2026-11-15';

    // Dispatch 10 parallel booking requests at the exact same millisecond
    const requests = Array.from({ length: 10 }).map((_, idx) =>
      bookingService.createBooking(idx % 2 === 0 ? guestId1 : guestId2, {
        propertyId,
        checkIn,
        checkOut,
        guestsCount: 2,
      })
    );

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(9);

    // Verify DB contains exactly 1 booking
    const bookingsInDb = await prisma.booking.findMany({
      where: { propertyId, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
    });
    expect(bookingsInDb.length).toBe(1);
  });

  it('should allow same-day checkout/check-in without date conflict', async () => {
    // Existing booking ends on 2026-11-15. New booking starts on 2026-11-15.
    const checkIn = '2026-11-15';
    const checkOut = '2026-11-20';

    const booking = await bookingService.createBooking(guestId2, {
      propertyId,
      checkIn,
      checkOut,
      guestsCount: 2,
    });

    expect(booking).toBeDefined();
    expect(booking.status).toBe(BookingStatus.PENDING);
  });

  it('should reject host date blocking when a confirmed/pending booking exists', async () => {
    // Attempt to block 2026-11-12 which has a booking
    await expect(
      availabilityService.updateDateAvailability(hostId, propertyId, [
        { date: '2026-11-12', isBlocked: true },
      ])
    ).rejects.toThrow('These dates already contain a confirmed guest reservation');
  });
});
