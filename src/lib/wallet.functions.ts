import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, full_name, balance")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return { ...(data ?? { id: context.userId, username: null, full_name: null, balance: 0 }), isAdmin };
  });

export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions")
      .select("id, amount, type, description, created_at")
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