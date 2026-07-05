import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Wallet } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile, listMyTransactions } from "@/lib/wallet.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Social Padu" }] }),
  component: WalletPage,
});

function WalletPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchTx = useServerFn(listMyTransactions);
  const fetchCcy = useServerFn(getUserCurrency);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: tx } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const { data: ccy } = useQuery({ queryKey: ["currency"], queryFn: () => fetchCcy() });

  const symbol = ccy?.symbol ?? "$";
  const rate = ccy?.rate ?? 1;

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
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Online top-ups are currently unavailable. Contact support to top up your wallet.
            </div>
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
