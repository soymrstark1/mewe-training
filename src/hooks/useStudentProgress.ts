import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressData {
  lastSlide: number;
  totalSlides: number;
  completed: boolean;
}

export function useStudentProgress(classIds: string[], authUserId: string | null) {
  return useQuery({
    queryKey: ['student-progress', authUserId, classIds],
    queryFn: async () => {
      if (!authUserId || classIds.length === 0) return new Map<string, ProgressData>();

      const { data } = await supabase
        .from('student_progress')
        .select('class_id, last_slide_number, total_slides, completed')
        .eq('student_auth_user_id', authUserId)
        .in('class_id', classIds);

      const map = new Map<string, ProgressData>();
      (data || []).forEach(r => {
        map.set(r.class_id, {
          lastSlide: r.last_slide_number,
          totalSlides: r.total_slides,
          completed: r.completed,
        });
      });
      return map;
    },
    enabled: !!authUserId && classIds.length > 0,
    staleTime: 30_000,
  });
}
