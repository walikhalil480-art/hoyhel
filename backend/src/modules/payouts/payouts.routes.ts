import { Router, Request, Response } from 'express';
import { PayoutService } from './payouts.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();
const payoutService = new PayoutService();

router.get(
  '/dashboard',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await payoutService.getHostEarningsDashboard(req.user!.userId);
    return res.json({ success: true, data });
  })
);

router.post(
  '/request',
  authenticate,
  requireRoles('HOST', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, destinationAccount } = req.body;
    const payout = await payoutService.requestPayout(req.user!.userId, Number(amount), destinationAccount);
    return res.status(201).json({ success: true, message: 'Payout requested', data: payout });
  })
);

export default router;
