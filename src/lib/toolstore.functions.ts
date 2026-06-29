import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";

const CONN_KEY = "tool_store_connection";

// ggsoma Partner API base URL
const DEFAULT_TOOL_STORE_URL = "https://ggsoma.store/api/partner/v1";

type Conn = { api_url: string; api_key: string };

async function loadConn(): Promise<Conn | null> {
  // Env var takes priority — always works even when DB isn't set up
  const envKey = process.env.TOOLS_STORE_API_KEY;
  if (envKey) return { api_url: DEFAULT_TOOL_STORE_URL, api_key: envKey };
  // Fall back to DB
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", CONN_KEY).maybeSingle();
    const v = (data?.value ?? null) as Conn | null;
    if (v?.api_url && v?.api_key) return v;
  } catch { /* DB not ready */ }
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
    // ggsoma error shape: { ok: false, error: { code, message } }
    const errObj = (json as { ok?: boolean; error?: { message?: string; code?: string } | string })?.error;
    const msg = typeof errObj === "object" ? (errObj?.message ?? errObj?.code) : errObj;
    throw new Error(String(msg || `Upstream ${res.status}`));
  }
  return json as T;
}

function assertAdmin(ctx: { email?: string }) {
  if ((ctx as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Admins only");
}

// ---------- Admin: save connection (direct API URL + key) ----------
export const saveToolStoreConnectionDirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { api_url: string; api_key: string }) =>
    z.object({ api_url: z.string().url().min(5), api_key: z.string().min(4) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context);
    const conn: Conn = { api_url: data.api_url.replace(/\/$/, ""), api_key: data.api_key };
    // Verify connection by calling /balance
    await callStore<{ ok?: boolean; balance?: string }>(conn, "/balance");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({ key: CONN_KEY, value: conn });
    if (error) throw new Error(`DB save failed: ${error.message}. Set TOOLS_STORE_API_KEY as a Vercel env var instead.`);
    return { ok: true, api_url: conn.api_url };
  });

// Keep legacy connection code support
export const saveToolStoreConnection = saveToolStoreConnectionDirect;

// ---------- Status ----------
export const getToolStoreStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await loadConn();
    const isAdminUser = (context as { email?: string }).email === ADMIN_EMAIL;
    let balance: number | null = null;
    if (conn && isAdminUser) {
      try {
        const r = await callStore<{ balance?: string | number }>(conn, "/balance");
        balance = r.balance != null ? Number(r.balance) : null;
      } catch { balance = null; }
    }
    return {
      connected: Boolean(conn),
      isAdmin: isAdminUser,
      apiUrl: isAdminUser && conn ? conn.api_url : null,
      adminBalance: balance,
    };
  });

// ---------- ToolProduct type (mapped from ggsoma catalog) ----------
export type ToolProduct = {
  id: string;
  slug: string;
  name_en: string;
  desc_en?: string;
  your_price: number;
  stock: number;
  delivery_type: "LINK" | "COUPON" | "READY_ACCOUNT";
  in_stock: boolean;
  duration_days?: number;
  emoji?: string;        // Unicode emoji from provider/product
  provider_name?: string;
};

type GgsomaProduct = {
  id: number;
  slug: string;
  productCode?: string;
  name: string;
  yourPrice: string;
  stock: { inStock: boolean; count: number; maxQuantity: number };
  deliveryType: "LINK" | "COUPON" | "READY_ACCOUNT";
  durationDays?: number;
  flags?: { sensitiveDelivery?: boolean };
  emoji?: { normal?: string; display?: string };
  provider?: { name?: string; emoji?: { normal?: string } };
};

async function loadMarkupPercent(): Promise<number> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "markup_percent").maybeSingle();
    const v = Number((data?.value as number | string | null) ?? 0);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

function mapProducts(raw: GgsomaProduct[], markupPct: number): ToolProduct[] {
  const factor = 1 + markupPct / 100;
  return raw.map((p) => ({
    id: String(p.id),
    slug: p.slug,
    name_en: p.name,
    your_price: +((Number(p.yourPrice) * factor) || 0).toFixed(4),
    stock: p.stock?.count ?? 0,
    in_stock: p.stock?.inStock ?? false,
    emoji: p.emoji?.normal ?? p.provider?.emoji?.normal ?? undefined,
    provider_name: p.provider?.name ?? undefined,
    delivery_type: p.deliveryType,
    duration_days: p.durationDays,
  }));
}

async function fetchProducts(conn: Conn): Promise<{ data?: GgsomaProduct[] }> {
  return callStore<{ data?: GgsomaProduct[] }>(conn, "/catalog/products");
}

