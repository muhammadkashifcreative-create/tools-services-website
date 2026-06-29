import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth } from "@/lib/direct-auth-middleware.server";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "./stripe.server";

const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf",
]);
const THREE_DECIMAL = new Set(["bhd","jod","kwd","omr","tnd"]);

function toMinorUnit(amount: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL.has(c)) return Math.round(amount);
  if (THREE_DECIMAL.has(c)) return Math.round(amount * 1000);
  return Math.round(amount * 100);
}

type CheckoutResult = { clientSecret: string } | { error: string };

export const createDepositCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        usdAmount: z.number().positive().min(1).max(2000),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { getUserCurrency } = await import("./geo.functions");
      const ccy = await getUserCurrency();
      const localAmount = +(data.usdAmount * ccy.rate).toFixed(2);
      const minor = toMinorUnit(localAmount, ccy.currency);
      if (minor < 50) {
        return { error: "Deposit amount too small for selected currency." };
      }

      const stripe = createStripeClient(data.environment as StripeEnv);

      const pi = await stripe.paymentIntents.create({
        amount: minor,
        currency: ccy.currency.toLowerCase(),
        payment_method_types: ["card"],
        description: "Social Padu wallet top-up",
        metadata: {
          userId: context.userId,
          usdAmount: data.usdAmount.toFixed(4),
          localCurrency: ccy.currency,
          localAmount: localAmount.toFixed(2),
          kind: "wallet_deposit",
        },
      });

      return { clientSecret: pi.client_secret ?? "" };
    } catch (error) {
      console.error("createDepositCheckout error", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

// Called immediately after stripe.confirmCardPayment succeeds on the client.
// Verifies the PaymentIntent server-side and credits the wallet — no webhook needed.
export const confirmDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentIntentId: string; environment: string }) =>
    z.object({ paymentIntentId: z.string().min(1), environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const stripe = createStripeClient(data.environment as StripeEnv);
    const pi = await stripe.paymentIntents.retrieve(data.paymentIntentId);

    if (pi.metadata?.userId !== context.userId) throw new Error("Payment intent does not belong to this user");
    if (pi.status !== "succeeded") throw new Error("Payment has not succeeded yet");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotency — skip if already credited (webhook may have fired first)
    const { data: existing } = await supabaseAdmin
      .from("transactions").select("id").like("description", `stripe:${pi.id}%`).limit(1).maybeSingle();
    if (existing) return { ok: true, alreadyCredited: true };

    const usdAmount = Number(pi.metadata?.usdAmount ?? 0);
    if (!usdAmount) throw new Error("Missing usdAmount in payment metadata");

    const localAmount = pi.metadata?.localAmount ?? "";
    const localCurrency = pi.metadata?.localCurrency ?? "MYR";

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", context.userId).maybeSingle();
    const newBal = +(Number(profile?.balance ?? 0) + usdAmount).toFixed(4);

    await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", context.userId);
    await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      amount: usdAmount,
      type: "deposit",
      description: `stripe:${pi.id} Wallet top-up · ${localAmount} ${localCurrency}`,
    });

    // Send payment confirmation email (non-blocking)
    const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const toEmail = authUser?.user?.email;
    if (toEmail) {
      import("@/lib/email.server").then(({ sendPaymentConfirmationEmail }) => {
        sendPaymentConfirmationEmail(
          toEmail,
          prof?.full_name ?? "",
          usdAmount,
          pi.metadata?.localAmount ?? usdAmount.toFixed(2),
          pi.metadata?.localCurrency ?? "USD",
          newBal,
        ).catch(console.error);
      });
    }

    return { ok: true, newBalance: newBal };
  });

