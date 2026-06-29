import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, Wrench, LogIn, Copy, Sparkles, ShieldCheck, Zap, Package, Star, X, Clock, Boxes, Tag, ChevronRight } from "lucide-react";
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

function ProductDetailModal({ productId, authed, fxSymbol, fxRate, onClose }: {
  productId: string; authed: boolean; fxSymbol: string; fxRate: number; onClose: () => void;
}) {
  const fetchDetail = useServerFn(getToolProductDetail);
  const [qty, setQty] = useState(1);
  const qc = useQueryClient();
  const purchase = useServerFn(purchaseToolProduct);

  const { data: product, isLoading } = useQuery({
    queryKey: ["toolProductDetail", productId],
    queryFn: () => fetchDetail({ data: { productId } }),
  });

  const mut = useMutation({
    mutationFn: () => purchase({ data: { productId, qty } }),
    onSuccess: (r) => {
      toast.success(`Purchased! ${r.codes.length} code(s) delivered.`);
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (r.codes?.length) navigator.clipboard?.writeText(r.codes.join("\n")).catch(() => {});
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ps = paletteFor(productId);
  const priceLocal = product ? +(Number(product.your_price) * fxRate).toFixed(2) : 0;
  const totalLocal = +(priceLocal * qty).toFixed(2);
  const outOfStock = product ? (product.in_stock === false || product.stock === 0) : false;
  const deliveryLabel: Record<string, string> = {
    LINK: "Instant link delivery",
    COUPON: "Coupon / activation code",
    READY_ACCOUNT: "Ready-to-use account",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

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
          <button onClick={onClose} className="rounded-lg border border-border p-1.5 hover:bg-accent transition">
            <X className="h-4 w-4" />
          </button>
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
              {product.delivery_type && (
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  {deliveryLabel[product.delivery_type] ?? product.delivery_type}
                </span>
              )}
              {product.duration_days && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" /> {product.duration_days} days
                </span>
              )}
              {product.provider_name && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3 w-3" /> {product.provider_name}
                </span>
              )}
            </div>

            {/* Full name */}
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

            {/* Price */}
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
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground" />
                  </div>
                )}
              </div>
              {!outOfStock && qty > 1 && (
                <p className="mt-2 text-xs text-muted-foreground">Total: <span className="font-bold text-foreground">{fxSymbol}{totalLocal.toFixed(2)}</span></p>
              )}
            </div>

            {/* CTA */}
            {authed ? (
              <button disabled={outOfStock || mut.isPending} onClick={() => mut.mutate()}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--gradient-accent)" }}>
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {outOfStock ? "Out of stock" : `Buy · ${fxSymbol}${totalLocal.toFixed(2)}`}
              </button>
            ) : (
              <Link to="/auth"
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow"
                style={{ background: "var(--gradient-accent)" }}>
                <LogIn className="h-4 w-4" /> Login to purchase · {fxSymbol}{totalLocal.toFixed(2)}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Copy icon kept available for future use
void Copy;