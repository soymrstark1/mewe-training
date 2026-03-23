import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Download, Printer, Send, Star, ChevronRight, ArrowLeft, BarChart3 } from 'lucide-react';
import FeedbackQuestionEditor from './FeedbackQuestionEditor';
import FeedbackAnalytics from './FeedbackAnalytics';

interface ClassWithFeedback {
  id: string;
  name: string;
  class_type: string;
  feedback_enabled: boolean;
}

interface ResponseRow {
  student_auth_user_id: string;
  student_name: string;
  student_email: string;
  question_text: string;
  question_type: string;
  rating: number | null;
  answer_text: string | null;
  selected_option_id: string | null;
  created_at: string;
}

interface Comment {
  id: string;
  auth_user_id: string;
  sender_name: string;
  message: string;
  parent_id: string | null;
  created_at: string;
}

interface OptionData {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export default function FeedbackManager({ teacherId }: { teacherId: string }) {
  const [classes, setClasses] = useState<ClassWithFeedback[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [feedbackOptions, setFeedbackOptions] = useState<OptionData[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('Maestro');
  const [authUserId, setAuthUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUserId(user.id);
        const { data: u } = await supabase.from('users').select('name').eq('auth_user_id', user.id).maybeSingle();
        setSenderName(u?.name || 'Maestro');
      }
      const { data } = await supabase
        .from('teacher_classes')
        .select('id, name, class_type, feedback_enabled')
        .eq('teacher_id', teacherId)
        .eq('feedback_enabled', true)
        .order('sort_order');
      setClasses((data as any) || []);
      setLoading(false);
    };
    init();
  }, [teacherId]);

