/**
 * Minimal Stripe REST client — plain fetch + node crypto, no server-side SDK
 * dependency. Only the endpoints the bookstore needs.
 *
 * Checkout is fully custom (Stripe Elements Payment Element embedded on our
 * own /checkout page) rather than a redirect to Stripe's hosted Checkout, so
 * this client works in terms of PaymentIntents, not Checkout Sessions.
 *
 * Env vars (set in Vercel):
 *   STRIPE_SECRET_KEY         — sk_live_... / sk_test_...
 *   STRIPE_WEBHOOK_SECRET     — whsec_... (from the webhook endpoint in the
 *                               Stripe dashboard pointing at /api/stripe/webhook)
 *   VITE_STRIPE_PUBLISHABLE_KEY — pk_live_... / pk_test_..., read client-side
 *                               by the /checkout page to mount Stripe Elements
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.stripe.com/v1";

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Flattens nested params into Stripe's form encoding (a[b][0][c]=v). */
function formEncode(params: Record<string, unknown>, prefix = "", out: string[] = []): string[] {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          formEncode(item as Record<string, unknown>, `${name}[${i}]`, out);
        } else {
          out.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      formEncode(value as Record<string, unknown>, name, out);
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out;
}

async function stripeRequest<T>(method: "GET" | "POST", path: string, params?: Record<string, unknown>): Promise<T> {
  const body = params ? formEncode(params).join("&") : undefined;
  const url = method === "GET" && body ? `${API_BASE}${path}?${body}` : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(method === "POST" && body ? { body } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; type?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Stripe error ${res.status}`);
  }
  return json;
}

export interface StripePaymentIntent {
  id: string;
  client_secret: string | null;
  status: "requires_payment_method" | "requires_confirmation" | "requires_action" | "processing" | "requires_capture" | "canceled" | "succeeded";
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

/** Creates the PaymentIntent our custom /checkout page mounts Stripe Elements against. */
export async function createPaymentIntent(opts: {
  amountUsdCents: number;
  customerEmail?: string | null;
  purchaseId: string;
  userId: string;
  bookId: string;
  description: string;
}): Promise<StripePaymentIntent> {
  return stripeRequest<StripePaymentIntent>("POST", "/payment_intents", {
    amount: opts.amountUsdCents,
    currency: "usd",
    description: opts.description,
    "automatic_payment_methods[enabled]": true,
    ...(opts.customerEmail ? { receipt_email: opts.customerEmail } : {}),
    metadata: {
      purchase_id: opts.purchaseId,
      user_id: opts.userId,
      book_id: opts.bookId,
    },
  });
}

/** Updates the charge amount on an unconfirmed PaymentIntent (e.g. after a promo code is applied). */
export async function updatePaymentIntentAmount(paymentIntentId: string, amountUsdCents: number): Promise<StripePaymentIntent> {
  return stripeRequest<StripePaymentIntent>("POST", `/payment_intents/${paymentIntentId}`, {
    amount: amountUsdCents,
  });
}

export async function retrievePaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
  return stripeRequest<StripePaymentIntent>("GET", `/payment_intents/${paymentIntentId}`);
}

export interface StripePromotionCode {
  id: string;
  code: string;
  active: boolean;
  coupon: {
    valid: boolean;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
  };
}

/** Looks up an active promotion code by its customer-facing code (case-sensitive, as Stripe stores it). */
export async function findPromotionCode(code: string): Promise<StripePromotionCode | null> {
  const result = await stripeRequest<{ data: StripePromotionCode[] }>("GET", "/promotion_codes", {
    code,
    active: true,
    limit: 1,
  });
  return result.data[0] ?? null;
}

export interface StripeRefund {
  id: string;
  status: string; // pending | succeeded | failed | canceled | requires_action
  amount: number;
  currency: string;
  payment_intent: string;
}

/** Full refund of a payment intent. Amount defaults to the full charge. */
export async function createRefund(paymentIntentId: string, amountCents?: number): Promise<StripeRefund> {
  return stripeRequest<StripeRefund>("POST", "/refunds", {
    payment_intent: paymentIntentId,
    ...(amountCents != null ? { amount: amountCents } : {}),
  });
}

/**
 * Verifies a Stripe webhook signature (Stripe-Signature header).
 * Format: t=<unix>,v1=<hmac-sha256 hex of "<t>.<payload>">
 */
export function verifyStripeWebhook(payload: string, sigHeader: string | null, toleranceSec = 300): boolean {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret || !sigHeader) return false;

  const parts = new Map<string, string[]>();
  for (const item of sigHeader.split(",")) {
    const [k, v] = item.split("=", 2);
    if (!k || !v) continue;
    const list = parts.get(k.trim()) ?? [];
    list.push(v.trim());
    parts.set(k.trim(), list);
  }
  const timestamp = Number(parts.get("t")?.[0]);
  const signatures = parts.get("v1") ?? [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false;

  const expected = createHmac("sha256", whSecret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}
