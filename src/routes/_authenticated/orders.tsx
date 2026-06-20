import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Loader2, Clock4 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listMyOrders, refreshOrderStatus } from "@/lib/orders.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — iGroBrand" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const refresh = useServerFn(refreshOrderStatus);
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => fetchOrders() });

  const mut = useMutation({
    mutationFn: (orderId: string) => refresh({ data: { orderId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Track and refresh every order you've placed.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur sm:text-xs">
            <Clock4 className="h-3.5 w-3.5 text-primary" />
            <span>Processed within 72 business hours</span>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (orders ?? []).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No orders yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Service</th>
                    <th className="px-5 py-3 text-left font-medium">Link</th>
                    <th className="px-5 py-3 text-right font-medium">Qty</th>
                    <th className="px-5 py-3 text-right font-medium">Remains</th>
                    <th className="px-5 py-3 text-right font-medium">Charge</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(orders ?? []).map((o) => (
                    <tr key={o.id} className="hover:bg-accent/30">
                      <td className="px-5 py-3">
                        <div className="font-medium">{o.services?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.services?.platform ?? ""}</div>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3 text-muted-foreground">{o.link}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{o.quantity.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{o.remains ?? "—"}</td>
                      <td className="px-5 py-3 text-right tabular-nums">${Number(o.charge).toFixed(2)}</td>
                      <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => mut.mutate(o.id)}
                          disabled={mut.isPending}
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                        >
                          <RefreshCw className="h-3 w-3" /> Refresh
                        </button>
                      </td>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    processing: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    "in progress": "bg-blue-100 text-blue-700",
    partial: "bg-violet-100 text-violet-700",
    canceled: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}