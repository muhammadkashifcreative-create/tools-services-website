
CREATE TABLE public.tool_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric(12,4) NOT NULL,
  total_price numeric(12,4) NOT NULL,
  codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_orders TO authenticated;
GRANT ALL ON public.tool_orders TO service_role;

ALTER TABLE public.tool_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tool orders" ON public.tool_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own tool orders" ON public.tool_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update tool orders" ON public.tool_orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_tool_orders_user ON public.tool_orders(user_id, created_at DESC);
