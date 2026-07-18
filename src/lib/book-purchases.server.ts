/**
 * Book purchase settlement: turns a Stripe PaymentIntent result into book
 * access.
 *
 * Called from two places with the same PaymentIntent shape:
 *   1. /api/stripe/webhook     — pushed by Stripe on payment_intent.* events
 *   2. reconcileMyPurchases    — pulls the intent when the user lands on the
 *      library page, so a missed webhook can never strand a paid purchase
 *
 * Idempotency: the purchase row is claimed with a single conditional UPDATE
 * (status = 'pending' → final status).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StripePaymentIntent } from "@/lib/stripe.server";

export interface BookPurchaseRow {
  id: string;
  user_id: string;
  book_id: string;
  amount_usd: number;
  status: string;
  stripe_session_id: string | null;
  created_at: string;
  paid_at: string | null;
}

// The generated Database types don't include the books tables (they ship via
// migration), so queries go through an untyped client — same as deposits.
export async function booksTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as SupabaseClient).from("books");
}

export async function bookPurchasesTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as SupabaseClient).from("book_purchases");
}

export async function bookReviewsTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as SupabaseClient).from("book_reviews");
}

export type SettleOutcome = "granted" | "already_settled" | "still_pending" | "failed" | "not_found";

export async function settleBookPurchase(intent: StripePaymentIntent): Promise<SettleOutcome> {
  const purchaseId = intent.metadata?.purchase_id;
  if (!purchaseId) return "not_found";

  const table = await bookPurchasesTable();
  const { data: purchase } = (await table
    .select("id, user_id, book_id, amount_usd, status")
    .eq("id", purchaseId)
    .maybeSingle()) as { data: BookPurchaseRow | null };

  if (!purchase) return "not_found";
  if (purchase.status !== "pending") return "already_settled";

  let finalStatus: string;
  if (intent.status === "succeeded") {
    finalStatus = "paid";
  } else if (intent.status === "canceled") {
    finalStatus = "failed";
  } else {
    return "still_pending"; // still requires payment/action/confirmation
  }

  // Instant delivery only when the book already has its PDF uploaded;
  // otherwise the admin fulfils the purchase from the dashboard.
  let instantDelivery = false;
  let bookTitle = "your book";
  if (finalStatus === "paid") {
    const books = await booksTable();
    const { data: book } = await books.select("title, file_path").eq("id", purchase.book_id).maybeSingle();
    instantDelivery = Boolean((book as { file_path?: string | null } | null)?.file_path);
    bookTitle = (book as { title?: string } | null)?.title ?? bookTitle;
  }

  // Claim the row: only one caller can move it out of 'pending'.
  const { data: claimed } = await table
    .update({
      status: finalStatus,
      stripe_payment_intent: intent.id,
      ...(finalStatus === "paid"
        ? {
            paid_at: new Date().toISOString(),
            delivery_status: instantDelivery ? "delivered" : "pending",
            ...(instantDelivery ? { delivered_at: new Date().toISOString() } : {}),
          }
        : {}),
      // Promo codes can lower the charge — record what was actually paid
      ...(finalStatus === "paid" ? { amount_usd: intent.amount / 100 } : {}),
    })
    .eq("id", purchase.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) return "already_settled";

  if (finalStatus !== "paid") return "failed";

  const paidUsd = intent.amount / 100;

  // Receipt email + admin Telegram notification — both best-effort.
  void (async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(purchase.user_id);
      const email = authUser?.user?.email;
      const name = (authUser?.user?.user_metadata as { name?: string } | null)?.name ?? "";
      if (email) {
        const { sendBookPurchaseEmail } = await import("@/lib/email.server");
        await sendBookPurchaseEmail(email, name, bookTitle, paidUsd, instantDelivery).catch(console.error);
        const { notifyTelegram } = await import("@/lib/telegram.server");
        await notifyTelegram(
          `📚 Book sold: "${bookTitle}" — $${paidUsd.toFixed(2)} to ${email}` +
            (instantDelivery ? "" : "\n⚠️ NEEDS DELIVERY — fulfil it in Admin → Sales"),
        ).catch(() => {});
      }
    } catch { /* notifications are best-effort */ }
  })();

  return "granted";
}
