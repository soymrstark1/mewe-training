
-- Allow anyone to look up a teacher by access code (needed for registration flow)
CREATE POLICY "Anyone can lookup teacher by access code" ON public.teachers
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Allow teachers to insert into users table (for student creation)
CREATE POLICY "Teachers can insert users" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'superadmin')
  );
