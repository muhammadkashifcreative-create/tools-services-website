import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Search, Wrench, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { ProductCard, ProductDetailModal, stripTags } from "@/components/ToolStorefront";
import { listToolProducts, type ToolProduct } from "@/lib/toolstore.functions";
import { getUserCurrency } from "@/lib/geo.functions";

export const Route = createFileRoute("/_authenticated/dashboard/new-order")({
  head: () => ({ meta: [{ title: "New Order — Social Padu" }] }),
  validateSearch: (search: Record<string, unknown>): { product?: string } => ({
    product: typeof search.product === "string" ? search.product : undefined,
  }),
  component: NewOrderPage,
});

function NewOrderPage() {
  const { product: productParam } = Route.useSearch();
  const fetchProducts = useServerFn(listToolProducts);
  const fetchCurrency = useServerFn(getUserCurrency);

  const [query, setQuery] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(productParam ?? null);

  const { data: prod, isLoading, refetch } = useQuery({
    queryKey: ["toolProducts"],
    queryFn: () => fetchProducts(),
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
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New Order</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Pick a tool, pay from your wallet or card, and get your codes instantly.
            </p>
          </div>
        </div>

        {/* Search */}
        {allProducts.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="mt-6">
          {isLoading && !prod ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
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
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          purchasable
          initialQty={selectedQty}
          fxSymbol={fxSymbol}
          fxRate={fxRate}
          onClose={() => { setSelectedProductId(null); setSelectedQty(1); refetch(); }}
        />
      )}
    </AppLayout>
  );
}
