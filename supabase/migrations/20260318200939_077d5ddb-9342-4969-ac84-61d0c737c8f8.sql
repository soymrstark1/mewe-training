CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_auth_user_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.teacher_classes(id) ON DELETE CASCADE,
  last_slide_number integer NOT NULL DEFAULT 0,
  total_slides integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_auth_user_id, class_id)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own progress"
  ON public.student_progress FOR ALL
  TO authenticated
  USING (student_auth_user_id = auth.uid())
  WITH CHECK (student_auth_user_id = auth.uid());

CREATE POLICY "Teachers view student progress"
  ON public.student_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.id = student_progress.class_id
      AND tc.teacher_id = get_teacher_id(auth.uid())
  ));

CREATE POLICY "Superadmins full access student_progress"
  ON public.student_progress FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));