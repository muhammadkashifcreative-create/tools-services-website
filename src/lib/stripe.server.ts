import Stripe from "stripe";

export type StripeEnv = "sandbox" | "live";

// Shared currency helpers — single source of truth used by payments and toolstore.
const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf",
]);
const THREE_DECIMAL = new Set(["bhd","jod","kwd","omr","tnd"]);

export function toMinorUnit(amount: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL.has(c)) return Math.round(amount);
  if (THREE_DECIMAL.has(c)) return Math.round(amount * 1000);
  return Math.round(amount * 100);
}

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured in Vercel environment variables`);
  return value;
}

export function createStripeClient(env: StripeEnv): Stripe {
  const key = env === "sandbox"
    ? (process.env.STRIPE_SANDBOX_API_KEY ?? getEnv("STRIPE_SECRET_KEY"))
    : (process.env.STRIPE_LIVE_API_KEY ?? getEnv("STRIPE_SECRET_KEY"));

  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string; raw?: { message?: string } };
    return e.raw?.message ?? e.message ?? "Payment failed";
  }
  return "Payment failed";
}

export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ type: string; data: { object: unknown } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = env === "sandbox"
    ? (process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET ?? getEnv("STRIPE_WEBHOOK_SECRET"))
    : (process.env.PAYMENTS_LIVE_WEBHOOK_SECRET ?? getEnv("STRIPE_WEBHOOK_SECRET"));

  if (!signature || !body) throw new Error("Missing Stripe signature");

  let timestamp: string | undefined;
  const v1: string[] = [];
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = v;
    if (k === "v1") v1.push(v);
  }
  if (!timestamp || !v1.length) throw new Error("Invalid Stripe signature format");

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300)
    throw new Error("Stripe webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Buffer.from(new Uint8Array(sig)).toString("hex");
  if (!v1.includes(expected)) throw new Error("Invalid Stripe webhook signature");

  return JSON.parse(body);
}
