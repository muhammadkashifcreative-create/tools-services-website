import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, MessageSquare, ArrowLeft, Clock, AlertCircle, CheckCircle2,
  Filter, X, Send, ShieldCheck, User,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { adminListAllCases, updateCaseStatus, getCase, addCaseMessage } from "@/lib/cases.functions";
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
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

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
            <p className="mt-1 text-sm text-muted-foreground">Click any case to review, reply and resolve customer support tickets.</p>
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
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`group cursor-pointer rounded-2xl border bg-card shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5 ${
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
                    <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.status}
                        onChange={(e) => statusMut.mutate({ caseId: c.id, status: e.target.value })}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium capitalize outline-none focus:ring-2 ring-primary/30 cursor-pointer"
                      >
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button
                        onClick={() => setSelectedCaseId(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:opacity-90"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Case detail modal */}
      {selectedCaseId && (
        <CaseModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
        />
      )}
    </AppLayout>
  );
}

function CaseModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const fetchCase = useServerFn(getCase);
  const send = useServerFn(addCaseMessage);
  const setStatus = useServerFn(updateCaseStatus);
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fetchCase({ data: { caseId } }),
    refetchInterval: 10000,
  });

  const sendMut = useMutation({
    mutationFn: () => send({ data: { caseId, body: reply } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
      qc.invalidateQueries({ queryKey: ["adminCases"] });
      toast.success("Reply sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => setStatus({ data: { caseId, status } }),
    onSuccess: (_, status) => {
      toast.success(`Case marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["case", caseId] });
      qc.invalidateQueries({ queryKey: ["adminCases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = data?.case;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[88vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4 bg-card">
          <div className="flex-1 min-w-0">
            {c ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Support Case</p>
                <h2 className="font-bold text-sm sm:text-base truncate">{c.subject}</h2>
              </>
            ) : (
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {c && (
              <select
                value={c.status}
                onChange={(e) => statusMut.mutate(e.target.value)}
                disabled={statusMut.isPending}
                className="rounded-lg border border-border bg-card text-foreground px-3 py-1.5 text-xs font-medium capitalize outline-none focus:ring-2 ring-primary/30"
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            )}
            {c && c.status !== "resolved" && (
              <button
                onClick={() => statusMut.mutate("resolved")}
                disabled={statusMut.isPending}
                title="Mark resolved"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:px-3 sm:py-1.5"
              >
                {statusMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                <span className="hidden sm:inline">Resolve</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-border bg-card p-2.5 hover:bg-accent transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Case meta row */}
        {c && (
          <div className="flex flex-wrap items-center gap-2 border-b px-5 py-2.5 bg-muted/30 text-[11px]">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold capitalize ${STATUS_COLORS[c.status] ?? STATUS_COLORS.open}`}>
              {c.status}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold capitalize ${PRIORITY_COLORS[c.priority] ?? PRIORITY_COLORS.normal}`}>
              <AlertCircle className="h-2.5 w-2.5" /> {c.priority} priority
            </span>
            <span className="text-muted-foreground capitalize">{c.category.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(c.created_at).toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        )}

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {data && data.messages.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No messages yet.
            </div>
          )}
          {data?.messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border p-4 ${
                m.is_staff
                  ? "border-primary/30 bg-primary/5 ml-6"
                  : "border-border/60 bg-card mr-6"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${m.is_staff ? "bg-primary" : "bg-slate-400"}`}>
                    {m.is_staff ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  </div>
                  <span className="text-xs font-semibold">
                    {m.is_staff ? "Support Team" : "Customer"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>

        {/* Reply box */}
        {c && c.status !== "closed" && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (reply.trim()) sendMut.mutate(); }}
            className="border-t bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                <ShieldCheck className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Reply as Support Team</span>
            </div>
            <textarea
              required
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Type your support reply…"
              className="w-full resize-none rounded-xl border border-border bg-muted/40 text-foreground px-4 py-3 text-sm outline-none focus:ring-2 ring-ring transition placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => statusMut.mutate("resolved")}
                disabled={statusMut.isPending || c.status === "resolved"}
                className="text-xs text-muted-foreground hover:text-emerald-600 transition disabled:opacity-40"
              >
                Mark as resolved
              </button>
              <button
                type="submit"
                disabled={sendMut.isPending || !reply.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
              >
                {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Reply
              </button>
            </div>
          </form>
        )}

        {c && c.status === "closed" && (
          <div className="border-t bg-card px-5 py-4 text-center text-sm text-muted-foreground">
            This case is closed.{" "}
            <button onClick={() => statusMut.mutate("open")} className="text-primary hover:underline">
              Reopen it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
