import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";
import { booksTable, bookPurchasesTable, bookReviewsTable, withQuantityCol } from "@/lib/book-purchases.server";

async function assertAdmin(context: { email?: string; userId?: string }) {
  if (!(await isAdminUser(context))) throw new Error("Forbidden");
}

type PurchaseRow = {
  id: string;
  user_id: string;
  book_id: string;
  amount_usd: number;
  status: string;
  delivery_status: string;
  created_at: string;
  paid_at: string | null;
  quantity?: number;
  review_requested_at?: string | null;
};

async function bookInfoMap(bookIds: string[]) {
  if (bookIds.length === 0) return new Map<string, { title: string; file_path: string | null }>();
  const books = await booksTable();
  const { data } = await books.select("id, title, file_path").in("id", bookIds);
  return new Map(
    ((data ?? []) as Array<{ id: string; title: string; file_path: string | null }>).map((b) => [
      b.id,
      { title: b.title, file_path: b.file_path },
    ]),
  );
}

/** "bookId:userId" keys for every existing review among the given books — best-effort. */
async function reviewedPairKeys(bookIds: string[]): Promise<Set<string>> {
  const keys = new Set<string>();
  if (bookIds.length === 0) return keys;
  try {
    const reviews = await bookReviewsTable();
    const { data } = await reviews.select("book_id, user_id").in("book_id", bookIds);
    for (const r of (data ?? []) as Array<{ book_id: string; user_id: string }>) {
      keys.add(`${r.book_id}:${r.user_id}`);
    }
  } catch { /* reviews table unavailable — treat as no reviews yet */ }
  return keys;
}

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const purchases = await bookPurchasesTable();
    const BASE_COLS = await withQuantityCol("id, user_id, book_id, amount_usd, status, delivery_status, created_at, paid_at");
    const runSelect = (cols: string) => purchases.select(cols).order("created_at", { ascending: false }).limit(200);

    // review_requested_at is a newer column — degrade gracefully pre-migration.
    let rows: PurchaseRow[] = [];
    const withReview = await runSelect(`${BASE_COLS}, review_requested_at`);
    if (withReview.error) {
      if (!withReview.error.message.includes("does not exist") && !withReview.error.message.includes("schema cache")) {
        throw new Error(withReview.error.message);
      }
      const base = await runSelect(BASE_COLS);
      if (base.error) {
        if (base.error.message.includes("does not exist") || base.error.message.includes("schema cache")) return [];
        throw new Error(base.error.message);
      }
      rows = (base.data ?? []) as unknown as PurchaseRow[];
    } else {
      rows = (withReview.data ?? []) as unknown as PurchaseRow[];
    }

    const allUserIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const bookIds = Array.from(new Set(rows.map((r) => r.book_id)));
    const [{ data: profiles }, { data: authUsers }, bookInfo, reviewedKeys] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, username, full_name").in("id", allUserIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      bookInfoMap(bookIds),
      reviewedPairKeys(bookIds),
    ]);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      book_id: r.book_id,
      name: bookInfo.get(r.book_id)?.title ?? "Removed book",
      book_has_file: Boolean(bookInfo.get(r.book_id)?.file_path),
      charge: Number(r.amount_usd),
      quantity: Number(r.quantity ?? 1) || 1,
      status: r.status,
      delivery_status: r.delivery_status,
      created_at: r.created_at,
      review_requested_at: r.review_requested_at ?? null,
      has_review: reviewedKeys.has(`${r.book_id}:${r.user_id}`),
      profile: byId.get(r.user_id) ?? null,
      email: emailById.get(r.user_id) ?? "",
    }));
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const purchases = await bookPurchasesTable();
    const books = await booksTable();

    const [users, paidRows, bookCount] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      purchases.select(await withQuantityCol("amount_usd")).eq("status", "paid"),
      books.select("id", { count: "exact", head: true }),
    ]);

    const paid = (paidRows.data ?? []) as unknown as Array<{ amount_usd: number; quantity?: number }>;
    const revenue = paid.reduce((s, r) => s + Number(r.amount_usd ?? 0), 0);

    return {
      users: users.count ?? 0,
      // Copies sold, not orders — one order can be for several copies.
      sales: paid.reduce((n, r) => n + (Number(r.quantity ?? 1) || 1), 0),
      books: bookCount.count ?? 0,
      revenue: +revenue.toFixed(2),
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, balance, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p) => p.id);

    // Fetch emails from auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    const purchases = await bookPurchasesTable();
    const { data: agg } = ids.length
      ? await purchases.select("user_id, amount_usd").eq("status", "paid").in("user_id", ids)
      : { data: [] };
    const byUser = new Map<string, { count: number; spent: number }>();
    for (const o of (agg ?? []) as Array<{ user_id: string; amount_usd: number }>) {
      const cur = byUser.get(o.user_id) ?? { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += Number(o.amount_usd ?? 0);
      byUser.set(o.user_id, cur);
    }
    return (profiles ?? []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? "",
      orders: byUser.get(p.id)?.count ?? 0,
      spent: +(byUser.get(p.id)?.spent ?? 0).toFixed(2),
    }));
  });

export const adminUserOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const purchases = await bookPurchasesTable();
    const { data: rows, error } = await purchases
      .select("id, book_id, amount_usd, status, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) return [];
      throw new Error(error.message);
    }
    const typed = (rows ?? []) as PurchaseRow[];
    const bookInfo = await bookInfoMap(Array.from(new Set(typed.map((r) => r.book_id))));

    return typed.map((o) => ({
      id: o.id,
      name: bookInfo.get(o.book_id)?.title ?? "Removed book",
      charge: Number(o.amount_usd),
      status: o.status,
      created_at: o.created_at,
    }));
  });

export const getTelegramStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { isTelegramConfigured } = await import("@/lib/telegram.server");
    return { configured: isTelegramConfigured() };
  });

/** Sends a real Telegram message right now so the admin can confirm the bot/chat setup actually works. */
export const sendTestTelegramNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { notifyTelegram, isTelegramConfigured } = await import("@/lib/telegram.server");
    if (!isTelegramConfigured()) {
      throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel first.");
    }
    try {
      await notifyTelegram(`✅ <b>Test notification</b>\nSent from Admin → Overview at ${new Date().toUTCString()}. If you see this, Telegram alerts are working.`);
    } catch (e) {
      throw new Error((e as Error).message);
    }
    return { ok: true };
  });

// Bootstrap: lets the first signed-in user claim admin if no admin exists yet.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Admin already exists. Ask an existing admin to grant access.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
