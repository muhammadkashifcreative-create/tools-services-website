import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listMyCases, createCase } from "@/lib/cases.functions";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  head: () => ({ meta: [{ title: "Support — Social Padu" }] }),
  component: SupportPage,
});

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-600",
  pending: "bg-amber-500/15 text-amber-600",
  resolved: "bg-emerald-500/15 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
};

function SupportPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchCases = useServerFn(listMyCases);
  const create = useServerFn(createCase);
  const { data: cases, isLoading } = useQuery({ queryKey: ["my-cases"], queryFn: () => fetchCases() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "other", priority: "normal", body: "" });

  const mut = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success("Case created");
      setOpen(false);
      setForm({ subject: "", category: "other", priority: "normal", body: "" });
      qc.invalidateQueries({ queryKey: ["my-cases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("nav.cases")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Open a case if you need help. Our team replies inside the thread.</p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Plus className="h-4 w-4" /> {t("cta.newCase")}
          </button>
        </div>

        {open && (
          <form
            onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
            className="mt-6 space-y-3 rounded-xl border bg-card p-5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input required minLength={3} maxLength={160} placeholder={t("case.subject")}
                value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-ring placeholder:text-muted-foreground" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 ring-ring">
                  <option value="order_issue">Order issue</option>
                  <option value="refund">Refund</option>
                  <option value="payment">Payment</option>
                  <option value="account">Account</option>
                  <option value="technical">Technical</option>
                  <option value="other">Other</option>
                </select>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 ring-ring">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <textarea required minLength={5} maxLength={4000} rows={5} placeholder={t("case.message")}
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full rounded-md border border-border bg-muted/40 text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-ring placeholder:text-muted-foreground" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-3 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={mut.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("cta.submit")}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (cases ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8" />
              <p>No cases yet. Open one when you need help.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Subject</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Priority</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(cases ?? []).map((c) => (
                  <tr key={c.id} className="hover:bg-accent/40">
                    <td className="px-5 py-3">
                      <Link to="/dashboard/support/$caseId" params={{ caseId: c.id }} className="font-medium hover:underline">
                        {c.subject}
                      </Link>
                    </td>
                    <td className="px-5 py-3 capitalize text-muted-foreground">{c.category.replace("_", " ")}</td>
                    <td className="px-5 py-3 capitalize">{c.priority}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[c.status] ?? ""}`}>{c.status}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(c.last_activity_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}