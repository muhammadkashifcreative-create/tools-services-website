import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, Wrench, LogIn, Copy, Sparkles, ShieldCheck, Zap, Package, Star, X, Clock, Boxes, Tag, ChevronRight, Check, Wallet, CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { TiltCard } from "@/components/TiltCard";
import { toast } from "sonner";
import {
  listToolProductsPublic,
  getToolStoreStatusPublic,
  getToolProductDetail,
  purchaseToolProduct,
  type ToolProduct,
} from "@/lib/toolstore.functions";
import { getStripe, getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { createDepositCheckout } from "@/lib/payments.functions";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getMyProfile } from "@/lib/wallet.functions";
import { getUserCurrency } from "@/lib/geo.functions";

export const Route = createFileRoute("/tools/store")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tools Store — Browse premium digital tools | Social Padu" },
      { name: "description", content: "Browse the live catalog of premium digital tools and accounts. Login to purchase with your wallet." },
      { property: "og:title", content: "Social Padu Tools Store" },
      { property: "og:description", content: "Live catalog of premium digital tools. Open to browse, sign in to buy." },
    ],
  }),
  component: ToolsStorePublicPage,
});

function ToolsStorePublicPage() {
  const fetchStatus = useServerFn(getToolStoreStatusPublic);
  const fetchProducts = useServerFn(listToolProductsPublic);
  const fetchProfile = useServerFn(getMyProfile);
  const fetchCurrency = useServerFn(getUserCurrency);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("product");
  });
  useEffect(() => {
    // Use the session cookie check via /api/auth/me instead of Supabase client
    // (Supabase client may not be configured client-side without VITE_ env vars)
    fetch("/api/auth/me").then((r) => setAuthed(r.ok)).catch(() => setAuthed(false));
  }, []);

  const { data: status, isLoading: stLoading } = useQuery({ queryKey: ["toolStatusPub"], queryFn: () => fetchStatus() });
  const { data: prod, isLoading: prLoading, error: prodError, refetch } = useQuery({
    queryKey: ["toolProductsPub"],
    queryFn: () => fetchProducts(),
    enabled: true, // always attempt — server will return not-connected if no key
    retry: 1,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
    enabled: authed === true,
  });
  const { data: ccy } = useQuery({
    queryKey: ["user-currency"],
    queryFn: () => fetchCurrency(),
    staleTime: 30 * 60 * 1000,
  });
  const fxSymbol = ccy?.symbol ?? "RM";
  const fxRate = ccy?.rate ?? 4.7;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Toaster />
      <section className="relative overflow-hidden brand-gradient">
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
                <Sparkles className="h-3 w-3" /> Live tools catalog
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                Premium tools. <span className="text-gradient">Instant delivery.</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                {(prod?.products ?? []).length.toLocaleString()} products available — pay from your wallet, get codes within seconds.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon={Zap} label="Instant codes" />
                <Chip icon={ShieldCheck} label="Wallet-secured" />
                <Chip icon={Star} label="Curated catalog" />
              </div>
            </div>
            {!authed && (
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
                <LogIn className="h-4 w-4" /> Login to buy
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">

          {(stLoading || prLoading) && !prod ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : prodError ? (
            <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-10 text-center">
              <Wrench className="mx-auto h-8 w-8 text-destructive/60" />
              <h2 className="mt-3 text-lg font-bold">Could not load catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">{(prodError as Error).message}</p>
            </div>
          ) : !prod?.connected ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
              <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-3 text-lg font-bold">Store catalog coming soon</h2>
              <p className="mt-1 text-sm text-muted-foreground">The live catalog isn't connected yet. Check back shortly.</p>
            </div>
          ) : (prod?.products ?? []).length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">
              No products available right now.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {(prod!.products as ToolProduct[]).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  authed={authed === true}
                  walletBalance={Number(profile?.balance ?? 0)}
                  onPurchased={() => refetch()}
                  fxSymbol={fxSymbol}
                  fxRate={fxRate}
                  onViewDetail={() => setSelectedProductId(p.id)}
                />
              ))}
            </div>
          )}
      </div>
      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          authed={authed === true}
          fxSymbol={fxSymbol}
          fxRate={fxRate}
          onClose={() => setSelectedProductId(null)}
        />
      )}
      <SiteFooter />
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </span>
  );
}

