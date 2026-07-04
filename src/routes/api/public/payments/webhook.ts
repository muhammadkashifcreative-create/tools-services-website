import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhookBody } from "@/lib/stripe.server";
import { deltaBalance } from "@/lib/balance.server";

// Auto-detect which Stripe environment signed the webhook by trying each configured
// secret. This prevents attackers from forcing ?env=sandbox against a live deployment.
async function parseWebhook(
  request: Request,
): Promise<{ event: { type: string; data: { object: unknown } }; env: StripeEnv }> {
  const signature = request.headers.get("stripe-signature") ?? "";
  const body = await request.text();

  const liveSecret =
    process.env.PAYMENTS_LIVE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  const sandboxSecret = process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;

  if (liveSecret) {
    try {
      const event = await verifyWebhookBody(body, signature, liveSecret);
      return { event, env: "live" };
    } catch {
      // signature didn't match live secret — try sandbox
    }
  }

  if (sandboxSecret) {
    const event = await verifyWebhookBody(body, signature, sandboxSecret);
    return { event, env: "sandbox" };
  }

  throw new Error("No webhook secret configured or signature verification failed");
}

async function handlePaymentIntent(pi: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const meta = pi?.metadata ?? {};
  const userId = meta.userId as string | undefined;
  const piId = pi?.id as string | undefined;
  const kind = (meta.kind as string | undefined) ?? "wallet_deposit";

  if (!userId || !piId) {
    console.error("webhook: missing userId or paymentIntentId");
    return;
  }

  // tool_purchase is fulfilled client-side by confirmToolCardPurchase.
  // Skipping here prevents incorrectly crediting the wallet if the webhook fires first.
  // Only wallet_deposit intents are credited below.
  if (kind !== "wallet_deposit") return;

  // Idempotency — skip if already processed
  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .like("description", `stripe:${piId}%`)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const usdAmount = Number(meta.usdAmount ?? 0);
  if (!usdAmount) return;

  // wallet_deposit — atomically credit balance
  await deltaBalance(userId, usdAmount);
  await supabaseAdmin.from("transactions").insert({
    user_id: userId, amount: usdAmount, type: "deposit",
    description: `stripe:${piId} Wallet top-up · ${meta.localAmount ?? ""} ${meta.localCurrency ?? "MYR"}`,
  });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { event } = await parseWebhook(request);

          if (event.type === "payment_intent.succeeded") {
            await handlePaymentIntent(event.data.object);
          } else if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
          ) {
            const session = event.data.object as any;
            const piId = session?.payment_intent as string;
            if (piId && session?.metadata) {
              await handlePaymentIntent({ id: piId, metadata: session.metadata });
            }
          } else {
            console.log("Webhook: unhandled event type", event.type);
          }

          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", (e as Error).message);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
