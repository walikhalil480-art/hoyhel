import { Request, Response } from 'express';
import { BookingService } from './booking.service';
import { PricingService } from './pricing.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ForbiddenError } from '../../utils/errors';

const bookingService = new BookingService();
const pricingService = new PricingService();

export const calculatePriceController = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId, checkIn, checkOut, guestsCount, promoCode } = req.body;
  const breakdown = await pricingService.calculateBookingPrice(propertyId, checkIn, checkOut, Number(guestsCount), promoCode);
  return res.json({ success: true, data: breakdown });
});

export const createBookingController = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking(req.user!.userId, req.body);
  return res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

export const getBookingByIdController = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user!.userId, req.user!.roles);
  return res.json({ success: true, data: booking });
});

export const getUserBookingsController = asyncHandler(async (req: Request, res: Response) => {
  const role = (req.query.role as 'guest' | 'host') || 'guest';
  const userRoles = req.user!.roles || [];

  if (role === 'host' && !userRoles.includes('HOST') && !userRoles.includes('ADMIN')) {
    throw new ForbiddenError('Only registered hosts can view property bookings');
  }

  const bookings = await bookingService.getUserBookings(req.user!.userId, role);
  return res.json({ success: true, data: bookings });
});

export const cancelBookingController = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.cancelBooking(req.params.id, req.user!.userId, req.body.reason);
  return res.json({
    success: true,
    message: 'Booking cancelled',
    data: result,
  });
});
