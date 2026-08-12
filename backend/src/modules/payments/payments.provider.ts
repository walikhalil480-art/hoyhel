export interface PaymentIntentResult {
  transactionId: string;
  clientSecret?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  rawResponse?: any;
}

export interface IPaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata: Record<string, any>): Promise<PaymentIntentResult>;
  processMpesaStkPush(phone: string, amount: number, accountReference: string): Promise<PaymentIntentResult>;
  refundPayment(transactionId: string, amount: number): Promise<{ refundId: string; status: string }>;
}

export class StripePaymentProvider implements IPaymentProvider {
  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, any>): Promise<PaymentIntentResult> {
    // Standard mock Stripe driver for sandbox & production fallback
    const txnId = `TXN-STRIPE-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const clientSecret = `pi_secret_mock_${Math.random().toString(36).substring(7)}`;

    return {
      transactionId: txnId,
      clientSecret,
      status: 'SUCCESS',
      rawResponse: { provider: 'stripe', mock: true, amount, currency, metadata },
    };
  }

  async processMpesaStkPush(phone: string, amount: number, accountReference: string): Promise<PaymentIntentResult> {
    throw new Error('M-Pesa STK push not supported on Stripe driver');
  }

  async refundPayment(transactionId: string, amount: number) {
    return {
      refundId: `re_mock_${Math.random().toString(36).substring(7)}`,
      status: 'succeeded',
    };
  }
}

export class MpesaPaymentProvider implements IPaymentProvider {
  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, any>): Promise<PaymentIntentResult> {
    throw new Error('Card payment intent not supported on M-Pesa driver');
  }

  async processMpesaStkPush(phone: string, amount: number, accountReference: string): Promise<PaymentIntentResult> {
    const checkoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      transactionId: `TXN-MPESA-${checkoutId}`,
      status: 'PENDING',
      rawResponse: { provider: 'mpesa', checkoutId, phone, amount, accountReference },
    };
  }

  async refundPayment(transactionId: string, amount: number) {
    return {
      refundId: `mpesa_ref_${Math.random().toString(36).substring(7)}`,
      status: 'completed',
    };
  }
}
