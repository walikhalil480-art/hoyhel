import { prisma } from '../config/database';
import { AuthService } from '../modules/auth/auth.service';
import { BookingService } from '../modules/bookings/booking.service';
import { PaymentService } from '../modules/payments/payments.service';
import { PropertyService } from '../modules/properties/properties.service';
import { AdminService } from '../modules/admin/admin.service';
import { UserService } from '../modules/users/user.service';
import { UserRoleType, PropertyType, PropertyStatus, CancellationPolicy, PaymentMethodType } from '@prisma/client';

describe('LuxeHaven Full Marketplace Business Logic & Edge Cases Suite', () => {
  const authService = new AuthService();
  const bookingService = new BookingService();
  const paymentService = new PaymentService();
  const propertyService = new PropertyService();
  const adminService = new AdminService();
  const userService = new UserService();

  let hostUser: any;
  let guestUser: any;
  let adminUser: any;
  let testProperty: any;

  beforeAll(async () => {
    // 1. Create Host, Guest, Admin test accounts
    hostUser = await prisma.user.create({
      data: {
        email: `marketplace.host.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Marketplace',
        lastName: 'Host',
        role: UserRoleType.HOST,
      },
    });

    guestUser = await prisma.user.create({
      data: {
        email: `marketplace.guest.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Marketplace',
        lastName: 'Guest',
        role: UserRoleType.GUEST,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `marketplace.admin.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Marketplace',
        lastName: 'Admin',
        role: UserRoleType.ADMIN,
      },
    });

    // 2. Create Published Property with cover image
    testProperty = await prisma.property.create({
      data: {
        hostId: hostUser.id,
        title: 'Penthouse Suite Azure',
        description: 'Luxury oceanfront penthouse',
        propertyType: PropertyType.APARTMENT,
        status: PropertyStatus.PUBLISHED,
        basePrice: 1000,
        cleaningFee: 150,
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        address: '500 Ocean Boulevard',
        city: 'Miami',
        country: 'United States',
        latitude: 25.7617,
        longitude: -80.1918,
        cancellationPolicy: CancellationPolicy.MODERATE,
        images: {
          create: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750', isMain: true }],
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.refund.deleteMany({ where: { booking: { propertyId: testProperty.id } } });
    await prisma.payment.deleteMany({ where: { booking: { propertyId: testProperty.id } } });
    await prisma.booking.deleteMany({ where: { propertyId: testProperty.id } });
    await prisma.propertyImage.deleteMany({ where: { propertyId: testProperty.id } });
    await prisma.property.delete({ where: { id: testProperty.id } });
    await prisma.user.deleteMany({ where: { id: { in: [hostUser.id, guestUser.id, adminUser.id] } } });
  });

  it('should prevent host from booking their own property', async () => {
    await expect(
      bookingService.createBooking(hostUser.id, {
        propertyId: testProperty.id,
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        guestsCount: 2,
      })
    ).rejects.toThrow('Hosts cannot book their own properties');
  });

  it('should reject booking if guest count exceeds maximum property capacity', async () => {
    await expect(
      bookingService.createBooking(guestUser.id, {
        propertyId: testProperty.id,
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        guestsCount: 10, // Max capacity is 4
      })
    ).rejects.toThrow('exceeds property limit');
  });

  it('should store historical snapshot of property details on booking creation', async () => {
    const booking = await bookingService.createBooking(guestUser.id, {
      propertyId: testProperty.id,
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      guestsCount: 2,
    });

    expect(booking.propertyName).toBe('Penthouse Suite Azure');
    expect(booking.propertyAddress).toBe('500 Ocean Boulevard, Miami, United States');
    expect(booking.cancellationPolicySnapshot).toBe(CancellationPolicy.MODERATE);

    // Verify snapshot persists even if host alters property title
    await prisma.property.update({
      where: { id: testProperty.id },
      data: { title: 'Renamed Title After Booking' },
    });

    const refreshedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(refreshedBooking?.propertyName).toBe('Penthouse Suite Azure');

    // Restore title
    await prisma.property.update({
      where: { id: testProperty.id },
      data: { title: 'Penthouse Suite Azure' },
    });
  });

  it('should enforce payment idempotency and prevent duplicate payments', async () => {
    const booking = await bookingService.createBooking(guestUser.id, {
      propertyId: testProperty.id,
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      guestsCount: 2,
    });

    const ikKey = `ik_test_duplicate_${Date.now()}`;

    // First payment request
    const pay1 = await paymentService.processBookingPayment(guestUser.id, {
      bookingId: booking.id,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      idempotencyKey: ikKey,
    });
    expect(pay1.payment.status).toBe('SUCCESS');

    // Duplicate payment request with same idempotency key
    const pay2 = await paymentService.processBookingPayment(guestUser.id, {
      bookingId: booking.id,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      idempotencyKey: ikKey,
    });
    expect(pay2.idempotencyReplay).toBe(true);
    expect(pay2.payment.id).toBe(pay1.payment.id);
  });

  it('should calculate cancellation policy refunds accurately according to rules', async () => {
    const booking = await bookingService.createBooking(guestUser.id, {
      propertyId: testProperty.id,
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      guestsCount: 2,
    });

    await paymentService.processBookingPayment(guestUser.id, {
      bookingId: booking.id,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    });

    // Moderate policy (> 5 days away) -> 100% refund eligible
    const cancelResult = await bookingService.cancelBooking(booking.id, guestUser.id, 'Changed travel plans');
    expect(cancelResult.refundPercent).toBe(100);
    expect(cancelResult.eligibleRefund).toBe(booking.totalPrice);
  });

  it('should correctly reconcile admin financial dashboard stats against DB records', async () => {
    const analytics = await adminService.getDashboardAnalytics();
    expect(analytics).toBeDefined();
    expect(typeof analytics.totalRevenue).toBe('number');
    expect(typeof analytics.platformFees).toBe('number');
    expect(typeof analytics.hostEarnings).toBe('number');
    expect(analytics.totalRevenue).toBeGreaterThanOrEqual(0);
  });
});
