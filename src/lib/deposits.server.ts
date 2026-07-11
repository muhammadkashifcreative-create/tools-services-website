/**
 * Deposit settlement: turns a Heleket payment status into a wallet credit.
 *
 * Called from two places with the same payload shape:
 *   1. /api/heleket/webhook  — pushed by Heleket on every status change
 *   2. reconcileMyDeposits   — pulls /payment/info when the user opens the
 *      wallet, so a missed webhook can never strand a paid deposit
 *
 * Idempotency: the deposit row is claimed with a single conditional UPDATE
 * (status = 'pending' → final status). Whichever caller wins the claim does
 * the crediting; the loser sees zero updated rows and stops. If crediting
 * fails after the claim, the row is reverted to 'pending' so a webhook resend
 * or the next reconcile retries it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { deltaBalance } from "@/lib/balance.server";
import type { HeleketPayment } from "@/lib/heleket.server";

export interface DepositRow {
  id: string;
  user_id: string;
  amount_usd: number;
  credited_usd: number | null;
  status: string;
  provider_uuid: string | null;
  payment_url: string | null;
  payer_currency: string | null;
  created_at: string;
}

// The generated Database types don't include the deposits table (it ships via
// migration), so queries go through an untyped client, mirroring the loosely
// typed rpc pattern in balance.server.ts.
export async function depositsTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as SupabaseClient).from("deposits");
}

export type SettleOutcome = "credited" | "already_settled" | "still_pending" | "failed" | "not_found";

export async function settleDeposit(payment: HeleketPayment): Promise<SettleOutcome> {
  const table = await depositsTable();
  // API responses carry the authoritative state in payment_status; webhooks in status.
  const status = payment.payment_status ?? payment.status ?? "";

  const { data: deposit } = (await table
    .select("id, user_id, amount_usd, credited_usd, status, payer_currency")
    .eq("id", payment.order_id)
    .maybeSingle()) as { data: DepositRow | null };

  if (!deposit) return "not_found";
  if (deposit.status !== "pending") return "already_settled";

  const paidUsd = Number.parseFloat(payment.payment_amount_usd ?? "") || 0;

  let finalStatus: string;
  let creditUsd = 0;
  if (status === "paid") {
    finalStatus = "paid";
    creditUsd = Number(deposit.amount_usd);
  } else if (status === "paid_over") {
    finalStatus = "paid";
    creditUsd = Math.max(Number(deposit.amount_usd), paidUsd);
  } else if (status === "wrong_amount" && payment.is_final) {
    // Customer sent less than the invoice — credit what actually arrived.
    // Only the webhook payload reliably carries USD amounts; if this came from
    // a source without them, leave the row for the webhook to settle.
    if (payment.payment_amount_usd == null) return "still_pending";
    finalStatus = paidUsd > 0 ? "wrong_amount" : "failed";
    creditUsd = paidUsd;
  } else if (["cancel", "fail", "system_fail"].includes(status) && payment.is_final) {
    finalStatus = "failed";
  } else {
    return "still_pending"; // check / process / confirm_check / non-final states
  }

  // Claim the row: only one caller can move it out of 'pending'.
  const { data: claimed } = await table
    .update({
      status: finalStatus,
      credited_usd: creditUsd > 0 ? creditUsd : null,
      provider_uuid: payment.uuid,
      payer_currency: payment.payer_currency,
      txid: payment.txid ?? null,
    })
    .eq("id", deposit.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) return "already_settled";

  if (creditUsd <= 0) return "failed";

  try {
    const newBalance = await deltaBalance(deposit.user_id, creditUsd);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("transactions").insert({
      user_id: deposit.user_id,
      amount: creditUsd,
      type: "deposit",
      description: `Crypto top-up${payment.payer_currency ? ` (${payment.payer_currency})` : ""} #${deposit.id.slice(0, 8).toUpperCase()}`,
    });

    // Notify admin on Telegram (non-blocking, same as signups/orders)
    void (async () => {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(deposit.user_id);
        const email = authUser?.user?.email;
        if (email) {
          const { tgDeposit } = await import("@/lib/telegram.server");
          await tgDeposit(email, creditUsd, newBalance);
        }
      } catch { /* notification is best-effort */ }
    })();

    return "credited";
  } catch (e) {
    // Credit failed after the claim — release the row so a retry can settle it.
    await table.update({ status: "pending", credited_usd: null }).eq("id", deposit.id);
    throw e;
  }
}
