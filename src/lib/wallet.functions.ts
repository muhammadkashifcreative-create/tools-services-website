import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";
import { deltaBalance } from "@/lib/balance.server";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin email always has full admin access — no DB check needed
    const isAdminByEmail = (context as { email?: string }).email === ADMIN_EMAIL;

    let profile: { id: string; username: string | null; full_name: string | null; balance: number } | null = null;
    let isAdminByRole = false;

    try {
      const { data } = await context.supabase
        .from("profiles")
        .select("id, username, full_name, balance")
        .eq("id", context.userId)
        .maybeSingle();
      profile = data ?? null;

      if (!isAdminByEmail) {
        const { data: roles } = await context.supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", context.userId);
        isAdminByRole = (roles ?? []).some((r) => r.role === "admin");
      }
    } catch { /* DB not ready yet — proceed with defaults */ }

    return {
      ...(profile ?? { id: context.userId, username: null, full_name: null, balance: 0 }),
      isAdmin: isAdminByEmail || isAdminByRole,
      email: (context as { email?: string }).email ?? null,
    };
  });

export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions")
      .select("id, amount, type, description, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Admin-only manual credit. Used by admins to grant wallet credit for testing or compensation.
export const demoDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ amount: z.number().positive().max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    if ((context as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newBal = await deltaBalance(context.userId, data.amount);
    await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      amount: data.amount,
      type: "deposit",
      description: "Admin credit",
    });
    return { newBalance: newBal };
  });