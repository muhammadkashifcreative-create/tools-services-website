import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Copy, Check, ShoppingBag } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listMyToolOrders } from "@/lib/toolstore.functions";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ title: "Orders — Social Padu" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const fetchOrders = useServerFn(listMyToolOrders);
  const { data: orders, isLoading } = useQuery({ queryKey: ["toolOrders"], queryFn: () => fetchOrders() });

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Every tool you've purchased — codes included.</p>
          </div>
          <Link
            to="/tools/store"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:text-sm"
            style={{ background: "var(--gradient-accent)" }}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Browse store
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (orders ?? []).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No orders yet. <Link to="/tools/store" className="font-medium text-primary hover:underline">Browse the store →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Product</th>
                    <th className="px-5 py-3 text-right font-medium">Qty</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Codes</th>
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(orders ?? []).map((o) => (
                    <tr key={o.id} className="hover:bg-accent/30">
                      <td className="px-5 py-3">
                        <div className="font-medium">{o.product_name}</div>
                        <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{o.qty}</td>
                      <td className="px-5 py-3 text-right tabular-nums">${Number(o.total_price).toFixed(2)}</td>
                      <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-5 py-3"><CodesCell codes={(o.codes as string[] | null) ?? []} /></td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CodesCell({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  if (!codes.length) return <span className="text-xs text-muted-foreground">—</span>;

  const copy = () => {
    navigator.clipboard?.writeText(codes.join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[180px] truncate font-mono text-xs">{codes[0]}{codes.length > 1 ? ` +${codes.length - 1}` : ""}</span>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent"
        title="Copy code(s)"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    processing: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    canceled: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}
