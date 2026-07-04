import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";
import { toMinorUnit } from "@/lib/stripe.server";
import { deltaBalance } from "@/lib/balance.server";

const CONN_KEY = "tool_store_connection";

// ggsoma Partner API base URL
const DEFAULT_TOOL_STORE_URL = "https://ggsoma.store/api/partner/v1";

// Product ID for "Gemini Pro 18 Months" on the ggsoma catalog.
// Used to restrict the GEMIPRO10 coupon. Update if ggsoma changes their catalog IDs.
const GEMIPRO_PRODUCT_ID = "6";

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

// ---------- Pricing markup (admin-configurable, applied to tool prices) ----------
export const getMarkup = createServerFn({ method: "GET" }).handler(async () => {
  return { markup: await loadMarkupPercent() };
});

export const updateMarkup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ markup: z.number().min(0).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: "markup_percent",
      value: data.markup as unknown as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
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

// ---------- Shared coupon logic ----------
function applyCoupon(
  couponCode: string | undefined,
  productId: string,
  baseTotal: number,
): { discountUsd: number } | { error: string } {
  const code = couponCode?.toUpperCase();
  if (!code) return { discountUsd: 0 };
  if (code === "WELCOME5") return { discountUsd: +(baseTotal * 0.05).toFixed(4) };
  if (code === "GEMIPRO10") {
    if (productId !== GEMIPRO_PRODUCT_ID) {
      return { error: "Coupon GEMIPRO10 is only valid for Gemini Pro 18 Months" };
    }
    // Fixed RM10 off (converted to USD at ~4.7 rate; capped at 90% of total)
    const discountUsd = Math.min(+(10 / 4.7).toFixed(4), +(baseTotal * 0.9).toFixed(4));
    return { discountUsd };
  }
  return { error: "Invalid coupon code" };
}

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
  .inputValidator((d: { productId: string; qty: number; coupon?: string }) =>
    z.object({ productId: z.string().min(1), qty: z.number().int().positive().max(50), coupon: z.string().trim().max(32).optional() }).parse(d),
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

    const baseTotal = +(Number(product.your_price) * data.qty).toFixed(4);

    // Apply coupon discount
    const couponResult = applyCoupon(data.coupon, data.productId, baseTotal);
    if ("error" in couponResult) throw new Error(couponResult.error);
    const total = +(baseTotal - couponResult.discountUsd).toFixed(4);

    // 2) Read balance for idempotency return value (floor enforced by deltaBalance in step 3)
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("balance")
      .eq("id", context.userId)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotency: reject if the same user bought the same product in the last 30 seconds
    const thirtySecsAgo = new Date(Date.now() - 30_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("tool_orders")
      .select("id, codes")
      .eq("user_id", context.userId)
      .eq("product_id", data.productId)
      .eq("qty", data.qty)
      .gte("created_at", thirtySecsAgo)
      .limit(1)
      .maybeSingle();
    if (recent) return { ok: true, orderId: recent.id, codes: recent.codes as string[], newBalance: Number(profile?.balance ?? 0) };

    // 3) Atomically debit wallet first — refund if provider call fails
    let newBal: number;
    try {
      newBal = await deltaBalance(context.userId, -total);
    } catch (err: any) {
      if (err.message?.includes("Insufficient")) throw new Error("Insufficient wallet balance. Top up first.");
      throw err;
    }

    // 4) Place order via ggsoma Partner API
    const externalOrderId = `sp-${context.userId.slice(0, 8)}-${Date.now()}`;
    let resp: GgsomaOrderResp;
    try {
      resp = await callStore<GgsomaOrderResp>(conn, "/orders", {
        method: "POST",
        body: JSON.stringify({ productSlug: product.slug, quantity: data.qty, externalOrderId }),
      });
      if (!resp.ok) throw new Error("Upstream purchase failed");
    } catch {
      await deltaBalance(context.userId, total).catch(console.error);
      throw new Error("Purchase could not be completed. Your balance has been refunded.");
    }
    const codes = extractDeliverables(resp);

    // 5) Record transaction + order
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
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Create card checkout for tool purchase ----------
export const createToolCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; qty: number; coupon?: string; environment: string }) =>
    z.object({ productId: z.string().min(1), qty: z.number().int().positive().max(50), coupon: z.string().optional(), environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const conn = await loadConn();
    if (!conn) throw new Error("Tool store not connected");
    const [r, markup] = await Promise.all([fetchProducts(conn), loadMarkupPercent()]);
    const products = mapProducts(r.data ?? [], markup);
    const product = products.find((p) => p.id === data.productId);
    if (!product) throw new Error("Product not found");
    if (!product.in_stock) throw new Error("Product is out of stock");

    const baseTotal = +(Number(product.your_price) * data.qty).toFixed(4);
    const couponResult = applyCoupon(data.coupon, data.productId, baseTotal);
    if ("error" in couponResult) throw new Error(couponResult.error);
    const usdTotal = +(baseTotal - couponResult.discountUsd).toFixed(4);

    const { getUserCurrency } = await import("./geo.functions");
    const ccy = await getUserCurrency();
    const localAmount = +(usdTotal * ccy.rate).toFixed(2);
    const minor = toMinorUnit(localAmount, ccy.currency);
    if (minor < 50) throw new Error("Amount too small for payment");

    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(data.environment as "sandbox" | "live");
    const pi = await stripe.paymentIntents.create({
      amount: minor,
      currency: ccy.currency.toLowerCase(),
      payment_method_types: ["card"],
      description: `Social Padu — ${product.name_en}`,
      metadata: {
        userId: context.userId,
        kind: "tool_purchase",
        productId: data.productId,
        qty: String(data.qty),
        coupon: data.coupon ?? "",
        usdAmount: usdTotal.toFixed(4),
      },
    });
    return { clientSecret: pi.client_secret ?? "" };
  });

