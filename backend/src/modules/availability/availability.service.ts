import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';

export class AvailabilityService {
  async getPropertyCalendar(propertyId: string, startDateStr: string, endDateStr: string) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    const availabilities = await prisma.availability.findMany({
      where: {
        propertyId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING', 'PENDING_PAYMENT'] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
        checkIn: { lte: endDate },
        checkOut: { gte: startDate },
      },
      select: { checkIn: true, checkOut: true, status: true, expiresAt: true },
    });

    return {
      basePrice: property.basePrice,
      availabilities,
      bookings,
    };
  }

  async updateDateAvailability(
    hostId: string,
    propertyId: string,
    dates: Array<{
      date: string;
      isBlocked?: boolean;
      customPrice?: number | null;
      minStay?: number | null;
      maxStay?: number | null;
      note?: string | null;
    }>
  ) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');
    if (property.hostId !== hostId) throw new ForbiddenError('Only property host can manage calendar availability');

    // Check if host tries to block any date that has an active booking
    const blockedDatesRequested = dates.filter((d) => d.isBlocked === true).map((d) => new Date(d.date));

    if (blockedDatesRequested.length > 0) {
      for (const bDate of blockedDatesRequested) {
        const existingBooking = await prisma.booking.findFirst({
          where: {
            propertyId,
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING', 'PENDING_PAYMENT'] },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
            checkIn: { lte: bDate },
            checkOut: { gt: bDate },
          },
        });

        if (existingBooking) {
          throw new ConflictError('These dates already contain a confirmed guest reservation');
        }
      }
    }

    const ops = dates.map((d) => {
      const dateObj = new Date(d.date);
      return prisma.availability.upsert({
        where: {
          propertyId_date: { propertyId, date: dateObj },
        },
        update: {
          isBlocked: d.isBlocked !== undefined ? d.isBlocked : undefined,
          customPrice: d.customPrice !== undefined ? d.customPrice : undefined,
          minStay: d.minStay !== undefined ? d.minStay : undefined,
          maxStay: d.maxStay !== undefined ? d.maxStay : undefined,
          note: d.note !== undefined ? d.note : undefined,
        },
        create: {
          propertyId,
          date: dateObj,
          isBlocked: d.isBlocked || false,
          customPrice: d.customPrice || null,
          minStay: d.minStay || null,
          maxStay: d.maxStay || null,
          note: d.note || null,
        },
      });
    });

    await prisma.$transaction(ops);
    return { success: true, count: dates.length };
  }
}
