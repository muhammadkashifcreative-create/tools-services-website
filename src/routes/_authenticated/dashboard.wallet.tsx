import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Wallet, Bitcoin, Loader2, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile, listMyTransactions } from "@/lib/wallet.functions";
import { createTopUp, reconcileMyDeposits, MIN_TOPUP_USD, MAX_TOPUP_USD } from "@/lib/deposit.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Social Padu" }] }),
  component: WalletPage,
});

const QUICK_AMOUNTS = [10, 25, 50, 100];

function WalletPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchTx = useServerFn(listMyTransactions);
  const fetchCcy = useServerFn(getUserCurrency);
  const startTopUp = useServerFn(createTopUp);
  const reconcile = useServerFn(reconcileMyDeposits);
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("25");

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: tx } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const { data: ccy } = useQuery({ queryKey: ["currency"], queryFn: () => fetchCcy() });

  // Settles paid deposits even if a webhook was missed; keeps polling while
  // a top-up is still awaiting blockchain confirmation.
  const { data: deposits } = useQuery({
    queryKey: ["deposits-reconcile"],
    queryFn: () => reconcile(),
    refetchInterval: (query) => ((query.state.data?.pending?.length ?? 0) > 0 ? 8000 : false),
  });

  // When a reconcile pass credits money, refresh balance + history and tell the user.
  useEffect(() => {
    if ((deposits?.credited ?? 0) > 0) {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Payment received — your balance has been updated.");
    }
  }, [deposits, queryClient]);

  // Back from the Heleket payment page
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("topup") === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      toast.success("Payment completed. Your balance will update as soon as the network confirms it.");
    }
  }, []);

  const topUpMut = useMutation({
    mutationFn: (usd: number) => startTopUp({ data: { amount: usd } }),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parsedAmount = Number.parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount >= MIN_TOPUP_USD && parsedAmount <= MAX_TOPUP_USD;

  const symbol = ccy?.symbol ?? "$";
  const rate = ccy?.rate ?? 1;
  const pendingDeposits = deposits?.pending ?? [];

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Your balance is used to place orders. Pay only for what you use.</p>

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
            <h3 className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4 text-primary" /> Add funds</h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((usd) => (
                <button
                  key={usd}
                  type="button"
                  onClick={() => setAmount(String(usd))}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${amount === String(usd) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  ${usd}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={MIN_TOPUP_USD}
                  max={MAX_TOPUP_USD}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border bg-background py-2 pl-7 pr-3 text-sm tabular-nums outline-none ring-primary/40 focus:ring-2"
                  placeholder="Amount in USD"
                />
              </div>
              <button
                type="button"
                disabled={!amountValid || topUpMut.isPending}
                onClick={() => topUpMut.mutate(Math.round(parsedAmount * 100) / 100)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {topUpMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bitcoin className="h-4 w-4" />}
                Pay with crypto
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Min ${MIN_TOPUP_USD} · Pay with BTC, ETH, USDT and 100+ other coins. You&apos;ll be redirected to a secure payment page.
            </p>

            {pendingDeposits.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingDeposits.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      ${d.amountUsd.toFixed(2)} top-up awaiting payment
                    </span>
                    {d.paymentUrl && (
                      <a href={d.paymentUrl} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                        Complete payment <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                    <p className="text-sm font-medium capitalize">{{ deposit: "Wallet top-up", order: "Order placed", refund: "Order refund", tool_purchase: "Tool purchase" }[t.type] ?? t.type}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {(t.description ?? "").replace(/^stripe:\S+\s*/, "").trim() || (t.description ?? "")}
                      {" · "}{new Date(t.created_at).toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
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
