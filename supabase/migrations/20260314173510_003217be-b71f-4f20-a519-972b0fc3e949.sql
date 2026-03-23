
CREATE TABLE public.teacher_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  brand_name text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view requests" ON public.teacher_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests" ON public.teacher_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own request" ON public.teacher_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can view own request" ON public.teacher_requests
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
