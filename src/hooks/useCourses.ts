import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Course {
  id: string;
  teacher_id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CourseWithClasses extends Course {
  classes: { id: string; name: string; class_type: string; sort_order: number }[];
}

export function useCourses(teacherId: string | null) {
  return useQuery({
    queryKey: ['courses', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('sort_order', { ascending: true });

      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map(c => c.id);
      const { data: classes } = await supabase
        .from('teacher_classes')
        .select('id, name, class_type, sort_order, course_id')
        .in('course_id', courseIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      return courses.map(course => ({
        ...course,
        description: course.description || '',
        classes: (classes || []).filter(c => c.course_id === course.id),
      })) as CourseWithClasses[];
    },
    enabled: !!teacherId,
    staleTime: 30_000,
  });
}

export function useStudentCourses(teacherIds: string[]) {
  return useQuery({
    queryKey: ['student-courses', teacherIds],
    queryFn: async () => {
      if (teacherIds.length === 0) return [];

      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .in('teacher_id', teacherIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map(c => c.id);
      const { data: classes } = await supabase
        .from('teacher_classes')
        .select('id, name, class_type, sort_order, course_id')
        .in('course_id', courseIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      return courses.map(course => ({
        ...course,
        description: course.description || '',
        classes: (classes || []).filter(c => c.course_id === course.id),
      })) as CourseWithClasses[];
    },
    enabled: teacherIds.length > 0,
    staleTime: 30_000,
  });
}
