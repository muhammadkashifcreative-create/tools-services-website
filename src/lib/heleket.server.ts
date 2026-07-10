/**
 * Heleket crypto payment gateway client.
 *
 * Auth model (https://doc.heleket.com/general/request-format):
 *   every request carries two headers —
 *     merchant: the merchant UUID
 *     sign:     md5(base64(json_body) + PAYMENT_API_KEY)
 *
 * Webhooks are signed the same way: the `sign` field inside the payload is
 * md5(base64(json_encode(payload_without_sign)) + PAYMENT_API_KEY), where
 * json_encode is PHP-style — forward slashes escaped as \/ .
 */
import { createHash, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.heleket.com/v1";

function credentials(): { merchantId: string; apiKey: string } {
  const merchantId = process.env.HELEKET_MERCHANT_ID;
  const apiKey = process.env.HELEKET_PAYMENT_API_KEY;
  if (!merchantId || !apiKey) {
    const missing = [
      ...(!merchantId ? ["HELEKET_MERCHANT_ID"] : []),
      ...(!apiKey ? ["HELEKET_PAYMENT_API_KEY"] : []),
    ];
    throw new Error(
      `Crypto payments are not configured. Missing environment variable(s): ${missing.join(", ")}.`,
    );
  }
  return { merchantId, apiKey };
}

export function isHeleketConfigured(): boolean {
  return Boolean(process.env.HELEKET_MERCHANT_ID && process.env.HELEKET_PAYMENT_API_KEY);
}

function signBody(jsonBody: string, apiKey: string): string {
  return createHash("md5")
    .update(Buffer.from(jsonBody, "utf8").toString("base64") + apiKey)
    .digest("hex");
}

/** Shape shared by the create-invoice response, payment-info response and webhooks. */
export interface HeleketPayment {
  uuid: string;
  order_id: string;
  amount: string;
  payment_amount: string | null;
  payment_amount_usd?: string | null;
  payer_currency: string | null;
  currency: string;
  url?: string;
  address?: string | null;
  txid?: string | null;
  // create/info responses use payment_status; webhooks use status
  payment_status?: string;
  status?: string;
  is_final: boolean;
}

async function heleketRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const { merchantId, apiKey } = credentials();
  const body = JSON.stringify(payload);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      merchant: merchantId,
      sign: signBody(body, apiKey),
    },
    body,
  });

  const json = (await res.json().catch(() => null)) as
    | { state?: number; result?: T; message?: string; errors?: unknown }
    | null;

  if (!res.ok || !json || json.state !== 0 || !json.result) {
    const detail = json?.message ?? (json?.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`);
    throw new Error(`Heleket ${path} failed: ${detail}`);
  }
  return json.result;
}

/**
 * Creates a hosted-checkout invoice. The returned `url` is the Heleket payment
 * page where the customer picks a coin and pays; status changes arrive on
 * `${origin}/api/heleket/webhook`.
 */
export function createInvoice(opts: { amountUsd: number; orderId: string; origin: string }): Promise<HeleketPayment> {
  return heleketRequest<HeleketPayment>("/payment", {
    amount: opts.amountUsd.toFixed(2),
    currency: "USD",
    order_id: opts.orderId,
    url_callback: `${opts.origin}/api/heleket/webhook`,
    url_success: `${opts.origin}/dashboard/wallet?topup=success`,
    url_return: `${opts.origin}/dashboard/wallet`,
    lifetime: 7200,
  });
}

/** Fetches current invoice state — the webhook-independent source of truth. */
export function getPaymentInfo(orderId: string): Promise<HeleketPayment> {
  return heleketRequest<HeleketPayment>("/payment/info", { order_id: orderId });
}

/**
 * Verifies the `sign` field of a webhook payload.
 * Heleket signs PHP-style JSON, so `/` must be escaped as `\/` before hashing.
 */
export function verifyWebhookSignature(payload: Record<string, unknown>): boolean {
  if (!isHeleketConfigured()) return false;
  const { apiKey } = credentials();

  const { sign, ...rest } = payload as { sign?: unknown };
  if (typeof sign !== "string" || sign.length === 0) return false;

  const phpStyleJson = JSON.stringify(rest).replace(/\//g, "\\/");
  const expected = signBody(phpStyleJson, apiKey);

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sign, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
