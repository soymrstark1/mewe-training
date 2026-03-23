
CREATE TABLE public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_auth_user_id uuid NOT NULL,
  class_id uuid REFERENCES public.teacher_classes(id) ON DELETE CASCADE NOT NULL,
  slide_number integer NOT NULL,
  note_text text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_auth_user_id, class_id, slide_number)
);

ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own notes"
ON public.student_notes FOR ALL TO authenticated
USING (student_auth_user_id = auth.uid())
WITH CHECK (student_auth_user_id = auth.uid());

CREATE TRIGGER update_student_notes_updated_at
  BEFORE UPDATE ON public.student_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
