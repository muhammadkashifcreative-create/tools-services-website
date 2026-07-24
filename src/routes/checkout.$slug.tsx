import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ArrowLeft, BadgeCheck, BookOpen, Check, ChevronDown, Loader2, LogIn, Minus, Plus, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getBookBySlugPublic, createBookPaymentIntent, updateCheckoutQuantity, applyCheckoutPromoCode, type Book } from "@/lib/books.functions";
import { getUserCurrency } from "@/lib/geo.functions";

const MAX_QTY = 99;

export const Route = createFileRoute("/checkout/$slug")({
  // The book page can pre-set how many copies the customer wants.
  validateSearch: (search: Record<string, unknown>): { qty?: number } => {
    const qty = Number(search.qty);
    return Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY ? { qty } : {};
  },
  loader: async ({ params }) => getBookBySlugPublic({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.book ? `Checkout — ${loaderData.book.title} | Social Padu` : "Checkout — Social Padu" }],
  }),
  component: CheckoutPage,
});

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

// Loaded once per page load, matching Stripe's recommended pattern.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null);
  }
  return stripePromise;
}

function CheckoutPage() {
  const { book } = Route.useLoaderData() as { book: Book | null };
  const { qty: qtyFromUrl } = Route.useSearch();
  const fetchCurrency = useServerFn(getUserCurrency);
  const createIntent = useServerFn(createBookPaymentIntent);
  const setQty = useServerFn(updateCheckoutQuantity);
  const qc = useQueryClient();

  const [quantity, setQuantity] = useState(qtyFromUrl ?? 1);
  // The ?qty hint only seeds the checkout. Once the stepper is used the server
  // row is the truth, or a refetch would undo the change the customer just made.
  const seedQty = useRef(qtyFromUrl);
  // A promo lowers the total, so re-price after a quantity change with it still applied.
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

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

  const {
    data: checkout,
    isLoading: creatingIntent,
    error: intentError,
  } = useQuery({
    // Quantity isn't part of the key: changes go through updateCheckoutQuantity,
    // which reprices the same PaymentIntent rather than starting a new checkout.
    queryKey: ["checkoutIntent", book?.id],
    queryFn: () => createIntent({ data: { bookId: book!.id, quantity: seedQty.current } }),
    enabled: authed === true && !!book,
    retry: false,
  });

  // A resumed checkout may already be for several copies — follow what the server has.
  useEffect(() => {
    if (checkout?.quantity) setQuantity(checkout.quantity);
  }, [checkout?.quantity]);

  const qtyMut = useMutation({
    mutationFn: (next: number) =>
      setQty({ data: { purchaseId: checkout!.purchaseId, quantity: next, promoCode: appliedPromo ?? undefined } }),
    onSuccess: (_res, next) => {
      seedQty.current = undefined;
      setQuantity(next);
      qc.invalidateQueries({ queryKey: ["checkoutIntent"] });
    },
    onError: (e: Error) => {
      setQuantity(checkout?.quantity ?? 1);
      toast.error(e.message);
    },
  });

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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/books/$slug"
          params={{ slug: book.slug }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to book
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>

        {/* Mobile-first: order summary stacks above payment; side-by-side from lg up */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          {/* Order summary */}
          <div className="order-1 rounded-2xl border border-border/60 bg-card p-5 shadow-soft lg:sticky lg:top-24">
            <div className="flex gap-4">
              <div className="w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 sm:w-24">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={`${book.title} cover`} className="aspect-3/4 w-full object-cover" />
                ) : (
                  <div className="flex aspect-3/4 w-full items-center justify-center" style={{ background: "var(--gradient-card)" }}>
                    <BookOpen className="h-6 w-6 text-primary/60" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{book.category}</p>
                <h2 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug sm:text-base">{book.title}</h2>
                {book.author && <p className="mt-0.5 truncate text-xs text-muted-foreground">by {book.author}</p>}
              </div>
            </div>

            {checkout?.alreadyOwned && (
              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
                <p className="font-semibold text-foreground">You already own this book.</p>
                <p className="mt-0.5 text-muted-foreground">
                  Ordering again is fine — it's added to your{" "}
                  <Link to="/dashboard/library" className="font-medium text-primary hover:underline">Library</Link>{" "}
                  as a new purchase. Re-downloads of what you own are always free.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-sm">
              <span className="text-muted-foreground">Price per copy</span>
              <span className="font-semibold tabular-nums">{fxSymbol}{local.toFixed(2)}</span>
            </div>

            {checkout?.quantityEnabled && (
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <QtyStepper
                  value={quantity}
                  busy={qtyMut.isPending}
                  onChange={(next) => qtyMut.mutate(next)}
                />
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-sm">
              <span className="font-medium">Total</span>
              <span className="text-base font-bold tabular-nums">
                {checkout ? `${fxSymbol}${((checkout.amountUsdCents / 100) * fxRate).toFixed(2)}` : `${fxSymbol}${local.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Charged in USD</span>
              <span className="tabular-nums">${checkout ? (checkout.amountUsdCents / 100).toFixed(2) : Number(book.price_usd).toFixed(2)}</span>
            </div>

            <ul className="mt-5 space-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure checkout on socialpadu.my</li>
              <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Instant access after payment</li>
              <li className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Lifetime access in your Library</li>
            </ul>
          </div>

          {/* Payment */}
          <div className="order-2 rounded-2xl border border-border/60 bg-card p-5 shadow-soft sm:p-6">
            {authed === false ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Log in to complete your purchase.</p>
                <Link
                  to="/auth"
                  search={{ redirect: `/checkout/${book.slug}` }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  <LogIn className="h-4 w-4" /> Log in to continue
                </Link>
              </div>
            ) : intentError ? (
              <div className="py-6 text-center">
                <p className="text-sm font-medium text-destructive">{(intentError as Error).message}</p>
                <Link to="/books/$slug" params={{ slug: book.slug }} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                  ← Back to book
                </Link>
              </div>
            ) : !STRIPE_PUBLISHABLE_KEY ? (
              <div className="py-6 text-center">
                <p className="text-sm font-medium text-destructive">Checkout isn't fully configured yet — please contact support.</p>
                <Link to="/books/$slug" params={{ slug: book.slug }} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                  ← Back to book
                </Link>
              </div>
            ) : creatingIntent || !checkout ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Preparing secure checkout…
              </div>
            ) : (
              <Elements
                // Elements reads the amount when it mounts, so a quantity change
                // has to rebuild it — otherwise Apple/Google Pay would show the
                // old total for the new charge.
                key={quantity}
                stripe={getStripePromise()}
                options={{
                  clientSecret: checkout.clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#e07b2e",
                      colorBackground: "transparent",
                      borderRadius: "10px",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    },
                  },
                }}
              >
                <PayForm purchaseId={checkout.purchaseId} onPromoApplied={setAppliedPromo} />
              </Elements>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function QtyStepper({ value, busy, onChange }: { value: number; busy: boolean; onChange: (next: number) => void }) {
  const step = (delta: number) => {
    const next = Math.min(MAX_QTY, Math.max(1, value + delta));
    if (next !== value) onChange(next);
  };
  return (
    <div className="inline-flex items-center rounded-lg border border-border/60">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={busy || value <= 1}
        aria-label="Decrease quantity"
        className="flex h-10 w-10 items-center justify-center rounded-l-lg text-muted-foreground transition hover:bg-accent disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex h-10 w-12 items-center justify-center border-x border-border/60 text-sm font-bold tabular-nums" aria-live="polite">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : value}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={busy || value >= MAX_QTY}
        aria-label="Increase quantity"
        className="flex h-10 w-10 items-center justify-center rounded-r-lg text-muted-foreground transition hover:bg-accent disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function PayForm({ purchaseId, onPromoApplied }: { purchaseId: string; onPromoApplied: (code: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const qc = useQueryClient();
  const applyPromo = useServerFn(applyCheckoutPromoCode);

  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const promoMut = useMutation({
    mutationFn: () => applyPromo({ data: { purchaseId, code: promoCode.trim() } }),
    onSuccess: () => {
      setPromoApplied(true);
      onPromoApplied(promoCode.trim());
      toast.success("Promo code applied!");
      qc.invalidateQueries({ queryKey: ["checkoutIntent"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setPayError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/library`,
      },
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message ?? "Payment failed — please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      window.location.href = "/dashboard/library?justPaid=1";
      return;
    }

    // Any other terminal-ish state (requires_action handled by Stripe's own
    // redirect already, processing, etc.) — send them to the library, the
    // webhook/reconcile safety net will finish settling it.
    window.location.href = "/dashboard/library?justPaid=1";
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {/* Promo code */}
      <div className="mt-4 border-t border-border/60 pt-4">
        {promoApplied ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Promo code applied
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPromoOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Tag className="h-3.5 w-3.5" /> Have a promo code?
              <ChevronDown className={`h-3 w-3 transition-transform ${promoOpen ? "rotate-180" : ""}`} />
            </button>
            {promoOpen && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  disabled={promoMut.isPending}
                  className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:border-primary/40 focus:ring-2 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => promoCode.trim() && promoMut.mutate()}
                  disabled={promoMut.isPending || !promoCode.trim()}
                  className="shrink-0 rounded-lg border border-border/60 px-3.5 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                >
                  {promoMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {payError && <p className="mt-3 text-sm text-destructive">{payError}</p>}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--gradient-accent)" }}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {submitting ? "Processing…" : "Pay now"}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Payments are processed securely by Stripe. We never see or store your card details.
      </p>
    </form>
  );
}
