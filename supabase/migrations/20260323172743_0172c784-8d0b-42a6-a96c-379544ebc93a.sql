
-- Create academies table
CREATE TABLE public.academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  admin_user_id uuid NOT NULL,
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;

-- Create academy_teachers table
CREATE TABLE public.academy_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(academy_id, teacher_id)
);
ALTER TABLE public.academy_teachers ENABLE ROW LEVEL SECURITY;

-- Create academy_students table
CREATE TABLE public.academy_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  student_auth_user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(academy_id, student_auth_user_id)
);
ALTER TABLE public.academy_students ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_academy_admin(_user_id uuid, _academy_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academies WHERE id = _academy_id AND admin_user_id = _user_id AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_academy_manager(_user_id uuid, _teacher_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_teachers at2
    JOIN public.academies a ON a.id = at2.academy_id
    WHERE at2.teacher_id = _teacher_id AND a.admin_user_id = _user_id AND a.is_active = true AND at2.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_academy_student(_user_id uuid, _academy_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_students WHERE academy_id = _academy_id AND student_auth_user_id = _user_id AND is_active = true
  )
$$;

-- RLS: academies
CREATE POLICY "Academy admin full access" ON public.academies FOR ALL TO authenticated
  USING (admin_user_id = auth.uid()) WITH CHECK (admin_user_id = auth.uid());
CREATE POLICY "Superadmins full access academies" ON public.academies FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Students can view their academies" ON public.academies FOR SELECT TO authenticated
  USING (is_academy_student(auth.uid(), id));
CREATE POLICY "Anyone can lookup academy by code" ON public.academies FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS: academy_teachers
CREATE POLICY "Academy admin manages teachers" ON public.academy_teachers FOR ALL TO authenticated
  USING (is_academy_admin(auth.uid(), academy_id)) WITH CHECK (is_academy_admin(auth.uid(), academy_id));
CREATE POLICY "Superadmins full access academy_teachers" ON public.academy_teachers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Students can view academy teachers" ON public.academy_teachers FOR SELECT TO authenticated
  USING (is_academy_student(auth.uid(), academy_id));

-- RLS: academy_students
CREATE POLICY "Academy admin manages students" ON public.academy_students FOR ALL TO authenticated
  USING (is_academy_admin(auth.uid(), academy_id)) WITH CHECK (is_academy_admin(auth.uid(), academy_id));
CREATE POLICY "Superadmins full access academy_students" ON public.academy_students FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Students can view own academy enrollment" ON public.academy_students FOR SELECT TO authenticated
  USING (student_auth_user_id = auth.uid());
CREATE POLICY "Students can enroll via academy code" ON public.academy_students FOR INSERT TO authenticated
  WITH CHECK (student_auth_user_id = auth.uid());

-- RLS on existing tables for academy managers
CREATE POLICY "Academy managers manage teacher classes" ON public.teacher_classes FOR ALL TO authenticated
  USING (is_academy_manager(auth.uid(), teacher_id)) WITH CHECK (is_academy_manager(auth.uid(), teacher_id));
CREATE POLICY "Academy managers manage teacher slides" ON public.teacher_slides FOR ALL TO authenticated
  USING (is_academy_manager(auth.uid(), teacher_id)) WITH CHECK (is_academy_manager(auth.uid(), teacher_id));
CREATE POLICY "Academy managers manage slide actions" ON public.slide_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_slides ts WHERE ts.id = slide_actions.slide_id AND is_academy_manager(auth.uid(), ts.teacher_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teacher_slides ts WHERE ts.id = slide_actions.slide_id AND is_academy_manager(auth.uid(), ts.teacher_id)));
CREATE POLICY "Academy managers view student progress" ON public.student_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.id = student_progress.class_id AND is_academy_manager(auth.uid(), tc.teacher_id)));
CREATE POLICY "Academy managers view teachers" ON public.teachers FOR SELECT TO authenticated
  USING (is_academy_manager(auth.uid(), id));
CREATE POLICY "Academy managers view teacher students" ON public.teacher_students FOR SELECT TO authenticated
  USING (is_academy_manager(auth.uid(), teacher_id));
CREATE POLICY "Academy managers manage courses" ON public.courses FOR ALL TO authenticated
  USING (is_academy_manager(auth.uid(), teacher_id)) WITH CHECK (is_academy_manager(auth.uid(), teacher_id));
CREATE POLICY "Academy managers manage exam questions" ON public.exam_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.id = exam_questions.class_id AND is_academy_manager(auth.uid(), tc.teacher_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.id = exam_questions.class_id AND is_academy_manager(auth.uid(), tc.teacher_id)));
CREATE POLICY "Academy managers manage exam options" ON public.exam_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exam_questions eq JOIN public.teacher_classes tc ON tc.id = eq.class_id WHERE eq.id = exam_options.question_id AND is_academy_manager(auth.uid(), tc.teacher_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exam_questions eq JOIN public.teacher_classes tc ON tc.id = eq.class_id WHERE eq.id = exam_options.question_id AND is_academy_manager(auth.uid(), tc.teacher_id)));
CREATE POLICY "Academy managers manage feedback questions" ON public.feedback_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.id = feedback_questions.class_id AND is_academy_manager(auth.uid(), tc.teacher_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.id = feedback_questions.class_id AND is_academy_manager(auth.uid(), tc.teacher_id)));
CREATE POLICY "Academy managers view feedback responses" ON public.feedback_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback_questions fq JOIN public.teacher_classes tc ON tc.id = fq.class_id WHERE fq.id = feedback_responses.question_id AND is_academy_manager(auth.uid(), tc.teacher_id)));
CREATE POLICY "Academy managers view student exam responses" ON public.student_exam_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exam_questions eq JOIN public.teacher_classes tc ON tc.id = eq.class_id WHERE eq.id = student_exam_responses.question_id AND is_academy_manager(auth.uid(), tc.teacher_id)));
CREATE POLICY "Academy managers view users" ON public.users FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'academy'));
CREATE POLICY "Academy students view academy teachers" ON public.teachers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.academy_teachers at2 JOIN public.academy_students ast ON ast.academy_id = at2.academy_id WHERE at2.teacher_id = teachers.id AND ast.student_auth_user_id = auth.uid() AND at2.is_active = true AND ast.is_active = true));
