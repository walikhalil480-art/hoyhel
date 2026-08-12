import { Router } from 'express';
import {
  calculatePriceController,
  createBookingController,
  getBookingByIdController,
  getUserBookingsController,
  cancelBookingController,
} from './booking.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { recordAuditLog } from '../../middleware/auditLog.middleware';

const router = Router();

router.post('/calculate-price', calculatePriceController);

router.post(
  '/',
  authenticate,
  recordAuditLog('BOOKING_CREATE', 'Booking'),
  createBookingController
);

router.get(['/', '/my', '/user', '/guest'], authenticate, getUserBookingsController);
router.get('/:id', authenticate, getBookingByIdController);

router.post(
  '/:id/cancel',
  authenticate,
  recordAuditLog('BOOKING_CANCEL', 'Booking'),
  cancelBookingController
);

export default router;
