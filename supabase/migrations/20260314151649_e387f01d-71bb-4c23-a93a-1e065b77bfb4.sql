
CREATE POLICY "Students can enroll themselves"
ON public.teacher_students FOR INSERT TO authenticated
WITH CHECK (student_auth_user_id = auth.uid());
