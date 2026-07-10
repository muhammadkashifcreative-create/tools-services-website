import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Wallet, Loader2, ExternalLink, Copy, CircleCheck, CircleX, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyProfile, listMyTransactions } from "@/lib/wallet.functions";
import {
  createTopUp,
  getDepositStatus,
  reconcileMyDeposits,
  TOPUP_COINS,
  MIN_TOPUP_USD,
  MAX_TOPUP_USD,
  type CreateTopUpResult,
} from "@/lib/deposit.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Social Padu" }] }),
  component: WalletPage,
});

const QUICK_AMOUNTS = [10, 25, 50, 100];

function useCountdown(expiresAt: number | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) { setLeft(null); return; }
    const tick = () => setLeft(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (left == null) return null;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function WalletPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchTx = useServerFn(listMyTransactions);
  const fetchCcy = useServerFn(getUserCurrency);
  const startTopUp = useServerFn(createTopUp);
  const fetchDepositStatus = useServerFn(getDepositStatus);
  const reconcile = useServerFn(reconcileMyDeposits);
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("25");
  const [coinId, setCoinId] = useState<string>(TOPUP_COINS[0].id);
  const [payment, setPayment] = useState<Extract<CreateTopUpResult, { mode: "address" }> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  // Live status for the open checkout dialog.
  const { data: depositStatus } = useQuery({
    queryKey: ["deposit-status", payment?.depositId],
    queryFn: () => fetchDepositStatus({ data: { depositId: payment!.depositId } }),
    enabled: dialogOpen && !!payment,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s && s !== "pending" ? false : 5000;
    },
  });
  const settled = depositStatus && depositStatus.status !== "pending";
  const paidOk = settled && depositStatus.creditedUsd > 0;

  // When the dialog's deposit settles, refresh balance + history.
  useEffect(() => {
    if (settled) {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["deposits-reconcile"] });
    }
  }, [settled, queryClient]);

  // When a background reconcile pass credits money, refresh and tell the user.
  useEffect(() => {
    if ((deposits?.credited ?? 0) > 0) {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Payment received — your balance has been updated.");
    }
  }, [deposits, queryClient]);

  // Back from the hosted Heleket page (used for "more coins" fallback)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("topup") === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      toast.success("Payment completed. Your balance will update as soon as the network confirms it.");
    }
  }, []);

  const topUpMut = useMutation({
    mutationFn: (input: { amount: number; coinId?: string }) => startTopUp({ data: input }),
    onSuccess: (result) => {
      if (result.mode === "address") {
        setPayment(result);
        setDialogOpen(true);
      } else {
        window.location.assign(result.url);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const countdown = useCountdown(payment?.expiresAt ?? null);

  const copyAddress = async () => {
    if (!payment) return;
    try {
      await navigator.clipboard.writeText(payment.address);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy — long-press the address to copy it manually.");
    }
  };

  const parsedAmount = Number.parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount >= MIN_TOPUP_USD && parsedAmount <= MAX_TOPUP_USD;

  const symbol = ccy?.symbol ?? "$";
  const rate = ccy?.rate ?? 1;
  const pendingDeposits = deposits?.pending ?? [];
  const selectedCoin = TOPUP_COINS.find((c) => c.id === coinId) ?? TOPUP_COINS[0];

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
              <div className="relative min-w-24 flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={MIN_TOPUP_USD}
                  max={MAX_TOPUP_USD}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-sm tabular-nums outline-none ring-primary/40 focus:ring-2"
                  placeholder="Custom"
                />
              </div>
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground">Pay with</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TOPUP_COINS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCoinId(c.id)}
                  className={`rounded-md border px-2 py-1.5 text-left transition-colors ${coinId === c.id ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
                >
                  <span className="block text-xs font-semibold">{c.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{c.networkLabel}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!amountValid || topUpMut.isPending}
              onClick={() => topUpMut.mutate({ amount: Math.round(parsedAmount * 100) / 100, coinId })}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {topUpMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Pay {amountValid ? `$${parsedAmount.toFixed(2)}` : ""} with {selectedCoin.label} ({selectedCoin.networkLabel})
            </button>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Min ${MIN_TOPUP_USD}</span>
              <button
                type="button"
                disabled={!amountValid || topUpMut.isPending}
                onClick={() => topUpMut.mutate({ amount: Math.round(parsedAmount * 100) / 100 })}
                className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                More coins →
              </button>
            </div>

            {pendingDeposits.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingDeposits.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      ${d.amountUsd.toFixed(2)} top-up awaiting payment
                    </span>
                    {d.paymentUrl && (
                      <a href={d.paymentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                        Complete payment <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* In-site crypto checkout */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            {payment && !settled && (
              <>
                <DialogHeader>
                  <DialogTitle>Send {payment.payerAmount} {payment.payerCurrency}</DialogTitle>
                  <DialogDescription>
                    via {payment.networkLabel} network — send the exact amount to the address below.
                  </DialogDescription>
                </DialogHeader>

                {payment.qrCode && (
                  <div className="flex justify-center">
                    <img src={payment.qrCode} alt="Payment address QR code" className="h-44 w-44 rounded-lg border bg-white p-2" />
                  </div>
                )}

                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="break-all font-mono text-xs">{payment.address}</p>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Copy className="h-3 w-3" /> Copy address
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Waiting for payment…
                  </span>
                  {countdown && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="h-3 w-3" /> {countdown}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Your balance updates automatically after network confirmation (usually 1–5 minutes).
                  Sending a different amount or coin may delay or lose the payment.
                </p>
              </>
            )}

            {payment && settled && paidOk && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CircleCheck className="h-12 w-12 text-emerald-500" />
                <DialogTitle>Payment received</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  ${(depositStatus?.creditedUsd ?? 0).toFixed(2)} has been added to your wallet.
                </p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Done
                </button>
              </div>
            )}

            {payment && settled && !paidOk && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CircleX className="h-12 w-12 text-destructive" />
                <DialogTitle>Payment not completed</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  This payment expired or failed. No funds were credited — start a new top-up to try again.
                </p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="mt-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Close
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
