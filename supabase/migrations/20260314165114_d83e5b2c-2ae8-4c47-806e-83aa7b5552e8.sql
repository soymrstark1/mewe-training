
-- Admin access to users table (renamed to avoid conflict)
CREATE POLICY "Admin role can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