// Pick a deterministic gradient per product so cards look distinct yet cohesive.
const PALETTES: Array<{ from: string; to: string }> = [
  { from: "#f09433", to: "#bc1888" },
  { from: "#25F4EE", to: "#FE2C55" },
  { from: "#ff5858", to: "#c4302b" },
  { from: "#1877F2", to: "#0a4fb5" },
  { from: "#1DB954", to: "#168f3f" },
  { from: "#9146FF", to: "#5d2eb8" },
  { from: "#EA4335", to: "#4285F4" },
  { from: "#6366f1", to: "#06b6d4" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#10b981", to: "#0ea5e9" },
];
function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

function ProductCard({ product, authed, walletBalance, onPurchased, fxSymbol, fxRate, onViewDetail }: { product: ToolProduct; authed: boolean; walletBalance: number; onPurchased: () => void; fxSymbol: string; fxRate: number; onViewDetail: () => void }) {
  const [qty, setQty] = useState(1);
  const purchase = useServerFn(purchaseToolProduct);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => purchase({ data: { productId: product.id, qty } }),
    onSuccess: (r) => {
      toast.success(`Purchased! ${r.codes.length} code(s) delivered.`);
      qc.invalidateQueries({ queryKey: ["profile"] });
      onPurchased();
      if (r.codes?.length) {
        navigator.clipboard?.writeText(r.codes.join("\n")).catch(() => {});
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const totalUsd = +(Number(product.your_price) * qty).toFixed(2);
  const totalLocal = +(totalUsd * fxRate).toFixed(2);
  const priceLocal = +(Number(product.your_price) * fxRate).toFixed(2);
  const outOfStock = product.in_stock === false || product.stock === 0;
  const canAfford = !authed || walletBalance >= totalUsd;
  const fmt = (n: number) => `${fxSymbol}${n.toFixed(2)}`;
  const ps = paletteFor(product.id);

  return (
    <TiltCard className="h-full">
      <div
        className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:border-primary/40 hover:shadow-elegant"
        style={{
          backgroundImage:
            "radial-gradient(400px circle at var(--mx, 50%) var(--my, 0%), oklch(0.72 0.20 50 / 0.10), transparent 45%)",
        }}
      >
        {/* Accent stripe */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, ${ps.from}, ${ps.to})` }}
          aria-hidden
        />
        {/* Soft glow on hover */}
        <div
          className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
          style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}
          aria-hidden
        />

        <div className="relative p-5">
          <button onClick={onViewDetail} className="flex w-full items-start gap-3 text-left">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-soft text-2xl"
              style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}
              aria-hidden
            >
              {product.emoji ?? <Package className="h-5 w-5 text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}>
                  Tool
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                  outOfStock ? "bg-destructive/15 text-destructive" : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                }`}>
                  {outOfStock ? "Out of stock" : product.stock > 0 ? `${product.stock} left` : "In stock"}
                </span>
              </div>
              <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{product.name_en}</h3>
              {product.desc_en && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{stripTags(product.desc_en)}</p>
              )}
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                View details <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </button>

          <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</p>
              <p className="text-xl font-bold tabular-nums text-gradient">{fmt(priceLocal)}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase text-muted-foreground">Qty</label>
              <input
                type="number" min={1} max={Math.max(1, product.stock)} value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(product.stock || 1, Number(e.target.value || 1))))}
                className="w-16 rounded-md border border-border/60 bg-background px-2 py-1 text-right text-sm"
                disabled={!authed}
              />
            </div>
          </div>

          <Link
            to="/auth"
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
            style={{ background: "var(--gradient-accent)" }}
          >
            <LogIn className="h-3.5 w-3.5" /> Login to purchase · {fmt(totalLocal)}
          </Link>
        </div>
      </div>
    </TiltCard>
  );
}

function stripTags(s: string) { return s.replace(/<[^>]+>/g, ""); }

const ELEMENT_STYLE = {
  base: { color: "#0f172a", fontFamily: "Arial,sans-serif", fontSize: "14px", "::placeholder": { color: "#94a3b8" } },
  invalid: { color: "#ef4444" },
};

