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
  const { data, error } = await supabaseAdmin.rpc("delta_balance", {
    p_user_id: userId,
    p_delta: delta,
  });
  if (error) throw new Error(`Balance update failed: ${error.message}`);
  return Number(data);
}
