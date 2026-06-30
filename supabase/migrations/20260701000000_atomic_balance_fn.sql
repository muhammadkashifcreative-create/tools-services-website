-- Atomic wallet balance update function.
-- Replaces the unsafe read-then-write pattern used throughout the app.
-- Using Postgres row-level locking guarantees correctness under concurrent requests
-- (e.g. simultaneous Stripe webhook + client confirmation, or two concurrent deposits).
--
-- Usage from application code:
--   const { data: newBalance } = await supabaseAdmin.rpc("delta_balance", {
--     p_user_id: userId,
--     p_delta: amount,   -- positive to credit, negative to debit
--   });

CREATE OR REPLACE FUNCTION public.delta_balance(p_user_id UUID, p_delta NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE profiles
  SET balance = balance + p_delta
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delta_balance(UUID, NUMERIC) TO service_role;
