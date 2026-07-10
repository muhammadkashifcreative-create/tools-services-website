import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth } from "@/lib/direct-auth-middleware.server";

export const MIN_TOPUP_USD = 5;
export const MAX_TOPUP_USD = 5000;

/**
 * Starts a crypto top-up: records a pending deposit, creates a Heleket
 * invoice for it, and returns the hosted payment page URL to redirect to.
 */
export const createTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ amount: z.number().min(MIN_TOPUP_USD).max(MAX_TOPUP_USD) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { isHeleketConfigured, createInvoice } = await import("@/lib/heleket.server");
    if (!isHeleketConfigured()) {
      throw new Error("Crypto top-ups are not configured yet. Please contact support.");
    }

    const amountUsd = Math.round(data.amount * 100) / 100;
    // SITE_URL keeps callbacks pointing at production even if a request
    // arrives via a preview deployment URL.
    const origin = process.env.SITE_URL ?? new URL(getRequest().url).origin;

    const { depositsTable } = await import("@/lib/deposits.server");
    const table = await depositsTable();

    const { data: deposit, error } = (await table
      .insert({ user_id: context.userId, amount_usd: amountUsd })
      .select("id")
      .single()) as { data: { id: string } | null; error: { message: string } | null };
    if (error || !deposit) {
      throw new Error(`Could not start top-up: ${error?.message ?? "deposit not created"}`);
    }

    try {
      const invoice = await createInvoice({ amountUsd, orderId: deposit.id, origin });
      await table
        .update({ provider_uuid: invoice.uuid, payment_url: invoice.url ?? null })
        .eq("id", deposit.id);
      return { url: invoice.url as string };
    } catch (e) {
      // Invoice creation failed — close the orphaned row so it never reconciles.
      await table.update({ status: "failed" }).eq("id", deposit.id).eq("status", "pending");
      console.error("Heleket invoice creation failed:", e);
      throw new Error("Payment provider is unavailable right now. Please try again in a minute.");
    }
  });

/**
 * Settles any of the user's recent pending deposits by querying Heleket
 * directly. Safety net for missed webhooks; also what makes the wallet page
 * update moments after the user returns from the payment page.
 */
export const reconcileMyDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isHeleketConfigured, getPaymentInfo } = await import("@/lib/heleket.server");
    const { depositsTable, settleDeposit } = await import("@/lib/deposits.server");
    if (!isHeleketConfigured()) return { configured: false, credited: 0, pending: [] };

    const table = await depositsTable();
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: rows } = (await table
      .select("id, amount_usd, payment_url, created_at")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10)) as {
      data: { id: string; amount_usd: number; payment_url: string | null; created_at: string }[] | null;
    };

    let credited = 0;
    const stillPending: { id: string; amountUsd: number; paymentUrl: string | null }[] = [];

    for (const row of rows ?? []) {
      try {
        const info = await getPaymentInfo(row.id);
        const outcome = await settleDeposit(info);
        if (outcome === "credited") credited += 1;
        else if (outcome === "still_pending") {
          stillPending.push({ id: row.id, amountUsd: Number(row.amount_usd), paymentUrl: row.payment_url });
        }
      } catch (e) {
        // One bad lookup shouldn't block the rest — it stays pending for next time.
        console.error(`Deposit reconcile failed for ${row.id}:`, e);
        stillPending.push({ id: row.id, amountUsd: Number(row.amount_usd), paymentUrl: row.payment_url });
      }
    }

    return { configured: true, credited, pending: stillPending };
  });
