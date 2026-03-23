CREATE POLICY "Service role trigger inserts" ON public.users
  FOR INSERT
  WITH CHECK (true);