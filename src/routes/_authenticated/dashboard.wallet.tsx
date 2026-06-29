import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useState } from "react";
import { Loader2, CreditCard, Lock, ShieldCheck, X, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile, listMyTransactions } from "@/lib/wallet.functions";
import { createDepositCheckout } from "@/lib/payments.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { getStripe, getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { confirmDeposit } from "@/lib/payments.functions";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Social Padu" }] }),
  component: WalletPage,
});

const ELEMENT_STYLE = {
  base: {
    color: "#0f172a",
    fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
    fontSize: "14px",
    fontSmoothing: "antialiased",
    "::placeholder": { color: "#94a3b8" },
  },
  invalid: { color: "#ef4444" },
  complete: { color: "#16a34a" },
};

function CardPaymentForm({
  clientSecret,
  localAmount,
  symbol,
  currency,
  environment,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  localAmount: string;
  symbol: string;
  currency: string;
  environment: "sandbox" | "live";
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const confirm = useServerFn(confirmDeposit);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) { setLoading(false); return; }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: { name: name.trim() || undefined },
      },
      return_url: window.location.href,
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await confirm({ data: { paymentIntentId: paymentIntent.id, environment } });
      } catch (e) {
        // Webhook may credit it anyway — still show success
        console.warn("confirmDeposit error (webhook will handle):", e);
      }
      setDone(true);
      setTimeout(onSuccess, 1800);
    } else {
      setError("Payment incomplete. Please try again.");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="font-bold text-lg">Payment successful!</p>
        <p className="text-sm text-muted-foreground">Your wallet will be credited in a few moments.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card number */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Card number
        </label>
        <div className="rounded-xl border border-border bg-background px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
          <CardNumberElement options={{ style: ELEMENT_STYLE, showIcon: true }} />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Expiry date
          </label>
          <div className="rounded-xl border border-border bg-background px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
            <CardExpiryElement options={{ style: ELEMENT_STYLE }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            CVC
          </label>
          <div className="rounded-xl border border-border bg-background px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
            <CardCvcElement options={{ style: ELEMENT_STYLE }} />
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Name on card
        </label>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Pay button */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--gradient-accent)" }}
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
          : <><Lock className="h-4 w-4" /> Pay {symbol}{localAmount} {currency}</>
        }
      </button>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          Cancel
        </button>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Secured by Stripe
        </span>
      </div>
    </form>
  );
}

function WalletPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchTx = useServerFn(listMyTransactions);
  const startCheckout = useServerFn(createDepositCheckout);
  const fetchCcy = useServerFn(getUserCurrency);
  const qc = useQueryClient();
  const [amount, setAmount] = useState(20);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: tx } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const { data: ccy } = useQuery({ queryKey: ["currency"], queryFn: () => fetchCcy() });

  const symbol = ccy?.symbol ?? "$";
  const rate = ccy?.rate ?? 1;
  const localPreview = (amount * rate).toFixed(2);

  const openCheckout = async () => {
    setCheckoutError(null);
    setClientSecret(null);
    setCheckoutLoading(true);
    try {
      const res = await startCheckout({
        data: { usdAmount: amount, environment: getStripeEnvironment() },
      });
      if ("error" in res) { setCheckoutError(res.error); toast.error(res.error); return; }
      if (!res.clientSecret) { setCheckoutError("Payment setup failed. Try again."); return; }
      setClientSecret(res.clientSecret);
      setCheckoutOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment session failed";
      setCheckoutError(msg);
      toast.error(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setClientSecret(null);
    setCheckoutError(null);
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Top up to place orders. Pay only for what you use.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Balance card */}
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">Current balance</p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-gradient">
              {symbol}{(Number(profile?.balance ?? 0) * rate).toFixed(2)} <span className="text-lg font-semibold text-muted-foreground">{ccy?.currency ?? "USD"}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ≈ ${Number(profile?.balance ?? 0).toFixed(2)} USD
            </p>
          </div>

          {/* Add funds card */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Add funds</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Pay securely by card. Charged in {ccy?.currency ?? "your local currency"} at today's rate.
            </p>
            <input
              type="number" min={1} max={2000} value={amount}
              onChange={(e) => { setAmount(Number(e.target.value)); if (checkoutOpen) closeCheckout(); }}
              className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 ring-primary/30"
            />
            {ccy && ccy.currency !== "USD" && amount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                You'll be charged ≈ <span className="font-semibold text-foreground">{symbol}{localPreview} {ccy.currency}</span>
              </p>
            )}
            {isStripeConfigured() ? (
              !checkoutOpen ? (
                <button
                  onClick={openCheckout}
                  disabled={!amount || amount <= 0 || checkoutLoading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {checkoutLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>
                    : <><CreditCard className="h-4 w-4" /> Pay ${amount} with card</>
                  }
                </button>
              ) : (
                <button
                  onClick={closeCheckout}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border/60 px-4 py-2.5 text-sm font-semibold transition hover:bg-accent"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              )
            ) : (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Card payments not yet configured. Contact support to top up your wallet.
              </div>
            )}
            {checkoutError && !checkoutOpen && (
              <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {checkoutError}
              </div>
            )}
          </div>
        </div>

        {/* Custom card payment form */}
        {checkoutOpen && clientSecret && (
          <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4" style={{ background: "var(--gradient-hero)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-accent)" }}>
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <p className="font-bold">Card payment</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Topping up <span className="font-semibold text-foreground">${amount} USD</span>
                  {ccy?.currency !== "USD" && <> · <span className="font-semibold text-foreground">{symbol}{localPreview} {ccy?.currency}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> SSL Encrypted
              </div>
            </div>

            {/* Form */}
            <div className="p-6">
              <Elements stripe={getStripe()}>
                <CardPaymentForm
                  clientSecret={clientSecret}
                  localAmount={localPreview}
                  symbol={symbol}
                  currency={ccy?.currency ?? "USD"}
                  environment={getStripeEnvironment()}
                  onSuccess={() => {
                    toast.success("Payment successful! Wallet credited.");
                    closeCheckout();
                  }}
                  onCancel={closeCheckout}
                />
              </Elements>
            </div>
          </div>
        )}

        {/* Preset top-up packages */}
        <div className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Top-up packages</h2>
              <p className="text-xs text-muted-foreground">One-tap top-ups. Tap a card, then "Pay with card".</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Starter", usd: 10, blurb: "Try out a campaign" },
              { name: "Popular", usd: 25, blurb: "Most chosen", featured: true },
              { name: "Pro",     usd: 50, blurb: "Run multiple posts" },
              { name: "Agency",  usd: 100, blurb: "Bulk client work" },
            ].map((p) => {
              const active = amount === p.usd;
              return (
                <button
                  key={p.name}
                  onClick={() => setAmount(p.usd)}
                  className={`relative rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 shadow-elegant"
                      : "border-border/60 bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
                  }`}
                >
                  {p.featured && (
                    <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow">
                      Best value
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.name}</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">${p.usd}</p>
                  {ccy && ccy.currency !== "USD" && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      ≈ {symbol}{(p.usd * rate).toFixed(2)} {ccy.currency}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{p.blurb}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="font-semibold">Transactions</h2>
          </div>
          {(tx ?? []).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <ul className="divide-y">
              {(tx ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">{t.type}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.description ?? ""} · {new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`tabular-nums text-sm font-semibold ${Number(t.amount) >= 0 ? "text-emerald-600" : "text-foreground"}`}>
                      {Number(t.amount) >= 0 ? "+" : ""}{symbol}{(Number(t.amount) * rate).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{Number(t.amount) >= 0 ? "+" : ""}${Number(t.amount).toFixed(2)} USD</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
