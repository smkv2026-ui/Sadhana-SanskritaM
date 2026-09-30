import { env } from '@/config/env';
import type { Registration } from '@/data/types';
import { buildUpiLink } from '@/lib/upi';

/**
 * PaymentProvider — how a learner pays for a registration.
 *
 * Now: ManualUpiProvider (client-side UPI QR + deep link, admin verifies the UTR).
 * Later: RazorpayProvider (needs a tiny server to create orders and verify webhooks;
 * implement `createPayment` + flip VITE_PAYMENT_PROVIDER=razorpay — no UI rewrite needed,
 * the stepper renders whatever `PaymentInstructions` kind it receives).
 */
export type PaymentInstructions =
  | {
      kind: 'upi-manual';
      upiLink: string;
      vpa: string;
      payeeName: string;
      amountInr: number;
      reference: string;
    }
  | { kind: 'redirect'; url: string };

export interface PaymentProvider {
  readonly id: 'manual-upi' | 'razorpay';
  readonly label: string;
  /** True when an admin must verify the payment (UTR) before access unlocks. */
  readonly requiresManualVerification: boolean;
  createPayment(registration: Pick<Registration, 'amountInr' | 'reference' | 'courseTitle'>): Promise<PaymentInstructions>;
}

export class ManualUpiProvider implements PaymentProvider {
  readonly id = 'manual-upi' as const;
  readonly label = 'UPI (any app)';
  readonly requiresManualVerification = true;

  constructor(
    private readonly vpa: string,
    private readonly payeeName: string,
  ) {}

  async createPayment(reg: Pick<Registration, 'amountInr' | 'reference' | 'courseTitle'>): Promise<PaymentInstructions> {
    return {
      kind: 'upi-manual',
      upiLink: buildUpiLink({ vpa: this.vpa, payeeName: this.payeeName, amountInr: reg.amountInr, reference: reg.reference }),
      vpa: this.vpa,
      payeeName: this.payeeName,
      amountInr: reg.amountInr,
      reference: reg.reference,
    };
  }
}

/** Stub — requires a server (order creation + signature verification) and is off by default. */
export class RazorpayProvider implements PaymentProvider {
  readonly id = 'razorpay' as const;
  readonly label = 'Card / UPI / Netbanking (Razorpay)';
  readonly requiresManualVerification = false;

  async createPayment(): Promise<PaymentInstructions> {
    throw new Error(
      'RazorpayProvider is not enabled. Deploy an order-creation endpoint, implement createPayment(), then set VITE_PAYMENT_PROVIDER=razorpay.',
    );
  }
}

let instance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (instance) return instance;
  instance =
    env.providers.payment === 'razorpay' && env.flags.onlinePayments
      ? new RazorpayProvider()
      : new ManualUpiProvider(env.upi.vpa, env.upi.payeeName);
  return instance;
}
