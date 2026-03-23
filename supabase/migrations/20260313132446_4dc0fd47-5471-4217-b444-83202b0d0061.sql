
-- Create teacher_classes table
CREATE TABLE public.teacher_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Nueva Clase',
  description text DEFAULT '',
  cover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add class_id to teacher_slides (nullable for existing data)
ALTER TABLE public.teacher_slides ADD COLUMN class_id uuid REFERENCES public.teacher_classes(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- RLS: Students can view active classes of their teachers
CREATE POLICY "Students can view teacher classes"
ON public.teacher_classes FOR SELECT TO authenticated
USING (
  is_active = true AND
  public.is_student_of_teacher(auth.uid(), teacher_id)
);

-- RLS: Teachers manage own classes
CREATE POLICY "Teachers manage own classes"
ON public.teacher_classes FOR ALL TO authenticated
USING (teacher_id = public.get_teacher_id(auth.uid()))
WITH CHECK (teacher_id = public.get_teacher_id(auth.uid()));

-- RLS: Superadmins full access
CREATE POLICY "Superadmins full access on teacher_classes"
ON public.teacher_classes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Updated_at trigger
CREATE TRIGGER update_teacher_classes_updated_at
  BEFORE UPDATE ON public.teacher_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
