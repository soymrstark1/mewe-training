import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Save, Check } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

// Local draft for editing without auto-save
interface QuestionDraft {
  question_text: string;
  options: Record<string, string>; // optionId -> option_text
  dirty: boolean;
  saved: boolean; // briefly true after save
}

export default function ExamEditor({ classId }: { classId: string }) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});

  useEffect(() => { fetchQuestions(); }, [classId]);

  const initDrafts = useCallback((qs: ExamQuestion[]) => {
    const d: Record<string, QuestionDraft> = {};
    qs.forEach(q => {
      d[q.id] = {
        question_text: q.question_text,
        options: Object.fromEntries(q.options.map(o => [o.id, o.option_text])),
        dirty: false,
        saved: false,
      };
    });
    setDrafts(d);
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data: qData } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('class_id', classId)
      .order('sort_order', { ascending: true });

    if (!qData) { setLoading(false); return; }

    const questionIds = qData.map(q => q.id);
    let options: any[] = [];
    if (questionIds.length > 0) {
      const { data: oData } = await supabase
        .from('exam_options')
        .select('*')
        .in('question_id', questionIds)
        .order('sort_order', { ascending: true });
      options = oData || [];
    }

    const mapped = qData.map(q => ({
      ...q,
      options: options.filter(o => o.question_id === q.id),
    }));
    setQuestions(mapped);
    initDrafts(mapped);
    setLoading(false);
  };

  // Local draft updates (no DB call)
  const updateDraftText = (qId: string, text: string) => {
    setDrafts(prev => ({
      ...prev,
      [qId]: { ...prev[qId], question_text: text, dirty: true, saved: false },
    }));
  };

  const updateDraftOption = (qId: string, optId: string, text: string) => {
    setDrafts(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        options: { ...prev[qId].options, [optId]: text },
        dirty: true,
        saved: false,
      },
    }));
  };

  // Save a single question + its options to DB
  const saveQuestion = async (qId: string) => {
    const draft = drafts[qId];
    if (!draft) return;

    const q = questions.find(q => q.id === qId);
    if (q && q.question_type === 'multiple_choice' && !q.options.some(o => o.is_correct)) {
      toast.error('Selecciona la opción correcta antes de guardar');
      return;
    }

    const { error: qErr } = await supabase
      .from('exam_questions')
      .update({ question_text: draft.question_text })
      .eq('id', qId);

    if (qErr) { toast.error('Error al guardar pregunta'); return; }

    // Update all options text
    const optionUpdates = Object.entries(draft.options).map(([optId, text]) =>
      supabase.from('exam_options').update({ option_text: text }).eq('id', optId)
    );
    await Promise.all(optionUpdates);

    // Update local questions state
    setQuestions(prev => prev.map(q => q.id === qId ? {
      ...q,
      question_text: draft.question_text,
      options: q.options.map(o => ({ ...o, option_text: draft.options[o.id] ?? o.option_text })),
    } : q));

    setDrafts(prev => ({ ...prev, [qId]: { ...prev[qId], dirty: false, saved: true } }));
    setTimeout(() => {
      setDrafts(prev => prev[qId] ? { ...prev, [qId]: { ...prev[qId], saved: false } } : prev);
    }, 2000);
  };

  const addQuestion = async () => {
    const nextOrder = questions.length;
    const { data, error } = await supabase
      .from('exam_questions')
      .insert({ class_id: classId, question_text: '', question_type: 'multiple_choice', sort_order: nextOrder })
      .select()
      .single();
    if (error || !data) { toast.error('Error al agregar pregunta'); return; }

    await supabase.from('exam_options').insert([
      { question_id: data.id, option_text: '', sort_order: 0 },
      { question_id: data.id, option_text: '', sort_order: 1 },
    ]);
    fetchQuestions();
  };

  const updateQuestionType = async (id: string, value: string) => {
    await supabase.from('exam_questions').update({ question_type: value }).eq('id', id);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, question_type: value } : q));
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('exam_options').delete().eq('question_id', id);
    await supabase.from('exam_questions').delete().eq('id', id);
    toast.success('Pregunta eliminada');
    setDeleteTarget(null);
    fetchQuestions();
  };

  const addOption = async (questionId: string, currentOptions: ExamOption[]) => {
    if (currentOptions.length >= 6) { toast.error('Máximo 6 opciones'); return; }
    const { data, error } = await supabase.from('exam_options').insert({
      question_id: questionId,
      option_text: '',
      sort_order: currentOptions.length,
    }).select().single();
    if (error || !data) { toast.error('Error al agregar opción'); return; }
    const newOpt: ExamOption = { id: data.id, option_text: '', is_correct: false, sort_order: currentOptions.length };
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: [...q.options, newOpt] } : q));
    setDrafts(prev => ({ ...prev, [questionId]: { ...prev[questionId], options: { ...prev[questionId].options, [data.id]: '' } } }));
  };

  const setCorrectOption = async (questionId: string, correctOptionId: string) => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    for (const o of q.options) {
      await supabase.from('exam_options').update({ is_correct: o.id === correctOptionId }).eq('id', o.id);
    }
    setQuestions(prev => prev.map(q => q.id === questionId ? {
      ...q,
      options: q.options.map(o => ({ ...o, is_correct: o.id === correctOptionId })),
    } : q));
  };

  const removeOption = async (questionId: string, optionId: string, currentOptions: ExamOption[]) => {
    if (currentOptions.length <= 2) { toast.error('Mínimo 2 opciones'); return; }
    await supabase.from('exam_options').delete().eq('id', optionId);
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: q.options.filter(o => o.id !== optionId) } : q));
    setDrafts(prev => {
      const d = { ...prev[questionId] };
      const opts = { ...d.options };
      delete opts[optionId];
      return { ...prev, [questionId]: { ...d, options: opts } };
    });
  };

  if (loading) return <p className="text-muted-foreground">Cargando preguntas...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={addQuestion} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Agregar Pregunta
        </Button>
        <span className="text-sm text-muted-foreground">{questions.length} preguntas</span>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => {
          const draft = drafts[q.id];
          if (!draft) return null;

          return (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">Pregunta {qi + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Save button */}
                    <Button
                      variant={draft.saved ? 'ghost' : draft.dirty ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => saveQuestion(q.id)}
                      disabled={!draft.dirty && !draft.saved}
                    >
                      {draft.saved ? (
                        <><Check className="h-3 w-3" /> Guardado</>
                      ) : (
                        <><Save className="h-3 w-3" /> Guardar</>
                      )}
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Abierta</Label>
                      <Switch
                        checked={q.question_type === 'open'}
                        onCheckedChange={(checked) => updateQuestionType(q.id, checked ? 'open' : 'multiple_choice')}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(q.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={draft.question_text}
                  onChange={e => updateDraftText(q.id, e.target.value)}
                  placeholder="Escribe la pregunta..."
                  className="min-h-[60px]"
                />

                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Opciones (selecciona la correcta):</p>
                    <RadioGroup
                      value={q.options.find(o => o.is_correct)?.id || ''}
                      onValueChange={(val) => setCorrectOption(q.id, val)}
                    >
                      {q.options.map((opt, oi) => (
                        <div key={opt.id} className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors ${opt.is_correct ? 'bg-green-100 dark:bg-green-900/30 ring-1 ring-green-400' : ''}`}>
                          <RadioGroupItem value={opt.id} id={opt.id} />
                          <span className="text-xs font-bold text-muted-foreground w-4">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <Input
                            value={draft.options[opt.id] ?? opt.option_text}
                            onChange={e => updateDraftOption(q.id, opt.id, e.target.value)}
                            placeholder={`Opción ${String.fromCharCode(65 + oi)}...`}
                            className="h-8 text-sm flex-1"
                          />
                          {opt.is_correct && (
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">✓ Correcta</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive shrink-0"
                            onClick={() => removeOption(q.id, opt.id, q.options)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </RadioGroup>
                    {q.options.length < 6 && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => addOption(q.id, q.options)}>
                        <Plus className="h-3 w-3" /> Agregar Opción
                      </Button>
                    )}
                  </div>
                )}

                {q.question_type === 'open' && (
                  <p className="text-xs text-muted-foreground italic">
                    El alumno escribirá su respuesta. Tú la calificarás manualmente.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta pregunta?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán también todas sus opciones.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) deleteQuestion(deleteTarget); }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
