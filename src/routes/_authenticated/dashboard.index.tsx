import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, Receipt, ShoppingBag } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile } from "@/lib/wallet.functions";
import { listMyBookPurchases } from "@/lib/books.functions";
import { getUserCurrency } from "@/lib/geo.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — Social Padu" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchPurchases = useServerFn(listMyBookPurchases);
  const fetchCcy = useServerFn(getUserCurrency);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: purchases } = useQuery({ queryKey: ["bookPurchases"], queryFn: () => fetchPurchases() });
  const { data: ccy } = useQuery({ queryKey: ["user-currency"], queryFn: () => fetchCcy(), staleTime: 30 * 60 * 1000 });

  const symbol = ccy?.symbol ?? "$";
  const rate = ccy?.rate ?? 1;
  const fmt = (usd: number) => `${symbol}${(usd * rate).toFixed(2)}`;
  const paid = (purchases ?? []).filter((p) => p.status === "paid");
  const totalSpent = paid.reduce((s, p) => s + Number(p.amount_usd), 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Here's a quick overview of your account.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard icon={BookOpen} label="Books owned" value={String(paid.length)} />
          <StatCard icon={Receipt} label="Total purchases" value={String(purchases?.length ?? 0)} />
          <StatCard icon={ShoppingBag} label="Total spent" value={fmt(totalSpent)} sub={`$${totalSpent.toFixed(2)} USD`} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Link
            to="/books"
            className="group rounded-xl border bg-card p-6 transition hover:border-primary/40 hover:shadow-sm lg:col-span-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Browse the book library</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Practical guide books for the software you use — instant PDF download.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </Link>
          <Link
            to="/dashboard/library"
            className="group rounded-xl border bg-card p-6 transition hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">My Library</h3>
                <p className="mt-1 text-sm text-muted-foreground">Download the books you own.</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="font-semibold">Recent purchases</h2>
            <Link to="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          {(purchases ?? []).length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No purchases yet. <Link to="/books" className="font-medium text-primary hover:underline">Browse the library →</Link>
            </div>
          ) : (
            <ul className="divide-y">
              {(purchases ?? []).slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.book_title}</p>
                    <p className="truncate text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                    <StatusBadge status={p.status === "paid" && p.delivery_status === "pending" ? "preparing" : p.status} />
                    <span className="w-20 text-right text-sm font-medium tabular-nums">{fmt(Number(p.amount_usd))}</span>
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

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof BookOpen; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    preparing: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}
