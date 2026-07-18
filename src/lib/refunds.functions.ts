import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";
import { booksTable, bookPurchasesTable } from "@/lib/book-purchases.server";

/**
 * Refunds always pass through admin approval — a customer can *request* a
 * refund, but no money is returned until an admin approves it, at which point
 * the Stripe refund is issued against the original payment intent.
 */

async function assertAdmin(ctx: { email?: string; userId?: string }) {
  if (!(await isAdminUser(ctx))) throw new Error("Admins only");
}

function isMissingColumn(msg?: string | null): boolean {
  return !!msg && (msg.includes("does not exist") || msg.includes("schema cache"));
}

// ---------- Customer: request a refund ----------

export const requestBookRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { purchaseId: string; reason: string }) =>
    z.object({
      purchaseId: z.string().uuid(),
      reason: z.string().trim().min(5, "Please tell us why you'd like a refund.").max(1000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const purchases = await bookPurchasesTable();
    const { data: row, error } = await purchases
      .select("id, user_id, book_id, amount_usd, status, refund_status")
      .eq("id", data.purchaseId)
      .maybeSingle();
    if (error) {
      if (isMissingColumn(error.message)) throw new Error("Refunds aren't available yet — please contact support.");
      throw new Error(error.message);
    }
    const p = row as { id: string; user_id: string; book_id: string; amount_usd: number; status: string; refund_status: string | null } | null;
    if (!p || p.user_id !== context.userId) throw new Error("Purchase not found.");
    if (p.status !== "paid") throw new Error("Only paid purchases can be refunded.");
    if (p.refund_status && p.refund_status !== "none") {
      throw new Error(
        p.refund_status === "refunded"
          ? "This purchase has already been refunded."
          : p.refund_status === "requested"
            ? "You've already requested a refund for this purchase — it's under review."
            : "A refund decision has already been made for this purchase.",
      );
    }

    const { error: updErr } = await purchases
      .update({ refund_status: "requested", refund_reason: data.reason, refund_requested_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("user_id", context.userId);
    if (updErr) {
      if (isMissingColumn(updErr.message)) throw new Error("Refunds aren't available yet — please contact support.");
      throw new Error(updErr.message);
    }

    // Notify admin + acknowledge the customer — both best-effort.
    void (async () => {
      try {
        const books = await booksTable();
        const { data: book } = await books.select("title").eq("id", p.book_id).maybeSingle();
        const title = (book as { title?: string } | null)?.title ?? "a book";
        const { notifyTelegram } = await import("@/lib/telegram.server");
        await notifyTelegram(
          `↩️ Refund requested: "${title}" — $${Number(p.amount_usd).toFixed(2)}\nReason: ${data.reason}\nApprove or reject it in Admin → Refunds.`,
        ).catch(() => {});
        const email = (context as { email?: string }).email;
        if (email) {
          const { sendRefundRequestedEmail } = await import("@/lib/email.server");
          await sendRefundRequestedEmail(email, "", title, Number(p.amount_usd)).catch(console.error);
        }
      } catch { /* best-effort */ }
    })();

    return { ok: true };
  });

// ---------- Admin: review & resolve ----------

export type AdminRefund = {
  id: string;
  book_title: string;
  amount_usd: number;
  refund_status: string;
  refund_reason: string | null;
  refund_requested_at: string | null;
  created_at: string;
  customer_email: string;
  customer_name: string | null;
};

export const adminListRefunds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const purchases = await bookPurchasesTable();
    const { data, error } = await purchases
      .select("id, user_id, book_id, amount_usd, refund_status, refund_reason, refund_requested_at, created_at")
      .neq("refund_status", "none")
      .order("refund_requested_at", { ascending: false })
      .limit(200);
    if (error) {
      if (isMissingColumn(error.message)) return { ready: false, refunds: [] as AdminRefund[] };
      throw new Error(error.message);
    }
    const rows = (data ?? []) as Array<{ id: string; user_id: string; book_id: string; amount_usd: number; refund_status: string; refund_reason: string | null; refund_requested_at: string | null; created_at: string }>;
    if (rows.length === 0) return { ready: true, refunds: [] as AdminRefund[] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bookIds = Array.from(new Set(rows.map((r) => r.book_id)));
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const books = await booksTable();
    const [{ data: bookRows }, { data: profiles }, { data: authUsers }] = await Promise.all([
      books.select("id, title").in("id", bookIds),
      supabaseAdmin.from("profiles").select("id, full_name, username").in("id", userIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const titleById = new Map((bookRows ?? []).map((b: { id: string; title: string }) => [b.id, b.title]));
    const nameById = new Map((profiles ?? []).map((p) => [p.id, (p.full_name || p.username || null) as string | null]));
    const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return {
      ready: true,
      refunds: rows.map((r) => ({
        id: r.id,
        book_title: titleById.get(r.book_id) ?? "Removed book",
        amount_usd: Number(r.amount_usd),
        refund_status: r.refund_status,
        refund_reason: r.refund_reason,
        refund_requested_at: r.refund_requested_at,
        created_at: r.created_at,
        customer_email: emailById.get(r.user_id) ?? "",
        customer_name: nameById.get(r.user_id) ?? null,
      })) as AdminRefund[],
    };
  });

/** Best-effort customer notification after an admin resolves a refund. */
async function notifyCustomerRefund(userId: string, kind: "approved" | "rejected", bookTitle: string, amountUsd: number, note?: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    const name = (authUser?.user?.user_metadata as { name?: string } | null)?.name ?? "";
    if (!email) return;
    const emails = await import("@/lib/email.server");
    if (kind === "approved") await emails.sendRefundApprovedEmail(email, name, bookTitle, amountUsd).catch(console.error);
    else await emails.sendRefundRejectedEmail(email, name, bookTitle, note).catch(console.error);
  } catch { /* best-effort */ }
}

export const adminResolveRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { purchaseId: string; action: "approve" | "reject"; note?: string | null }) =>
    z.object({
      purchaseId: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      note: z.string().max(1000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const purchases = await bookPurchasesTable();
    const { data: row, error } = await purchases
      .select("id, user_id, book_id, amount_usd, status, refund_status, stripe_payment_intent")
      .eq("id", data.purchaseId)
      .maybeSingle();
    if (error) {
      if (isMissingColumn(error.message)) throw new Error("Run the database update (Admin → Check Database) to enable refunds.");
      throw new Error(error.message);
    }
    const p = row as { id: string; user_id: string; book_id: string; amount_usd: number; status: string; refund_status: string | null; stripe_payment_intent: string | null } | null;
    if (!p) throw new Error("Purchase not found.");
    if (p.refund_status !== "requested") throw new Error("This refund has already been resolved.");

    const books = await booksTable();
    const { data: book } = await books.select("title").eq("id", p.book_id).maybeSingle();
    const bookTitle = (book as { title?: string } | null)?.title ?? "your book";

    if (data.action === "reject") {
      const { error: updErr } = await purchases
        .update({ refund_status: "rejected", refund_processed_at: new Date().toISOString() })
        .eq("id", p.id);
      if (updErr) throw new Error(updErr.message);
      void notifyCustomerRefund(p.user_id, "rejected", bookTitle, Number(p.amount_usd), data.note ?? undefined);
      return { ok: true, action: "rejected" as const };
    }

    // Approve → issue the Stripe refund first; only mark refunded if it works.
    if (!p.stripe_payment_intent) {
      throw new Error("No Stripe payment reference on this order — refund it manually in the Stripe dashboard.");
    }
    const { createRefund } = await import("@/lib/stripe.server");
    let refundId: string;
    try {
      const refund = await createRefund(p.stripe_payment_intent);
      refundId = refund.id;
    } catch (e) {
      throw new Error(`Stripe refund failed: ${(e as Error).message}`);
    }

    const { error: updErr } = await purchases
      .update({ refund_status: "refunded", stripe_refund_id: refundId, refund_processed_at: new Date().toISOString() })
      .eq("id", p.id);
    if (updErr) throw new Error(updErr.message);

    void notifyCustomerRefund(p.user_id, "approved", bookTitle, Number(p.amount_usd));
    return { ok: true, action: "refunded" as const };
  });
