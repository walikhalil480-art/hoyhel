import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function processBookingExpiryJob() {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const expiredBookings = await prisma.booking.updateMany({
    where: {
      status: BookingStatus.PENDING,
      createdAt: { lt: fifteenMinsAgo },
    },
    data: {
      status: BookingStatus.CANCELLED,
      cancellationReason: 'Payment window expired (15 minutes limit)',
      cancelledAt: new Date(),
    },
  });

  if (expiredBookings.count > 0) {
    console.log(`⏰ Automatically expired ${expiredBookings.count} unpaid pending bookings`);
  }
}
