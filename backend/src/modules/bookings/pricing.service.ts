import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';

export interface PriceBreakdown {
  nights: number;
  avgNightlyPrice: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  discount: number;
  totalPrice: number;
}

export interface PriceBreakdown {
  nights: number;
  avgNightlyPrice: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  discount: number;
  promoDiscount: number;
  totalPrice: number;
  promoCodeApplied?: string;
}

export class PricingService {
  async calculateBookingPrice(
    propertyId: string,
    checkInDateStr: string,
    checkOutDateStr: string,
    guestsCount: number,
    promoCode?: string
  ): Promise<PriceBreakdown> {
    const checkIn = new Date(checkInDateStr);
    const checkOut = new Date(checkOutDateStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new ValidationError('Invalid check-in or check-out date format');
    }

    if (checkIn >= checkOut) {
      throw new ValidationError('Check-out date must be after check-in date');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      throw new ValidationError('Check-in date cannot be in the past');
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        availabilities: {
          where: {
            date: { gte: checkIn, lt: checkOut },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundError('Property');
    }

    if (guestsCount > property.maxGuests) {
      throw new ValidationError(`Guest count (${guestsCount}) exceeds property limit (${property.maxGuests})`);
    }

    // Calculate nights
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Custom pricing per night
    const availabilityMap = new Map<string, number>();
    property.availabilities.forEach((av) => {
      const dateKey = av.date.toISOString().split('T')[0];
      if (av.customPrice !== null && av.customPrice !== undefined) {
        availabilityMap.set(dateKey, av.customPrice);
      }
    });

    let subtotal = 0;
    const currentDate = new Date(checkIn);
    for (let i = 0; i < nights; i++) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const nightlyCost = availabilityMap.get(dateKey) || property.basePrice;
      subtotal += nightlyCost;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const cleaningFee = property.cleaningFee;
    const serviceFee = Math.round((subtotal * 0.1) * 100) / 100; // 10% platform service fee
    const taxes = Math.round(((subtotal + serviceFee) * 0.08) * 100) / 100; // 8% local occupancy tax
    let durationDiscount = nights >= 7 ? Math.round(subtotal * 0.1 * 100) / 100 : 0; // 10% weekly discount
    let promoDiscount = 0;

    if (promoCode) {
      const discountRecord = await prisma.discountCode.findUnique({
        where: { code: promoCode.trim().toUpperCase() },
      });

      if (!discountRecord || !discountRecord.isActive) {
        throw new ValidationError('Invalid or inactive promo code');
      }

      if (discountRecord.expiresAt && discountRecord.expiresAt < new Date()) {
        throw new ValidationError('Promo code has expired');
      }

      if (discountRecord.usedCount >= discountRecord.maxUses) {
        throw new ValidationError('Promo code usage limit has been reached');
      }

      if (subtotal < discountRecord.minBookingAmount) {
        throw new ValidationError(`Booking subtotal must be at least $${discountRecord.minBookingAmount} for this promo code`);
      }

      if (discountRecord.discountPercent) {
        promoDiscount = Math.round((subtotal * (discountRecord.discountPercent / 100)) * 100) / 100;
      } else if (discountRecord.discountAmount) {
        promoDiscount = Math.min(subtotal, discountRecord.discountAmount);
      }
    }

    const totalDiscount = Math.round((durationDiscount + promoDiscount) * 100) / 100;
    const totalPrice = Math.max(0, Math.round((subtotal + cleaningFee + serviceFee + taxes - totalDiscount) * 100) / 100);
    const avgNightlyPrice = Math.round((subtotal / nights) * 100) / 100;

    return {
      nights,
      avgNightlyPrice,
      subtotal,
      cleaningFee,
      serviceFee,
      taxes,
      discount: totalDiscount,
      promoDiscount,
      totalPrice,
      promoCodeApplied: promoCode ? promoCode.trim().toUpperCase() : undefined,
    };
  }
}
