import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth } from "@/lib/direct-auth-middleware.server";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
  toMinorUnit,
} from "./stripe.server";
import { deltaBalance } from "@/lib/balance.server";

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

    const newBal = await deltaBalance(context.userId, usdAmount);

    await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      amount: usdAmount,
      type: "deposit",
      description: `stripe:${pi.id} Wallet top-up · ${localAmount} ${localCurrency}`,
    });

    // Send payment confirmation email + Telegram (non-blocking)
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
      import("@/lib/telegram.server").then(({ tgDeposit }) => {
        tgDeposit(toEmail, usdAmount, newBal).catch(console.error);
      });
    }

    return { ok: true, newBalance: newBal };
  });
