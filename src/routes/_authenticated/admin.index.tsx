import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Loader2, ShieldCheck, Users, MessageSquare, ShoppingBag, DollarSign, BookOpen,
  Database, Zap, BarChart3, Mail, Server, Plus, Pencil, Trash2, UploadCloud, X, Check, Star, Undo2, Send,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile } from "@/lib/wallet.functions";
import {
  adminListOrders, adminStats, claimFirstAdmin, adminListUsers, adminUserOrders,
  getTelegramStatus, sendTestTelegramNotification,
} from "@/lib/admin.functions";
import { adminListAllCases } from "@/lib/cases.functions";
import {
  adminListBooks, adminUpsertBook, adminDeleteBook, adminCreateUploadUrl, adminDeliverPurchase, adminRequestReview,
  adminListAllReviews, deleteBookReview, getStripeStatus, getMyrRate, type Book, type AdminReview,
} from "@/lib/books.functions";
import { adminListRefunds, adminResolveRefund, type AdminRefund } from "@/lib/refunds.functions";
import { runDatabaseMigration } from "@/lib/migrate.server";
import { getMaintenanceStatus, setMaintenanceMode } from "@/lib/maintenance.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Social Padu" }] }),
  component: AdminPage,
});

function AdminPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
    retry: 1,
  });
  if (isLoading && !isError) {
    return <AppLayout><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }
  if (!profile?.isAdmin) return <ClaimAdmin />;
  return <AdminBody />;
}

function ClaimAdmin() {
  const qc = useQueryClient();
  const claim = useServerFn(claimFirstAdmin);
  const mut = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => {
      toast.success("You are now admin.");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Admin access</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No admin exists yet. As the first account, you can claim admin access for this workspace.
        </p>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim admin"}
        </button>
      </div>
    </AppLayout>
  );
}

