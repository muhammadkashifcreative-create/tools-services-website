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
    const { data: toolData, error } = await supabaseAdmin
      .from("tool_orders")
      .select("id, product_name, qty, unit_price, total_price, codes, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const allUserIds = Array.from(new Set((toolData ?? []).map((r) => r.user_id)));
    const [{ data: profiles }, { data: authUsers }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, username, full_name").in("id", allUserIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return (toolData ?? []).map((r) => ({
      id: r.id,
      type: "tool" as const,
      user_id: r.user_id,
      name: r.product_name,
      platform: "Tools Store",
      quantity: r.qty,
      unit_price: Number(r.unit_price),
      charge: Number(r.total_price),
      codes: (r.codes as string[] | null) ?? [],
      status: r.status,
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
    const [users, toolCount, toolFull, markupSetting] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("tool_orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("tool_orders").select("total_price"),
      supabaseAdmin.from("app_settings").select("value").eq("key", "markup_percent").maybeSingle(),
    ]);

    // Tool provider cost = what we paid upstream = total_price / (1 + markup%)
    const markupPct = Number((markupSetting.data?.value as number | null) ?? 25);
    const markupFactor = 1 + markupPct / 100;
    const totalEarned = (toolFull.data ?? []).reduce((s, r) => s + Number(r.total_price ?? 0), 0);
    const totalCost = totalEarned / markupFactor;

    return {
      users: users.count ?? 0,
      orders: toolCount.count ?? 0,
      revenue: +totalEarned.toFixed(2),
      spent: +totalCost.toFixed(2),
      profit: +(totalEarned - totalCost).toFixed(2),
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

    const { data: toolAgg } = await supabaseAdmin
      .from("tool_orders")
      .select("user_id, total_price")
      .in("user_id", ids);
    const agg = new Map<string, { count: number; spent: number }>();
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
    const { data: toolRows, error } = await supabaseAdmin
      .from("tool_orders")
      .select("id, product_name, qty, unit_price, total_price, codes, status, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    return (toolRows ?? []).map((o) => ({
      id: o.id,
      type: "tool" as const,
      name: o.product_name,
      platform: "Tools Store",
      link: null as string | null,
      quantity: o.qty,
      unit_price: Number(o.unit_price),
      charge: Number(o.total_price),
      codes: (o.codes as string[] | null) ?? [],
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
