
-- 1. Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Nuevo Curso',
  description text DEFAULT '',
  cover_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own courses" ON public.courses FOR ALL
  TO authenticated USING (teacher_id = get_teacher_id(auth.uid()))
  WITH CHECK (teacher_id = get_teacher_id(auth.uid()));

CREATE POLICY "Students view courses" ON public.courses FOR SELECT
  TO authenticated USING (is_active = true AND is_student_of_teacher(auth.uid(), teacher_id));

CREATE POLICY "Superadmins full access courses" ON public.courses FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- 2. Add course_id to teacher_classes
ALTER TABLE public.teacher_classes ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- 3. Certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_auth_user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id),
  issued_at timestamptz DEFAULT now(),
  certificate_url text,
  UNIQUE (student_auth_user_id, course_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own certificates" ON public.certificates FOR ALL
  TO authenticated USING (student_auth_user_id = auth.uid())
  WITH CHECK (student_auth_user_id = auth.uid());

CREATE POLICY "Teachers view certificates" ON public.certificates FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM courses c WHERE c.id = certificates.course_id
    AND c.teacher_id = get_teacher_id(auth.uid())
  ));

CREATE POLICY "Superadmins full access certificates" ON public.certificates FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- 4. Storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true);

CREATE POLICY "Anyone can read certificates" ON storage.objects FOR SELECT TO public USING (bucket_id = 'certificates');
CREATE POLICY "Service role can upload certificates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates');