export const createOrderCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        serviceId: z.string().uuid(),
        link: z.string().trim().url().max(500),
        quantity: z.number().int().positive().max(10_000_000),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      // Resolve service + price server-side (do not trust client total)
      const { data: service, error: sErr } = await context.supabase
        .from("services")
        .select("id, provider_service_id, name, rate, min_quantity, max_quantity")
        .eq("id", data.serviceId)
        .maybeSingle();
      if (sErr) throw new Error(sErr.message);
      if (!service) return { error: "Service not found" };
      if (data.quantity < service.min_quantity || data.quantity > service.max_quantity) {
        return { error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}` };
      }

      const usdAmount = +(Number(service.rate) * data.quantity / 1000).toFixed(2);
      if (usdAmount < 0.5) return { error: "Order total too small to charge by card." };

      const { getUserCurrency } = await import("./geo.functions");
      const ccy = await getUserCurrency();
      const localAmount = +(usdAmount * ccy.rate).toFixed(2);
      const minor = toMinorUnit(localAmount, ccy.currency);
      if (minor < 50) return { error: "Order total too small for selected currency." };

      const stripe = createStripeClient(data.environment as StripeEnv);

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: ccy.currency.toLowerCase(),
              product_data: {
                name: service.name,
                description: `Social Padu — qty ${data.quantity.toLocaleString()}`,
              },
              unit_amount: minor,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded",
        return_url: data.returnUrl,
        payment_method_types: ["card"],
        payment_intent_data: {
          description: `Social Padu — ${service.name} × ${data.quantity}`,
          metadata: {
            userId: context.userId,
            kind: "order_payment",
            serviceId: service.id,
            quantity: String(data.quantity),
            link: data.link,
            usdAmount: usdAmount.toFixed(4),
            localCurrency: ccy.currency,
            localAmount: localAmount.toFixed(2),
          },
        },
        automatic_tax: { enabled: false },
        metadata: {
          userId: context.userId,
          kind: "order_payment",
          serviceId: service.id,
          quantity: String(data.quantity),
          link: data.link,
          usdAmount: usdAmount.toFixed(4),
          localCurrency: ccy.currency,
          localAmount: localAmount.toFixed(2),
        },
      } as any);

      return { clientSecret: session.client_secret ?? "", sessionId: session.id };
    } catch (error) {
      console.error("createOrderCheckout error", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

export const confirmOrderCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      sessionId: z.string().min(1),
      environment: z.enum(["sandbox", "live"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const stripe = createStripeClient(data.environment as StripeEnv);
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);

    if (session.payment_status !== "paid") throw new Error("Payment not completed yet.");

    const meta = session.metadata ?? {};
    if (meta.userId !== context.userId) throw new Error("Session does not belong to this user.");
    if (meta.kind !== "order_payment") throw new Error("Invalid session type.");

    const piId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? "";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotency — already processed by webhook or a previous confirmation
    const { data: existing } = await supabaseAdmin
      .from("transactions")
      .select("id, reference_id")
      .like("description", `stripe:${piId}%`)
      .limit(1)
      .maybeSingle();
    if (existing) return { ok: true, alreadyProcessed: true, orderId: existing.reference_id };

    const serviceId = meta.serviceId as string;
    const link = meta.link as string;
    const quantity = Number(meta.quantity);
    const usdAmount = Number(meta.usdAmount);

    if (!serviceId || !link || !quantity || !usdAmount) throw new Error("Incomplete session metadata.");

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, provider_service_id, name")
      .eq("id", serviceId)
      .maybeSingle();
    if (!service) throw new Error("Service not found.");

    let providerOrderId: string | null = null;
    try {
      const { placeOrder: providerPlace } = await import("@/lib/famousprovider.server");
      const res = await providerPlace({ service: service.provider_service_id, link, quantity });
      providerOrderId = String(res.order);
    } catch (e) {
      console.error("confirmOrderCheckout: provider failed, crediting wallet", e);
    }

    if (providerOrderId) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .insert({ user_id: context.userId, service_id: serviceId, link, quantity, charge: usdAmount, status: "processing", provider_order_id: providerOrderId })
        .select("id")
        .single();
      await supabaseAdmin.from("transactions").insert({
        user_id: context.userId,
        amount: -usdAmount,
        type: "order",
        description: `stripe:${piId} — ${service.name}`,
        reference_id: order?.id ?? null,
      });

      // Send confirmation email (non-blocking)
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const toEmail = authUser?.user?.email;
      if (toEmail && order?.id) {
        const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
        import("@/lib/email.server").then(({ sendOrderConfirmationEmail }) => {
          sendOrderConfirmationEmail(toEmail, prof?.full_name ?? "", order.id, service.name, quantity, usdAmount, link).catch(console.error);
        });
      }

      return { ok: true, orderId: order?.id };
    } else {
      // Provider failed — refund to wallet
      const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", context.userId).maybeSingle();
      const newBal = +(Number(profile?.balance ?? 0) + usdAmount).toFixed(4);
      await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", context.userId);
      await supabaseAdmin.from("transactions").insert({
        user_id: context.userId,
        amount: usdAmount,
        type: "deposit",
        description: `stripe:${piId} — order failed, credited to wallet`,
      });
      throw new Error("Provider could not process the order. Your payment has been credited to your wallet.");
    }
  });