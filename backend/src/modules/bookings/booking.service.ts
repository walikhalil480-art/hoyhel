import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../../utils/errors';
import { BookingStatus, CancellationPolicy, NotificationType, NotificationPriority } from '@prisma/client';
import { PricingService } from './pricing.service';
import { NotificationService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

const pricingService = new PricingService();
const notificationService = new NotificationService();

export class BookingService {
  async expirePendingBookings() {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const expiredCount = await prisma.booking.updateMany({
      where: {
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING] },
        OR: [
          { expiresAt: { lt: new Date() } },
          { createdAt: { lt: fifteenMinsAgo } },
        ],
        payment: { is: null },
      },
      data: {
        status: BookingStatus.EXPIRED,
        cancellationReason: 'Payment timeout - temporary booking hold expired automatically',
        cancelledAt: new Date(),
      },
    });
    return expiredCount.count;
  }

  async createBooking(
    guestId: string,
    data: {
      propertyId: string;
      checkIn: string;
      checkOut: string;
      adultsCount?: number;
      childrenCount?: number;
      infantsCount?: number;
      petsCount?: number;
      guestsCount?: number;
      specialRequests?: string;
      estimatedArrival?: string;
      emergencyName?: string;
      emergencyPhone?: string;
      emergencyRelation?: string;
      promoCode?: string;
    }
  ) {
    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);

    // Auto-expire abandoned pending reservations first
    await this.expirePendingBookings();

    const adultsCount = Math.max(1, data.adultsCount || data.guestsCount || 1);
    const childrenCount = Math.max(0, data.childrenCount || 0);
    const infantsCount = Math.max(0, data.infantsCount || 0);
    const petsCount = Math.max(0, data.petsCount || 0);
    const totalGuests = adultsCount + childrenCount;

    // Calculate server-side prices
    const price = await pricingService.calculateBookingPrice(
      data.propertyId,
      data.checkIn,
      data.checkOut,
      totalGuests,
      data.promoCode
    );

    // 15-minute temporary hold expiration timestamp
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Execute in serializable transaction with PostgreSQL row-level locking to prevent double booking
    return await prisma.$transaction(async (tx) => {
      // 0. Acquire PostgreSQL row lock on Property to serialize concurrent booking attempts
      const property = await tx.property.findUnique({
        where: { id: data.propertyId },
        select: { id: true, hostId: true, title: true, address: true, city: true, country: true, cancellationPolicy: true, maxGuests: true, status: true },
      });

      if (!property) {
        throw new NotFoundError('Property');
      }

      if (property.status !== 'PUBLISHED') {
        throw new ValidationError('Cannot book a property that is not published');
      }

      // Check guest account status
      const guestUser = await tx.user.findUnique({
        where: { id: guestId },
        select: { id: true, isActive: true, isSuspended: true, isBlocked: true, isBanned: true, suspensionReason: true, blockedReason: true, banReason: true },
      });

      if (!guestUser || !guestUser.isActive || guestUser.isSuspended || guestUser.isBlocked || guestUser.isBanned) {
        const reason = guestUser?.suspensionReason || guestUser?.blockedReason || guestUser?.banReason || 'Your account is currently restricted from creating new reservations. Please contact support.';
        throw new ForbiddenError(`Account Restricted: ${reason}`);
      }

      if (property.hostId === guestId) {
        throw new ForbiddenError('Hosts cannot book their own properties');
      }

      if (totalGuests > property.maxGuests) {
        throw new ValidationError(`Guest count (${totalGuests}) exceeds property limit (${property.maxGuests})`);
      }

      await tx.$executeRaw`SELECT id FROM "Property" WHERE id = ${data.propertyId} FOR UPDATE`;

      // 1. Check for blocked availability dates
      const blockedDates = await tx.availability.findFirst({
        where: {
          propertyId: data.propertyId,
          date: { gte: checkInDate, lt: checkOutDate },
          isBlocked: true,
        },
      });

      if (blockedDates) {
        throw new ConflictError('Property is not available for one or more of the selected dates');
      }

      // 2. Check for overlapping existing bookings (CONFIRMED, PENDING_PAYMENT, PENDING, CHECKED_IN)
      const overlappingBooking = await tx.booking.findFirst({
        where: {
          propertyId: data.propertyId,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING, BookingStatus.CHECKED_IN] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
      });

      if (overlappingBooking) {
        throw new ConflictError('Property has already been reserved for the selected dates');
      }

      // 3. Generate Unique Booking Number
      const bookingNumber = `LH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const newBooking = await tx.booking.create({
        data: {
          bookingNumber,
          propertyId: data.propertyId,
          guestId,
          propertyName: property.title,
          propertyAddress: `${property.address}, ${property.city}, ${property.country}`,
          cancellationPolicySnapshot: property.cancellationPolicy,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestsCount: totalGuests,
          adultsCount,
          childrenCount,
          infantsCount,
          petsCount,
          estimatedArrival: data.estimatedArrival || null,
          emergencyName: data.emergencyName || null,
          emergencyPhone: data.emergencyPhone || null,
          emergencyRelation: data.emergencyRelation || null,
          expiresAt,
          nights: price.nights,
          nightlyPrice: price.avgNightlyPrice,
          subtotal: price.subtotal,
          cleaningFee: price.cleaningFee,
          serviceFee: price.serviceFee,
          taxes: price.taxes,
          discount: price.discount,
          totalPrice: price.totalPrice,
          status: BookingStatus.PENDING_PAYMENT,
          specialRequests: data.specialRequests || null,
        },
        include: {
          property: {
            select: { id: true, title: true, address: true, city: true, country: true, images: { take: 1 } },
          },
          guest: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Send real-time notifications
      await notificationService.createNotification({
        userId: property.hostId,
        type: NotificationType.BOOKING_CREATED,
        title: 'New Reservation Hold',
        message: `Temporary reservation hold initiated for "${property.title}" by ${newBooking.guest.firstName}.`,
        data: { bookingId: newBooking.id, bookingNumber: newBooking.bookingNumber },
        priority: NotificationPriority.HIGH,
        actionUrl: '/host/dashboard',
      });

      await notificationService.createNotification({
        userId: guestId,
        type: NotificationType.BOOKING_CREATED,
        title: 'Reservation Hold Initiated',
        message: `Your dates for "${property.title}" are held for 15 minutes. Please complete payment.`,
        data: { bookingId: newBooking.id, bookingNumber: newBooking.bookingNumber },
        actionUrl: `/checkout/${data.propertyId}?bookingId=${newBooking.id}`,
      });

      return newBooking;
    }, { timeout: 15000 });
  }

  async getBookingById(bookingId: string, userId: string, userRoles: string[]) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          include: {
            host: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
            images: { orderBy: { sortOrder: 'asc' } },
            propertyAmenities: { include: { amenity: true } },
          },
        },
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        payment: true,
        refunds: true,
        review: true,
      },
    });

    if (!booking) throw new NotFoundError('Booking');

    const isGuest = booking.guestId === userId;
    const isHost = (booking as any).property?.hostId === userId;
    const isAdmin = userRoles.includes('ADMIN');

    if (!isGuest && !isHost && !isAdmin) {
      throw new ForbiddenError('You are not authorized to view this booking');
    }

    return booking;
  }

  async updateExpiredBookings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updated = await prisma.booking.updateMany({
      where: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        checkOut: { lt: today },
      },
      data: {
        status: BookingStatus.COMPLETED,
      },
    });

    return updated.count;
  }

  async getUserBookings(userId: string, role: 'guest' | 'host' = 'guest') {
    await this.updateExpiredBookings();

    if (role === 'host') {
      return prisma.booking.findMany({
        where: { property: { hostId: userId } },
        include: {
          property: { select: { id: true, title: true, city: true, country: true, propertyType: true, status: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
          guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          payment: { select: { status: true, amount: true, paymentMethod: true, transactionId: true } },
          review: { select: { id: true, rating: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.booking.findMany({
      where: { guestId: userId },
      include: {
        property: { select: { id: true, title: true, city: true, country: true, propertyType: true, status: true, images: { take: 1, orderBy: { sortOrder: 'asc' } }, host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        payment: { select: { status: true, amount: true, paymentMethod: true, transactionId: true } },
        review: { select: { id: true, rating: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true, payment: true },
    });

    if (!booking) throw new NotFoundError('Booking');
    if (booking.guestId !== userId && booking.property.hostId !== userId) {
      throw new ForbiddenError('You cannot cancel this booking');
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new ValidationError(`Cannot cancel booking in ${booking.status} state`);
    }

    // Calculate refund based on cancellation policy
    const policy = booking.property.cancellationPolicy;
    const now = new Date();
    const checkIn = new Date(booking.checkIn);
    const diffDays = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let refundPercent = 0;
    if (policy === CancellationPolicy.FLEXIBLE) {
      refundPercent = diffDays >= 1 ? 1.0 : 0.5;
    } else if (policy === CancellationPolicy.MODERATE) {
      refundPercent = diffDays >= 5 ? 1.0 : diffDays >= 2 ? 0.5 : 0;
    } else if (policy === CancellationPolicy.STRICT) {
      refundPercent = diffDays >= 14 ? 1.0 : diffDays >= 7 ? 0.5 : 0;
    }

    const eligibleRefund = booking.payment?.status === 'SUCCESS' ? booking.totalPrice * refundPercent : 0;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: reason || 'Cancelled by user',
        cancelledAt: new Date(),
        refundedAmount: eligibleRefund,
      },
    });

    // Notify Guest & Host
    await notificationService.createNotification({
      userId: booking.guestId,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Reservation Cancelled',
      message: `Booking #${booking.bookingNumber} for "${booking.property.title}" has been cancelled.`,
      data: { bookingId: booking.id, eligibleRefund },
      actionUrl: '/dashboard',
    });

    await notificationService.createNotification({
      userId: booking.property.hostId,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Reservation Cancelled',
      message: `Booking #${booking.bookingNumber} for "${booking.property.title}" was cancelled.`,
      data: { bookingId: booking.id },
      actionUrl: '/host/dashboard',
    });

    if (eligibleRefund > 0) {
      await notificationService.createNotification({
        userId: booking.guestId,
        type: NotificationType.REFUND_COMPLETED,
        title: 'Refund Processed',
        message: `$${eligibleRefund.toFixed(2)} has been refunded for booking #${booking.bookingNumber}.`,
        data: { bookingId: booking.id, amount: eligibleRefund },
        actionUrl: '/dashboard',
      });
    }

    return { booking: updated, eligibleRefund, refundPercent: refundPercent * 100 };
  }
}
