import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useProgressUpsert(
  classId: string | undefined,
  authUserId: string | null,
  isStudent: boolean,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upsertProgress = useCallback(
    (lastSlideNumber: number, totalSlides: number, completed: boolean = false) => {
      if (!classId || !authUserId || !isStudent) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        await supabase.from('student_progress').upsert(
          {
            student_auth_user_id: authUserId,
            class_id: classId,
            last_slide_number: lastSlideNumber,
            total_slides: totalSlides,
            completed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_auth_user_id,class_id' },
        );
      }, 1000);
    },
    [classId, authUserId, isStudent],
  );

  const upsertImmediate = useCallback(
    async (lastSlideNumber: number, totalSlides: number, completed: boolean = true) => {
      if (!classId || !authUserId || !isStudent) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      await supabase.from('student_progress').upsert(
        {
          student_auth_user_id: authUserId,
          class_id: classId,
          last_slide_number: lastSlideNumber,
          total_slides: totalSlides,
          completed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_auth_user_id,class_id' },
      );
    },
    [classId, authUserId, isStudent],
  );

  return { upsertProgress, upsertImmediate };
}
