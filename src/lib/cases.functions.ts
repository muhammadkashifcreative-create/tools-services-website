import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";
import { z } from "zod";

const CategoryEnum = z.enum(["order_issue", "refund", "payment", "account", "technical", "other"]);
const PriorityEnum = z.enum(["low", "normal", "high", "urgent"]);
const StatusEnum = z.enum(["open", "pending", "resolved", "closed"]);

function isAdmin(ctx: { email?: string }) {
  return (ctx as { email?: string }).email === ADMIN_EMAIL;
}

export const listMyCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cases")
      .select("id, subject, category, priority, status, order_id, last_activity_at, created_at")
      .order("last_activity_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string }) => z.object({ caseId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: c, error } = await context.supabase
      .from("cases")
      .select("id, user_id, subject, category, priority, status, order_id, last_activity_at, created_at")
      .eq("id", data.caseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Case not found");
    const { data: msgs, error: mErr } = await context.supabase
      .from("case_messages")
      .select("id, user_id, is_staff, body, attachments, created_at")
      .eq("case_id", data.caseId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { case: c, messages: msgs ?? [] };
  });

export const createCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; category: string; priority: string; body: string; orderId?: string | null }) =>
    z.object({
      subject: z.string().min(3).max(160),
      category: CategoryEnum,
      priority: PriorityEnum,
      body: z.string().min(5).max(4000),
      orderId: z.string().uuid().nullish(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: c, error } = await context.supabase
      .from("cases")
      .insert({
        user_id: context.userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
        order_id: data.orderId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await context.supabase
      .from("case_messages")
      .insert({ case_id: c.id, user_id: context.userId, is_staff: false, body: data.body });
    if (mErr) throw new Error(mErr.message);
    return { id: c.id };
  });

export const addCaseMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string; body: string }) =>
    z.object({ caseId: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const admin = isAdmin(context as never);
    const { error } = await context.supabase
      .from("case_messages")
      .insert({ case_id: data.caseId, user_id: context.userId, is_staff: admin, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string; status: string }) =>
    z.object({ caseId: z.string().uuid(), status: StatusEnum }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("cases")
      .update({ status: data.status })
      .eq("id", data.caseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAllCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAdmin(context as never)) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("id, user_id, subject, category, priority, status, last_activity_at, created_at")
      .order("last_activity_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username, full_name").in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return (data ?? []).map((c) => ({ ...c, profile: map.get(c.user_id) ?? null }));
  });