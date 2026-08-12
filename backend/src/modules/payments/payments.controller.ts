import { Request, Response } from 'express';
import { PaymentService } from './payments.service';
import { asyncHandler } from '../../utils/asyncHandler';

const paymentService = new PaymentService();

export const processPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.processBookingPayment(req.user!.userId, req.body);
  return res.status(200).json({
    success: true,
    message: 'Payment processed successfully',
    data: result,
  });
});

export const paymentWebhookController = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.processWebhook(req.body);
  return res.json(result);
});
