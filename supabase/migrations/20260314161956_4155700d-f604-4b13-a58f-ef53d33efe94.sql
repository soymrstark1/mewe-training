
-- Add class_type, video_url, external_url to teacher_classes
ALTER TABLE teacher_classes ADD COLUMN class_type text NOT NULL DEFAULT 'slides';
ALTER TABLE teacher_classes ADD COLUMN video_url text;
ALTER TABLE teacher_classes ADD COLUMN external_url text;

-- Exam questions table
CREATE TABLE exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
  question_text text NOT NULL DEFAULT '',
  question_type text NOT NULL DEFAULT 'multiple_choice',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own exam questions" ON exam_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.id = exam_questions.class_id AND tc.teacher_id = get_teacher_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.id = exam_questions.class_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Students can view exam questions" ON exam_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM teacher_classes tc JOIN teacher_students ts ON ts.teacher_id = tc.teacher_id WHERE tc.id = exam_questions.class_id AND ts.student_auth_user_id = auth.uid() AND ts.is_active = true AND tc.is_active = true));

CREATE POLICY "Superadmins full access exam_questions" ON exam_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Exam options table
CREATE TABLE exam_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL DEFAULT '',
  is_correct boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE exam_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own exam options" ON exam_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM exam_questions eq JOIN teacher_classes tc ON tc.id = eq.class_id WHERE eq.id = exam_options.question_id AND tc.teacher_id = get_teacher_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM exam_questions eq JOIN teacher_classes tc ON tc.id = eq.class_id WHERE eq.id = exam_options.question_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Students can view exam options" ON exam_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM exam_questions eq JOIN teacher_classes tc ON tc.id = eq.class_id JOIN teacher_students ts ON ts.teacher_id = tc.teacher_id WHERE eq.id = exam_options.question_id AND ts.student_auth_user_id = auth.uid() AND ts.is_active = true AND tc.is_active = true));

CREATE POLICY "Superadmins full access exam_options" ON exam_options FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Student exam responses table
CREATE TABLE student_exam_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  student_auth_user_id uuid NOT NULL,
  selected_option_id uuid REFERENCES exam_options(id),
  open_answer text,
  is_correct boolean,
  teacher_grade text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, student_auth_user_id)
);
ALTER TABLE student_exam_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own exam responses" ON student_exam_responses FOR ALL TO authenticated
  USING (student_auth_user_id = auth.uid()) WITH CHECK (student_auth_user_id = auth.uid());

CREATE POLICY "Teachers view student responses" ON student_exam_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM exam_questions eq JOIN teacher_classes tc ON tc.id = eq.class_id WHERE eq.id = student_exam_responses.question_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Teachers grade responses" ON student_exam_responses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM exam_questions eq JOIN teacher_classes tc ON tc.id = eq.class_id WHERE eq.id = student_exam_responses.question_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Superadmins full access exam_responses" ON student_exam_responses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin')) WITH CHECK (has_role(auth.uid(), 'superadmin'));