function AdminBody() {
  const qc = useQueryClient();
  const fetchStats = useServerFn(adminStats);
  const fetchOrders = useServerFn(adminListOrders);
  const fetchUsers = useServerFn(adminListUsers);
  const fetchCases = useServerFn(adminListAllCases);
  const fetchUserOrders = useServerFn(adminUserOrders);
  const fetchStripe = useServerFn(getStripeStatus);
  const fetchTelegram = useServerFn(getTelegramStatus);
  const sendTestTelegram = useServerFn(sendTestTelegramNotification);
  const runMigration = useServerFn(runDatabaseMigration);
  const fetchMaintenance = useServerFn(getMaintenanceStatus);
  const saveMaintenance = useServerFn(setMaintenanceMode);

  const { data: stats } = useQuery({ queryKey: ["adminStats"], queryFn: () => fetchStats(), staleTime: 0, refetchOnWindowFocus: true });
  const { data: orders } = useQuery({ queryKey: ["adminOrders"], queryFn: () => fetchOrders(), staleTime: 0, refetchOnWindowFocus: true });
  const { data: users } = useQuery({ queryKey: ["adminUsers"], queryFn: () => fetchUsers(), staleTime: 0, refetchOnWindowFocus: true });
  const { data: cases } = useQuery({ queryKey: ["adminCases"], queryFn: () => fetchCases(), staleTime: 0, refetchOnWindowFocus: true });
  const fetchReviews = useServerFn(adminListAllReviews);
  const { data: reviewsData } = useQuery({ queryKey: ["adminReviews"], queryFn: () => fetchReviews(), staleTime: 0, refetchOnWindowFocus: true });
  const fetchRefunds = useServerFn(adminListRefunds);
  const { data: refundsData } = useQuery({ queryKey: ["adminRefunds"], queryFn: () => fetchRefunds(), staleTime: 0, refetchOnWindowFocus: true });
  const pendingRefunds = (refundsData?.refunds ?? []).filter((r) => r.refund_status === "requested").length;
  const { data: stripeStatus } = useQuery({ queryKey: ["stripeStatus"], queryFn: () => fetchStripe() });
  const { data: telegramStatus } = useQuery({ queryKey: ["telegramStatus"], queryFn: () => fetchTelegram() });
  const testTelegramMut = useMutation({
    mutationFn: () => sendTestTelegram(),
    onSuccess: () => toast.success("Test message sent — check your Telegram chat."),
    onError: (e: Error) => toast.error(e.message),
  });
  const { data: maintenance } = useQuery({ queryKey: ["maintenance"], queryFn: () => fetchMaintenance() });
  const fetchMyr = useServerFn(getMyrRate);
  const { data: myr } = useQuery({ queryKey: ["myrRate"], queryFn: () => fetchMyr(), staleTime: 30 * 60 * 1000 });
  const myrRate = myr?.rate ?? 4.7;
  const rm = (usd: number) => `RM${(usd * myrRate).toFixed(2)}`;
  const [tab, setTab] = useState<"overview" | "books" | "orders" | "users" | "reviews" | "refunds">("overview");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<{ id: string; name: string; email: string; bookHasFile: boolean } | null>(null);
  const pendingDeliveries = (orders ?? []).filter((o) => o.status === "paid" && o.delivery_status === "pending").length;

  const { data: userOrders } = useQuery({
    queryKey: ["adminUserOrders", selectedUser],
    queryFn: () => fetchUserOrders({ data: { userId: selectedUser! } }),
    enabled: !!selectedUser,
  });

  const [migrationSql, setMigrationSql] = useState("");
  const migrationMut = useMutation({
    mutationFn: () => runMigration(),
    onSuccess: (r: { ok: boolean; message: string; sql?: string; missing?: string[] }) => {
      if (r.ok) {
        toast.success(r.message);
        qc.invalidateQueries();
      } else {
        toast.error(r.message);
        if (r.sql) setMigrationSql(r.sql);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const maintenanceMut = useMutation({
    mutationFn: (enabled: boolean) => saveMaintenance({ data: { enabled } }),
    onSuccess: (r) => {
      toast.success(r.enabled ? "Maintenance mode is ON — visitors now see the maintenance page." : "Maintenance mode is OFF — the site is live again.");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestReview = useServerFn(adminRequestReview);
  const requestReviewMut = useMutation({
    mutationFn: (purchaseId: string) => requestReview({ data: { purchaseId } }),
    onSuccess: () => {
      toast.success("Review request sent.");
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">

        {/* Premium admin header */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #e07b2e 0%, transparent 50%), radial-gradient(circle at 80% 20%, #f59e0b 0%, transparent 40%)" }} />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--gradient-accent)" }}>
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">Admin Control Panel</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Social Padu Bookstore</h1>
              <p className="mt-1 text-sm text-slate-400">Full platform control — books, sales, users & support.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold text-white tabular-nums">{rm(stats?.revenue ?? 0)}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Revenue</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats?.sales ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Books Sold</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold text-orange-400 tabular-nums">{stats?.books ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Books Listed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab nav with counts */}
        <div className="mt-5 flex flex-wrap gap-1 rounded-xl border bg-card p-1 text-sm shadow-soft">
          {([
            ["overview", "Overview", <BarChart3 key="o" className="h-3.5 w-3.5" />, undefined],
            ["books", "Books", <BookOpen key="b" className="h-3.5 w-3.5" />, stats?.books],
            ["orders", "Sales", <ShoppingBag key="or" className="h-3.5 w-3.5" />, stats?.sales],
            ["users", "Users", <Users key="u" className="h-3.5 w-3.5" />, stats?.users],
            ["reviews", "Reviews", <Star key="rv" className="h-3.5 w-3.5" />, reviewsData?.reviews.length],
            ["refunds", "Refunds", <Undo2 key="rf" className="h-3.5 w-3.5" />, refundsData?.refunds.length],
          ] as const).map(([k, l, icon, count]) => (
            <button key={k} onClick={() => setTab(k as typeof tab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-medium transition-all ${tab === k ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}>
              {icon}{l}
              {count !== undefined && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === k ? "bg-white/20" : "bg-muted"}`}>{count}</span>}
              {k === "orders" && pendingDeliveries > 0 && (
                <span className="ml-1 animate-pulse rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingDeliveries} to deliver
                </span>
              )}
              {k === "refunds" && pendingRefunds > 0 && (
                <span className="ml-1 animate-pulse rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingRefunds} to review
                </span>
              )}
            </button>
          ))}
          <Link to="/admin/cases" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-all">
            <MessageSquare className="h-3.5 w-3.5" /> Support Cases
            {(cases?.length ?? 0) > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{cases?.length}</span>}
          </Link>
        </div>

        {tab === "overview" && (<>
          {/* KPI grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatIcon icon={DollarSign} tone="emerald" label="Total Revenue" value={rm(stats?.revenue ?? 0)} sub={`$${(stats?.revenue ?? 0).toFixed(2)} USD · all-time book sales`} />
            <StatIcon icon={ShoppingBag} tone="primary" label="Books Sold" value={stats?.sales ?? 0} sub="Paid purchases" />
            <StatIcon icon={BookOpen} tone="amber" label="Books Listed" value={stats?.books ?? 0} sub="In the catalog" />
            <StatIcon icon={Users} tone="default" label="Total Users" value={stats?.users ?? 0} sub="Registered accounts" />
          </div>

          {/* System status row */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SystemChip
              icon={Zap}
              label="Stripe Payments"
              ok={stripeStatus?.configured && stripeStatus?.webhookConfigured && stripeStatus?.publishableKeyConfigured}
              detail={
                !stripeStatus?.configured
                  ? "Set STRIPE_SECRET_KEY in Vercel"
                  : !stripeStatus?.publishableKeyConfigured
                    ? "Set VITE_STRIPE_PUBLISHABLE_KEY in Vercel — checkout page needs it"
                    : !stripeStatus?.webhookConfigured
                      ? "Key set — webhook secret missing"
                      : "Secret key + webhook + publishable key configured"
              }
            />
            <SystemChip icon={Server} label="Database" ok={true} detail="Supabase" />
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-soft">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${telegramStatus?.configured ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                <Send className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">Telegram Alerts</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {telegramStatus?.configured ? "Bot token + chat ID set" : "Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID"}
                </p>
              </div>
              <button
                onClick={() => testTelegramMut.mutate()}
                disabled={testTelegramMut.isPending || !telegramStatus?.configured}
                className="shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] font-semibold hover:bg-accent disabled:opacity-40"
              >
                {testTelegramMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send test"}
              </button>
            </div>
          </div>

          {/* Maintenance mode */}
          <div className={`mt-4 flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between ${maintenance?.enabled ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "bg-card"}`}>
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${maintenance?.enabled ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <div>
                <p className="font-semibold">
                  Maintenance mode {maintenance?.enabled ? <span className="text-amber-600">— ON</span> : <span className="text-emerald-600">— OFF</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {maintenance?.enabled
                    ? "Visitors currently see the maintenance page. You bypass it as admin."
                    : "The site is live for everyone. Turn on to show visitors a maintenance page."}
                </p>
              </div>
            </div>
            <button
              onClick={() => maintenanceMut.mutate(!maintenance?.enabled)}
              disabled={maintenanceMut.isPending || maintenance == null}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${maintenance?.enabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}
            >
              {maintenanceMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {maintenance?.enabled ? "Turn OFF — go live" : "Turn ON maintenance"}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-400">Database not set up?</p>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">Click to check which tables exist (including the new books tables). If any are missing, you'll get the SQL to run in Supabase.</p>
              </div>
              <button
                onClick={() => migrationMut.mutate()}
                disabled={migrationMut.isPending}
                className="shrink-0 inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {migrationMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Check Database
              </button>
            </div>
            {migrationSql && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-amber-800">Run this SQL in <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="underline">Supabase SQL Editor</a>:</p>
                <div className="relative">
                  <pre className="overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] text-green-400 max-h-40">{migrationSql}</pre>
                  <button
                    onClick={() => { navigator.clipboard.writeText(migrationSql); toast.success("SQL copied!"); }}
                    className="absolute right-2 top-2 rounded bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20"
                  >Copy</button>
                </div>
              </div>
            )}
          </div>
        </>)}

        {tab === "books" && <BooksTab />}

        {tab === "reviews" && <ReviewsTab />}

        {tab === "refunds" && <RefundsTab rm={rm} />}

        {tab === "orders" && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">All sales</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Paid purchases marked <strong>Needs delivery</strong> are waiting for you — click Deliver to send the book. Once delivered, use <strong>Request review</strong> to email the customer and ask for a rating.</p>
          </div>
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Book</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-left">Payment</th>
                  <th className="px-5 py-3 text-left">Delivery</th>
                  <th className="px-5 py-3 text-left">Review</th>
                  <th className="px-5 py-3 text-left">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(orders ?? []).map((o) => (
                  <tr key={o.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="max-w-40 truncate">{o.profile?.username ?? o.profile?.full_name ?? o.user_id.slice(0, 8)}</div>
                      {o.email && <div className="flex max-w-40 items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{o.email}</span></div>}
                    </td>
                    <td className="px-5 py-3">{o.name}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <div>{rm(o.charge)}</div>
                      <div className="text-[10px] text-muted-foreground">${o.charge.toFixed(2)}</div>
                    </td>
                    <td className="px-5 py-3 capitalize">{o.status}</td>
                    <td className="px-5 py-3">
                      {o.status !== "paid" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : o.delivery_status === "delivered" ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Delivered</span>
                      ) : (
                        <button
                          onClick={() => setDelivering({ id: o.id, name: o.name, email: o.email, bookHasFile: o.book_has_file })}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-amber-600"
                        >
                          <UploadCloud className="h-3 w-3" /> Needs delivery — Deliver
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {o.status !== "paid" || o.delivery_status !== "delivered" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : o.has_review ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <Star className="h-3 w-3 fill-emerald-700" /> Reviewed
                        </span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <button
                            onClick={() => requestReviewMut.mutate(o.id)}
                            disabled={requestReviewMut.isPending}
                            title={o.review_requested_at ? `First requested ${new Date(o.review_requested_at).toLocaleString()}` : undefined}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-2.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                          >
                            <Star className="h-3 w-3" /> {o.review_requested_at ? "Resend request" : "Request review"}
                          </button>
                          {o.review_requested_at && (
                            <span className="text-[10px] text-muted-foreground">Requested {new Date(o.review_requested_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(orders ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No sales yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {delivering && (
          <DeliverModal
            purchase={delivering}
            onClose={() => setDelivering(null)}
          />
        )}

        {tab === "users" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <h2 className="font-semibold">Users</h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{users?.length ?? 0}</span>
              </div>
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left">User</th>
                      <th className="px-5 py-3 text-left">Email</th>
                      <th className="px-5 py-3 text-right">Books</th>
                      <th className="px-5 py-3 text-right">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(users ?? []).map((u) => (
                      <tr key={u.id} onClick={() => setSelectedUser(u.id)}
                        className={`cursor-pointer hover:bg-accent/40 transition-colors ${selectedUser === u.id ? "bg-primary/5" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex max-w-40 items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: "var(--gradient-accent)" }}>
                              {(u.full_name ?? u.username ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate font-medium">{u.username ?? u.full_name ?? u.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="max-w-40 px-5 py-3 text-muted-foreground text-xs">
                          <div className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{(u as { email?: string }).email || "—"}</span></div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{u.orders}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-emerald-600">{rm(u.spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold">{selectedUser ? "User purchases" : "Select a user to see their purchases"}</h2>
              </div>
              <div className="max-h-[600px] overflow-auto">
                {selectedUser && (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 text-left">Book</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(userOrders ?? []).map((o) => (
                        <tr key={o.id} className="hover:bg-accent/40 transition-colors">
                          <td className="px-5 py-3 font-medium">{o.name}</td>
                          <td className="px-5 py-3 text-right tabular-nums">{rm(o.charge)}</td>
                          <td className="px-5 py-3 capitalize">{o.status}</td>
                        </tr>
                      ))}
                      {(userOrders ?? []).length === 0 && (
                        <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No purchases.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

// ─── Manual delivery ───────────────────────────────────────────────────────────

function DeliverModal({ purchase, onClose }: {
  purchase: { id: string; name: string; email: string; bookHasFile: boolean };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const deliver = useServerFn(adminDeliverPurchase);
  const createUploadUrl = useServerFn(adminCreateUploadUrl);
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  async function upload(file: File) {
    setUploading(true);
    try {
      const { uploadUrl, path } = await createUploadUrl({ data: { kind: "file", filename: file.name } });
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setFilePath(path);
      setFileName(file.name);
      toast.success("File uploaded — ready to deliver.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const mut = useMutation({
    mutationFn: () => deliver({ data: { purchaseId: purchase.id, filePath } }),
    onSuccess: () => {
      toast.success("Delivered — the customer can now download it and has been emailed.");
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canDeliver = Boolean(filePath || purchase.bookHasFile) && !uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border bg-card p-6 shadow-elegant">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Deliver book</h3>
          <button onClick={onClose} className="rounded-md p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{purchase.name}</span> for{" "}
          <span className="font-semibold text-foreground">{purchase.email || "customer"}</span>
        </p>

        <div className="mt-5 space-y-3 text-sm">
          {purchase.bookHasFile ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
              This book already has its PDF uploaded — deliver it as-is, or upload a different file just for this customer below.
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
              This book has no PDF in the catalog — upload the file to deliver to this customer.
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-accent">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            {filePath ? "Replace file" : "Upload file for this customer"}
            <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </label>
          {fileName && <p className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> {fileName}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={!canDeliver || mut.isPending}
            className="inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--gradient-accent)" }}
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Deliver {filePath ? "uploaded file" : "book PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Books manager ─────────────────────────────────────────────────────────────

type AdminBook = Book & { file_path: string | null; sales: number };

const CATEGORY_SUGGESTIONS = ["Office & Productivity", "Design & Creative", "Development & Coding", "AI & Automation", "Operating Systems", "General"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];

function BooksTab() {
  const qc = useQueryClient();
  const fetchBooks = useServerFn(adminListBooks);
  const deleteBook = useServerFn(adminDeleteBook);
  const fetchMyr = useServerFn(getMyrRate);
  const { data, isLoading } = useQuery({ queryKey: ["adminBooks"], queryFn: () => fetchBooks() });
  const { data: myr } = useQuery({ queryKey: ["myrRate"], queryFn: () => fetchMyr(), staleTime: 30 * 60 * 1000 });
  const myrRate = myr?.rate ?? 4.7;
  const [editing, setEditing] = useState<AdminBook | "new" | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteBook({ data: { id } }),
    onSuccess: (r) => {
      toast.success(r.unpublishedInstead ? "Book has sales — unpublished instead of deleting." : "Book deleted.");
      qc.invalidateQueries({ queryKey: ["adminBooks"] });
      qc.invalidateQueries({ queryKey: ["booksPub"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const books = (data?.books ?? []) as AdminBook[];

  return (
    <div className="mt-6">
      {data && !data.ready && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
          The books tables don't exist yet. Go to <strong>Overview → Check Database</strong> and run the SQL it gives you in Supabase, then come back here.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="font-semibold">Book catalog</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Add guide books, upload the PDF and cover, set the price, then publish.</p>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Plus className="h-4 w-4" /> Add book
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : books.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No books yet — click <strong>Add book</strong> to create your first one.
          </div>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Book</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Sales</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-border/60 bg-muted/40">
                          {b.cover_url ? (
                            <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{b.title}</div>
                          <div className="text-xs text-muted-foreground">{b.category} · {b.level}{b.pages ? ` · ${b.pages}p` : ""}{!b.file_path ? " · no PDF yet" : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <div>RM{(Number(b.price_usd) * myrRate).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">${Number(b.price_usd).toFixed(2)}</div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{b.sales}</td>
                    <td className="px-5 py-3">
                      {b.published ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Published</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Draft</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => setEditing(b)}
                          title="Edit book"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${b.title}"?`)) delMut.mutate(b.id); }}
                          disabled={delMut.isPending}
                          title="Delete book"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <BookEditor
          book={editing === "new" ? null : editing}
          myrRate={myrRate}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function BookEditor({ book, myrRate, onClose }: { book: AdminBook | null; myrRate: number; onClose: () => void }) {
  const qc = useQueryClient();
  const upsert = useServerFn(adminUpsertBook);
  const createUploadUrl = useServerFn(adminCreateUploadUrl);

  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [category, setCategory] = useState(book?.category ?? CATEGORY_SUGGESTIONS[0]);
  const [level, setLevel] = useState(book?.level ?? "All levels");
  const [language, setLanguage] = useState(book?.language ?? "English");
  const [pages, setPages] = useState(book?.pages ? String(book.pages) : "");
  // Admin thinks in RM; the store charges USD via Stripe, so convert on save
  const [price, setPrice] = useState(book ? (Number(book.price_usd) * myrRate).toFixed(2) : "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(book?.cover_url ?? "");
  const [filePath, setFilePath] = useState(book?.file_path ?? "");
  const [fileName, setFileName] = useState(book?.file_path ? "current PDF kept" : "");
  const [published, setPublished] = useState(book?.published ?? false);
  const [uploading, setUploading] = useState<"cover" | "file" | null>(null);

  async function upload(kind: "cover" | "file", file: File) {
    setUploading(kind);
    try {
      const { uploadUrl, path, publicUrl } = await createUploadUrl({ data: { kind, filename: file.name } });
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      if (kind === "cover" && publicUrl) setCoverUrl(publicUrl);
      if (kind === "file") { setFilePath(path); setFileName(file.name); }
      toast.success(kind === "cover" ? "Cover uploaded." : "PDF uploaded.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  const saveMut = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          ...(book ? { id: book.id } : {}),
          title: title.trim(),
          author: author.trim() || null,
          category: category.trim() || "General",
          level,
          language: language.trim() || null,
          pages: pages.trim() ? Number(pages) : null,
          price_usd: +(Number(price) / myrRate).toFixed(2),
          description: description.trim() || null,
          cover_url: coverUrl || null,
          file_path: filePath || null,
          published,
        },
      }),
    onSuccess: (r: { ok: boolean; id: string; announcement: { sent: number } | { error: string } | null }) => {
      toast.success(book ? "Book updated." : "Book created.");
      if (r.announcement) {
        if ("sent" in r.announcement) {
          toast.success(`📣 Launch announcement emailed to ${r.announcement.sent} reader${r.announcement.sent === 1 ? "" : "s"}.`);
        } else {
          toast.error(`Book saved, but the launch email failed: ${r.announcement.error}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["adminBooks"] });
      qc.invalidateQueries({ queryKey: ["booksPub"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const priceOk = Number.isFinite(Number(price)) && Number(price) / myrRate >= 1;
  const canSave = title.trim().length >= 2 && priceOk && !uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border bg-card p-6 shadow-elegant">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{book ? "Edit book" : "Add a new book"}</h3>
          <button onClick={onClose} className="rounded-md p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm">
            <span className="mb-1.5 block font-medium">Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Excel 2026 — From Zero to Power User"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Author</span>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Price (RM) *</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RM</span>
              <input type="number" min={myrRate} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.00"
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm tabular-nums outline-none focus:ring-2 ring-ring" />
            </div>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              ≈ ${Number.isFinite(Number(price)) && Number(price) > 0 ? (Number(price) / myrRate).toFixed(2) : "0.00"} USD — Stripe charges in USD. Minimum $1.00 USD (≈ RM{myrRate.toFixed(2)}) — lower prices can fail at checkout for some payment methods.
            </span>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} list="book-categories"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring" />
            <datalist id="book-categories">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Language</span>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} list="book-languages" placeholder="English"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring" />
            <datalist id="book-languages">
              {["English", "Malay", "Chinese", "Tamil", "Arabic", "Indonesian"].map((l) => <option key={l} value={l} />)}
            </datalist>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Level</span>
              <select value={level} onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring">
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Pages</span>
              <input type="number" min={1} value={pages} onChange={(e) => setPages(e.target.value)} placeholder="120"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 ring-ring" />
            </label>
          </div>
          <label className="sm:col-span-2 text-sm">
            <span className="mb-1.5 block font-medium">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              placeholder="What the reader will learn, chapter highlights, who it's for…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring" />
          </label>

          {/* Cover upload */}
          <div className="text-sm">
            <span className="mb-1.5 block font-medium">Cover image</span>
            <div className="flex items-center gap-3">
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-border/60 bg-muted/40">
                {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-accent">
                {uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                {coverUrl ? "Replace" : "Upload"} cover
                <input type="file" accept="image/*" className="hidden" disabled={uploading !== null}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload("cover", f); e.target.value = ""; }} />
              </label>
            </div>
          </div>

          {/* PDF upload */}
          <div className="text-sm">
            <span className="mb-1.5 block font-medium">Book PDF <span className="font-normal text-muted-foreground">(optional)</span></span>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-accent">
                {uploading === "file" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                {filePath ? "Replace" : "Upload"} PDF
                <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={uploading !== null}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload("file", f); e.target.value = ""; }} />
              </label>
              {fileName && <span className="inline-flex items-center gap-1 truncate text-xs text-emerald-600"><Check className="h-3 w-3" />{fileName}</span>}
            </div>
          </div>

          <label className="sm:col-span-2 flex items-center gap-2.5 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-[#e07b2e]" />
            <span>
              <span className="font-semibold">Published</span>
              <span className="ml-2 text-xs text-muted-foreground">Visible in the public library. First publish emails a launch announcement to all subscribed users. Without a PDF, you deliver each sale yourself from the Sales tab.</span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!canSave || saveMut.isPending}
            className="inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--gradient-accent)" }}
          >
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {book ? "Save changes" : "Create book"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Refund approvals ───────────────────────────────────────────────────────────

function RefundsTab({ rm }: { rm: (usd: number) => string }) {
  const qc = useQueryClient();
  const fetchRefunds = useServerFn(adminListRefunds);
  const resolve = useServerFn(adminResolveRefund);
  const { data, isLoading } = useQuery({ queryKey: ["adminRefunds"], queryFn: () => fetchRefunds() });
  const refunds = (data?.refunds ?? []) as AdminRefund[];

  const mut = useMutation({
    mutationFn: (v: { purchaseId: string; action: "approve" | "reject" }) => resolve({ data: v }),
    onSuccess: (r) => {
      toast.success(r.action === "refunded" ? "Refund approved — money returned to the customer via Stripe." : "Refund request declined.");
      qc.invalidateQueries({ queryKey: ["adminRefunds"] });
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-6 overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">Refund requests</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Customers request refunds and <strong>you approve before any money is returned</strong>. Approving issues the Stripe refund automatically.</p>
      </div>
      {data && !data.ready && (
        <div className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
          Refunds need a database update. Go to <strong>Overview → Check Database</strong> and run the SQL it gives you, then come back.
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : refunds.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">No refund requests.</div>
      ) : (
        <div className="max-h-[600px] divide-y overflow-auto">
          {refunds.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start gap-4 px-6 py-4 hover:bg-accent/30 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.book_title}</span>
                  <span className="tabular-nums text-sm text-muted-foreground">{rm(r.amount_usd)} · ${r.amount_usd.toFixed(2)}</span>
                  <RefundStatusPill status={r.refund_status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.customer_email || r.customer_name || "customer"}</span>
                  {r.refund_requested_at && <span>· {new Date(r.refund_requested_at).toLocaleString()}</span>}
                </div>
                {r.refund_reason && <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">“{r.refund_reason}”</p>}
              </div>
              {r.refund_status === "requested" && (
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                  <button
                    onClick={() => { if (confirm(`Decline the refund request for "${r.book_title}"?`)) mut.mutate({ purchaseId: r.id, action: "reject" }); }}
                    disabled={mut.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => { if (confirm(`Approve and refund ${rm(r.amount_usd)} to ${r.customer_email || "the customer"}? This returns the money via Stripe.`)) mut.mutate({ purchaseId: r.id, action: "approve" }); }}
                    disabled={mut.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve &amp; refund
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RefundStatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    requested: "bg-blue-100 text-blue-700",
    refunded: "bg-emerald-100 text-emerald-700",
    rejected: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = { requested: "Awaiting review", refunded: "Refunded", rejected: "Declined" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls[status] ?? "bg-muted text-muted-foreground"}`}>{label[status] ?? status}</span>;
}

// ─── Review moderation ──────────────────────────────────────────────────────────

function ReviewsTab() {
  const qc = useQueryClient();
  const fetchReviews = useServerFn(adminListAllReviews);
  const removeReview = useServerFn(deleteBookReview);
  const { data, isLoading } = useQuery({ queryKey: ["adminReviews"], queryFn: () => fetchReviews() });
  const reviews = (data?.reviews ?? []) as AdminReview[];

  const delMut = useMutation({
    mutationFn: (id: string) => removeReview({ data: { reviewId: id } }),
    onSuccess: () => {
      toast.success("Review deleted.");
      qc.invalidateQueries({ queryKey: ["adminReviews"] });
      qc.invalidateQueries({ queryKey: ["booksPub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-6 overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">Customer reviews</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Every live review from verified buyers. Remove any that break your guidelines — the rating averages update instantly.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">No reviews yet.</div>
      ) : (
        <div className="max-h-[600px] divide-y overflow-auto">
          {reviews.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start gap-4 px-6 py-4 hover:bg-accent/30 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </span>
                  <span className="text-xs font-semibold">{r.author}</span>
                  <span className="text-xs text-muted-foreground">on</span>
                  {r.book_slug ? (
                    <Link to="/books/$slug" params={{ slug: r.book_slug }} className="text-xs font-medium text-primary hover:underline">{r.book_title}</Link>
                  ) : (
                    <span className="text-xs font-medium">{r.book_title}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">· {new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p>
              </div>
              <button
                onClick={() => { if (confirm(`Delete this review by ${r.author}?`)) delMut.mutate(r.id); }}
                disabled={delMut.isPending}
                title="Delete review"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-destructive hover:bg-destructive/10 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatIcon({ icon: Icon, label, value, tone, sub }: { icon: typeof Users; label: string; value: number | string; tone: "emerald" | "amber" | "primary" | "default"; sub?: string }) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    primary: "bg-primary/10 text-primary",
    default: "bg-muted text-muted-foreground",
  }[tone];
  const valClass = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    primary: "text-gradient",
    default: "",
  }[tone];
  return (
    <div className="group rounded-xl border bg-card p-5 shadow-soft transition hover:shadow-elegant hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${valClass}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SystemChip({ icon: Icon, label, ok, detail }: { icon: typeof Users; label: string; ok?: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-soft">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ok ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{detail ?? (ok ? "Connected" : "Not configured")}</p>
      </div>
      <div className={`ml-auto h-2 w-2 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-destructive"}`} />
    </div>
  );
}
