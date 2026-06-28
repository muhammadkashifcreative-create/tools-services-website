import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getCase, addCaseMessage, updateCaseStatus } from "@/lib/cases.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/support/$caseId")({
  head: () => ({ meta: [{ title: "Case — Social Padu" }] }),
  component: CaseDetail,
});

function CaseDetail() {
  const { caseId } = useParams({ from: "/_authenticated/support/$caseId" });
  const qc = useQueryClient();
  const fetchCase = useServerFn(getCase);
  const send = useServerFn(addCaseMessage);
  const setStatus = useServerFn(updateCaseStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fetchCase({ data: { caseId } }),
    refetchInterval: 15000,
  });
  const [reply, setReply] = useState("");

  const sendMut = useMutation({
    mutationFn: () => send({ data: { caseId, body: reply } }),
    onSuccess: () => { setReply(""); qc.invalidateQueries({ queryKey: ["case", caseId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: (status: string) => setStatus({ data: { caseId, status } }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["case", caseId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <AppLayout><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }
  const c = data.case;

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard/support" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{c.subject}</h1>
          <select value={c.status} onChange={(e) => statusMut.mutate(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm capitalize">
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <span className="capitalize">{c.category.replace("_", " ")}</span>·
          <span className="capitalize">priority {c.priority}</span>·
          <span>opened {new Date(c.created_at).toLocaleDateString()}</span>
        </div>

        <div className="mt-6 space-y-3">
          {data.messages.map((m) => (
            <div key={m.id} className={`rounded-xl border p-4 ${m.is_staff ? "bg-primary/5 border-primary/30" : "bg-card"}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">{m.is_staff ? "Support team" : "You"}</span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.body}</p>
            </div>
          ))}
        </div>

        {c.status !== "closed" && (
          <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) sendMut.mutate(); }}
            className="mt-6 rounded-xl border bg-card p-3">
            <textarea required value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
              placeholder="Type your reply…"
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-ring" />
            <div className="mt-2 flex justify-end">
              <button type="submit" disabled={sendMut.isPending || !reply.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send reply
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}