import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";

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
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// DEV / manual deposit. Until Stripe is wired, admins can grant credit.
// Self-deposit demo flow: any signed-in user can add funds for testing.
// Replace with Stripe-backed deposit before production.
export const demoDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ amount: z.number().positive().max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("balance")
      .eq("id", context.userId)
      .maybeSingle();
    const newBal = +(Number(profile?.balance ?? 0) + data.amount).toFixed(4);
    await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", context.userId);
    await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      amount: data.amount,
      type: "deposit",
      description: "Demo deposit (replace with Stripe)",
    });
    return { newBalance: newBal };
  });