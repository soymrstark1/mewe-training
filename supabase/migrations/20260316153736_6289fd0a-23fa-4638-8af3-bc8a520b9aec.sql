-- Create feedback_options table (like exam_options)
CREATE TABLE feedback_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES feedback_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own feedback options" ON feedback_options
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM feedback_questions fq JOIN teacher_classes tc ON tc.id = fq.class_id WHERE fq.id = feedback_options.question_id AND tc.teacher_id = get_teacher_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM feedback_questions fq JOIN teacher_classes tc ON tc.id = fq.class_id WHERE fq.id = feedback_options.question_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Students can view feedback options" ON feedback_options
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM feedback_questions fq JOIN teacher_classes tc ON tc.id = fq.class_id JOIN teacher_students ts ON ts.teacher_id = tc.teacher_id WHERE fq.id = feedback_options.question_id AND ts.student_auth_user_id = auth.uid() AND ts.is_active = true AND tc.is_active = true));

CREATE POLICY "Superadmins full access feedback_options" ON feedback_options
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Add selected_option_id to feedback_responses
ALTER TABLE feedback_responses ADD COLUMN selected_option_id uuid REFERENCES feedback_options(id);