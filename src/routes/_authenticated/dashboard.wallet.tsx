import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, CreditCard, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile, listMyTransactions } from "@/lib/wallet.functions";
import { createDepositCheckout } from "@/lib/payments.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { getStripe, getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Social Padu" }] }),
  component: WalletPage,
});

function WalletPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchTx = useServerFn(listMyTransactions);
  const startCheckout = useServerFn(createDepositCheckout);
  const fetchCcy = useServerFn(getUserCurrency);
  const qc = useQueryClient();
  const [amount, setAmount] = useState(20);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: tx } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const { data: ccy } = useQuery({ queryKey: ["currency"], queryFn: () => fetchCcy() });

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const openCheckout = async () => {
    setCheckoutError(null);
    setClientSecret(null);
    setCheckoutLoading(true);
    try {
      const res = await startCheckout({
        data: {
          usdAmount: amount,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in res) {
        setCheckoutError(res.error);
        toast.error(res.error);
        return;
      }
      if (!res.clientSecret) {
        setCheckoutError("Stripe did not return a payment session. Check your Stripe keys in Vercel.");
        return;
      }
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

  const symbol = ccy?.symbol ?? "$";
  const rate = ccy?.rate ?? 1;
  const localPreview = (amount * rate).toFixed(2);

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Top up to place orders. Pay only for what you use.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">Current balance</p>
            <p className="mt-2 text-4xl font-bold tabular-nums">${Number(profile?.balance ?? 0).toFixed(2)}</p>
            {ccy && ccy.currency !== "USD" && (
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {symbol}{(Number(profile?.balance ?? 0) * rate).toFixed(2)} {ccy.currency}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Add funds</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Pay securely by card. Charged in {ccy?.currency ?? "your local currency"} at today's rate.
            </p>
            <input
              type="number"
              min={1}
              max={2000}
              value={amount}
              onChange={(e) => { setAmount(Number(e.target.value)); if (checkoutOpen) setCheckoutOpen(false); }}
              className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
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
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up payment…</>
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

        {/* Inline Stripe checkout — renders below the form instead of in a popup */}
        {checkoutOpen && isStripeConfigured() && (
          <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-soft">
            <div className="border-b border-border/60 px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Complete payment</p>
                <p className="text-xs text-muted-foreground">Topping up ${amount} USD · {ccy?.currency !== "USD" && `≈ ${symbol}${localPreview} ${ccy?.currency}`}</p>
              </div>
              <button onClick={closeCheckout} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              {clientSecret && (
              <EmbeddedCheckoutProvider
                stripe={getStripe()}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
              )}
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

        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4"><h2 className="font-semibold">Transactions</h2></div>
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
                  <span className={`shrink-0 tabular-nums text-sm font-semibold ${Number(t.amount) >= 0 ? "text-emerald-600" : "text-foreground"}`}>
                    {Number(t.amount) >= 0 ? "+" : ""}${Number(t.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </AppLayout>
  );
}