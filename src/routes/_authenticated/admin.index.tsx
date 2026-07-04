import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, ShieldCheck, Users, MessageSquare, ShoppingBag, DollarSign, TrendingDown, TrendingUp, Plug, CheckCircle2, Database, Activity, Zap, BarChart3, Mail, Server, Search, RotateCcw, Check } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile } from "@/lib/wallet.functions";
import { adminListOrders, adminStats, claimFirstAdmin, adminListUsers, adminUserOrders } from "@/lib/admin.functions";
import { adminListAllCases, updateCaseStatus } from "@/lib/cases.functions";
import { saveToolStoreConnectionDirect, getToolStoreStatus, getMarkup, updateMarkup, adminListToolPricing, setToolPriceOverride } from "@/lib/toolstore.functions";
import { runDatabaseMigration } from "@/lib/migrate.server";
import { getMaintenanceStatus, setMaintenanceMode } from "@/lib/maintenance.functions";
import { OrderDetailModal, type OrderDetailData } from "@/components/OrderDetailModal";
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
  const fetchMarkup = useServerFn(getMarkup);
  const saveMarkup = useServerFn(updateMarkup);
  const setCaseStatus = useServerFn(updateCaseStatus);
  const fetchUserOrders = useServerFn(adminUserOrders);
  const fetchToolStatus = useServerFn(getToolStoreStatus);
  const saveToolConnDirect = useServerFn(saveToolStoreConnectionDirect);
  const runMigration = useServerFn(runDatabaseMigration);
  const fetchMaintenance = useServerFn(getMaintenanceStatus);
  const saveMaintenance = useServerFn(setMaintenanceMode);

  const { data: stats } = useQuery({ queryKey: ["adminStats"], queryFn: () => fetchStats(), staleTime: 0, refetchOnWindowFocus: true });
  const { data: orders } = useQuery({ queryKey: ["adminOrders"], queryFn: () => fetchOrders(), staleTime: 0, refetchOnWindowFocus: true });
  const { data: users } = useQuery({ queryKey: ["adminUsers"], queryFn: () => fetchUsers(), staleTime: 0, refetchOnWindowFocus: true });
  const { data: cases } = useQuery({ queryKey: ["adminCases"], queryFn: () => fetchCases(), staleTime: 0, refetchOnWindowFocus: true });
  const { data: markup } = useQuery({ queryKey: ["markup"], queryFn: () => fetchMarkup() });
  const { data: toolStatus } = useQuery({ queryKey: ["toolStoreStatus"], queryFn: () => fetchToolStatus() });
  const { data: maintenance } = useQuery({ queryKey: ["maintenance"], queryFn: () => fetchMaintenance() });
  const [markupVal, setMarkupVal] = useState<number | null>(null);
  const [toolApiUrl, setToolApiUrl] = useState("");
  const [toolApiKey, setToolApiKey] = useState("");
  const [tab, setTab] = useState<"overview" | "orders" | "users" | "pricing">("overview");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetailData | null>(null);

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
  const markupMut = useMutation({
    mutationFn: (m: number) => saveMarkup({ data: { markup: m } }),
    onSuccess: () => {
      toast.success("Markup updated.");
      qc.invalidateQueries({ queryKey: ["markup"] });
      qc.invalidateQueries({ queryKey: ["toolProducts"] });
      qc.invalidateQueries({ queryKey: ["toolProductsPub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toolDirectMut = useMutation({
    mutationFn: ({ api_url, api_key }: { api_url: string; api_key: string }) =>
      saveToolConnDirect({ data: { api_url, api_key } }),
    onSuccess: () => {
      toast.success("Tools store connected successfully.");
      setToolApiUrl(""); setToolApiKey("");
      qc.invalidateQueries({ queryKey: ["toolStoreStatus"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const currentMarkup = markupVal ?? markup?.markup ?? 25;

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
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Social Padu Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">Full platform control — tools store, users, revenue & support.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold text-white tabular-nums">${(stats?.revenue ?? 0).toFixed(2)}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Revenue</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">${(stats?.profit ?? 0).toFixed(2)}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Net Profit</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold text-orange-400 tabular-nums">{stats?.orders ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Orders</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab nav with counts */}
        <div className="mt-5 flex flex-wrap gap-1 rounded-xl border bg-card p-1 text-sm shadow-soft">
          {([
            ["overview", "Overview", <BarChart3 key="o" className="h-3.5 w-3.5" />],
            ["users", "Users", <Users key="u" className="h-3.5 w-3.5" />, stats?.users],
            ["orders", "Orders", <ShoppingBag key="or" className="h-3.5 w-3.5" />, stats?.orders],
            ["pricing", "Pricing", <DollarSign key="p" className="h-3.5 w-3.5" />],
          ] as const).map(([k, l, icon, count]) => (
            <button key={k} onClick={() => setTab(k as typeof tab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-medium transition-all ${tab === k ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}>
              {icon}{l}
              {count !== undefined && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === k ? "bg-white/20" : "bg-muted"}`}>{count}</span>}
            </button>
          ))}
          <Link to="/admin/cases" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-all">
            <MessageSquare className="h-3.5 w-3.5" /> Support Cases
            {(cases?.length ?? 0) > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{cases?.length}</span>}
          </Link>
        </div>

        {tab === "overview" && (<>
          {/* KPI grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatIcon icon={DollarSign} tone="emerald" label="Total Revenue" value={`$${(stats?.revenue ?? 0).toFixed(2)}`} sub="All-time earnings" />
            <StatIcon icon={TrendingDown} tone="amber" label="Provider Cost" value={`$${(stats?.spent ?? 0).toFixed(2)}`} sub="What we pay upstream" />
            <StatIcon icon={TrendingUp} tone="primary" label="Net Profit" value={`$${(stats?.profit ?? 0).toFixed(2)}`} sub={`${stats?.revenue ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0}% margin`} />
            <StatIcon icon={Users} tone="default" label="Total Users" value={stats?.users ?? 0} sub="Registered accounts" />
            <StatIcon icon={ShoppingBag} tone="default" label="Total Orders" value={stats?.orders ?? 0} sub="All-time tool purchases" />
          </div>

          {/* System status row */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SystemChip icon={Zap} label="Tools Store" ok={toolStatus?.connected} detail={toolStatus?.adminBalance != null ? `$${toolStatus.adminBalance.toFixed(2)} balance` : "—"} />
            <SystemChip icon={Server} label="Database" ok={true} detail="Supabase" />
            <SystemChip icon={Activity} label="Stripe" ok={true} detail="Payments live" />
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
              <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">Click to check which tables exist. If any are missing, you'll get the SQL to run in Supabase.</p>
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

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Pricing markup</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              % added on top of the upstream USD cost of each tool. Selling price = provider cost × (1 + markup%). Must be &gt; 0 to avoid losses.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="number"
                value={currentMarkup}
                onChange={(e) => setMarkupVal(Number(e.target.value))}
                className="w-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <button
                onClick={() => markupMut.mutate(currentMarkup)}
                disabled={markupMut.isPending}
                className="ml-auto rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tools store API</h3>
              {toolStatus?.connected && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {toolStatus?.connected
                ? `Connected · ${toolStatus?.apiUrl ?? ""}`
                : "Enter your Tools Store API URL and key."}
            </p>
            {!toolStatus?.connected && (
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  value={toolApiUrl}
                  onChange={(e) => setToolApiUrl(e.target.value)}
                  placeholder="https://ggsoma.store/api/partner/v1"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={toolApiKey}
                    onChange={(e) => setToolApiKey(e.target.value)}
                    placeholder="API key"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                  />
                  <button
                    onClick={() => toolDirectMut.mutate({ api_url: toolApiUrl, api_key: toolApiKey })}
                    disabled={toolDirectMut.isPending || !toolApiUrl.trim() || !toolApiKey.trim()}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {toolDirectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {toolStatus?.connected && toolStatus?.adminBalance !== null && (
              <p className="mt-3 text-sm">Upstream balance: <span className="font-semibold">${toolStatus.adminBalance?.toFixed(2) ?? "—"}</span></p>
            )}
          </div>
        </div>
        </>)}

        {tab === "orders" && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-6 py-4"><h2 className="font-semibold">All orders</h2></div>
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-left">Service</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3 text-right">Charge</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(orders ?? []).map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setOrderDetail({
                      id: o.id,
                      product_name: o.name,
                      qty: o.quantity,
                      unit_price: o.unit_price,
                      total_price: o.charge,
                      codes: o.codes,
                      status: o.status,
                      created_at: o.created_at,
                      buyer: { name: o.profile?.full_name ?? o.profile?.username ?? o.user_id.slice(0, 8), email: o.email || null },
                    })}
                    className="cursor-pointer hover:bg-accent/40 transition-colors"
                    title="View order details"
                  >
                    <td className="px-5 py-3">{o.profile?.username ?? o.profile?.full_name ?? o.user_id.slice(0, 8)}</td>
                    <td className="px-5 py-3">
                      <div>{o.name}</div>
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700">
                        Tool
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{o.quantity.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums">${o.charge.toFixed(2)}</td>
                    <td className="px-5 py-3 capitalize">{o.status}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(orders ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
                      <th className="px-5 py-3 text-right">Balance</th>
                      <th className="px-5 py-3 text-right">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(users ?? []).map((u) => (
                      <tr key={u.id} onClick={() => setSelectedUser(u.id)}
                        className={`cursor-pointer hover:bg-accent/40 transition-colors ${selectedUser === u.id ? "bg-primary/5" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: "var(--gradient-accent)" }}>
                              {(u.full_name ?? u.username ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{u.username ?? u.full_name ?? u.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{(u as { email?: string }).email || "—"}</div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-emerald-600">${Number(u.balance ?? 0).toFixed(2)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">${u.spent.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold">{selectedUser ? "User orders" : "Select a user to see their orders"}</h2>
              </div>
              <div className="max-h-[600px] overflow-auto">
                {selectedUser && (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 text-left">Service</th>
                        <th className="px-5 py-3 text-right">Qty</th>
                        <th className="px-5 py-3 text-right">Charge</th>
                        <th className="px-5 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(userOrders ?? []).map((o) => {
                        const buyer = (users ?? []).find((u) => u.id === selectedUser);
                        return (
                        <tr
                          key={o.id}
                          onClick={() => setOrderDetail({
                            id: o.id,
                            product_name: o.name,
                            qty: o.quantity,
                            unit_price: o.unit_price,
                            total_price: o.charge,
                            codes: o.codes,
                            status: o.status,
                            created_at: o.created_at,
                            buyer: buyer ? { name: buyer.full_name ?? buyer.username, email: buyer.email || null } : null,
                          })}
                          className="cursor-pointer hover:bg-accent/40 transition-colors"
                          title="View order details"
                        >
                          <td className="px-5 py-3">
                            <div className="font-medium">{o.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700">
                                Tool
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">{o.quantity.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right tabular-nums">${o.charge.toFixed(2)}</td>
                          <td className="px-5 py-3 capitalize">{o.status}</td>
                        </tr>
                      );})}
                      {(userOrders ?? []).length === 0 && (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No orders.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}


        {tab === "pricing" && <PricingTab />}

      </div>

      {orderDetail && <OrderDetailModal order={orderDetail} onClose={() => setOrderDetail(null)} />}
    </AppLayout>
  );
}

function PricingTab() {
  const qc = useQueryClient();
  const fetchPricing = useServerFn(adminListToolPricing);
  const savePrice = useServerFn(setToolPriceOverride);
  const { data, isLoading } = useQuery({ queryKey: ["adminToolPricing"], queryFn: () => fetchPricing() });
  const [search, setSearch] = useState("");

  const mut = useMutation({
    mutationFn: ({ productId, priceUsd }: { productId: string; priceUsd: number | null }) =>
      savePrice({ data: { productId, priceUsd } }),
    onSuccess: (_r, vars) => {
      toast.success(vars.priceUsd == null ? "Price reset to default." : "Custom price saved.");
      qc.invalidateQueries({ queryKey: ["adminToolPricing"] });
      qc.invalidateQueries({ queryKey: ["toolProducts"] });
      qc.invalidateQueries({ queryKey: ["toolProductsPub"] });
      qc.invalidateQueries({ queryKey: ["toolProductDetail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  const customCount = items.filter((i) => i.override_price != null).length;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Product pricing</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Default price = provider cost × (1 + {data?.markup ?? 0}% markup). Set a custom USD price to override it — customers see it converted to their currency.
            {customCount > 0 && <span className="ml-1 font-semibold text-primary">{customCount} custom price{customCount > 1 ? "s" : ""} active.</span>}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 ring-ring"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.connected ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">Tools store is not connected yet.</div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">No products match your search.</div>
      ) : (
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-right">Provider cost</th>
                <th className="px-5 py-3 text-right">Default price</th>
                <th className="px-5 py-3 text-right">Selling price</th>
                <th className="px-5 py-3 text-right">Custom price (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => (
                <PricingRow
                  key={`${item.id}:${item.override_price ?? "default"}`}
                  item={item}
                  saving={mut.isPending}
                  onSave={(priceUsd) => mut.mutate({ productId: item.id, priceUsd })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PricingRow({ item, saving, onSave }: {
  item: { id: string; name: string; provider_price: number; default_price: number; override_price: number | null; in_stock: boolean };
  saving: boolean;
  onSave: (priceUsd: number | null) => void;
}) {
  const [val, setVal] = useState(item.override_price != null ? String(item.override_price) : "");
  const parsed = Number(val);
  const validInput = val.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
  const dirty = validInput && parsed !== (item.override_price ?? NaN);
  const effective = item.override_price ?? item.default_price;
  const belowCost = validInput && parsed < item.provider_price;

  return (
    <tr className={item.in_stock ? "" : "opacity-60"}>
      <td className="px-5 py-3">
        <div className="font-medium">{item.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {item.override_price != null ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Custom</span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">Default</span>
          )}
          {!item.in_stock && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">Out of stock</span>}
        </div>
      </td>
      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">${item.provider_price.toFixed(2)}</td>
      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">${item.default_price.toFixed(2)}</td>
      <td className="px-5 py-3 text-right tabular-nums font-semibold">${Number(effective).toFixed(2)}</td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={item.default_price.toFixed(2)}
              className="w-28 rounded-md border bg-background py-1.5 pl-6 pr-2 text-right text-sm tabular-nums outline-none focus:ring-2 ring-ring"
            />
          </div>
          <button
            onClick={() => onSave(parsed)}
            disabled={saving || !dirty}
            title="Save custom price"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onSave(null)}
            disabled={saving || item.override_price == null}
            title="Reset to default price"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        {belowCost && <p className="mt-1 text-right text-[10px] font-semibold text-destructive">Below provider cost — you'd sell at a loss</p>}
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
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

function SystemChip({ icon: Icon, label, ok, detail }: { icon: typeof Activity; label: string; ok?: boolean; detail?: string }) {
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