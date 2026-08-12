import { prisma } from '../../config/database';
import { PayoutStatus, BookingStatus } from '@prisma/client';

export class PayoutService {
  async getHostEarningsDashboard(hostId: string) {
    const completedBookings = await prisma.booking.findMany({
      where: {
        property: { hostId },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] },
      },
      select: {
        subtotal: true,
        cleaningFee: true,
        serviceFee: true,
        totalPrice: true,
        status: true,
      },
    });

    const totalGross = completedBookings.reduce((sum, b) => sum + (b.subtotal + b.cleaningFee), 0);
    const totalPlatformFees = completedBookings.reduce((sum, b) => sum + b.serviceFee, 0);
    const netEarnings = totalGross;

    const payouts = await prisma.payout.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });

    const completedPayoutsSum = payouts
      .filter((p) => p.status === PayoutStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayoutsSum = payouts
      .filter((p) => p.status === PayoutStatus.PENDING || p.status === PayoutStatus.PROCESSING)
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, netEarnings - completedPayoutsSum - pendingPayoutsSum);

    return {
      totalGross,
      totalPlatformFees,
      netEarnings,
      availableBalance,
      pendingPayoutsSum,
      completedPayoutsSum,
      payouts,
    };
  }

  async requestPayout(hostId: string, amount: number, destinationAccount?: string) {
    const dashboard = await this.getHostEarningsDashboard(hostId);

    if (amount <= 0 || amount > dashboard.availableBalance) {
      throw new Error(`Requested amount exceeds available balance ($${dashboard.availableBalance})`);
    }

    const refNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payout = await prisma.payout.create({
      data: {
        hostId,
        amount,
        currency: 'USD',
        status: PayoutStatus.PENDING,
        payoutMethod: 'BANK_TRANSFER',
        destinationAccount: destinationAccount || 'Standard Bank Account (*4920)',
        referenceNumber: refNumber,
      },
    });

    return payout;
  }
}
