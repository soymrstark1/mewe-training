
CREATE TABLE public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.teacher_classes(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view chat"
  ON public.live_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.id = live_chat_messages.class_id
      AND (
        tc.teacher_id = get_teacher_id(auth.uid())
        OR is_student_of_teacher(auth.uid(), tc.teacher_id)
      )
    )
  );

CREATE POLICY "Participants can send chat"
  ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.id = live_chat_messages.class_id
      AND (
        tc.teacher_id = get_teacher_id(auth.uid())
        OR is_student_of_teacher(auth.uid(), tc.teacher_id)
      )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
