import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useProgressUpsert } from '@/hooks/useProgressUpsert';

interface ExamOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

interface ExamQuestion {
  id: string;
  question_text: string;
  question_type: string;
  sort_order: number;
  options: ExamOption[];
}

interface Props {
  classId: string;
  className: string;
  authUserId: string;
  isStudent: boolean;
  onBack: () => void;
}

export default function ExamView({ classId, className, authUserId, isStudent, onBack }: Props) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; openAnswer?: string }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean | null>>({});
  const { upsertImmediate } = useProgressUpsert(classId, authUserId, isStudent);

  useEffect(() => {
    const fetch = async () => {
      const { data: qData } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('class_id', classId)
        .order('sort_order', { ascending: true });
      if (!qData) { setLoading(false); return; }

      const qIds = qData.map(q => q.id);
      let options: any[] = [];
      if (qIds.length > 0) {
        const { data: oData } = await supabase
          .from('exam_options')
          .select('*')
          .in('question_id', qIds)
          .order('sort_order', { ascending: true });
        options = oData || [];
      }

      setQuestions(qData.map(q => ({
        ...q,
        options: options.filter(o => o.question_id === q.id),
      })));

      // Check if already answered
      if (isStudent && qIds.length > 0) {
        const { data: responses } = await supabase
          .from('student_exam_responses')
          .select('*')
          .in('question_id', qIds)
          .eq('student_auth_user_id', authUserId);
        if (responses && responses.length > 0) {
          setSubmitted(true);
          const ans: Record<string, { selectedOptionId?: string; openAnswer?: string }> = {};
          const res: Record<string, boolean | null> = {};
          responses.forEach(r => {
            ans[r.question_id] = { selectedOptionId: r.selected_option_id || undefined, openAnswer: r.open_answer || undefined };
            res[r.question_id] = r.is_correct;
          });
          setAnswers(ans);
          setResults(res);
        }
      }

      setLoading(false);
    };
    fetch();
  }, [classId, authUserId, isStudent]);

  const handleSubmit = async () => {
    // Validate all questions answered
    for (const q of questions) {
      const a = answers[q.id];
      if (q.question_type === 'multiple_choice' && !a?.selectedOptionId) {
        toast.error(`Responde la pregunta ${q.sort_order + 1}`);
        return;
      }
      if (q.question_type === 'open' && (!a?.openAnswer || !a.openAnswer.trim())) {
        toast.error(`Responde la pregunta ${q.sort_order + 1}`);
        return;
      }
    }

    // Submit all answers
    const inserts = questions.map(q => {
      const a = answers[q.id] || {};
      const isCorrect = q.question_type === 'multiple_choice'
        ? q.options.find(o => o.id === a.selectedOptionId)?.is_correct ?? false
        : null; // open questions graded by teacher

      return {
        question_id: q.id,
        student_auth_user_id: authUserId,
        selected_option_id: a.selectedOptionId || null,
        open_answer: a.openAnswer || null,
        is_correct: isCorrect,
      };
    });

    const { error } = await supabase.from('student_exam_responses').upsert(inserts, { onConflict: 'question_id,student_auth_user_id' });
    if (error) { toast.error('Error al enviar respuestas'); return; }

    // Calculate results
    const res: Record<string, boolean | null> = {};
    questions.forEach(q => {
      const a = answers[q.id] || {};
      if (q.question_type === 'multiple_choice') {
        res[q.id] = q.options.find(o => o.id === a.selectedOptionId)?.is_correct ?? false;
      } else {
        res[q.id] = null;
      }
    });
    setResults(res);
    setSubmitted(true);
    toast.success('¡Examen enviado!');
    // Mark progress as completed
    await upsertImmediate(questions.length, questions.length, true);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando examen...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Este examen aún no tiene preguntas.</p>
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      </div>
    );
  }

  const mcQuestions = questions.filter(q => q.question_type === 'multiple_choice');
  const correctCount = mcQuestions.filter(q => results[q.id] === true).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky z-10 flex items-center justify-between p-4 border-b bg-card safe-pt" style={{ top: 'var(--safe-top)' }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <span className="font-semibold text-foreground">{className}</span>
        </div>
        {submitted && mcQuestions.length > 0 && (
          <span className="text-sm font-semibold text-primary">
            {correctCount}/{mcQuestions.length} correctas
          </span>
        )}
      </div>

      <div className="container mx-auto max-w-2xl p-6 space-y-6">
        {questions.map((q, qi) => (
          <Card key={q.id} className={submitted ? (results[q.id] === true ? 'border-emerald-500' : results[q.id] === false ? 'border-destructive' : '') : ''}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-bold text-primary shrink-0">{qi + 1}.</span>
                <p className="text-foreground font-medium">{q.question_text}</p>
              </div>

              {q.question_type === 'multiple_choice' ? (
                <RadioGroup
                  value={answers[q.id]?.selectedOptionId || ''}
                  onValueChange={(val) => { if (!submitted) setAnswers(prev => ({ ...prev, [q.id]: { selectedOptionId: val } })); }}
                  disabled={submitted}
                >
                  {q.options.map((opt, oi) => (
                    <div key={opt.id} className={`flex items-center gap-2 p-2 rounded ${submitted && opt.is_correct ? 'bg-emerald-500/10' : ''} ${submitted && answers[q.id]?.selectedOptionId === opt.id && !opt.is_correct ? 'bg-destructive/10' : ''}`}>
                      <RadioGroupItem value={opt.id} id={opt.id} />
                      <Label htmlFor={opt.id} className="cursor-pointer flex-1">
                        <span className="font-bold text-muted-foreground mr-1">{String.fromCharCode(65 + oi)}.</span>
                        {opt.option_text}
                      </Label>
                      {submitted && opt.is_correct && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-1">
                  <Textarea
                    value={answers[q.id]?.openAnswer || ''}
                    onChange={e => { if (!submitted) setAnswers(prev => ({ ...prev, [q.id]: { openAnswer: e.target.value } })); }}
                    placeholder="Escribe tu respuesta..."
                    disabled={submitted}
                    className="min-h-[80px]"
                  />
                  {submitted && results[q.id] === null && (
                    <p className="text-xs text-muted-foreground italic">Pendiente de calificación por el maestro.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {isStudent && !submitted && (
          <Button size="lg" className="w-full gap-2" onClick={handleSubmit}>
            <Send className="h-5 w-5" /> Enviar Examen
          </Button>
        )}

        {submitted && (
          <div className="text-center p-4">
            <p className="text-muted-foreground">Examen enviado ✓</p>
          </div>
        )}
      </div>
    </div>
  );
}
