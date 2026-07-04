/**
 * Atomically adjusts a user's wallet balance by `delta`.
 *   delta > 0 → credit (deposit, refund)
 *   delta < 0 → debit  (order charge)
 *
 * Backed by a Postgres function that runs inside a single UPDATE statement,
 * preventing the read-then-write race condition that can corrupt balances under
 * concurrent requests (e.g. simultaneous Stripe webhook + client confirmation).
 *
 * Requires migration: supabase/migrations/20260701000000_atomic_balance_fn.sql
 */
export async function deltaBalance(userId: string, delta: number): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // The generated Database types don't include the delta_balance RPC
  // (it ships via migration), so call it through a loosely-typed signature.
  const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const call = () => rpc("delta_balance", { p_user_id: userId, p_delta: delta });

  let { data, error } = await call();

  // Google sign-ins may not have a profiles row yet (the auth.users trigger is
  // not installed on every deployment) — create the profile and retry once.
  if (error?.message?.includes("Profile not found")) {
    await ensureProfile(userId);
    ({ data, error } = await call());
  }

  if (error) throw new Error(`Balance update failed: ${error.message}`);
  return Number(data);
}

/**
 * Guarantees a `profiles` row exists for the given auth user.
 * No-op if the profile is already there.
 */
export async function ensureProfile(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  let email: string | null = null;
  let name: string | null = null;
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = authUser?.user?.email ?? null;
    name = (authUser?.user?.user_metadata as { name?: string } | null)?.name ?? null;
  } catch { /* profile still gets created with defaults */ }

  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      username: email ? email.split("@")[0] : null,
      full_name: name,
    },
    { onConflict: "id" },
  );
  if (error) console.error("ensureProfile failed:", error.message);
}
