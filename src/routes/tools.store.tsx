import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, Wrench, LogIn, Copy, Sparkles, ShieldCheck, Zap, Package, Star } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { TiltCard } from "@/components/TiltCard";
import { toast } from "sonner";
import {
  listToolProductsPublic,
  getToolStoreStatusPublic,
  purchaseToolProduct,
  type ToolProduct,
} from "@/lib/toolstore.functions";
import { getMyProfile } from "@/lib/wallet.functions";

export const Route = createFileRoute("/tools/store")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tools Store — Browse premium digital tools | Social Padu" },
      { name: "description", content: "Browse the live catalog of premium digital tools and accounts. Sign in to purchase with your wallet." },
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

  const [authed, setAuthed] = useState<boolean | null>(null);
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
                <LogIn className="h-4 w-4" /> Sign in to buy
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(prod!.products as ToolProduct[]).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  authed={authed === true}
                  walletBalance={Number(profile?.balance ?? 0)}
                  onPurchased={() => refetch()}
                />
              ))}
            </div>
          )}
      </div>
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

function ProductCard({ product, authed, walletBalance, onPurchased }: { product: ToolProduct; authed: boolean; walletBalance: number; onPurchased: () => void }) {
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
  const total = +(Number(product.your_price) * qty).toFixed(2);
  const outOfStock = product.in_stock === false || product.stock === 0;
  const canAfford = !authed || walletBalance >= total;
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
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-soft text-2xl"
              style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}
              aria-hidden
            >
              {product.emoji ?? <Package className="h-5 w-5 text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}
                >
                  Tool
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    outOfStock
                      ? "bg-destructive/15 text-destructive"
                      : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {outOfStock ? "Out of stock" : product.stock > 0 ? `${product.stock} left` : "In stock"}
                </span>
              </div>
              <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
                {product.name_en}
              </h3>
              {product.desc_en && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {stripTags(product.desc_en)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</p>
              <p className="text-xl font-bold tabular-nums text-gradient">${Number(product.your_price).toFixed(2)}</p>
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

          {authed ? (
            <>
              <button
                onClick={() => mut.mutate()}
                disabled={outOfStock || mut.isPending || !canAfford}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "var(--gradient-accent)" }}
              >
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><ShoppingBag className="h-3.5 w-3.5" /> Buy · ${total.toFixed(2)}</>)}
              </button>
              {!canAfford && !outOfStock && (
                <p className="mt-2 text-[11px] text-destructive">Wallet balance too low. <Link to="/wallet" className="underline">Top up</Link>.</p>
              )}
            </>
          ) : (
            <Link
              to="/auth"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-xs font-semibold hover:bg-accent"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in to buy · ${total.toFixed(2)}
            </Link>
          )}
        </div>
      </div>
    </TiltCard>
  );
}

function stripTags(s: string) { return s.replace(/<[^>]+>/g, ""); }
// Copy icon kept available for future use
void Copy;