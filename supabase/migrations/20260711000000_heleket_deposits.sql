-- Crypto wallet top-ups via Heleket payment gateway.
-- Each row is one payment attempt; its id doubles as the Heleket order_id,
-- which is how webhook callbacks are matched back to a user.

CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd NUMERIC(12,4) NOT NULL CHECK (amount_usd > 0),
  -- What was actually credited to the wallet. Can differ from amount_usd on
  -- overpayment (paid_over) or underpayment (wrong_amount).
  credited_usd NUMERIC(12,4),
  -- pending | paid | wrong_amount | failed
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'heleket',
  provider_uuid TEXT,
  payment_url TEXT,
  payer_currency TEXT,
  txid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own deposits" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all deposits" ON public.deposits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX deposits_user_status_idx ON public.deposits (user_id, status);

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
