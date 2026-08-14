import { Router, Request, Response } from 'express';
import { UserReportService } from './reports.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const reportService = new UserReportService();

router.use(authenticate);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { reportedUserId, reason, details } = req.body;
    const report = await reportService.createReport(req.user!.userId, { reportedUserId, reason, details });
    return res.status(201).json({ success: true, message: 'Report submitted successfully for admin review', data: report });
  })
);

router.get(
  '/my-reports',
  asyncHandler(async (req: Request, res: Response) => {
    const reports = await reportService.getUserSubmittedReports(req.user!.userId);
    return res.json({ success: true, data: reports });
  })
);

export default router;
