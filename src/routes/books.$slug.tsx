import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, BookOpen, Check, CreditCard, Download, Loader2, LogIn, MessageSquare, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  getBookBySlugPublic,
  listBookReviews, getMyBookReview, upsertMyBookReview,
  type Book, type BookReview,
} from "@/lib/books.functions";
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
  const { book, soldCount } = Route.useLoaderData() as { book: Book | null; soldCount: number };
  const fetchCurrency = useServerFn(getUserCurrency);
  const fetchReviews = useServerFn(listBookReviews);

  // Rating summary for the header — shares the ["bookReviews", id] cache with
  // the reviews section below, so React Query only fetches it once.
  const { data: reviewSummary } = useQuery({
    queryKey: ["bookReviews", book?.id],
    queryFn: () => fetchReviews({ data: { bookId: book!.id } }),
    enabled: !!book,
  });

  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => setAuthed(r.ok)).catch(() => setAuthed(false));
  }, []);

  const { data: ccy } = useQuery({
    queryKey: ["user-currency"],
    queryFn: () => fetchCurrency(),
    staleTime: 30 * 60 * 1000,
  });
  const fxSymbol = ccy?.symbol ?? "$";
  const fxRate = ccy?.rate ?? 1;

  if (!book) {
    return (
      <div className="min-h-dvh bg-background">
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
    <div className="min-h-dvh bg-background">
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

            {/* Rating + social proof */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {(reviewSummary?.count ?? 0) > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-2 text-sm transition hover:opacity-80">
                  <Stars value={reviewSummary!.avg ?? 0} />
                  <span className="font-semibold text-foreground">{reviewSummary!.avg}</span>
                  <span className="text-muted-foreground">· {reviewSummary!.count} review{reviewSummary!.count === 1 ? "" : "s"}</span>
                </a>
              )}
              {soldCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <BadgeCheck className="h-4 w-4" /> {soldCount} sold
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 font-medium">{book.level}</span>
              {book.pages && <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 font-medium">{book.pages} pages</span>}
              <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 font-medium">PDF · digital download</span>
            </div>

            {/* Book details / specs */}
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft sm:grid-cols-4">
              <Spec label="Total pages" value={book.pages ? String(book.pages) : "—"} />
              <Spec label="Language" value={book.language ?? "English"} />
              <Spec label="Published" value={new Date(book.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })} />
              <Spec label="Copies sold" value={soldCount > 0 ? String(soldCount) : "New"} />
            </dl>

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
                  <Link
                    to="/checkout/$slug"
                    params={{ slug: book.slug }}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90"
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Buy now — secure checkout
                  </Link>
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

        <ReviewsSection bookId={book.id} authed={authed} bookSlug={book.slug} />
      </div>
      <SiteFooter />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${className} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

function ReviewsSection({ bookId, bookSlug, authed }: { bookId: string; bookSlug: string; authed: boolean | null }) {
  const qc = useQueryClient();
  const fetchReviews = useServerFn(listBookReviews);
  const fetchMine = useServerFn(getMyBookReview);
  const saveReview = useServerFn(upsertMyBookReview);

  const { data, isLoading } = useQuery({ queryKey: ["bookReviews", bookId], queryFn: () => fetchReviews({ data: { bookId } }) });
  const { data: mine } = useQuery({
    queryKey: ["myBookReview", bookId],
    queryFn: () => fetchMine({ data: { bookId } }),
    enabled: authed === true,
  });

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["bookReviews", bookId] });
    qc.invalidateQueries({ queryKey: ["myBookReview", bookId] });
    qc.invalidateQueries({ queryKey: ["booksPub"] });
  };

  const saveMut = useMutation({
    mutationFn: () => saveReview({ data: { bookId, rating, body } }),
    onSuccess: () => {
      toast.success("Thanks for your review!");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = (data?.reviews ?? []) as BookReview[];

  return (
    <section id="reviews" className="mt-14 max-w-3xl scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reader reviews</h2>
          {data?.count ? (
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Stars value={data.avg ?? 0} />
              <span className="font-semibold text-foreground">{data.avg}</span> · {data.count} verified review{data.count === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No reviews yet — be the first verified reader to share your thoughts.</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified buyers only · text reviews
        </span>
      </div>

      {/* Write review — one-time, no editing once submitted */}
      <div className="mt-6">
        {authed === true && mine?.canReview && mine?.mine ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <BadgeCheck className="h-4 w-4 text-emerald-500" /> You've already reviewed this book
            </p>
            <p className="mt-1">Thanks for sharing your thoughts — your review is posted below.</p>
          </div>
        ) : authed === true && mine?.canReview ? (
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <p className="text-sm font-semibold">Write a review</p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`} className="p-0.5">
                  <Star className={`h-6 w-6 transition ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-300"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What did you learn? Who would you recommend it to? (text only, minimum 10 characters)"
              className="mt-3 w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none ring-primary/30 focus:border-primary/40 focus:ring-2"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className={`text-[11px] ${rating === 0 || body.trim().length < 10 ? "font-medium text-amber-600" : "text-muted-foreground"}`}>
                {rating === 0
                  ? "Select a star rating to continue."
                  : body.trim().length < 10
                    ? `Reviews need a minimum of 10 characters — ${10 - body.trim().length} more to go.`
                    : "Posting as a verified buyer. Reviews are text only."}
              </p>
              <button
                type="button"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || rating === 0 || body.trim().length < 10}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--gradient-accent)" }}
              >
                {saveMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                Post review
              </button>
            </div>
          </div>
        ) : authed === true ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
            Reviews are reserved for verified buyers — <span className="font-semibold text-foreground">buy the book</span> and your review will carry the verified badge.
          </div>
        ) : authed === false ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
            <Link to="/auth" search={{ redirect: `/books/${bookSlug}` }} className="font-semibold text-primary hover:underline">Log in</Link> and purchase the book to leave a verified review.
          </div>
        ) : null}
      </div>

      {/* Review list */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--gradient-accent)" }}>
                    {r.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{r.author}</p>
                    <p className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                      <BadgeCheck className="h-3 w-3" /> Verified purchase
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} className="h-3.5 w-3.5" />
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
