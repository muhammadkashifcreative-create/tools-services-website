import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

// Supports both VITE_PAYMENTS_CLIENT_TOKEN (legacy) and VITE_STRIPE_PUBLISHABLE_KEY
const clientToken =
  (import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined) ??
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined);

export function getStripeEnvironment(): StripeEnv {
  if (!clientToken) throw new Error("Stripe publishable key not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in Vercel.");
  if (clientToken.startsWith("pk_test_")) return "sandbox";
  if (clientToken.startsWith("pk_live_")) return "live";
  throw new Error("Invalid Stripe publishable key format");
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function isStripeConfigured(): boolean {
  return Boolean(clientToken?.startsWith("pk_test_") || clientToken?.startsWith("pk_live_"));
}
