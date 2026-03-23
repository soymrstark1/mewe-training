
-- Fix overly permissive global_settings update policy
DROP POLICY "Authenticated can update settings" ON public.global_settings;
CREATE POLICY "Superadmins can update settings" ON public.global_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
