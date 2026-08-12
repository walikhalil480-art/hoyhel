import { Router, Request, Response } from 'express';
import { NotificationService } from './notifications.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const notificationService = new NotificationService();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(req.user!.userId, { page, limit, unreadOnly });
    return res.json({
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        unreadCount: result.unreadCount,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  })
);

router.get(
  '/unread-count',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationService.getUnreadCount(req.user!.userId);
    return res.json({ success: true, data: result });
  })
);

router.patch(
  '/mark-all-read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllAsRead(req.user!.userId);
    return res.json({ success: true, message: 'All notifications marked as read' });
  })
);

router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAsRead(req.params.id, req.user!.userId);
    return res.json({ success: true, message: 'Notification marked as read' });
  })
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.deleteNotification(req.params.id, req.user!.userId);
    return res.json({ success: true, message: 'Notification deleted' });
  })
);

export default router;
