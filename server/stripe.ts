import Stripe from "stripe";
import { storage } from "./storage";

export async function getStripeClient(organizationId: string): Promise<Stripe | null> {
  const org = await storage.getOrganization(organizationId);
  
  if (!org || !org.paymentEnabled || !org.stripeSecretKey) {
    return null;
  }
  
  return new Stripe(org.stripeSecretKey, {
    apiVersion: "2025-11-17.clover",
  });
}

export async function createPaymentIntent(
  organizationId: string,
  amount: number,
  currency: string = "usd",
  metadata: Record<string, string> = {}
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const stripe = await getStripeClient(organizationId);
  
  if (!stripe) {
    return null;
  }
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
  
  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

export async function getPaymentIntent(
  organizationId: string,
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  const stripe = await getStripeClient(organizationId);
  
  if (!stripe) {
    return null;
  }
  
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export function calculateFinalPrice(
  basePrice: number,
  discountType: string | null,
  discountValue: string | null
): number {
  if (!discountType || !discountValue) return basePrice;
  
  const discountNum = parseFloat(discountValue);
  if (isNaN(discountNum)) return basePrice;
  
  if (discountType === "percentage") {
    const cappedPercent = Math.min(100, Math.max(0, discountNum));
    return basePrice * (1 - cappedPercent / 100);
  }
  
  if (discountType === "fixed") {
    return Math.max(0, basePrice - discountNum);
  }
  
  return basePrice;
}
