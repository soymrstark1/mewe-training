import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Printer, ChevronDown, ChevronUp, Star, Users, CheckCircle, BarChart3, BookOpen } from 'lucide-react';

interface FeedbackQuestion {
  id: string;
  question_text: string;
  question_type: string;
  sort_order: number;
}

interface FeedbackOptionData {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

interface StudentInfo {
  auth_user_id: string;
  name: string;
  email: string;
}

interface ResponseData {
  question_id: string;
  student_auth_user_id: string;
  rating: number | null;
  answer_text: string | null;
  selected_option_id: string | null;
}

interface Props {
  classId: string;
  className: string;
  teacherId: string;
  onBack: () => void;
}

export default function FeedbackAnalytics({ classId, className, teacherId, onBack }: Props) {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [options, setOptions] = useState<FeedbackOptionData[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [printStudentId, setPrintStudentId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    setLoading(true);

    const { data: qs } = await supabase
      .from('feedback_questions')
      .select('id, question_text, question_type, sort_order')
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('sort_order');

    const questionList = qs || [];
    setQuestions(questionList);

    if (questionList.length > 0) {
      const qIds = questionList.map(q => q.id);
      const { data: opts } = await supabase
        .from('feedback_options')
        .select('id, question_id, option_text, is_correct')
        .in('question_id', qIds);
      setOptions(opts || []);

      const { data: resps } = await supabase
        .from('feedback_responses')
        .select('question_id, student_auth_user_id, rating, answer_text, selected_option_id')
        .in('question_id', qIds);
      setResponses(resps || []);
    }

    const { data: enrollments } = await supabase
      .from('teacher_students')
      .select('student_auth_user_id')
      .eq('teacher_id', teacherId)
      .eq('is_active', true);

    if (enrollments && enrollments.length > 0) {
      const studentIds = enrollments.map(e => e.student_auth_user_id);
      const { data: users } = await supabase
        .from('users')
        .select('auth_user_id, name, email')
        .in('auth_user_id', studentIds);
      setStudents(users || []);
    }

    setLoading(false);
  };

  // Students who have at least 1 response (took the course feedback)
  const studentsWithResponses = new Set(responses.map(r => r.student_auth_user_id));
  const participatingStudents = students.filter(s => studentsWithResponses.has(s.auth_user_id));

  // KPIs based on participating students
  const totalEnrolled = students.length;
  const participatingCount = participatingStudents.length;
  const allAnswered = participatingStudents.filter(s => {
    const sResps = responses.filter(r => r.student_auth_user_id === s.auth_user_id);
    return sResps.length >= questions.length;
  });
  const completedCount = allAnswered.length;
  const completionRate = participatingCount > 0 ? Math.round((completedCount / participatingCount) * 100) : 0;

  const ratingResponses = responses.filter(r => r.rating != null);
  const avgRating = ratingResponses.length > 0
    ? (ratingResponses.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingResponses.length).toFixed(1)
    : '—';

  const getStudentResponses = (studentId: string) =>
    responses.filter(r => r.student_auth_user_id === studentId);

  const hasCompleted = (studentId: string) => {
    const sResps = getStudentResponses(studentId);
    return sResps.length >= questions.length;
  };

  const renderAnswer = (resp: ResponseData) => {
    const q = questions.find(q => q.id === resp.question_id);
    if (!q) return '—';
    if (q.question_type === 'rating') {
      return (
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={`h-4 w-4 ${i <= (resp.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
          ))}
        </div>
      );
    }
    if (q.question_type === 'multiple_choice' && resp.selected_option_id) {
      const opt = options.find(o => o.id === resp.selected_option_id);
      const isCorrect = opt?.is_correct;
      return (
        <span className={isCorrect ? 'text-green-600 dark:text-green-400 font-medium' : 'text-destructive font-medium'}>
          {opt?.option_text || '—'} {isCorrect ? '✓' : '✗'}
        </span>
      );
    }
    if (q.question_type === 'poll' && resp.answer_text) {
      const selectedIds = resp.answer_text.split(',').filter(Boolean);
      const selectedTexts = selectedIds.map(id => options.find(o => o.id === id)?.option_text).filter(Boolean);
      return <span>{selectedTexts.join(', ') || '—'}</span>;
    }
    return <span>{resp.answer_text || '—'}</span>;
  };

  const exportCSV = () => {
    const headers = ['Alumno', 'Email', 'Estado', ...questions.map(q => q.question_text)];
    const rows = participatingStudents.map(s => {
      const sResps = getStudentResponses(s.auth_user_id);
      const status = hasCompleted(s.auth_user_id) ? 'Completado' : 'Pendiente';
      const answers = questions.map(q => {
        const r = sResps.find(r => r.question_id === q.id);
        if (!r) return '';
        if (q.question_type === 'rating') return String(r.rating || '');
        if (q.question_type === 'multiple_choice' && r.selected_option_id) {
          const opt = options.find(o => o.id === r.selected_option_id);
          return opt?.option_text || '';
        }
        return r.answer_text || '';
      });
      return [s.name, s.email, status, ...answers];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printGlobal = () => {
    setPrintStudentId(null);
    setTimeout(() => window.print(), 100);
  };

  const printIndividual = (studentId: string) => {
    setPrintStudentId(studentId);
    setTimeout(() => window.print(), 100);
  };

  if (loading) return <p className="text-muted-foreground">Cargando análisis...</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <h2 className="text-lg font-semibold text-foreground">📊 Análisis — {className}</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{participatingCount}</p>
              <p className="text-xs text-muted-foreground">Tomaron el curso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Feedback completo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
              <p className="text-xs text-muted-foreground">Tasa de completitud</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{avgRating}</p>
              <p className="text-xs text-muted-foreground">Rating promedio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
        <Button variant="outline" size="sm" onClick={printGlobal} className="gap-1">
          <Printer className="h-4 w-4" /> Imprimir Lista Global
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="participated" className="print:hidden">
        <TabsList>
          <TabsTrigger value="participated">
            Tomaron el curso ({participatingCount})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos los alumnos ({totalEnrolled})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Tomaron el curso */}
        <TabsContent value="participated">
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alumnos que respondieron feedback</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participatingStudents.map(s => {
                      const completed = hasCompleted(s.auth_user_id);
                      const isExpanded = expandedStudent === s.auth_user_id;
                      const sResps = getStudentResponses(s.auth_user_id);

                      return (
                        <>
                          <TableRow key={s.auth_user_id} className="cursor-pointer" onClick={() => setExpandedStudent(isExpanded ? null : s.auth_user_id)}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                            <TableCell>
                              {completed
                                ? <Badge variant="default" className="bg-green-600">✅ Completado</Badge>
                                : <Badge variant="secondary">⏳ Pendiente</Badge>
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  Ver
                                </Button>
                                {completed && (
                                  <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={e => { e.stopPropagation(); printIndividual(s.auth_user_id); }}>
                                    <Printer className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && sResps.length > 0 && (
                            <TableRow key={`${s.auth_user_id}-detail`}>
                              <TableCell colSpan={4} className="bg-muted/30">
                                 <div className="divide-y divide-border/50 py-2 px-4">
                                   {questions.map(q => {
                                     const r = sResps.find(r => r.question_id === q.id);
                                     if (!r) return null;
                                     return (
                                       <div key={q.id} className="text-sm py-2 first:pt-0 last:pb-0">
                                         <p><span className="font-bold text-foreground">P:</span>{' '}<span className="font-bold text-foreground">{q.question_text}</span></p>
                                         <p className="mt-1"><span className="text-muted-foreground">R:</span>{' '}<span className="text-foreground">{renderAnswer(r)}</span></p>
                                       </div>
                                     );
                                   })}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {isExpanded && sResps.length === 0 && (
                            <TableRow key={`${s.auth_user_id}-empty`}>
                              <TableCell colSpan={4} className="bg-muted/30 text-center text-sm text-muted-foreground py-4">
                                Este alumno no ha respondido aún.
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                    {participatingStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Ningún alumno ha respondido feedback aún.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Todos los alumnos */}
        <TabsContent value="all">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Todos los alumnos inscritos ({totalEnrolled})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(s => (
                      <TableRow key={s.auth_user_id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          No hay alumnos inscritos.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print-only sections */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold mb-2">{className} — Análisis de Feedback</h2>
        <p className="text-sm mb-4">Fecha: {new Date().toLocaleDateString('es')} | {completedCount}/{participatingCount} completaron ({completionRate}%) | Rating promedio: {avgRating} | Total inscritos: {totalEnrolled}</p>

        {printStudentId ? (
          (() => {
            const s = students.find(st => st.auth_user_id === printStudentId);
            const sResps = getStudentResponses(printStudentId);
            if (!s) return null;
            return (
              <div>
                <h3 className="font-semibold text-lg mb-2">{s.name} ({s.email})</h3>
                {questions.map(q => {
                  const r = sResps.find(r => r.question_id === q.id);
                  return (
                    <div key={q.id} className="mb-3">
                      <p><strong>P: {q.question_text}</strong></p>
                      <p className="ml-4 text-sm">
                        R: {!r ? '— Sin respuesta' :
                          q.question_type === 'rating' ? `${r.rating}/5` :
                          q.question_type === 'multiple_choice' && r.selected_option_id ?
                            (() => { const o = options.find(o => o.id === r.selected_option_id); return `${o?.option_text} ${o?.is_correct ? '✓' : '✗'}`; })()
                          : q.question_type === 'poll' && r.answer_text ?
                            r.answer_text.split(',').filter(Boolean).map(id => options.find(o => o.id === id)?.option_text).filter(Boolean).join(', ')
                          : r.answer_text || '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-1 text-left">Alumno</th>
                <th className="border p-1 text-left">Email</th>
                <th className="border p-1 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {participatingStudents.map(s => (
                <tr key={s.auth_user_id}>
                  <td className="border p-1">{s.name}</td>
                  <td className="border p-1">{s.email}</td>
                  <td className="border p-1">{hasCompleted(s.auth_user_id) ? '✅ Completado' : '⏳ Pendiente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
