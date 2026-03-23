import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

interface TeacherClass {
  id: string;
  name: string;
  class_type: string;
  course_id: string | null;
}

export default function CourseManager({ teacherId }: { teacherId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const [coursesRes, classesRes] = await Promise.all([
      supabase.from('courses').select('id, name, description, is_active, sort_order').eq('teacher_id', teacherId).order('sort_order'),
      supabase.from('teacher_classes').select('id, name, class_type, course_id').eq('teacher_id', teacherId).eq('is_active', true).order('sort_order'),
    ]);
    setCourses((coursesRes.data || []).map(c => ({ ...c, description: c.description || '' })));
    setClasses(classesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [teacherId]);

  const addCourse = async () => {
    const maxOrder = courses.length > 0 ? Math.max(...courses.map(c => c.sort_order)) + 1 : 0;
    const { error } = await supabase.from('courses').insert({ teacher_id: teacherId, name: 'Nuevo Curso', sort_order: maxOrder });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const updateCourse = async (id: string, field: string, value: any) => {
    await supabase.from('courses').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    setCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteCourse = async (id: string) => {
    // Unassign classes first
    await supabase.from('teacher_classes').update({ course_id: null }).eq('course_id', id);
    await supabase.from('courses').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchData();
    toast({ title: 'Curso eliminado' });
  };

  const toggleClassInCourse = async (classId: string, courseId: string) => {
    const cls = classes.find(c => c.id === classId);
    const newCourseId = cls?.course_id === courseId ? null : courseId;
    await supabase.from('teacher_classes').update({ course_id: newCourseId }).eq('id', classId);
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, course_id: newCourseId } : c));
  };

  const classesInCourse = (courseId: string) => classes.filter(c => c.course_id === courseId);
  const unassignedClasses = classes.filter(c => !c.course_id);

  const getClassEmoji = (t: string) => {
    switch (t) {
      case 'video': return '🎬';
      case 'tiktok_feed': return '📱';
      case 'url': return '🌐';
      case 'exam': return '📝';
      case 'live': return '🔴';
      default: return '📚';
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground animate-pulse">Cargando cursos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Cursos</h2>
        <Button onClick={addCourse} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Curso
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No tienes cursos creados.</p>
            <p className="text-sm text-muted-foreground mt-1">Los cursos agrupan varias clases y permiten generar certificados de finalización.</p>
            <Button onClick={addCourse} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Crear primer curso</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map(course => {
            const courseClasses = classesInCourse(course.id);
            const isExpanded = expanded === course.id;
            return (
              <Card key={course.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0 cursor-grab" />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={course.name}
                        onChange={e => updateCourse(course.id, 'name', e.target.value)}
                        className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 shadow-none"
                        placeholder="Nombre del curso"
                      />
                      <Textarea
                        value={course.description}
                        onChange={e => updateCourse(course.id, 'description', e.target.value)}
                        className="text-sm border-none p-0 min-h-0 h-8 resize-none focus-visible:ring-0 shadow-none"
                        placeholder="Descripción (opcional)"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setAssignDialog(course.id)}>
                        + Clases
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setExpanded(isExpanded ? null : course.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(course.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="ml-8 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{courseClasses.length} {courseClasses.length === 1 ? 'clase' : 'clases'}</span>
                    <span>•</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={course.is_active}
                        onCheckedChange={v => updateCourse(course.id, 'is_active', !!v)}
                      />
                      Activo
                    </label>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    {courseClasses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay clases asignadas. Usa el botón "+ Clases" para agregar.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {courseClasses.map(cls => (
                          <div key={cls.id} className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                            <span className="text-lg">{getClassEmoji(cls.class_type)}</span>
                            <span className="text-sm font-medium text-foreground flex-1">{cls.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive"
                              onClick={() => toggleClassInCourse(cls.id, course.id)}
                            >
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign classes dialog */}
      <Dialog open={!!assignDialog} onOpenChange={open => { if (!open) setAssignDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar clases al curso</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tienes clases creadas.</p>
            ) : (
              classes.map(cls => {
                const isInThisCourse = cls.course_id === assignDialog;
                const isInOtherCourse = cls.course_id && cls.course_id !== assignDialog;
                return (
                  <label
                    key={cls.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      isInThisCourse ? 'bg-primary/10 border-primary/40' : isInOtherCourse ? 'opacity-50' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={isInThisCourse}
                      disabled={!!isInOtherCourse}
                      onCheckedChange={() => assignDialog && toggleClassInCourse(cls.id, assignDialog)}
                    />
                    <span className="text-lg">{getClassEmoji(cls.class_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cls.name}</p>
                      {isInOtherCourse && (
                        <p className="text-xs text-muted-foreground">Ya asignada a otro curso</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar curso?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Las clases dentro del curso no se eliminarán, solo se desasignarán.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteCourse(deleteConfirm)}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
