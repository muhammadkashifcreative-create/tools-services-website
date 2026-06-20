
-- Support cases (full helpdesk)
CREATE TYPE public.case_status AS ENUM ('open','pending','resolved','closed');
CREATE TYPE public.case_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.case_category AS ENUM ('order_issue','refund','payment','account','technical','other');

CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category public.case_category NOT NULL DEFAULT 'other',
  priority public.case_priority NOT NULL DEFAULT 'normal',
  status public.case_status NOT NULL DEFAULT 'open',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cases" ON public.cases FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own cases" ON public.cases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cases" ON public.cases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete cases" ON public.cases FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER cases_updated BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.case_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_messages TO authenticated;
GRANT ALL ON public.case_messages TO service_role;
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read messages of own cases" ON public.case_messages FOR SELECT
  TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Write to own cases" ON public.case_messages FOR INSERT
  TO authenticated WITH CHECK (
    author_id = auth.uid() AND (
      public.has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    )
  );

CREATE INDEX idx_cases_user ON public.cases(user_id, created_at DESC);
CREATE INDEX idx_cases_status ON public.cases(status, last_activity_at DESC);
CREATE INDEX idx_case_messages_case ON public.case_messages(case_id, created_at);

-- Bump last_activity_at on new message
CREATE OR REPLACE FUNCTION public.bump_case_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cases SET last_activity_at = now(), updated_at = now() WHERE id = NEW.case_id;
  RETURN NEW;
END $$;
CREATE TRIGGER case_messages_bump AFTER INSERT ON public.case_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_case_activity();

-- User language preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
