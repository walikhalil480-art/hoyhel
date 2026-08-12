import { Router } from 'express';
import { processPaymentController, paymentWebhookController } from './payments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { recordAuditLog } from '../../middleware/auditLog.middleware';

const router = Router();

router.post(
  '/process',
  authenticate,
  recordAuditLog('PAYMENT_PROCESS', 'Payment'),
  processPaymentController
);

router.post('/webhook', paymentWebhookController);

export default router;
