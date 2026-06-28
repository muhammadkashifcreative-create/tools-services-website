import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONN_KEY = "tool_store_connection";

type Conn = { api_url: string; api_key: string };

function decodeConnCode(code: string): Conn {
  const trimmed = code.trim().replace(/^conn_/, "");
  const buf = Buffer.from(trimmed, "base64");
  const obj = JSON.parse(buf.toString("utf8")) as { k?: string; u?: string };
  if (!obj?.k || !obj?.u) throw new Error("Invalid connection code");
  return { api_key: obj.k, api_url: obj.u.replace(/\/$/, "") };
}

async function loadConn(): Promise<Conn | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", CONN_KEY).maybeSingle();
  const v = (data?.value ?? null) as Conn | null;
  if (v?.api_url && v?.api_key) return v;
  // Fall back to env vars
  const envUrl = process.env.TOOLS_STORE_API_URL;
  const envKey = process.env.TOOLS_STORE_API_KEY;
  if (envUrl && envKey) return { api_url: envUrl.replace(/\/$/, ""), api_key: envKey };
  return null;
}

async function callStore<T>(conn: Conn, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${conn.api_url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.api_key}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown;
  try { json = text ? JSON.parse(text) : {}; } catch { throw new Error(`Upstream non-JSON (${res.status})`); }
  if (!res.ok) {
    const msg = (json as { error?: string })?.error || `Upstream ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

async function assertAdmin(ctx: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

// ---------- Admin: save connection (via connection code) ----------
export const saveToolStoreConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(8) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const conn = decodeConnCode(data.code);
    // Sanity check
    await callStore<{ success?: boolean; balance?: number }>(conn, "/balance");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_settings").upsert({ key: CONN_KEY, value: conn });
    return { ok: true, api_url: conn.api_url };
  });

// ---------- Admin: save connection (direct API URL + key) ----------
export const saveToolStoreConnectionDirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { api_url: string; api_key: string }) =>
    z.object({ api_url: z.string().url().min(5), api_key: z.string().min(4) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const conn: Conn = { api_url: data.api_url.replace(/\/$/, ""), api_key: data.api_key };
    await callStore<{ success?: boolean; balance?: number }>(conn, "/balance");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_settings").upsert({ key: CONN_KEY, value: conn });
    return { ok: true, api_url: conn.api_url };
  });

// ---------- Public-ish: status (admin sees keys, others only know if connected) ----------
export const getToolStoreStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await loadConn();
    const { data: roleData } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const isAdmin = Boolean(roleData);
    let balance: number | null = null;
    if (conn && isAdmin) {
      try {
        const r = await callStore<{ balance?: number }>(conn, "/balance");
        balance = r.balance ?? null;
      } catch { balance = null; }
    }
    return {
      connected: Boolean(conn),
      isAdmin,
      apiUrl: isAdmin && conn ? conn.api_url : null,
      adminBalance: balance,
    };
  });

// ---------- List products (any signed-in user) ----------
export type ToolProduct = {
  id: string;
  name_en: string;
  name_ar?: string;
  name_en_html?: string;
  name_ar_html?: string;
  desc_en?: string;
  desc_ar?: string;
  custom_emoji_id?: string;
  has_premium_emoji?: boolean;
  desc_has_premium_emoji?: boolean;
  all_emoji_ids?: string[];
  your_price: number;
  stock: number;
  is_manual?: boolean;
};

type RawProduct = ToolProduct & { store_price?: number | null; your_price: number | null };

async function loadMarkupPercent(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "markup_percent")
    .maybeSingle();
  const v = Number((data?.value as number | string | null) ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function applyMarkup(products: RawProduct[], markupPct: number): ToolProduct[] {
  const factor = 1 + markupPct / 100;
  return products.map((p) => {
    const yp = p.your_price != null ? Number(p.your_price) : Number(p.store_price ?? 0) * factor;
    return { ...p, your_price: +Number(yp || 0).toFixed(4) };
  });
}

export const listToolProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const conn = await loadConn();
    if (!conn) return { connected: false, products: [] as ToolProduct[] };
    const [r, markup] = await Promise.all([
      callStore<{ success?: boolean; products?: RawProduct[] }>(conn, "/products"),
      loadMarkupPercent(),
    ]);
    return { connected: true, products: applyMarkup(r.products ?? [], markup) };
  });

// ---------- Public catalog (no auth) ----------
export const listToolProductsPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    const conn = await loadConn();
    if (!conn) return { connected: false, products: [] as ToolProduct[] };
    try {
      const [r, markup] = await Promise.all([
        callStore<{ success?: boolean; products?: RawProduct[] }>(conn, "/products"),
        loadMarkupPercent(),
      ]);
      return { connected: true, products: applyMarkup(r.products ?? [], markup) };
    } catch {
      return { connected: true, products: [] as ToolProduct[] };
    }
  });

export const getToolStoreStatusPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    const conn = await loadConn();
    return { connected: Boolean(conn) };
  });

// ---------- Purchase ----------
export const purchaseToolProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; qty: number }) =>
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().positive().max(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const conn = await loadConn();
    if (!conn) throw new Error("Tool store is not connected yet.");

    // 1) Get product price/name from upstream
    const [list, markup] = await Promise.all([
      callStore<{ products?: RawProduct[] }>(conn, "/products"),
      loadMarkupPercent(),
    ]);
    const products = applyMarkup(list.products ?? [], markup);
    const product = products.find((p) => p.id === data.productId);
    if (!product) throw new Error("Product not found");
    const total = +(Number(product.your_price) * data.qty).toFixed(4);

    // 2) Check user wallet
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("balance")
      .eq("id", context.userId)
      .maybeSingle();
    const balance = Number(profile?.balance ?? 0);
    if (balance < total) throw new Error("Insufficient wallet balance. Top up first.");

    // 3) Call upstream purchase
    const buyer = `user:${context.userId}`;
    const resp = await callStore<{ success?: boolean; codes?: string[]; error?: string }>(
      conn,
      "/purchase",
      { method: "POST", body: JSON.stringify({ product_id: data.productId, qty: data.qty, buyer_info: buyer }) },
    );
    if (!resp.success) throw new Error(resp.error || "Upstream purchase failed");
    const codes = resp.codes ?? [];

    // 4) Deduct wallet + record order + transaction
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newBal = +(balance - total).toFixed(4);
    await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", context.userId);
    await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      amount: -total,
      type: "tool_purchase",
      description: `Tool: ${product.name_en} × ${data.qty}`,
    });
    const { data: order } = await supabaseAdmin
      .from("tool_orders")
      .insert({
        user_id: context.userId,
        product_id: data.productId,
        product_name: product.name_en,
        qty: data.qty,
        unit_price: product.your_price,
        total_price: total,
        codes,
        status: "completed",
      })
      .select("id")
      .single();

    return { ok: true, orderId: order?.id, codes, newBalance: newBal };
  });

// ---------- List my tool orders ----------
export const listMyToolOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tool_orders")
      .select("id, product_name, qty, unit_price, total_price, codes, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });