import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { deltaBalance } from "@/lib/balance.server";

function detectEnv(): StripeEnv {
  // Use live if live key is configured, otherwise sandbox
  if (process.env.STRIPE_LIVE_API_KEY || process.env.STRIPE_SECRET_KEY) return "live";
  return "sandbox";
}

async function handlePaymentIntent(pi: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const meta = pi?.metadata ?? {};
  const userId = meta.userId as string | undefined;
  const piId = pi?.id as string | undefined;
  const kind = (meta.kind as string | undefined) ?? "wallet_deposit";

  if (!userId || !piId) {
    console.error("webhook: missing userId or paymentIntentId", { userId, piId });
    return;
  }

  // tool_purchase is fulfilled client-side by confirmToolCardPurchase.
  // Skipping here prevents incorrectly crediting the wallet if the webhook fires first.
  if (kind === "tool_purchase") return;

  // Idempotency — skip if already processed (prefix match catches all description formats)
  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .like("description", `stripe:${piId}%`)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const usdAmount = Number(meta.usdAmount ?? 0);
  if (!usdAmount) return;

  if (kind === "order_payment") {
    const serviceId = meta.serviceId as string;
    const link = meta.link as string;
    const quantity = Number(meta.quantity);

    if (!serviceId || !link || !quantity) {
      console.error("webhook order_payment: missing fields", meta);
      return;
    }

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, provider_service_id, name")
      .eq("id", serviceId)
      .maybeSingle();

    if (!service) return;

    let providerOrderId: string | null = null;
    try {
      const { placeOrder: providerPlace } = await import("@/lib/famousprovider.server");
      const res = await providerPlace({ service: service.provider_service_id, link, quantity });
      providerOrderId = String(res.order);
    } catch (e) {
      console.error("webhook: provider order failed, crediting wallet", e);
    }

    if (providerOrderId) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .insert({ user_id: userId, service_id: serviceId, link, quantity, charge: usdAmount, status: "processing", provider_order_id: providerOrderId })
        .select("id").single();
      await supabaseAdmin.from("transactions").insert({
        user_id: userId, amount: -usdAmount, type: "order",
        description: `stripe:${piId} — ${service.name}`,
        reference_id: order?.id ?? null,
      });
    } else {
      // Provider failed — atomically refund to wallet
      await deltaBalance(userId, usdAmount);
      await supabaseAdmin.from("transactions").insert({
        user_id: userId, amount: usdAmount, type: "deposit",
        description: `stripe:${piId} — order failed, credited to wallet`,
      });
    }
    return;
  }

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
        // Accept env from query param or auto-detect
        const rawEnv = new URL(request.url).searchParams.get("env");
        const env: StripeEnv = (rawEnv === "sandbox" || rawEnv === "live") ? rawEnv : detectEnv();

        try {
          const event = await verifyWebhook(request, env);

          if (event.type === "payment_intent.succeeded") {
            await handlePaymentIntent(event.data.object);
          } else if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
          ) {
            // Legacy support for checkout sessions
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
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