// ---------- List products (signed-in users) ----------
export const listToolProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const conn = await loadConn();
    if (!conn) return { connected: false, products: [] as ToolProduct[] };
    const [r, markup] = await Promise.all([fetchProducts(conn), loadMarkupPercent()]);
    return { connected: true, products: mapProducts(r.data ?? [], markup) };
  });

// ---------- Public catalog (no auth needed) ----------
export const listToolProductsPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    const conn = await loadConn();
    if (!conn) return { connected: false, products: [] as ToolProduct[], error: "Tools store not connected" };
    const [r, markup] = await Promise.all([fetchProducts(conn), loadMarkupPercent()]);
    const products = mapProducts(r.data ?? [], markup);
    return { connected: true, products };
  });

export const getToolStoreStatusPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    const conn = await loadConn();
    return { connected: Boolean(conn) };
  });

// ---------- Single product detail (public) ----------
export const getToolProductDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => z.object({ productId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const conn = await loadConn();
    if (!conn) return null;
    const markup = await loadMarkupPercent();
    // Try single product endpoint first, fall back to catalog filter
    try {
      const r = await callStore<{ data?: GgsomaProduct }>(conn, `/catalog/products/${data.productId}`);
      if (r.data) {
        const factor = 1 + markup / 100;
        const p = r.data;
        return {
          id: String(p.id),
          slug: p.slug,
          name_en: p.name,
          desc_en: undefined as string | undefined,
          your_price: +((Number(p.yourPrice) * factor) || 0).toFixed(4),
          stock: p.stock?.count ?? 0,
          max_qty: p.stock?.maxQuantity ?? 0,
          in_stock: p.stock?.inStock ?? false,
          emoji: p.emoji?.normal ?? p.provider?.emoji?.normal,
          provider_name: p.provider?.name,
          delivery_type: p.deliveryType,
          duration_days: p.durationDays,
          sensitive: p.flags?.sensitiveDelivery ?? false,
        };
      }
    } catch { /* fall through to catalog filter */ }
    // Fallback: filter from catalog
    const r = await fetchProducts(conn);
    const products = mapProducts(r.data ?? [], markup);
    const found = products.find((p) => p.id === data.productId);
    return found ? { ...found, max_qty: found.stock, sensitive: false } : null;
  });

// ---------- Purchase ----------
type GgsomaOrderResp = {
  ok: boolean;
  orderCode?: string;
  deliveryType?: string;
  delivery?: { link?: string; code?: string; content?: string; instructions?: string };
  lines?: Array<{ orderCode: string; link?: string; code?: string; content?: string }>;
  totalCharged?: string;
  balanceAfter?: string;
};

function extractDeliverables(resp: GgsomaOrderResp): string[] {
  if (resp.lines?.length) {
    return resp.lines.map((l) => l.link ?? l.code ?? l.content ?? l.orderCode).filter(Boolean) as string[];
  }
  if (resp.delivery) {
    const d = resp.delivery;
    const val = d.link ?? d.code ?? d.content;
    if (val) return [val];
  }
  return resp.orderCode ? [resp.orderCode] : [];
}

export const purchaseToolProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; qty: number }) =>
    z.object({ productId: z.string().min(1), qty: z.number().int().positive().max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const conn = await loadConn();
    if (!conn) throw new Error("Tool store is not connected yet.");

    // 1) Fetch catalog to get slug + price
    const [r, markup] = await Promise.all([fetchProducts(conn), loadMarkupPercent()]);
    const products = mapProducts(r.data ?? [], markup);
    const product = products.find((p) => p.id === data.productId);
    if (!product) throw new Error("Product not found");
    if (!product.in_stock) throw new Error("Product is out of stock.");
    const total = +(Number(product.your_price) * data.qty).toFixed(4);

    // 2) Check wallet balance
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("balance")
      .eq("id", context.userId)
      .maybeSingle();
    const balance = Number(profile?.balance ?? 0);
    if (balance < total) throw new Error("Insufficient wallet balance. Top up first.");

    // 3) Place order via ggsoma Partner API
    const externalOrderId = `sp-${context.userId.slice(0, 8)}-${Date.now()}`;
    const resp = await callStore<GgsomaOrderResp>(conn, "/orders", {
      method: "POST",
      body: JSON.stringify({ productSlug: product.slug, quantity: data.qty, externalOrderId }),
    });
    if (!resp.ok) throw new Error("Upstream purchase failed");
    const codes = extractDeliverables(resp);

    // 4) Deduct wallet + record
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
