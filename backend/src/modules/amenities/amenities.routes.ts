import { Router, Request, Response } from 'express';
import { AmenityService } from './amenities.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();
const amenityService = new AmenityService();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const amenities = await amenityService.getAllAmenities();
    return res.json({ success: true, data: amenities });
  })
);

router.post(
  '/',
  authenticate,
  requireRoles('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, category, icon } = req.body;
    const amenity = await amenityService.createAmenity(name, category, icon);
    return res.status(201).json({ success: true, data: amenity });
  })
);

export default router;
