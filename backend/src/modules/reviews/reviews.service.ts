import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../utils/errors';
import { BookingStatus } from '@prisma/client';

export class ReviewService {
  async createPropertyReview(
    authorId: string,
    data: {
      bookingId: string;
      rating: number;
      cleanliness: number;
      communication: number;
      location: number;
      accuracy: number;
      value: number;
      comment: string;
    }
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { review: true, property: true },
    });

    if (!booking) throw new NotFoundError('Booking');
    if (booking.guestId !== authorId) throw new ForbiddenError('Only the guest who completed this stay can leave a review');

    if (booking.review) throw new ConflictError('A review has already been submitted for this booking');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (booking.status !== BookingStatus.COMPLETED && new Date(booking.checkOut) > today) {
      throw new ValidationError('You can only review a property after your stay check-out date has passed');
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          propertyId: booking.propertyId,
          bookingId: booking.id,
          authorId,
          rating: data.rating,
          cleanliness: data.cleanliness,
          communication: data.communication,
          location: data.location,
          accuracy: data.accuracy,
          value: data.value,
          comment: data.comment,
        },
      });

      // Recalculate Property Average Rating & Review Count
      const stats = await tx.review.aggregate({
        where: { propertyId: booking.propertyId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.property.update({
        where: { id: booking.propertyId },
        data: {
          averageRating: Math.round((stats._avg.rating || 0) * 100) / 100,
          reviewCount: stats._count.rating || 0,
        },
      });

      return created;
    });

    return review;
  }

  async getPropertyReviews(propertyId: string) {
    return prisma.review.findMany({
      where: { propertyId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
