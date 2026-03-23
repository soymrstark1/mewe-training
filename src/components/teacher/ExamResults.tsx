import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, Check, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ExamClass {
  id: string;
  name: string;
  description: string | null;
}

interface StudentSummary {
  auth_user_id: string;
  name: string;
  email: string;
  correct: number;
  total_mc: number;
  open_count: number;
  graded_count: number;
}

interface DetailQuestion {
  id: string;
  question_text: string;
  question_type: string;
  sort_order: number;
  options: { id: string; option_text: string; is_correct: boolean; sort_order: number }[];
  response: {
    id: string;
    selected_option_id: string | null;
    open_answer: string | null;
    is_correct: boolean | null;
    teacher_grade: string | null;
  } | null;
}

export default function ExamResults({ teacherId }: { teacherId: string }) {
  const [exams, setExams] = useState<ExamClass[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamClass | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [details, setDetails] = useState<DetailQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Level 1: Load exams
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('teacher_classes')
        .select('id, name, description')
        .eq('teacher_id', teacherId)
        .eq('class_type', 'exam')
        .order('sort_order');
      setExams(data || []);
    };
    load();
  }, [teacherId]);

  // Level 2: Load students for selected exam
  const loadStudents = async (examClass: ExamClass) => {
    setSelectedExam(examClass);
    setSelectedStudent(null);
    setLoading(true);
    setSearch('');

    // Get questions for this exam
    const { data: questions } = await supabase
      .from('exam_questions')
      .select('id, question_type')
      .eq('class_id', examClass.id);

    if (!questions?.length) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const questionIds = questions.map(q => q.id);
    const questionTypes: Record<string, string> = {};
    questions.forEach(q => { questionTypes[q.id] = q.question_type; });

    // Get all responses for these questions
    const { data: responses } = await supabase
      .from('student_exam_responses')
      .select('student_auth_user_id, question_id, is_correct, teacher_grade')
      .in('question_id', questionIds);

    if (!responses?.length) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // Group by student
    const studentMap: Record<string, { correct: number; total_mc: number; open_count: number; graded_count: number }> = {};
    responses.forEach(r => {
      if (!studentMap[r.student_auth_user_id]) {
        studentMap[r.student_auth_user_id] = { correct: 0, total_mc: 0, open_count: 0, graded_count: 0 };
      }
      const s = studentMap[r.student_auth_user_id];
      const qType = questionTypes[r.question_id];
      if (qType === 'multiple_choice') {
        s.total_mc++;
        if (r.is_correct) s.correct++;
      } else {
        s.open_count++;
        if (r.teacher_grade) s.graded_count++;
      }
    });

    // Get user info
    const userIds = Object.keys(studentMap);
    const { data: users } = await supabase
      .from('users')
      .select('auth_user_id, name, email')
      .in('auth_user_id', userIds);

    const result: StudentSummary[] = (users || []).map(u => ({
      auth_user_id: u.auth_user_id,
      name: u.name,
      email: u.email,
      ...studentMap[u.auth_user_id],
    }));

    setStudents(result);
    setLoading(false);
  };

  // Level 3: Load detailed responses for a student
  const loadDetails = async (student: StudentSummary) => {
    setSelectedStudent(student);
    setLoading(true);

    const { data: questions } = await supabase
      .from('exam_questions')
      .select('id, question_text, question_type, sort_order')
      .eq('class_id', selectedExam!.id)
      .order('sort_order');

    if (!questions?.length) { setDetails([]); setLoading(false); return; }

    const questionIds = questions.map(q => q.id);

    const [{ data: options }, { data: responses }] = await Promise.all([
      supabase.from('exam_options').select('id, question_id, option_text, is_correct, sort_order').in('question_id', questionIds).order('sort_order'),
      supabase.from('student_exam_responses').select('id, question_id, selected_option_id, open_answer, is_correct, teacher_grade').in('question_id', questionIds).eq('student_auth_user_id', student.auth_user_id),
    ]);

    const optMap: Record<string, typeof options> = {};
    (options || []).forEach(o => {
      if (!optMap[o.question_id]) optMap[o.question_id] = [];
      optMap[o.question_id]!.push(o);
    });

    const resMap: Record<string, (typeof responses)[0]> = {};
    (responses || []).forEach(r => { resMap[r.question_id] = r; });

    const initGrades: Record<string, string> = {};
    const detail: DetailQuestion[] = questions.map(q => {
      const res = resMap[q.id] || null;
      if (res && q.question_type === 'open') {
        initGrades[res.id] = res.teacher_grade || '';
      }
      return {
        ...q,
        options: (optMap[q.id] || []) as DetailQuestion['options'],
        response: res ? { id: res.id, selected_option_id: res.selected_option_id, open_answer: res.open_answer, is_correct: res.is_correct, teacher_grade: res.teacher_grade } : null,
      };
    });

    setGrades(initGrades);
    setDetails(detail);
    setLoading(false);
  };

  const saveGrade = async (responseId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('student_exam_responses')
      .update({ teacher_grade: grades[responseId] || null })
      .eq('id', responseId);
    setSaving(false);
    if (error) toast.error('Error al guardar');
    else toast.success('Calificación guardada');
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  // Level 3: Detail view
  if (selectedStudent && selectedExam) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground">{selectedStudent.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedStudent.email} — {selectedExam.name}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground animate-pulse">Cargando...</p>
        ) : details.length === 0 ? (
          <p className="text-muted-foreground">Sin respuestas.</p>
        ) : (
          <div className="space-y-4">
            {details.map((q, i) => (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{i + 1}. {q.question_text}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {q.question_type === 'multiple_choice' ? (
                    <div className="space-y-1">
                      {q.options.map(opt => {
                        const isSelected = q.response?.selected_option_id === opt.id;
                        const isCorrect = opt.is_correct;
                        let bg = 'bg-muted/30';
                        if (isSelected && isCorrect) bg = 'bg-green-500/15 border-green-500/50';
                        else if (isSelected && !isCorrect) bg = 'bg-destructive/15 border-destructive/50';
                        else if (isCorrect) bg = 'bg-green-500/10';
                        return (
                          <div key={opt.id} className={`flex items-center gap-2 rounded-md border p-2 text-sm ${bg}`}>
                            {isSelected && isCorrect && <Check className="h-4 w-4 text-green-600" />}
                            {isSelected && !isCorrect && <X className="h-4 w-4 text-destructive" />}
                            {!isSelected && isCorrect && <Check className="h-4 w-4 text-green-400 opacity-50" />}
                            {!isSelected && !isCorrect && <span className="w-4" />}
                            <span className="text-foreground">{opt.option_text}</span>
                          </div>
                        );
                      })}
                      {!q.response && <p className="text-sm text-muted-foreground italic">Sin respuesta</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-md border bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Respuesta del alumno:</p>
                        <p className="text-sm text-foreground">{q.response?.open_answer || <span className="italic text-muted-foreground">Sin respuesta</span>}</p>
                      </div>
                      {q.response && (
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Calificación o comentario del maestro..."
                            value={grades[q.response.id] || ''}
                            onChange={e => setGrades(prev => ({ ...prev, [q.response!.id]: e.target.value }))}
                            className="min-h-[60px]"
                          />
                          <Button size="icon" onClick={() => saveGrade(q.response!.id)} disabled={saving}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Level 2: Students list
  if (selectedExam) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedExam(null); setStudents([]); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold text-foreground">{selectedExam.name}</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar alumno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <p className="text-muted-foreground animate-pulse">Cargando...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="text-muted-foreground">No hay respuestas de alumnos para este examen.</p>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map(s => (
              <Card key={s.auth_user_id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => loadDetails(s)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="text-right text-sm">
                    {s.total_mc > 0 && (
                      <p className="text-foreground font-medium">{s.correct}/{s.total_mc} correctas</p>
                    )}
                    {s.open_count > 0 && (
                      <p className="text-muted-foreground">{s.graded_count}/{s.open_count} calificadas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Level 1: Exam list
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Calificaciones de Exámenes</h2>
      {exams.length === 0 ? (
        <p className="text-muted-foreground">No tienes exámenes creados.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {exams.map(e => (
            <Card key={e.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => loadStudents(e)}>
              <CardContent className="p-4">
                <p className="font-medium text-foreground">📝 {e.name}</p>
                {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
