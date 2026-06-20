import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Wallet, Receipt, Sparkles, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile } from "@/lib/wallet.functions";
import { listMyOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — iGroBrand" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchOrders = useServerFn(listMyOrders);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: orders } = useQuery({ queryKey: ["orders"], queryFn: () => fetchOrders() });

  const totalSpent = (orders ?? []).reduce((s, o) => s + Number(o.charge), 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Here's a quick overview of your account.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Wallet} label="Wallet balance" value={`$${Number(profile?.balance ?? 0).toFixed(2)}`} />
          <StatCard icon={Receipt} label="Total orders" value={String(orders?.length ?? 0)} />
          <StatCard icon={TrendingUp} label="Total spent" value={`$${totalSpent.toFixed(2)}`} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Link
            to="/new-order"
            className="group rounded-xl border bg-card p-6 transition hover:border-primary/40 hover:shadow-sm lg:col-span-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Place a new order</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse services across every platform and start boosting.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </Link>
          <Link
            to="/wallet"
            className="group rounded-xl border bg-card p-6 transition hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Top up</h3>
                <p className="mt-1 text-sm text-muted-foreground">Add funds to your wallet.</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="font-semibold">Recent orders</h2>
            <Link to="/orders" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          {(orders ?? []).length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No orders yet. <Link to="/new-order" className="font-medium text-primary hover:underline">Place your first one →</Link>
            </div>
          ) : (
            <ul className="divide-y">
              {(orders ?? []).slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.services?.name ?? "Service"}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.link}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                    <span className="hidden text-sm tabular-nums sm:inline">{o.quantity.toLocaleString()}</span>
                    <StatusBadge status={o.status} />
                    <span className="w-16 text-right text-sm font-medium tabular-nums">${Number(o.charge).toFixed(2)}</span>
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

function StatCard({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    processing: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    partial: "bg-violet-100 text-violet-700",
    canceled: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}