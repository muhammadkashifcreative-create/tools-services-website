import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BookOpen, Loader2, RotateCcw, ShoppingBag, Undo2, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listMyBookPurchases } from "@/lib/books.functions";
import { requestBookRefund } from "@/lib/refunds.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ title: "Purchases — Social Padu" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const fetchPurchases = useServerFn(listMyBookPurchases);
  const fetchCcy = useServerFn(getUserCurrency);
  const { data: purchases, isLoading } = useQuery({ queryKey: ["bookPurchases"], queryFn: () => fetchPurchases() });
  const { data: ccy } = useQuery({ queryKey: ["user-currency"], queryFn: () => fetchCcy(), staleTime: 30 * 60 * 1000 });
  const symbol = ccy?.symbol ?? "$";
  const rate = ccy?.rate ?? 1;
  const fmt = (usd: number) => `${symbol}${(usd * rate).toFixed(2)}`;
  const [refundFor, setRefundFor] = useState<{ id: string; title: string } | null>(null);

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Purchases</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Every book you've bought — downloads live in your Library.</p>
          </div>
          <Link
            to="/dashboard/library"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:text-sm"
            style={{ background: "var(--gradient-accent)" }}
          >
            <BookOpen className="h-3.5 w-3.5" /> My Library
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (purchases ?? []).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No purchases yet. <Link to="/books" className="font-medium text-primary hover:underline">Browse the library →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Book</th>
                    <th className="px-5 py-3 text-center font-medium">Qty</th>
                    <th className="px-5 py-3 text-right font-medium">Price</th>
                    <th className="px-5 py-3 text-left font-medium">Payment</th>
                    <th className="px-5 py-3 text-left font-medium">Delivery</th>
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(purchases ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-border/60 bg-muted/40">
                            {p.cover_url ? (
                              <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium">{p.book_title}</div>
                            <div className="text-xs text-muted-foreground">#{p.id.slice(0, 8).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center tabular-nums">{p.quantity ?? 1}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <div>{fmt(Number(p.amount_usd))}</div>
                        <div className="text-[10px] text-muted-foreground">${Number(p.amount_usd).toFixed(2)} USD</div>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3">
                        {p.status !== "paid" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : p.delivery_status === "delivered" ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Delivered</span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Being prepared</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {p.status === "paid" && p.delivery_status === "delivered" && (
                            <Link to="/dashboard/library" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
                              <BookOpen className="h-3 w-3" /> Open
                            </Link>
                          )}
                          {p.status !== "paid" && p.book_slug && (
                            <Link to="/checkout/$slug" params={{ slug: p.book_slug }} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
                              <ShoppingBag className="h-3 w-3" /> Retry
                            </Link>
                          )}
                          {p.status === "paid" && p.book_slug && (
                            <Link
                              to="/checkout/$slug"
                              params={{ slug: p.book_slug }}
                              className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                            >
                              <RotateCcw className="h-3 w-3" /> Buy again
                            </Link>
                          )}
                          {p.status === "paid" && (
                            (p.refund_status ?? "none") === "none" ? (
                              <button
                                onClick={() => setRefundFor({ id: p.id, title: p.book_title })}
                                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                              >
                                <Undo2 className="h-3 w-3" /> Request refund
                              </button>
                            ) : (
                              <RefundBadge status={p.refund_status ?? "none"} />
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {refundFor && <RefundModal purchaseId={refundFor.id} bookTitle={refundFor.title} onClose={() => setRefundFor(null)} />}
    </AppLayout>
  );
}

function RefundModal({ purchaseId, bookTitle, onClose }: { purchaseId: string; bookTitle: string; onClose: () => void }) {
  const qc = useQueryClient();
  const submit = useServerFn(requestBookRefund);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => submit({ data: { purchaseId, reason: reason.trim() } }),
    onSuccess: () => {
      toast.success("Refund request sent — we'll review it and email you.");
      qc.invalidateQueries({ queryKey: ["bookPurchases"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border bg-card p-6 shadow-elegant">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Request a refund</h3>
          <button onClick={onClose} className="rounded-md p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          For <span className="font-semibold text-foreground">{bookTitle}</span>. Our team reviews every request — no money is returned until it's approved.
        </p>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium">Why are you requesting a refund?</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Tell us what went wrong so we can make it right…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
          />
        </label>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || reason.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--gradient-accent)" }}
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    requested: { label: "Refund requested", cls: "bg-blue-100 text-blue-700" },
    refunded: { label: "Refunded", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Refund declined", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status];
  if (!s) return null;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}
