ALTER TABLE public.teacher_classes 
ADD COLUMN scheduled_date timestamptz,
ADD COLUMN is_live_active boolean NOT NULL DEFAULT false;

ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_classes;