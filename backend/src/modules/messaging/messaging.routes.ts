import { Router, Request, Response } from 'express';
import { MessagingService } from './messaging.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const messagingService = new MessagingService();

router.get(
  '/health',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    return res.json({
      success: true,
      messaging: true,
      database: true,
      authenticated: true,
      user: { id: req.user!.userId, email: req.user!.email, roles: req.user!.roles },
    });
  })
);

router.get(
  '/conversations',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const conversations = await messagingService.getUserConversations(req.user!.userId);
    return res.json({ success: true, data: conversations });
  })
);

router.get(
  ['/conversations/unread-count', '/unread-count', '/unread'],
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await messagingService.getUserUnreadMessageCount(req.user!.userId);
    return res.json({ success: true, data: result });
  })
);

router.post(
  '/conversations',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { hostId, recipientId, propertyId, bookingId } = req.body;
    const targetHostId = hostId || recipientId;
    const conversation = await messagingService.getOrCreateConversation(
      req.user!.userId,
      targetHostId,
      propertyId,
      bookingId
    );
    return res.status(201).json({ success: true, data: conversation });
  })
);

router.get(
  '/conversations/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const conversation = await messagingService.getConversationById(req.params.id, req.user!.userId);
    return res.json({ success: true, data: conversation });
  })
);

router.get(
  '/conversations/:id/messages',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const messages = await messagingService.getConversationMessages(req.params.id, req.user!.userId);
    return res.json({ success: true, data: messages });
  })
);

router.post(
  '/conversations/:id/messages',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const text = req.body.text || req.body.content;
    const message = await messagingService.sendMessage(req.params.id, req.user!.userId, text);
    return res.status(201).json({ success: true, data: message });
  })
);

router.patch(
  '/conversations/:id/read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await messagingService.markConversationAsRead(req.params.id, req.user!.userId);
    return res.json({ success: true, data: result });
  })
);

export default router;
