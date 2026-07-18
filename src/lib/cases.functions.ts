import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const CategoryEnum = z.enum(["order_issue", "refund", "payment", "account", "technical", "other"]);
const PriorityEnum = z.enum(["low", "normal", "high", "urgent"]);
const StatusEnum = z.enum(["open", "pending", "resolved", "closed"]);

/**
 * The migration and generated types name this column `author_id`, but
 * deployments migrated before that rename may still have `user_id` live.
 * Try author_id first and fall back on a "column not found" schema-cache
 * error, so posting a reply works regardless of which one is actually live.
 */
async function insertCaseMessage(
  supabase: SupabaseClient,
  row: { case_id: string; authorId: string; is_staff: boolean; body: string },
): Promise<{ error: string | null }> {
  const attempt = (key: "author_id" | "user_id") =>
    supabase.from("case_messages").insert({
      case_id: row.case_id,
      [key]: row.authorId,
      is_staff: row.is_staff,
      body: row.body,
    } as never);

  const first = await attempt("author_id");
  if (!first.error) return { error: null };
  if (!first.error.message.includes("author_id")) return { error: first.error.message };

  const second = await attempt("user_id");
  return { error: second.error?.message ?? null };
}

export const listMyCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cases")
      .select("id, subject, category, priority, status, order_id, last_activity_at, created_at")
      .eq("user_id", context.userId)
      .order("last_activity_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string }) => z.object({ caseId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const admin = await isAdminUser(context);
    const query = context.supabase
      .from("cases")
      .select("id, user_id, subject, category, priority, status, order_id, last_activity_at, created_at")
      .eq("id", data.caseId);
    // Non-admins can only read their own cases
    if (!admin) query.eq("user_id", context.userId);
    const { data: c, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Case not found");
    // Neither dashboard nor admin UI needs the author's id — only who's
    // shown (is_staff), the text, and timestamps — so the select never
    // depends on whichever author column name is actually live.
    const { data: msgs, error: mErr } = await context.supabase
      .from("case_messages")
      .select("id, is_staff, body, created_at")
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
    const { error: mErrMsg } = await insertCaseMessage(context.supabase, {
      case_id: c.id,
      authorId: context.userId,
      is_staff: false,
      body: data.body,
    });
    if (mErrMsg) throw new Error(mErrMsg);

    // Send case opened email (non-blocking)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const toEmail = authUser?.user?.email;
    if (toEmail) {
      import("@/lib/email.server").then(({ sendCaseOpenedEmail }) => {
        sendCaseOpenedEmail(toEmail, prof?.full_name ?? "", c.id, data.subject).catch(console.error);
      });
    }

    // Notify admin on Telegram (non-blocking)
    const openerEmail = (context as { email?: string }).email ?? toEmail;
    if (openerEmail) {
      import("@/lib/telegram.server").then(({ tgCaseOpened }) => {
        tgCaseOpened(openerEmail, data.subject, data.category, data.priority, c.id).catch(console.error);
      });
    }

    return { id: c.id };
  });

export const addCaseMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string; body: string }) =>
    z.object({ caseId: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const admin = await isAdminUser(context);

    // Only the case owner or an admin may post into a case.
    const { data: caseCheck } = await context.supabase
      .from("cases")
      .select("user_id")
      .eq("id", data.caseId)
      .maybeSingle();
    if (!caseCheck) throw new Error("Case not found");
    if (!admin && caseCheck.user_id !== context.userId) throw new Error("Forbidden");

    const { error: insertErr } = await insertCaseMessage(context.supabase, {
      case_id: data.caseId,
      authorId: context.userId,
      is_staff: admin,
      body: data.body,
    });
    if (insertErr) throw new Error(insertErr);

    // If admin replied, notify the customer
    if (admin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: caseRow } = await supabaseAdmin
        .from("cases").select("user_id, subject").eq("id", data.caseId).maybeSingle();
      if (caseRow) {
        const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", caseRow.user_id).maybeSingle();
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(caseRow.user_id);
        const toEmail = authUser?.user?.email;
        if (toEmail) {
          import("@/lib/email.server").then(({ sendCaseReplyEmail }) => {
            sendCaseReplyEmail(toEmail, prof?.full_name ?? "", data.caseId, caseRow.subject, data.body).catch(console.error);
          });
        }
      }
    } else {
      // Customer replied — notify admin on Telegram (non-blocking)
      const replierEmail = (context as { email?: string }).email;
      if (replierEmail) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: caseRow } = await supabaseAdmin
          .from("cases").select("subject").eq("id", data.caseId).maybeSingle();
        import("@/lib/telegram.server").then(({ tgCaseReply }) => {
          tgCaseReply(replierEmail, caseRow?.subject ?? "Support case", data.caseId).catch(console.error);
        });
      }
    }

    return { ok: true };
  });

export const updateCaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caseId: string; status: string }) =>
    z.object({ caseId: z.string().uuid(), status: StatusEnum }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const admin = await isAdminUser(context);
    const { data: caseCheck } = await context.supabase
      .from("cases")
      .select("user_id")
      .eq("id", data.caseId)
      .maybeSingle();
    if (!caseCheck) throw new Error("Case not found");
    if (!admin && caseCheck.user_id !== context.userId) throw new Error("Forbidden");

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
    if (!(await isAdminUser(context))) throw new Error("Forbidden");
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