  const loadClassFeedback = async (classId: string) => {
    setSelectedClass(classId);
    setShowAnalytics(false);

    const { data: qs } = await supabase
      .from('feedback_questions')
      .select('id, question_text, question_type')
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('sort_order');

    if (qs && qs.length > 0) {
      const qIds = qs.map(q => q.id);

      // Load options for showing correct/incorrect
      const { data: opts } = await supabase
        .from('feedback_options')
        .select('id, question_id, option_text, is_correct')
        .in('question_id', qIds);
      setFeedbackOptions(opts || []);

      const { data: resps } = await supabase
        .from('feedback_responses')
        .select('question_id, student_auth_user_id, rating, answer_text, selected_option_id, created_at')
        .in('question_id', qIds);

      const studentIds = [...new Set((resps || []).map(r => r.student_auth_user_id))];
      const { data: students } = studentIds.length > 0
        ? await supabase.from('users').select('auth_user_id, name, email').in('auth_user_id', studentIds)
        : { data: [] };

      const studentMap = new Map((students || []).map(s => [s.auth_user_id, s]));
      const qMap = new Map(qs.map(q => [q.id, q]));

      const rows: ResponseRow[] = (resps || []).map(r => {
        const s = studentMap.get(r.student_auth_user_id);
        const q = qMap.get(r.question_id);
        return {
          student_auth_user_id: r.student_auth_user_id,
          student_name: s?.name || 'Desconocido',
          student_email: s?.email || '',
          question_text: q?.question_text || '',
          question_type: q?.question_type || 'text',
          rating: r.rating,
          answer_text: r.answer_text,
          selected_option_id: r.selected_option_id,
          created_at: r.created_at || '',
        };
      });
      setResponses(rows);
    } else {
      setResponses([]);
      setFeedbackOptions([]);
    }

    const { data: cmts } = await supabase
      .from('feedback_comments')
      .select('*')
      .eq('class_id', classId)
      .order('created_at');
    setComments(cmts || []);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedClass) return;
    await supabase.from('feedback_comments').insert({
      class_id: selectedClass,
      auth_user_id: authUserId,
      sender_name: senderName,
      message: replyText.trim(),
      parent_id: replyTo,
    });
    setReplyText('');
    setReplyTo(null);
    const { data } = await supabase.from('feedback_comments').select('*').eq('class_id', selectedClass).order('created_at');
    setComments(data || []);
    toast.success('Respuesta enviada');
  };

  const exportCSV = () => {
    if (responses.length === 0) { toast.error('No hay datos para exportar'); return; }
    const cls = classes.find(c => c.id === selectedClass);
    const headers = ['Alumno', 'Email', 'Pregunta', 'Tipo', 'Respuesta', 'Fecha'];
    const rows = responses.map(r => [
      r.student_name,
      r.student_email,
      `"${r.question_text.replace(/"/g, '""')}"`,
      r.question_type,
      r.question_type === 'rating' ? String(r.rating || '') :
        r.question_type === 'multiple_choice' && r.selected_option_id
          ? (() => { const o = feedbackOptions.find(o => o.id === r.selected_option_id); return o?.option_text || ''; })()
          : `"${(r.answer_text || '').replace(/"/g, '""')}"`,
      r.created_at ? new Date(r.created_at).toLocaleString('es') : '',
    ]);

    if (comments.length > 0) {
      rows.push([]);
      rows.push(['--- Comentarios ---', '', '', '', '', '']);
      comments.forEach(c => {
        rows.push([c.sender_name, '', `"${c.message.replace(/"/g, '""')}"`, 'comentario', '', new Date(c.created_at).toLocaleString('es')]);
      });
    }

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${cls?.name || 'clase'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printSummary = () => window.print();

  const renderStars = (n: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  const renderResponseValue = (r: ResponseRow) => {
    if (r.question_type === 'rating') return renderStars(r.rating || 0);
    if (r.question_type === 'multiple_choice' && r.selected_option_id) {
      const opt = feedbackOptions.find(o => o.id === r.selected_option_id);
      const isCorrect = opt?.is_correct;
      return (
        <span className={isCorrect ? 'text-green-600 dark:text-green-400 font-medium' : 'text-destructive font-medium'}>
          {opt?.option_text || '—'} {isCorrect ? '✓' : '✗'}
        </span>
      );
    }
    if (r.question_type === 'poll' && r.answer_text) {
      const selectedIds = r.answer_text.split(',').filter(Boolean);
      const selectedTexts = selectedIds.map(id => feedbackOptions.find(o => o.id === id)?.option_text).filter(Boolean);
      return <span className="font-medium text-foreground">{selectedTexts.join(', ') || '—'}</span>;
    }
    return <p className="font-medium text-foreground">{r.answer_text || '—'}</p>;
  };

  const groupedByStudent = responses.reduce<Record<string, ResponseRow[]>>((acc, r) => {
    if (!acc[r.student_auth_user_id]) acc[r.student_auth_user_id] = [];
    acc[r.student_auth_user_id].push(r);
    return acc;
  }, {});

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  if (!selectedClass) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">💬 Feedback de Clases</h2>
        {classes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay clases con feedback habilitado. Activa el feedback desde la pestaña de Clases.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <Card key={cls.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => loadClassFeedback(cls.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{cls.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{cls.class_type}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const cls = classes.find(c => c.id === selectedClass);

  // Show analytics full-screen
  if (showAnalytics) {
    return (
      <FeedbackAnalytics
        classId={selectedClass}
        className={cls?.name || ''}
        teacherId={teacherId}
        onBack={() => setShowAnalytics(false)}
      />
    );
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <h2 className="text-lg font-semibold text-foreground flex-1">{cls?.name}</h2>
        <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)} className="gap-1">
          <BarChart3 className="h-4 w-4" /> Análisis
        </Button>
      </div>

      <Tabs defaultValue="questions" className="print:hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">Preguntas</TabsTrigger>
          <TabsTrigger value="responses">Respuestas</TabsTrigger>
          <TabsTrigger value="comments">Comentarios</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <FeedbackQuestionEditor classId={selectedClass} />
        </TabsContent>

        <TabsContent value="responses">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={printSummary} className="gap-1">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
            {Object.keys(groupedByStudent).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay respuestas.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedByStudent).map(([studentId, rows]) => (
                  <Card key={studentId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{rows[0].student_name} <span className="text-muted-foreground font-normal">({rows[0].student_email})</span></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {rows.map((r, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-muted-foreground">{r.question_text}</p>
                          {renderResponseValue(r)}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <div className="space-y-3">
            <ScrollArea className="max-h-96">
              <div className="space-y-2 pr-3">
                {comments.length === 0 && <p className="text-sm text-muted-foreground">No hay comentarios aún.</p>}
                {comments.map(c => (
                  <div
                    key={c.id}
                    className={`rounded-lg p-3 text-sm ${
                      c.auth_user_id === authUserId ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-xs text-muted-foreground">{c.sender_name}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('es')}</p>
                    </div>
                    <p className="text-foreground">{c.message}</p>
                    {c.auth_user_id !== authUserId && (
                      <button
                        className="text-xs text-primary mt-1 hover:underline"
                        onClick={() => setReplyTo(c.id)}
                      >
                        Responder
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={replyTo ? 'Escribe tu respuesta...' : 'Escribe un comentario...'}
                className="min-h-[50px] flex-1"
              />
              <Button size="icon" onClick={sendReply} disabled={!replyText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Print-only summary */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold mb-4">{cls?.name} — Resumen de Feedback</h2>
        <p className="text-sm mb-4">Fecha: {new Date().toLocaleDateString('es')}</p>
        <h3 className="font-semibold mb-2">Respuestas ({Object.keys(groupedByStudent).length} alumnos)</h3>
        {Object.entries(groupedByStudent).map(([studentId, rows]) => (
          <div key={studentId} className="mb-4 border-b pb-2">
            <p className="font-medium">{rows[0].student_name} ({rows[0].student_email})</p>
            {rows.map((r, i) => (
              <p key={i} className="text-sm ml-4">
                {r.question_text}: {r.question_type === 'rating' ? `${r.rating}/5` :
                  r.question_type === 'multiple_choice' && r.selected_option_id
                    ? (() => { const o = feedbackOptions.find(o => o.id === r.selected_option_id); return `${o?.option_text} ${o?.is_correct ? '✓' : '✗'}`; })()
                    : r.question_type === 'poll' && r.answer_text
                      ? r.answer_text.split(',').filter(Boolean).map(id => feedbackOptions.find(o => o.id === id)?.option_text).filter(Boolean).join(', ')
                      : r.answer_text || '—'}
              </p>
            ))}
          </div>
        ))}
        <h3 className="font-semibold mb-2 mt-4">Comentarios</h3>
        {comments.map(c => (
          <p key={c.id} className="text-sm ml-4">{c.sender_name}: {c.message}</p>
        ))}
      </div>
    </div>
  );
}
