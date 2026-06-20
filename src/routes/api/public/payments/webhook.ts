import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handlePaidSession(session: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const meta = session?.metadata ?? {};
  const userId = meta.userId as string | undefined;
  const sessionId = session?.id as string | undefined;
  const kind = (meta.kind as string | undefined) ?? "wallet_deposit";
  if (!userId || !sessionId) {
    console.error("webhook: missing metadata", { userId, sessionId, kind });
    return;
  }

  // Idempotency: skip if we already recorded this session
  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (existing) return;

  if (kind === "order_payment") {
    const serviceId = meta.serviceId as string;
    const link = meta.link as string;
    const quantity = Number(meta.quantity);
    const usdAmount = Number(meta.usdAmount);
    if (!serviceId || !link || !quantity || !usdAmount) {
      console.error("webhook order_payment: missing fields", meta);
      return;
    }

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, provider_service_id, name")
      .eq("id", serviceId)
      .maybeSingle();
    if (!service) {
      console.error("webhook order_payment: service not found", serviceId);
      return;
    }

    // Submit to upstream provider
    let providerOrderId: string | null = null;
    try {
      const { placeOrder: providerPlace } = await import("@/lib/famousprovider.server");
      const providerRes = await providerPlace({
        service: service.provider_service_id,
        link,
        quantity,
      });
      providerOrderId = String(providerRes.order);
    } catch (e) {
      console.error("webhook order_payment: provider failed; crediting wallet instead", e);
    }

    if (providerOrderId) {
      // Insert order + record transaction with the session id (idempotency anchor)
      const { data: order } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          service_id: serviceId,
          link,
          quantity,
          charge: usdAmount,
          status: "processing",
          provider_order_id: providerOrderId,
        })
        .select("id")
        .single();
      await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        amount: -usdAmount,
        type: "order",
        description: `Card-paid order for ${service.name}`,
        reference_id: order?.id ?? null,
        stripe_session_id: sessionId,
      });
      // Mirror as a positive "card_payment" transaction for the audit trail
      await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        amount: usdAmount,
        type: "deposit",
        description: `Card payment for ${service.name} (${meta.localAmount ?? ""} ${meta.localCurrency ?? ""})`,
        reference_id: order?.id ?? null,
      });
    } else {
      // Provider failed — credit the wallet so the user is not charged for nothing
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .maybeSingle();
      const newBal = +(Number(profile?.balance ?? 0) + usdAmount).toFixed(4);
      await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", userId);
      await supabaseAdmin.from("transactions").insert({
        user_id: userId,
        amount: usdAmount,
        type: "deposit",
        description: `Card payment credited (order failed at provider)`,
        stripe_session_id: sessionId,
      });
    }
    return;
  }

  // Default: wallet_deposit
  const usdAmount = Number(meta.usdAmount);
  if (!usdAmount) return;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();
  const newBal = +(Number(profile?.balance ?? 0) + usdAmount).toFixed(4);
  await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", userId);
  await supabaseAdmin.from("transactions").insert({
    user_id: userId,
    amount: usdAmount,
    type: "deposit",
    description: `Card deposit (${meta.localAmount ?? ""} ${meta.localCurrency ?? ""})`,
    stripe_session_id: sessionId,
  });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded" ||
            event.type === "transaction.completed"
          ) {
            await handlePaidSession(event.data.object);
          } else {
            console.log("Unhandled event:", event.type);
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