function ProductDetailModal({ productId, authed, fxSymbol, fxRate, onClose }: {
  productId: string; authed: boolean; fxSymbol: string; fxRate: number; onClose: () => void;
}) {
  const fetchDetail = useServerFn(getToolProductDetail);
  const startCheckout = useServerFn(createDepositCheckout);
  const [qty, setQty] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; percent?: number; fixedLocal?: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<"wallet" | "card" | null>(null);
  const [cardSecret, setCardSecret] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [success, setSuccess] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const qc = useQueryClient();
  const purchase = useServerFn(purchaseToolProduct);

  const { data: product, isLoading } = useQuery({
    queryKey: ["toolProductDetail", productId],
    queryFn: () => fetchDetail({ data: { productId } }),
  });

  const walletMut = useMutation({
    mutationFn: () => purchase({ data: { productId, qty, coupon: couponApplied?.code ?? undefined } }),
    onSuccess: (r) => {
      setSuccess(r.codes);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ps = paletteFor(productId);
  const priceLocal = product ? +(Number(product.your_price) * fxRate).toFixed(2) : 0;
  const discount = couponApplied
    ? couponApplied.fixedLocal ?? +(priceLocal * qty * ((couponApplied.percent ?? 0) / 100)).toFixed(2)
    : 0;
  const totalLocal = Math.max(0, +(priceLocal * qty - discount).toFixed(2));
  const outOfStock = product ? (product.in_stock === false || product.stock === 0) : false;

  const applyCoupon = () => {
    const c = coupon.trim().toUpperCase();
    if (c === "WELCOME5") {
      setCouponApplied({ code: c, percent: 5 }); setCouponError(null);
    } else if (c === "GEMIPRO10") {
      if (productId !== "6") {
        setCouponApplied(null);
        setCouponError("This coupon is only valid for Gemini Pro 18 Months");
      } else {
        setCouponApplied({ code: c, fixedLocal: 10 }); setCouponError(null);
      }
    } else {
      setCouponApplied(null); setCouponError("Invalid coupon code");
    }
  };

  const openCardPayment = async () => {
    if (!isStripeConfigured()) { toast.error("Card payments not configured"); return; }
    setCardLoading(true);
    try {
      const res = await startCheckout({ data: { usdAmount: totalLocal / fxRate, environment: getStripeEnvironment() } });
      if ("error" in res) { toast.error(res.error); return; }
      setCardSecret(res.clientSecret ?? "");
      setPayMode("card");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setCardLoading(false); }
  };

  const deliveryLabel: Record<string, string> = {
    LINK: "Instant link delivery", COUPON: "Coupon / activation code", READY_ACCOUNT: "Ready-to-use account",
  };

  // ── Success screen ──
  if (success.length > 0) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl p-6">
        <div className="flex justify-center mb-4"><div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div></div>
        <h2 className="text-center font-bold text-lg mb-1">Purchase successful!</h2>
        <p className="text-center text-sm text-muted-foreground mb-4">Your code(s) are ready.</p>
        <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-1.5">
          {success.map((c, i) => <p key={i} className="font-mono text-sm break-all">{c}</p>)}
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(success.join("\n")); setCopiedCodes(true); }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent transition">
          {copiedCodes ? <><Check className="h-4 w-4 text-emerald-500" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy code(s)</>}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground text-center py-2 transition">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="h-1 w-10 rounded-full bg-border" /></div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
              style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}>
              {product?.emoji ?? <Package className="h-5 w-5 text-white" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product Detail</p>
              {isLoading ? <div className="h-4 w-40 rounded bg-muted animate-pulse mt-1" /> :
                <p className="font-bold text-sm leading-snug">{product?.name_en}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-1.5 hover:bg-accent transition"><X className="h-4 w-4" /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !product ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Product not found.</div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${outOfStock ? "bg-destructive/15 text-destructive" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"}`}>
                {outOfStock ? "Out of stock" : product.stock > 0 ? `${product.stock} in stock` : "In stock"}
              </span>
              {product.delivery_type && <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">{deliveryLabel[product.delivery_type] ?? product.delivery_type}</span>}
              {product.duration_days && <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"><Clock className="h-3 w-3" /> {product.duration_days} days</span>}
              {product.provider_name && <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"><Tag className="h-3 w-3" /> {product.provider_name}</span>}
            </div>

            {/* Name */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Product Name</p>
              <p className="text-sm font-medium leading-relaxed">{product.name_en}</p>
            </div>

            {/* Description */}
            {product.desc_en && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{stripTags(product.desc_en)}</p>
              </div>
            )}

            {/* Price + Qty */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price per unit</p>
                  <p className="text-2xl font-bold tabular-nums text-gradient">{fxSymbol}{priceLocal.toFixed(2)}</p>
                </div>
                {!outOfStock && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <input type="number" min={1} max={Math.max(1, product.stock)} value={qty}
                      onChange={(e) => setQty(Math.max(1, Math.min(product.stock || 1, Number(e.target.value || 1))))}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:ring-2 ring-primary/30" />
                  </div>
                )}
              </div>
              {couponApplied && <div className="flex justify-between text-sm mt-2 text-emerald-600"><span>Coupon {couponApplied.code} {couponApplied.fixedLocal ? `(−${fxSymbol}${couponApplied.fixedLocal})` : `(−${couponApplied.percent}%)`}</span><span>−{fxSymbol}{discount.toFixed(2)}</span></div>}
              {!outOfStock && <div className="flex justify-between mt-2 pt-2 border-t border-border/60 text-sm"><span className="font-semibold">Total</span><span className="font-bold text-gradient tabular-nums">{fxSymbol}{totalLocal.toFixed(2)}</span></div>}
            </div>

            {/* Coupon */}
            {authed && !outOfStock && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coupon code</label>
                {couponApplied ? (
                  <div className="mt-1.5 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span className="font-mono font-bold">{couponApplied.code}</span><span className="text-xs text-muted-foreground">{couponApplied.percent}% off</span></span>
                    <button type="button" onClick={() => { setCouponApplied(null); setCoupon(""); }} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex gap-2">
                    <input type="text" placeholder="WELCOME5" value={coupon}
                      onChange={(e) => { setCoupon(e.target.value); setCouponError(null); }}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase outline-none focus:ring-2 ring-primary/30 text-foreground placeholder:text-muted-foreground" />
                    <button type="button" onClick={applyCoupon} className="rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold hover:bg-accent transition">Apply</button>
                  </div>
                )}
                {couponError && <p className="mt-1 text-[11px] text-destructive">{couponError}</p>}
              </div>
            )}

            {/* Card form */}
            {payMode === "card" && cardSecret && authed && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Card details</p>
                <Elements stripe={getStripe()}>
                  <ToolCardForm clientSecret={cardSecret} onSuccess={(codes) => { setCardSecret(null); setPayMode(null); setSuccess(codes); qc.invalidateQueries({ queryKey: ["profile"] }); }} onCancel={() => { setPayMode(null); setCardSecret(null); }} productId={productId} qty={qty} coupon={couponApplied?.code} />
                </Elements>
              </div>
            )}

            {/* CTAs */}
            {!outOfStock && payMode !== "card" && (
              authed ? (
                <div className="space-y-2">
                  <button disabled={walletMut.isPending} onClick={() => walletMut.mutate()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: "var(--gradient-accent)" }}>
                    {walletMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                    Pay from wallet · {fxSymbol}{totalLocal.toFixed(2)}
                  </button>
                  <button disabled={cardLoading} onClick={openCardPayment}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold transition hover:bg-accent disabled:opacity-60">
                    {cardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Pay with card
                  </button>
                </div>
              ) : (
                <Link to="/auth" className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow" style={{ background: "var(--gradient-accent)" }}>
                  <LogIn className="h-4 w-4" /> Login to purchase · {fxSymbol}{totalLocal.toFixed(2)}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCardForm({ clientSecret, onSuccess, onCancel, productId, qty, coupon }: {
  clientSecret: string; onSuccess: (codes: string[]) => void; onCancel: () => void;
  productId: string; qty: number; coupon?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const purchase = useServerFn(purchaseToolProduct);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError(null);
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) { setLoading(false); return; }
    const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardNumber, billing_details: { name: name.trim() || undefined } },
      return_url: window.location.href,
    });
    if (stripeErr) { setError(stripeErr.message ?? "Payment failed"); setLoading(false); return; }
    if (paymentIntent?.status === "succeeded") {
      try {
        const r = await purchase({ data: { productId, qty, coupon } });
        onSuccess(r.codes);
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to deliver codes"); setLoading(false); }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Card number</label>
        <div className="rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30"><CardNumberElement options={{ style: ELEMENT_STYLE, showIcon: true }} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Expiry</label>
          <div className="rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30"><CardExpiryElement options={{ style: ELEMENT_STYLE }} /></div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">CVC</label>
          <div className="rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30"><CardCvcElement options={{ style: ELEMENT_STYLE }} /></div>
        </div>
      </div>
      <input type="text" placeholder="Name on card" value={name} onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30" />
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
      <button type="submit" disabled={!stripe || loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow disabled:opacity-60"
        style={{ background: "var(--gradient-accent)" }}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {loading ? "Processing…" : "Pay & Get Codes"}
      </button>
      <button type="button" onClick={onCancel} className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 transition">Cancel</button>
    </form>
  );
}

// Copy icon kept available for future use
void Copy;