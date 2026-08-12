import { Router, Request, Response } from 'express';
import { ReviewService } from './reviews.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const reviewService = new ReviewService();

router.get(
  '/property/:propertyId',
  asyncHandler(async (req: Request, res: Response) => {
    const reviews = await reviewService.getPropertyReviews(req.params.propertyId);
    return res.json({ success: true, data: reviews });
  })
);

router.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.createPropertyReview(req.user!.userId, req.body);
    return res.status(201).json({ success: true, message: 'Review submitted successfully', data: review });
  })
);

export default router;
