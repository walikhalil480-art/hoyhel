import { prisma } from '../config/database';
import { AdminService } from '../modules/admin/admin.service';
import { BookingService } from '../modules/bookings/booking.service';
import { UserReportService } from '../modules/reports/reports.service';
import { UserRoleType, PropertyType, PropertyStatus, BookingStatus } from '@prisma/client';

const adminService = new AdminService();
const bookingService = new BookingService();
const reportService = new UserReportService();

describe('User Management & Moderation System Test Suite', () => {
  let adminId: string;
  let guestId: string;
  let hostId: string;
  let propertyId: string;
  let bookingId: string;

  beforeAll(async () => {
    // 1. Create Admin User
    const admin = await prisma.user.create({
      data: {
        email: `moderation.admin.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'System',
        lastName: 'Admin',
        role: UserRoleType.ADMIN,
      },
    });
    adminId = admin.id;

    // 2. Create Host User
    const host = await prisma.user.create({
      data: {
        email: `moderation.host.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Host',
        lastName: 'Elena',
        role: UserRoleType.HOST,
      },
    });
    hostId = host.id;

    // 3. Create Guest User
    const guest = await prisma.user.create({
      data: {
        email: `moderation.guest.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Elena',
        lastName: 'Guest',
        role: UserRoleType.GUEST,
      },
    });
    guestId = guest.id;

    // 4. Create Published Property
    const property = await prisma.property.create({
      data: {
        hostId,
        title: 'Moderation Test Villa',
        description: 'Luxury villa for testing moderation data integrity',
        propertyType: PropertyType.VILLA,
        status: PropertyStatus.PUBLISHED,
        basePrice: 400,
        address: '100 Sunset Blvd',
        city: 'Nairobi',
        country: 'Kenya',
        latitude: -1.2921,
        longitude: 36.8219,
      },
    });
    propertyId = property.id;

    // 5. Create Historical Booking for Guest
    const booking = await bookingService.createBooking(guestId, {
      propertyId,
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      guestsCount: 2,
    });
    bookingId = booking.id;
  });

  afterAll(async () => {
    // Cleanup records safely
    await prisma.userWarning.deleteMany({ where: { userId: guestId } });
    await prisma.userReport.deleteMany({ where: { OR: [{ reporterId: guestId }, { reportedUserId: guestId }] } });
    await prisma.booking.deleteMany({ where: { propertyId } });
    await prisma.property.delete({ where: { id: propertyId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, guestId, hostId] } } });
  });

  it('should fetch user details with accurate reservation summary stats', async () => {
    const userDetail = await adminService.getUserById(guestId);
    expect(userDetail).toBeDefined();
    expect(userDetail.email).toContain('moderation.guest');
    expect(userDetail.stats.totalBookings).toBeGreaterThanOrEqual(1);
    expect(userDetail.bookings.length).toBeGreaterThanOrEqual(1);
  });

  it('should issue a formal account warning to a user', async () => {
    const warning = await adminService.issueUserWarning(adminId, guestId, {
      reason: 'Inappropriate communication with host',
      severity: 'HIGH',
    });

    expect(warning).toBeDefined();
    expect(warning.userId).toBe(guestId);
    expect(warning.severity).toBe('HIGH');

    // Check user notifications
    const notifs = await prisma.notification.findMany({ where: { userId: guestId } });
    const warningNotif = notifs.find((n) => n.type === 'ACCOUNT_WARNED');
    expect(warningNotif).toBeDefined();
    expect(warningNotif?.title).toContain('Warning Issued');
  });

  it('should suspend user account and prevent creation of NEW bookings', async () => {
    // 1. Suspend user
    const updated = await adminService.updateUserModerationStatus(adminId, guestId, {
      action: 'SUSPEND',
      reason: 'Safety policy violation',
    });
    expect(updated.isSuspended).toBe(true);

    // 2. Attempting to create a NEW booking must fail with ForbiddenError
    await expect(
      bookingService.createBooking(guestId, {
        propertyId,
        checkIn: '2026-12-10',
        checkOut: '2026-12-15',
        guestsCount: 2,
      })
    ).rejects.toThrow('Account Restricted');
  });

  it('should preserve historical reservations when user is suspended', async () => {
    // Admin reservation query must STILL contain the historical reservation!
    const adminBookings = await adminService.getAdminBookings({ search: 'Elena' });
    const foundBooking = adminBookings.bookings.find((b) => b.id === bookingId);
    expect(foundBooking).toBeDefined();
    expect(foundBooking?.guest.id).toBe(guestId);
  });

  it('should block user account and verify restrictions', async () => {
    const updated = await adminService.updateUserModerationStatus(adminId, guestId, {
      action: 'BLOCK',
      reason: 'Excessive report volume',
    });
    expect(updated.isBlocked).toBe(true);
  });

  it('should unsuspend and unblock user account', async () => {
    const unsuspended = await adminService.updateUserModerationStatus(adminId, guestId, { action: 'UNSUSPEND' });
    expect(unsuspended.isSuspended).toBe(false);

    const unblocked = await adminService.updateUserModerationStatus(adminId, guestId, { action: 'UNBLOCK' });
    expect(unblocked.isBlocked).toBe(false);
  });

  it('should create and process a misconduct user report ticket', async () => {
    // Guest reports host
    const report = await reportService.createReport(guestId, {
      reportedUserId: hostId,
      reason: 'Misleading property description',
      details: 'Property photos did not match actual amenities',
    });
    expect(report).toBeDefined();
    expect(report.status).toBe('PENDING');

    // Admin lists reports
    const reportList = await adminService.getUserReports({ status: 'PENDING' });
    const found = reportList.reports.find((r) => r.id === report.id);
    expect(found).toBeDefined();

    // Admin resolves report
    const resolved = await adminService.updateReportStatus(adminId, report.id, {
      status: 'RESOLVED',
      adminNotes: 'Contacted host to update listing images',
    });
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.adminNotes).toContain('Contacted host');
  });
});
