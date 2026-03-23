import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Search, CheckCircle2 } from 'lucide-react';

interface StudentProgressRow {
  studentName: string;
  studentEmail: string;
  className: string;
  lastSlide: number;
  totalSlides: number;
  completed: boolean;
  updatedAt: string;
}

export default function StudentProgressView({ teacherId }: { teacherId: string }) {
  const [rows, setRows] = useState<StudentProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      // Get teacher's classes
      const { data: classes } = await supabase
        .from('teacher_classes')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      if (!classes?.length) { setLoading(false); return; }

      const classIds = classes.map(c => c.id);
      const classMap = new Map(classes.map(c => [c.id, c.name]));

      // Get progress for those classes
      const { data: progress } = await supabase
        .from('student_progress')
        .select('student_auth_user_id, class_id, last_slide_number, total_slides, completed, updated_at')
        .in('class_id', classIds);

      if (!progress?.length) { setLoading(false); return; }

      // Get user info
      const userIds = [...new Set(progress.map(p => p.student_auth_user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('auth_user_id, name, email')
        .in('auth_user_id', userIds);

      const userMap = new Map((users || []).map(u => [u.auth_user_id, u]));

      const result: StudentProgressRow[] = progress.map(p => {
        const user = userMap.get(p.student_auth_user_id);
        return {
          studentName: user?.name || 'Desconocido',
          studentEmail: user?.email || '',
          className: classMap.get(p.class_id) || '',
          lastSlide: p.last_slide_number,
          totalSlides: p.total_slides,
          completed: p.completed,
          updatedAt: p.updated_at || '',
        };
      });

      result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setRows(result);
      setLoading(false);
    };
    load();
  }, [teacherId]);

  const filtered = rows.filter(r =>
    r.studentName.toLowerCase().includes(search.toLowerCase()) ||
    r.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
    r.className.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-muted-foreground animate-pulse">Cargando progreso...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Progreso de Alumnos</h2>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay datos de progreso de alumnos.</p>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar alumno o clase..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="space-y-2">
            {filtered.map((r, i) => {
              const pct = r.totalSlides > 0 ? Math.round((r.lastSlide / r.totalSlides) * 100) : 0;
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground">{r.studentEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-foreground">{r.className}</p>
                        {r.completed ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium justify-end">
                            <CheckCircle2 className="h-3 w-3" /> Completada
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{pct}%</p>
                        )}
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {r.updatedAt && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Última actividad: {new Date(r.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
