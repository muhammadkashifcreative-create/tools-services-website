import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, Users, MessageSquare, ShoppingBag, DollarSign, TrendingDown, TrendingUp, Plug, CheckCircle2, Database } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getMyProfile } from "@/lib/wallet.functions";
import { syncServicesFromProvider, getMarkup, updateMarkup, saveServicesConnection, getServicesConnectionStatus } from "@/lib/services.functions";
import { adminListOrders, adminStats, claimFirstAdmin, adminListUsers, adminUserOrders } from "@/lib/admin.functions";
import { adminListAllCases, updateCaseStatus } from "@/lib/cases.functions";
import { saveToolStoreConnection, saveToolStoreConnectionDirect, getToolStoreStatus } from "@/lib/toolstore.functions";
import { runDatabaseMigration } from "@/lib/migrate.server";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/admin")({
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
  const sync = useServerFn(syncServicesFromProvider);
  const saveMarkup = useServerFn(updateMarkup);
  const setCaseStatus = useServerFn(updateCaseStatus);
  const fetchUserOrders = useServerFn(adminUserOrders);
  const fetchToolStatus = useServerFn(getToolStoreStatus);
  const saveToolConn = useServerFn(saveToolStoreConnection);
  const saveToolConnDirect = useServerFn(saveToolStoreConnectionDirect);
  const runMigration = useServerFn(runDatabaseMigration);
  const saveServicesConn = useServerFn(saveServicesConnection);
  const fetchServicesStatus = useServerFn(getServicesConnectionStatus);

  const { data: stats } = useQuery({ queryKey: ["adminStats"], queryFn: () => fetchStats() });
  const { data: orders } = useQuery({ queryKey: ["adminOrders"], queryFn: () => fetchOrders() });
  const { data: users } = useQuery({ queryKey: ["adminUsers"], queryFn: () => fetchUsers() });
  const { data: cases } = useQuery({ queryKey: ["adminCases"], queryFn: () => fetchCases() });
  const { data: markup } = useQuery({ queryKey: ["markup"], queryFn: () => fetchMarkup() });
  const { data: toolStatus } = useQuery({ queryKey: ["toolStoreStatus"], queryFn: () => fetchToolStatus() });
  const { data: servicesStatus } = useQuery({ queryKey: ["servicesConnStatus"], queryFn: () => fetchServicesStatus() });
  const [markupVal, setMarkupVal] = useState<number | null>(null);
  const [toolConnCode, setToolConnCode] = useState("");
  const [toolApiUrl, setToolApiUrl] = useState("");
  const [toolApiKey, setToolApiKey] = useState("");
  const [smmApiUrl, setSmmApiUrl] = useState("");
  const [smmApiKey, setSmmApiKey] = useState("");
  const [tab, setTab] = useState<"overview" | "orders" | "users" | "cases">("overview");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: userOrders } = useQuery({
    queryKey: ["adminUserOrders", selectedUser],
    queryFn: () => fetchUserOrders({ data: { userId: selectedUser! } }),
    enabled: !!selectedUser,
  });

  const migrationMut = useMutation({
    mutationFn: () => runMigration(),
    onSuccess: (r: { ok: boolean; message: string }) => {
      toast.success(r.message);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMut = useMutation({
    mutationFn: () => sync(),
    onSuccess: (r: { count: number; skipped?: number; errors?: string[] }) => {
      const parts = [`Synced ${r.count} services`];
      if (r.skipped) parts.push(`${r.skipped} skipped`);
      toast.success(parts.join(" · "));
      if (r.errors && r.errors.length) toast.warning(r.errors[0]);
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (e: Error) => toast.error(e.message || "Sync failed"),
  });
  const markupMut = useMutation({
    mutationFn: (m: number) => saveMarkup({ data: { markup: m } }),
    onSuccess: () => {
      toast.success("Markup updated. Re-sync services to apply.");
      qc.invalidateQueries({ queryKey: ["markup"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toolConnMut = useMutation({
    mutationFn: (code: string) => saveToolConn({ data: { code } }),
    onSuccess: () => {
      toast.success("Tools store connected successfully.");
      setToolConnCode("");
      qc.invalidateQueries({ queryKey: ["toolStoreStatus"] });
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
  const servicesConnMut = useMutation({
    mutationFn: ({ api_url, api_key }: { api_url: string; api_key: string }) =>
      saveServicesConn({ data: { api_url, api_key } }),
    onSuccess: () => {
      toast.success("Social Media Services API connected successfully. Re-sync to apply.");
      setSmmApiUrl(""); setSmmApiKey("");
      qc.invalidateQueries({ queryKey: ["servicesConnStatus"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentMarkup = markupVal ?? markup?.markup ?? 25;

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Manage services, pricing, finances, users, orders and support cases.</p>

        <div className="mt-6 flex flex-wrap gap-1 rounded-lg border bg-card p-1 text-sm">
          {([
            ["overview", "Overview"],
            ["users", "Users"],
            ["orders", "Orders"],
            ["cases", "Cases"],
          ] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === "overview" && (<>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatIcon icon={DollarSign} tone="emerald" label="Total earned" value={`$${(stats?.revenue ?? 0).toFixed(2)}`} />
            <StatIcon icon={TrendingDown} tone="amber" label="Total spent (provider cost)" value={`$${(stats?.spent ?? 0).toFixed(2)}`} />
            <StatIcon icon={TrendingUp} tone="primary" label="Profit" value={`$${(stats?.profit ?? 0).toFixed(2)}`} />
            <StatIcon icon={Users} tone="default" label="Users" value={stats?.users ?? 0} />
            <StatIcon icon={ShoppingBag} tone="default" label="Total orders" value={stats?.orders ?? 0} />
            <StatIcon icon={MessageSquare} tone="default" label="Active services" value={stats?.services ?? 0} />
          </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-400">Database not set up?</p>
            <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">If you see table errors, click this once to create all required tables automatically.</p>
          </div>
          <button
            onClick={() => migrationMut.mutate()}
            disabled={migrationMut.isPending}
            className="shrink-0 inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {migrationMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Setup Database
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Sync provider catalog</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pulls all services from the upstream provider and applies the current markup.
            </p>
            <button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {syncMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync now
            </button>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Pricing markup</h3>
            <p className="mt-1 text-sm text-muted-foreground">Percentage added on top of the provider's rate.</p>
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

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Social Media Services API</h3>
              {servicesStatus?.connected && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {servicesStatus?.configuredInDb
                ? `Connected · ${servicesStatus?.apiUrl ?? ""}`
                : servicesStatus?.connected
                ? "Using env var fallback. Configure in DB to override."
                : "Enter your SMM panel API URL and key."}
            </p>
            <div className="mt-4 space-y-2">
              <input
                type="text"
                value={smmApiUrl}
                onChange={(e) => setSmmApiUrl(e.target.value)}
                placeholder="https://justanotherpanel.com/api/v2"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
              />
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={smmApiKey}
                  onChange={(e) => setSmmApiKey(e.target.value)}
                  placeholder="API key"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                />
                <button
                  onClick={() => servicesConnMut.mutate({ api_url: smmApiUrl, api_key: smmApiKey })}
                  disabled={servicesConnMut.isPending || !smmApiUrl.trim() || !smmApiKey.trim()}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {servicesConnMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                </button>
              </div>
            </div>
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
                  <tr key={o.id}>
                    <td className="px-5 py-3">{o.profile?.username ?? o.profile?.full_name ?? o.user_id.slice(0, 8)}</td>
                    <td className="px-5 py-3">{o.services?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{o.quantity.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums">${Number(o.charge).toFixed(2)}</td>
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
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-6 py-4"><h2 className="font-semibold">Users ({users?.length ?? 0})</h2></div>
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left">User</th>
                      <th className="px-5 py-3 text-right">Balance</th>
                      <th className="px-5 py-3 text-right">Orders</th>
                      <th className="px-5 py-3 text-right">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(users ?? []).map((u) => (
                      <tr key={u.id} onClick={() => setSelectedUser(u.id)}
                        className={`cursor-pointer hover:bg-accent/40 ${selectedUser === u.id ? "bg-accent/60" : ""}`}>
                        <td className="px-5 py-3 font-medium">{u.username ?? u.full_name ?? u.id.slice(0, 8)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">${Number(u.balance ?? 0).toFixed(2)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{u.orders}</td>
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
                      {(userOrders ?? []).map((o) => (
                        <tr key={o.id}>
                          <td className="px-5 py-3">{o.services?.name ?? "—"}</td>
                          <td className="px-5 py-3 text-right tabular-nums">{o.quantity.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right tabular-nums">${Number(o.charge).toFixed(2)}</td>
                          <td className="px-5 py-3 capitalize">{o.status}</td>
                        </tr>
                      ))}
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

        {tab === "cases" && (
          <div className="mt-6 overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-6 py-4"><h2 className="font-semibold">Support cases ({cases?.length ?? 0})</h2></div>
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left">User</th>
                    <th className="px-5 py-3 text-left">Subject</th>
                    <th className="px-5 py-3 text-left">Category</th>
                    <th className="px-5 py-3 text-left">Priority</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(cases ?? []).map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3">{c.profile?.username ?? c.profile?.full_name ?? c.user_id.slice(0, 8)}</td>
                      <td className="px-5 py-3">
                        <Link to="/support/$caseId" params={{ caseId: c.id }} className="font-medium hover:underline">{c.subject}</Link>
                      </td>
                      <td className="px-5 py-3 capitalize text-muted-foreground">{c.category.replace("_", " ")}</td>
                      <td className="px-5 py-3 capitalize">{c.priority}</td>
                      <td className="px-5 py-3">
                        <select value={c.status}
                          onChange={(e) => setCaseStatus({ data: { caseId: c.id, status: e.target.value } }).then(() => qc.invalidateQueries({ queryKey: ["adminCases"] }))}
                          className="rounded-md border bg-background px-2 py-1 text-xs capitalize">
                          <option value="open">open</option>
                          <option value="pending">pending</option>
                          <option value="resolved">resolved</option>
                          <option value="closed">closed</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{new Date(c.last_activity_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(cases ?? []).length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No cases yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
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

function StatIcon({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: "emerald" | "amber" | "primary" | "default" }) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    primary: "bg-primary/10 text-primary",
    default: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}