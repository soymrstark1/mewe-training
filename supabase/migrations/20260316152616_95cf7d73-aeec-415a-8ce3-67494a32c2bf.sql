
-- 1. Add feedback_enabled to teacher_classes
ALTER TABLE teacher_classes ADD COLUMN feedback_enabled boolean NOT NULL DEFAULT false;

-- 2. Create feedback_questions table
CREATE TABLE feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
  question_text text NOT NULL DEFAULT '',
  question_type text NOT NULL DEFAULT 'rating',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own feedback questions" ON feedback_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.id = feedback_questions.class_id AND tc.teacher_id = get_teacher_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.id = feedback_questions.class_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Students can view feedback questions" ON feedback_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM teacher_classes tc JOIN teacher_students ts ON ts.teacher_id = tc.teacher_id WHERE tc.id = feedback_questions.class_id AND ts.student_auth_user_id = auth.uid() AND ts.is_active = true AND tc.is_active = true));

CREATE POLICY "Superadmins full access feedback_questions" ON feedback_questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- 3. Create feedback_responses table
CREATE TABLE feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES feedback_questions(id) ON DELETE CASCADE,
  student_auth_user_id uuid NOT NULL,
  rating integer,
  answer_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own feedback responses" ON feedback_responses
  FOR ALL TO authenticated
  USING (student_auth_user_id = auth.uid())
  WITH CHECK (student_auth_user_id = auth.uid());

CREATE POLICY "Teachers view feedback responses" ON feedback_responses
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM feedback_questions fq JOIN teacher_classes tc ON tc.id = fq.class_id WHERE fq.id = feedback_responses.question_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Superadmins full access feedback_responses" ON feedback_responses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- 4. Create feedback_comments table
CREATE TABLE feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  parent_id uuid REFERENCES feedback_comments(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage feedback comments" ON feedback_comments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.id = feedback_comments.class_id AND tc.teacher_id = get_teacher_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.id = feedback_comments.class_id AND tc.teacher_id = get_teacher_id(auth.uid())));

CREATE POLICY "Students can view and insert feedback comments" ON feedback_comments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM teacher_classes tc JOIN teacher_students ts ON ts.teacher_id = tc.teacher_id WHERE tc.id = feedback_comments.class_id AND ts.student_auth_user_id = auth.uid() AND ts.is_active = true));

CREATE POLICY "Students can insert own feedback comments" ON feedback_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() AND EXISTS (SELECT 1 FROM teacher_classes tc JOIN teacher_students ts ON ts.teacher_id = tc.teacher_id WHERE tc.id = feedback_comments.class_id AND ts.student_auth_user_id = auth.uid() AND ts.is_active = true));

CREATE POLICY "Superadmins full access feedback_comments" ON feedback_comments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));
