
-- Add unique constraint on teacher_students for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_students_teacher_student_unique'
  ) THEN
    ALTER TABLE public.teacher_students ADD CONSTRAINT teacher_students_teacher_student_unique UNIQUE (teacher_id, student_auth_user_id);
  END IF;
END $$;
