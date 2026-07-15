import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, ShoppingBag } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listMyBookPurchases } from "@/lib/books.functions";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ title: "Purchases — Social Padu" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const fetchPurchases = useServerFn(listMyBookPurchases);
  const { data: purchases, isLoading } = useQuery({ queryKey: ["bookPurchases"], queryFn: () => fetchPurchases() });

  return (
    <AppLayout>
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
                    <th className="px-5 py-3 text-right font-medium">Price</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
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
                      <td className="px-5 py-3 text-right tabular-nums">${Number(p.amount_usd).toFixed(2)}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right">
                        {p.status === "paid" ? (
                          <Link to="/dashboard/library" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
                            <BookOpen className="h-3 w-3" /> Open
                          </Link>
                        ) : p.book_slug ? (
                          <Link to="/books/$slug" params={{ slug: p.book_slug }} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
                            <ShoppingBag className="h-3 w-3" /> Retry
                          </Link>
                        ) : null}
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
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}
