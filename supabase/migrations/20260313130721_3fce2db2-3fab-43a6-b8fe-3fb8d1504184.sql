
-- 1. Add 'teacher' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- 2. Create teachers table
CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  brand_name text NOT NULL DEFAULT '',
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create teacher_students table
CREATE TABLE public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_auth_user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, student_auth_user_id)
);

-- 4. Create teacher_slides table
CREATE TABLE public.teacher_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  slide_number integer NOT NULL,
  language text NOT NULL DEFAULT 'es',
  media_url text,
  media_type text NOT NULL DEFAULT 'image',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, slide_number, language)
);

-- 5. Create slide_actions table
CREATE TABLE public.slide_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id uuid NOT NULL REFERENCES public.teacher_slides(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT 'web',
  label text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '🔗',
  url text,
  is_vertical boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Enable RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slide_actions ENABLE ROW LEVEL SECURITY;

-- 7. Helper: check if user is a specific teacher
CREATE OR REPLACE FUNCTION public.get_teacher_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.teachers WHERE auth_user_id = _user_id AND is_active = true LIMIT 1
$$;

-- 8. Helper: check if student belongs to teacher
CREATE OR REPLACE FUNCTION public.is_student_of_teacher(_student_user_id uuid, _teacher_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_students
    WHERE student_auth_user_id = _student_user_id
      AND teacher_id = _teacher_id
      AND is_active = true
  )
$$;

-- 9. RLS for teachers
CREATE POLICY "Superadmins full access on teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Teachers can view own record" ON public.teachers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Teachers can update own record" ON public.teachers
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 10. RLS for teacher_students
CREATE POLICY "Superadmins full access on teacher_students" ON public.teacher_students
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Teachers manage own students" ON public.teacher_students
  FOR ALL TO authenticated
  USING (teacher_id = public.get_teacher_id(auth.uid()))
  WITH CHECK (teacher_id = public.get_teacher_id(auth.uid()));

CREATE POLICY "Students can view own enrollment" ON public.teacher_students
  FOR SELECT TO authenticated
  USING (student_auth_user_id = auth.uid());

-- 11. RLS for teacher_slides
CREATE POLICY "Superadmins full access on teacher_slides" ON public.teacher_slides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Teachers manage own slides" ON public.teacher_slides
  FOR ALL TO authenticated
  USING (teacher_id = public.get_teacher_id(auth.uid()))
  WITH CHECK (teacher_id = public.get_teacher_id(auth.uid()));

CREATE POLICY "Students can view teacher slides" ON public.teacher_slides
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_students ts
      WHERE ts.teacher_id = teacher_slides.teacher_id
        AND ts.student_auth_user_id = auth.uid()
        AND ts.is_active = true
    )
  );

-- 12. RLS for slide_actions
CREATE POLICY "Superadmins full access on slide_actions" ON public.slide_actions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Teachers manage own slide actions" ON public.slide_actions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_slides ts
      WHERE ts.id = slide_actions.slide_id
        AND ts.teacher_id = public.get_teacher_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_slides ts
      WHERE ts.id = slide_actions.slide_id
        AND ts.teacher_id = public.get_teacher_id(auth.uid())
    )
  );

CREATE POLICY "Students can view slide actions" ON public.slide_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_slides ts
      JOIN public.teacher_students tst ON tst.teacher_id = ts.teacher_id
      WHERE ts.id = slide_actions.slide_id
        AND tst.student_auth_user_id = auth.uid()
        AND tst.is_active = true
    )
  );

-- 13. Updated_at triggers
CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_slides_updated_at
  BEFORE UPDATE ON public.teacher_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slide_actions_updated_at
  BEFORE UPDATE ON public.slide_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Also allow teachers to view users table (to see student info)
CREATE POLICY "Teachers can view their students" ON public.users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_students ts
      WHERE ts.student_auth_user_id = users.auth_user_id
        AND ts.teacher_id = public.get_teacher_id(auth.uid())
    )
  );
