import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Check, CreditCard, Download, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getBookBySlugPublic, createBookCheckout, type Book } from "@/lib/books.functions";
import { getUserCurrency } from "@/lib/geo.functions";

export const Route = createFileRoute("/books/$slug")({
  loader: async ({ params }) => getBookBySlugPublic({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const book = loaderData?.book;
    return {
      meta: book
        ? [
            { title: `${book.title} — Guide Book | Social Padu` },
            { name: "description", content: (book.description ?? `${book.title} — practical software guide book, instant PDF download.`).slice(0, 160) },
            { property: "og:title", content: book.title },
            { property: "og:description", content: (book.description ?? "Practical software guide book.").slice(0, 200) },
            ...(book.cover_url ? [{ property: "og:image", content: book.cover_url }] : []),
          ]
        : [{ title: "Book not found — Social Padu" }],
    };
  },
  component: BookDetailPage,
});

function BookDetailPage() {
  const { book } = Route.useLoaderData() as { book: Book | null };
  const fetchCurrency = useServerFn(getUserCurrency);
  const checkout = useServerFn(createBookCheckout);

  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => setAuthed(r.ok)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("canceled")) {
      toast.info("Checkout canceled — your card was not charged.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const { data: ccy } = useQuery({
    queryKey: ["user-currency"],
    queryFn: () => fetchCurrency(),
    staleTime: 30 * 60 * 1000,
  });
  const fxSymbol = ccy?.symbol ?? "$";
  const fxRate = ccy?.rate ?? 1;

  const buyMut = useMutation({
    mutationFn: () => checkout({ data: { bookId: book!.id } }),
    onSuccess: (r) => { window.location.href = r.checkoutUrl; },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Book not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This book may have been removed or the link is wrong.</p>
          <Link to="/books" className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
            <ArrowLeft className="h-4 w-4" /> Browse all books
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const local = Number(book.price_usd) * fxRate;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Toaster />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link to="/books" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All books
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Cover */}
          <div className="mx-auto w-full max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-border/60 shadow-elegant">
              {book.cover_url ? (
                <img src={book.cover_url} alt={`${book.title} cover`} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-4 p-8 text-center" style={{ background: "var(--gradient-card)" }}>
                  <BookOpen className="h-14 w-14 text-primary/60" />
                  <p className="text-lg font-bold text-foreground/80">{book.title}</p>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <span className="rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {book.category}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{book.title}</h1>
            {book.author && <p className="mt-2 text-sm text-muted-foreground">by <span className="font-semibold text-foreground">{book.author}</span></p>}

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 font-medium">{book.level}</span>
              {book.pages && <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 font-medium">{book.pages} pages</span>}
              <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 font-medium">PDF · digital download</span>
            </div>

            {book.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">{book.description}</p>
            )}

            <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-gradient">{fxSymbol}{local.toFixed(2)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">${Number(book.price_usd).toFixed(2)} USD · one-time payment</p>
                </div>
                {authed ? (
                  <button
                    type="button"
                    onClick={() => buyMut.mutate()}
                    disabled={buyMut.isPending}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    {buyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Buy now — secure checkout
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    search={{ redirect: `/books/${book.slug}` }}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90"
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    <LogIn className="h-4 w-4" /> Login to buy
                  </Link>
                )}
              </div>
              <ul className="mt-5 grid gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:grid-cols-3">
                <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Paid securely via Stripe</li>
                <li className="inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5 text-emerald-500" /> Instant download after payment</li>
                <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Lifetime access in your Library</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
