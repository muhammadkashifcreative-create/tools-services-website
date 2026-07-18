import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";
import { booksTable, bookPurchasesTable } from "@/lib/book-purchases.server";

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

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const purchases = await bookPurchasesTable();
    const { data, error } = await purchases
      .select("id, user_id, book_id, amount_usd, status, delivery_status, created_at, paid_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) return [];
      throw new Error(error.message);
    }
    const rows = (data ?? []) as PurchaseRow[];

    const allUserIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const [{ data: profiles }, { data: authUsers }, bookInfo] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, username, full_name").in("id", allUserIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      bookInfoMap(Array.from(new Set(rows.map((r) => r.book_id)))),
    ]);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      name: bookInfo.get(r.book_id)?.title ?? "Removed book",
      book_has_file: Boolean(bookInfo.get(r.book_id)?.file_path),
      charge: Number(r.amount_usd),
      status: r.status,
      delivery_status: r.delivery_status,
      created_at: r.created_at,
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
      purchases.select("amount_usd").eq("status", "paid"),
      books.select("id", { count: "exact", head: true }),
    ]);

    const paid = (paidRows.data ?? []) as Array<{ amount_usd: number }>;
    const revenue = paid.reduce((s, r) => s + Number(r.amount_usd ?? 0), 0);

    return {
      users: users.count ?? 0,
      sales: paid.length,
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
