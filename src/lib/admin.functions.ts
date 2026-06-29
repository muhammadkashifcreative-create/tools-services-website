import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";

function assertAdmin(context: { email?: string }) {
  if ((context as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Forbidden");
}

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: smmData, error }, { data: toolData }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, link, quantity, charge, status, provider_order_id, created_at, user_id, services(name, platform)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("tool_orders")
        .select("id, product_name, qty, total_price, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (error) throw new Error(error.message);

    const allUserIds = Array.from(new Set([
      ...(smmData ?? []).map((r) => r.user_id),
      ...(toolData ?? []).map((r) => r.user_id),
    ]));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", allUserIds);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const smm = (smmData ?? []).map((r) => ({
      id: r.id,
      type: "smm" as const,
      user_id: r.user_id,
      name: (r.services as { name?: string } | null)?.name ?? "—",
      platform: (r.services as { platform?: string } | null)?.platform ?? "",
      quantity: r.quantity,
      charge: Number(r.charge),
      status: r.status,
      created_at: r.created_at,
      profile: byId.get(r.user_id) ?? null,
    }));

    const tools = (toolData ?? []).map((r) => ({
      id: r.id,
      type: "tool" as const,
      user_id: r.user_id,
      name: r.product_name,
      platform: "Tools Store",
      quantity: r.qty,
      charge: Number(r.total_price),
      status: r.status,
      created_at: r.created_at,
      profile: byId.get(r.user_id) ?? null,
    }));

    return [...smm, ...tools].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, services, smmCount, toolCount, smmFull, toolFull] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("services").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("tool_orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("charge, quantity, services(provider_rate)"),
      supabaseAdmin.from("tool_orders").select("total_price"),
    ]);
    type SmmRow = { charge: number | string; quantity: number; services: { provider_rate: number | string } | null };
    const smmRows = (smmFull.data ?? []) as unknown as SmmRow[];
    const smmEarned = smmRows.reduce((s, r) => s + Number(r.charge ?? 0), 0);
    const smmCost = smmRows.reduce((s, r) => {
      const rate = Number(r.services?.provider_rate ?? 0);
      return s + (Number(r.quantity) / 1000) * rate;
    }, 0);
    const toolEarned = (toolFull.data ?? []).reduce((s, r) => s + Number(r.total_price ?? 0), 0);
    const totalEarned = smmEarned + toolEarned;
    return {
      users: users.count ?? 0,
      services: services.count ?? 0,
      orders: (smmCount.count ?? 0) + (toolCount.count ?? 0),
      revenue: +totalEarned.toFixed(2),
      spent: +smmCost.toFixed(2),
      profit: +(totalEarned - smmCost).toFixed(2),
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

    const [{ data: orderAgg }, { data: toolAgg }] = await Promise.all([
      supabaseAdmin.from("orders").select("user_id, charge").in("user_id", ids),
      supabaseAdmin.from("tool_orders").select("user_id, total_price").in("user_id", ids),
    ]);
    const agg = new Map<string, { count: number; spent: number }>();
    for (const o of orderAgg ?? []) {
      const cur = agg.get(o.user_id) ?? { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += Number(o.charge ?? 0);
      agg.set(o.user_id, cur);
    }
    for (const o of toolAgg ?? []) {
      const cur = agg.get(o.user_id) ?? { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += Number(o.total_price ?? 0);
      agg.set(o.user_id, cur);
    }
    return (profiles ?? []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? "",
      orders: agg.get(p.id)?.count ?? 0,
      spent: +(agg.get(p.id)?.spent ?? 0).toFixed(2),
    }));
  });

export const adminUserOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: smmRows, error }, { data: toolRows }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, link, quantity, charge, status, created_at, services(name, platform)")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("tool_orders")
        .select("id, product_name, qty, total_price, status, created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (error) throw new Error(error.message);

    const smm = (smmRows ?? []).map((o) => ({
      id: o.id,
      type: "smm" as const,
      name: o.services?.name ?? "—",
      platform: (o.services as { platform?: string } | null)?.platform ?? "",
      link: o.link,
      quantity: o.quantity,
      charge: Number(o.charge),
      status: o.status,
      created_at: o.created_at,
    }));

    const tools = (toolRows ?? []).map((o) => ({
      id: o.id,
      type: "tool" as const,
      name: o.product_name,
      platform: "Tools Store",
      link: null as string | null,
      quantity: o.qty,
      charge: Number(o.total_price),
      status: o.status,
      created_at: o.created_at,
    }));

    return [...smm, ...tools].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
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