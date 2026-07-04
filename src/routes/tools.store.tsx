import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Wrench, LogIn, Search, Sparkles, ShieldCheck, Zap, Star, X, ShoppingBag } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { ProductCard, ProductDetailModal, Chip, stripTags } from "@/components/ToolStorefront";
import {
  listToolProductsPublic,
  getToolStoreStatusPublic,
  type ToolProduct,
} from "@/lib/toolstore.functions";
import { getUserCurrency } from "@/lib/geo.functions";

export const Route = createFileRoute("/tools/store")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tools Store — Browse premium digital tools | Social Padu" },
      { name: "description", content: "Browse the live catalog of premium digital tools and accounts. Login and order from your dashboard." },
      { property: "og:title", content: "Social Padu Tools Store" },
      { property: "og:description", content: "Live catalog of premium digital tools. Open to browse, order from your dashboard." },
    ],
  }),
  component: ToolsStorePublicPage,
});

function ToolsStorePublicPage() {
  const fetchStatus = useServerFn(getToolStoreStatusPublic);
  const fetchProducts = useServerFn(listToolProductsPublic);
  const fetchCurrency = useServerFn(getUserCurrency);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("product");
  });
  useEffect(() => {
    // Use the session cookie check via /api/auth/me instead of Supabase client
    // (Supabase client may not be configured client-side without VITE_ env vars)
    fetch("/api/auth/me").then((r) => setAuthed(r.ok)).catch(() => setAuthed(false));
  }, []);

  const { isLoading: stLoading } = useQuery({ queryKey: ["toolStatusPub"], queryFn: () => fetchStatus() });
  const { data: prod, isLoading: prLoading, error: prodError } = useQuery({
    queryKey: ["toolProductsPub"],
    queryFn: () => fetchProducts(),
    enabled: true, // always attempt — server will return not-connected if no key
    retry: 1,
  });
  const { data: ccy } = useQuery({
    queryKey: ["user-currency"],
    queryFn: () => fetchCurrency(),
    staleTime: 30 * 60 * 1000,
  });
  const fxSymbol = ccy?.symbol ?? "RM";
  const fxRate = ccy?.rate ?? 4.7;

  const allProducts = (prod?.products ?? []) as ToolProduct[];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? allProducts.filter(
        (p) =>
          p.name_en.toLowerCase().includes(q) ||
          (p.desc_en && stripTags(p.desc_en).toLowerCase().includes(q)) ||
          (p.provider_name && p.provider_name.toLowerCase().includes(q)),
      )
    : allProducts;

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
                {allProducts.length.toLocaleString()} products available — order from your dashboard, get codes within seconds.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon={Zap} label="Instant codes" />
                <Chip icon={ShieldCheck} label="Wallet-secured" />
                <Chip icon={Star} label="Curated catalog" />
              </div>
            </div>
            {authed ? (
              <Link to="/dashboard/new-order" className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
                <ShoppingBag className="h-4 w-4" /> Order from dashboard
              </Link>
            ) : (
              <Link to="/auth" search={{ redirect: "/dashboard/new-order" }} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
                <LogIn className="h-4 w-4" /> Login to buy
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">

          {/* Search bar */}
          {(prod?.connected ?? false) && allProducts.length > 0 && (
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products… e.g. Gemini, CapCut, Coursera"
                  aria-label="Search products"
                  className="w-full rounded-xl border border-border/60 bg-card py-2.5 pl-10 pr-10 text-sm text-foreground shadow-soft outline-none ring-primary/30 transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-2 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                {q
                  ? `${filtered.length.toLocaleString()} result${filtered.length === 1 ? "" : "s"} for "${query.trim()}"`
                  : `${allProducts.length.toLocaleString()} products`}
              </p>
            </div>
          )}

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
          ) : allProducts.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">
              No products available right now.
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-3 text-lg font-bold">No products match "{query.trim()}"</h2>
              <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or browse the full catalog.</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
                style={{ background: "var(--gradient-accent)" }}
              >
                <X className="h-3.5 w-3.5" /> Clear search
              </button>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  fxSymbol={fxSymbol}
                  fxRate={fxRate}
                  onViewDetail={(qty) => { setSelectedQty(qty); setSelectedProductId(p.id); }}
                />
              ))}
            </div>
          )}
      </div>
      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          purchasable={false}
          initialQty={selectedQty}
          fxSymbol={fxSymbol}
          fxRate={fxRate}
          onClose={() => { setSelectedProductId(null); setSelectedQty(1); }}
          guestCta={(totalLocal) =>
            authed ? (
              <Link
                to="/dashboard/new-order"
                search={{ product: selectedProductId }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow"
                style={{ background: "var(--gradient-accent)" }}
              >
                <ShoppingBag className="h-4 w-4" /> Order from dashboard · {fxSymbol}{totalLocal.toFixed(2)}
              </Link>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: `/dashboard/new-order?product=${selectedProductId}` }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow"
                style={{ background: "var(--gradient-accent)" }}
              >
                <LogIn className="h-4 w-4" /> Login to purchase · {fxSymbol}{totalLocal.toFixed(2)}
              </Link>
            )
          }
        />
      )}
      <SiteFooter />
    </div>
  );
}
