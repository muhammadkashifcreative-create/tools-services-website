GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;