export const confirmToolCardPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentIntentId: string; environment: string }) =>
    z.object({ paymentIntentId: z.string().min(1), environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(data.environment as "sandbox" | "live");
    const pi = await stripe.paymentIntents.retrieve(data.paymentIntentId);
    if (pi.metadata?.userId !== context.userId) throw new Error("Not authorized");
    if (pi.status !== "succeeded") throw new Error("Payment not completed");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotency — already processed
    const { data: existingTx } = await supabaseAdmin.from("transactions").select("id").like("description", `stripe:${pi.id}%`).limit(1).maybeSingle();
    if (existingTx) return { ok: true, codes: [] as string[], alreadyDone: true };

    const productId = pi.metadata?.productId ?? "";
    const qty = Number(pi.metadata?.qty ?? 1);
    const usdAmount = Number(pi.metadata?.usdAmount ?? 0);
    const conn = await loadConn();
    if (!conn) throw new Error("Tool store not connected");
    const [r, markupPct] = await Promise.all([fetchProducts(conn), loadMarkupPercent()]);
    const products = mapProducts(r.data ?? [], markupPct);
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error("Product not found");

    const externalOrderId = `sp-card-${context.userId.slice(0, 8)}-${Date.now()}`;
    const resp = await callStore<GgsomaOrderResp>(conn, "/orders", {
      method: "POST",
      body: JSON.stringify({ productSlug: product.slug, quantity: qty, externalOrderId }),
    });
    if (!resp.ok) throw new Error("Failed to process order");
    const codes = extractDeliverables(resp);

    await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      amount: -usdAmount,
      type: "tool_purchase",
      description: `stripe:${pi.id} ${product.name_en} × ${qty}`,
    });
    await supabaseAdmin.from("tool_orders").insert({
      user_id: context.userId,
      product_id: productId,
      product_name: product.name_en,
      qty,
      unit_price: product.your_price,
      total_price: usdAmount,
      codes,
      status: "completed",
    });
    return { ok: true, codes };
  });
