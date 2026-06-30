-- Prevent balance from going negative inside the atomic delta_balance function.
-- Raising an exception causes the UPDATE to roll back automatically.
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

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delta_balance(UUID, NUMERIC) TO service_role;
