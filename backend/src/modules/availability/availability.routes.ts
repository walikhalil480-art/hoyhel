import { Router, Request, Response } from 'express';
import { AvailabilityService } from './availability.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();
const availabilityService = new AvailabilityService();

router.get(
  '/properties/:propertyId',
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const start = (startDate as string) || new Date().toISOString().split('T')[0];
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 90);
    const end = (endDate as string) || defaultEnd.toISOString().split('T')[0];

    const result = await availabilityService.getPropertyCalendar(req.params.propertyId, start, end);
    return res.json({ success: true, data: result });
  })
);

router.post(
  '/properties/:propertyId',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { dates } = req.body;
    const result = await availabilityService.updateDateAvailability(req.user!.userId, req.params.propertyId, dates);
    return res.json({ success: true, message: 'Calendar updated successfully', data: result });
  })
);

export default router;
