import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, PaymentError, ValidationError } from '../../utils/errors';
import { PaymentStatus, PaymentMethodType, BookingStatus, NotificationType, NotificationPriority } from '@prisma/client';
import { StripePaymentProvider, MpesaPaymentProvider } from './payments.provider';
import { NotificationService } from '../notifications/notifications.service';

const stripeProvider = new StripePaymentProvider();
const mpesaProvider = new MpesaPaymentProvider();

export class PaymentService {
  async processBookingPayment(
    userId: string,
    data: {
      bookingId: string;
      paymentMethod: PaymentMethodType;
      phone?: string;
      idempotencyKey?: string;
    }
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { payment: true, property: true },
    });

    if (!booking) throw new NotFoundError('Booking');
    if (booking.guestId !== userId) throw new ValidationError('You can only pay for your own booking');

    // Check if temporary hold has expired
    if (
      booking.status === BookingStatus.EXPIRED ||
      booking.status === BookingStatus.CANCELLED ||
      (booking.expiresAt && new Date(booking.expiresAt) < new Date() && booking.status !== BookingStatus.CONFIRMED)
    ) {
      if (booking.status !== BookingStatus.EXPIRED) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.EXPIRED, cancellationReason: 'Payment hold expired prior to payment completion' },
        });
      }
      throw new ValidationError('Your temporary booking hold has expired. Please re-select your dates and try again.');
    }

    if (data.idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existingPayment) {
        return { payment: existingPayment, idempotencyReplay: true };
      }
    }

    if (booking.payment && booking.payment.status === PaymentStatus.SUCCESS) {
      throw new ConflictError('Booking has already been paid for');
    }

    const idempotencyKey = data.idempotencyKey || `ik_${data.bookingId}_${Date.now()}`;

    // Handle M-Pesa STK Push
    if (data.paymentMethod === PaymentMethodType.MPESA) {
      if (!data.phone) throw new ValidationError('Phone number is required for M-Pesa payments');
      const result = await mpesaProvider.processMpesaStkPush(data.phone, booking.totalPrice, booking.bookingNumber);

      const payment = await prisma.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          status: PaymentStatus.PROCESSING,
          mpesaCheckoutId: result.transactionId,
          idempotencyKey,
        },
        create: {
          bookingId: booking.id,
          userId,
          amount: booking.totalPrice,
          currency: 'USD',
          status: PaymentStatus.PROCESSING,
          paymentMethod: PaymentMethodType.MPESA,
          transactionId: result.transactionId,
          idempotencyKey,
          rawResponse: result.rawResponse,
        },
      });

      return { payment, mpesaResponse: result };
    }

    // Default Credit Card (Stripe) Payment
    const result = await stripeProvider.createPaymentIntent(booking.totalPrice, 'USD', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
    });

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          status: PaymentStatus.SUCCESS,
          transactionId: result.transactionId,
          stripePaymentIntentId: result.transactionId,
        },
        create: {
          bookingId: booking.id,
          userId,
          amount: booking.totalPrice,
          currency: 'USD',
          status: PaymentStatus.SUCCESS,
          paymentMethod: PaymentMethodType.CREDIT_CARD,
          transactionId: result.transactionId,
          stripePaymentIntentId: result.transactionId,
          idempotencyKey,
          rawResponse: result.rawResponse,
        },
      });

      // Update Booking Status to CONFIRMED
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      const notificationService = new NotificationService();
      // Notify Guest
      await notificationService.createNotification({
        userId: booking.guestId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Reservation Confirmed',
        message: `Your reservation at "${booking.property.title}" is confirmed!`,
        data: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
        priority: NotificationPriority.HIGH,
        actionUrl: '/dashboard',
      });

      await notificationService.createNotification({
        userId: booking.guestId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message: `Your payment of $${booking.totalPrice} for booking #${booking.bookingNumber} has been processed.`,
        data: { bookingId: booking.id, amount: booking.totalPrice },
        actionUrl: '/dashboard',
      });

      // Notify Host
      await notificationService.createNotification({
        userId: booking.property.hostId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Reservation Confirmed',
        message: `Reservation confirmed for "${booking.property.title}" (Booking #${booking.bookingNumber}).`,
        data: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
        priority: NotificationPriority.HIGH,
        actionUrl: '/host/dashboard',
      });

      return p;
    });

    return { payment, stripeResponse: result };
  }

  async processWebhook(event: { type: string; data: any }) {
    if (event.type === 'payment_intent.succeeded') {
      const bookingId = event.data?.metadata?.bookingId;
      if (bookingId) {
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { bookingId },
            data: { status: PaymentStatus.SUCCESS },
          }),
          prisma.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.CONFIRMED },
          }),
        ]);
      }
    }
    return { received: true };
  }
}
