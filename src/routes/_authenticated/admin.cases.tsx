import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquare, ArrowLeft, Clock, AlertCircle, CheckCircle2, Filter } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { adminListAllCases, updateCaseStatus } from "@/lib/cases.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/admin/cases")({
  head: () => ({ meta: [{ title: "Support Cases — Admin · Social Padu" }] }),
  component: AdminCasesPage,
});

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-muted text-muted-foreground",
};

function AdminCasesPage() {
  const fetchCases = useServerFn(adminListAllCases);
  const setCaseStatus = useServerFn(updateCaseStatus);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "pending" | "resolved" | "closed">("all");

  const { data: cases, isLoading } = useQuery({
    queryKey: ["adminCases"],
    queryFn: () => fetchCases(),
    refetchInterval: 30000,
  });

  const statusMut = useMutation({
    mutationFn: ({ caseId, status }: { caseId: string; status: string }) =>
      setCaseStatus({ data: { caseId, status } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["adminCases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (cases ?? []).filter((c) => filter === "all" || c.status === filter);
  const counts = {
    all: cases?.length ?? 0,
    open: cases?.filter((c) => c.status === "open").length ?? 0,
    pending: cases?.filter((c) => c.status === "pending").length ?? 0,
    resolved: cases?.filter((c) => c.status === "resolved").length ?? 0,
    closed: cases?.filter((c) => c.status === "closed").length ?? 0,
  };

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground shadow-soft transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Support Cases</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review, reply and resolve customer support tickets.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> {counts.resolved} Resolved
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              <AlertCircle className="h-3 w-3" /> {counts.open} Open
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex flex-wrap gap-2">
          {(["all", "open", "pending", "resolved", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === s
                  ? "border-primary bg-primary text-white shadow-glow"
                  : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Filter className="h-3 w-3" />
              {s === "all" ? "All cases" : s}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === s ? "bg-white/20" : "bg-muted"}`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {/* Cases list */}
        <div className="mt-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading cases…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 font-semibold">No {filter !== "all" ? filter : ""} cases</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter !== "all" ? `No ${filter} cases at the moment.` : "No support cases yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className={`group rounded-2xl border bg-card shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5 ${
                    c.status === "open" ? "border-l-4 border-l-blue-400" :
                    c.status === "pending" ? "border-l-4 border-l-amber-400" :
                    c.status === "resolved" ? "border-l-4 border-l-emerald-400" :
                    "border-l-4 border-l-border/60"
                  } border border-border/60`}
                >
                  <div className="flex flex-wrap items-center gap-4 p-5">
                    {/* User & subject */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[c.status] ?? STATUS_COLORS.open}`}>
                          {c.status}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_COLORS[c.priority] ?? PRIORITY_COLORS.normal}`}>
                          <AlertCircle className="h-2.5 w-2.5" /> {c.priority}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">{c.category.replace(/_/g, " ")}</span>
                      </div>
                      <p className="mt-1.5 font-semibold truncate">{c.subject}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>From: <span className="font-medium text-foreground">{c.profile?.full_name ?? c.profile?.username ?? "User"}</span></span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(c.last_activity_at).toLocaleString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={c.status}
                        onChange={(e) => statusMut.mutate({ caseId: c.id, status: e.target.value })}
                        className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium capitalize outline-none focus:ring-2 ring-primary/30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <Link
                        to="/dashboard/support/$caseId"
                        params={{ caseId: c.id }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:opacity-90"
                      >
                        Open case →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
