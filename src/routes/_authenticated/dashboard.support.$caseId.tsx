import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, ArrowLeft, Send, ShieldCheck, User, Clock, Tag, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getCase, addCaseMessage, updateCaseStatus } from "@/lib/cases.functions";
import { getMyProfile } from "@/lib/wallet.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/support/$caseId")({
  head: () => ({ meta: [{ title: "Case — Social Padu" }] }),
  component: CaseDetail,
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

function CaseDetail() {
  const { caseId } = useParams({ from: "/_authenticated/dashboard/support/$caseId" });
  const qc = useQueryClient();
  const fetchCase = useServerFn(getCase);
  const fetchProfile = useServerFn(getMyProfile);
  const send = useServerFn(addCaseMessage);
  const setStatus = useServerFn(updateCaseStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fetchCase({ data: { caseId } }),
    refetchInterval: 10000,
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const [reply, setReply] = useState("");
  const isAdmin = profile?.isAdmin;

  const sendMut = useMutation({
    mutationFn: () => send({ data: { caseId, body: reply } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
      qc.invalidateQueries({ queryKey: ["adminCases"] });
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

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading case…</p>
        </div>
      </AppLayout>
    );
  }

  const c = data.case;

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-3xl">

        {/* Back link */}
        <Link
          to={isAdmin ? "/admin" : "/dashboard/support"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-soft transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isAdmin ? "Back to Admin" : "Back to Cases"}
        </Link>

        {/* Case header */}
        <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight">{c.subject}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[c.status] ?? STATUS_COLORS.open}`}>
                  {c.status}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${PRIORITY_COLORS[c.priority] ?? PRIORITY_COLORS.normal}`}>
                  <AlertCircle className="h-2.5 w-2.5" /> {c.priority} priority
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Tag className="h-3 w-3" /> {c.category.replace(/_/g, " ")}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {new Date(c.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Status control — always visible */}
            <div className="flex items-center gap-2">
              {isAdmin && c.status !== "resolved" && (
                <button
                  onClick={() => statusMut.mutate("resolved")}
                  disabled={statusMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {statusMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "✓"} Mark Resolved
                </button>
              )}
              <select
                value={c.status}
                onChange={(e) => statusMut.mutate(e.target.value)}
                disabled={statusMut.isPending}
                className="rounded-lg border border-border bg-card text-foreground px-3 py-1.5 text-xs font-medium capitalize outline-none focus:ring-2 ring-ring"
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message thread */}
        <div className="mt-4 space-y-3">
          {data.messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No messages yet.
            </div>
          )}
          {data.messages.map((m) => (
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
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${m.is_staff ? "bg-primary" : "bg-slate-400"}`}>
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
        {c.status !== "closed" && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (reply.trim()) sendMut.mutate(); }}
            className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${isAdmin ? "bg-primary" : "bg-slate-400"}`}>
                {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {isAdmin ? "Reply as Support Team" : "Your reply"}
              </span>
            </div>
            <textarea
              required
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder={isAdmin ? "Type your support reply…" : "Describe your issue or follow-up…"}
              className="w-full resize-none rounded-xl border border-border bg-muted/40 text-foreground px-4 py-3 text-sm outline-none focus:ring-2 ring-ring transition placeholder:text-muted-foreground"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { statusMut.mutate("resolved"); }}
                  disabled={statusMut.isPending}
                  className="text-xs text-muted-foreground hover:text-emerald-600 transition"
                >
                  Send & close case
                </button>
              )}
              <button
                type="submit"
                disabled={sendMut.isPending || !reply.trim()}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
              >
                {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isAdmin ? "Send Reply" : "Submit"}
              </button>
            </div>
          </form>
        )}

        {c.status === "closed" && (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            This case is closed. {isAdmin && <button onClick={() => statusMut.mutate("open")} className="ml-1 text-primary hover:underline">Reopen it</button>}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
