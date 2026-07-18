import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Search, X, BookOpen, Sparkles, ShieldCheck, Zap, Download } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCard } from "@/components/BookCard";
import { listBooksPublic, type CatalogBook } from "@/lib/books.functions";
import { getUserCurrency } from "@/lib/geo.functions";

export const Route = createFileRoute("/books/")({
  head: () => ({
    meta: [
      { title: "Guide Books — Master your software | Social Padu" },
      { name: "description", content: "Browse practical guide books for computer software — office suites, design apps, developer tools and AI. Instant PDF download after checkout." },
      { property: "og:title", content: "Social Padu Guide Books" },
      { property: "og:description", content: "Step-by-step software guide books. Buy once, download instantly, keep forever." },
    ],
  }),
  component: BooksCatalogPage,
});

function Chip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
      <Icon className="h-3 w-3 text-primary" /> {label}
    </span>
  );
}

function BooksCatalogPage() {
  const fetchBooks = useServerFn(listBooksPublic);
  const fetchCurrency = useServerFn(getUserCurrency);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["booksPub"], queryFn: () => fetchBooks() });
  const { data: ccy } = useQuery({
    queryKey: ["user-currency"],
    queryFn: () => fetchCurrency(),
    staleTime: 30 * 60 * 1000,
  });
  const fxSymbol = ccy?.symbol ?? "$";
  const fxRate = ccy?.rate ?? 1;

  const allBooks = (data?.books ?? []) as CatalogBook[];
  const categories = useMemo(
    () => Array.from(new Set(allBooks.map((b) => b.category))).sort(),
    [allBooks],
  );

  const q = query.trim().toLowerCase();
  const filtered = allBooks.filter((b) => {
    if (category && b.category !== category) return false;
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      (b.author ?? "").toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden brand-gradient">
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" /> Guide book library
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Master your software. <span className="text-gradient">One book at a time.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Practical, step-by-step guide books for the software you use every day — instant PDF download after checkout.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip icon={Download} label="Instant download" />
            <Chip icon={ShieldCheck} label="Secure card checkout" />
            <Chip icon={BookOpen} label="Yours forever" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Search + category filters */}
        {allBooks.length > 0 && (
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search books… e.g. Excel, Photoshop, Python"
                  aria-label="Search books"
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
                {filtered.length.toLocaleString()} book{filtered.length === 1 ? "" : "s"}
              </p>
            </div>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${category === null ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(category === c ? null : c)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${category === c ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-destructive/60" />
            <h2 className="mt-3 text-lg font-bold">Could not load the library</h2>
            <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
        ) : allBooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">New books coming soon</h2>
            <p className="mt-1 text-sm text-muted-foreground">The library is being stocked. Check back shortly.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">No books match your search</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or browse all categories.</p>
            <button
              type="button"
              onClick={() => { setQuery(""); setCategory(null); }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
              style={{ background: "var(--gradient-accent)" }}
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {filtered.map((b) => (
              <BookCard key={b.id} book={b} fxSymbol={fxSymbol} fxRate={fxRate} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
