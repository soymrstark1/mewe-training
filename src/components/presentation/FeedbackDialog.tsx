import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Star, Send, MessageCircle } from 'lucide-react';

interface FeedbackOption {
  id: string;
  option_text: string;
  sort_order: number;
}

interface FeedbackQuestion {
  id: string;
  question_text: string;
  question_type: string;
  sort_order: number;
  options: FeedbackOption[];
}

interface FeedbackComment {
  id: string;
  auth_user_id: string;
  sender_name: string;
  message: string;
  parent_id: string | null;
  created_at: string;
}

interface Props {
  classId: string;
  authUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

export default function FeedbackDialog({ classId, authUserId, open, onOpenChange, onSubmitted }: Props) {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, { rating?: number; answer_text?: string; selected_option_id?: string }>>({});
  const [existingResponses, setExistingResponses] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [senderName, setSenderName] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: user } = await supabase.from('users').select('name').eq('auth_user_id', authUserId).maybeSingle();
      setSenderName(user?.name || 'Estudiante');

      const { data: qs } = await supabase
        .from('feedback_questions')
        .select('id, question_text, question_type, sort_order')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('sort_order');

      if (qs && qs.length > 0) {
        const qIds = qs.map(q => q.id);
        const { data: opts } = await supabase
          .from('feedback_options')
          .select('*')
          .in('question_id', qIds)
          .order('sort_order');

        const questionsWithOpts: FeedbackQuestion[] = qs.map(q => ({
          ...q,
          options: (opts || []).filter((o: any) => o.question_id === q.id),
        }));
        setQuestions(questionsWithOpts);

        const { data: resp } = await supabase
          .from('feedback_responses')
          .select('question_id, rating, answer_text, selected_option_id')
          .in('question_id', qIds)
          .eq('student_auth_user_id', authUserId);
        if (resp && resp.length > 0) {
          const existing: Record<string, string> = {};
          const ans: Record<string, { rating?: number; answer_text?: string; selected_option_id?: string }> = {};
          resp.forEach((r: any) => {
            existing[r.question_id] = r.question_id;
            ans[r.question_id] = {
              rating: r.rating ?? undefined,
              answer_text: r.answer_text ?? undefined,
              selected_option_id: r.selected_option_id ?? undefined,
            };
          });
          setExistingResponses(existing);
          setAnswers(ans);
          setSubmitted(true);
        }
      } else {
        setQuestions([]);
      }

      const { data: cmts } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('class_id', classId)
        .order('created_at');
      setComments(cmts || []);
    };
    load();
  }, [open, classId, authUserId]);

  const setAnswer = (qId: string, field: 'rating' | 'answer_text' | 'selected_option_id', value: number | string) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], [field]: value } }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      for (const q of questions) {
        const ans = answers[q.id];
        if (!ans) continue;
        const payload: any = {
          rating: ans.rating ?? null,
          answer_text: ans.answer_text ?? null,
          selected_option_id: ans.selected_option_id ?? null,
        };
        if (existingResponses[q.id]) {
          await supabase.from('feedback_responses')
            .update(payload)
            .eq('question_id', q.id)
            .eq('student_auth_user_id', authUserId);
        } else {
          await supabase.from('feedback_responses').insert({
            question_id: q.id,
            student_auth_user_id: authUserId,
            ...payload,
          });
        }
      }
      setSubmitted(true);
      onSubmitted?.();
      toast.success('¡Feedback enviado!');
    } catch {
      toast.error('Error al enviar feedback');
    }
    setSaving(false);
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('feedback_comments').insert({
      class_id: classId,
      auth_user_id: authUserId,
      sender_name: senderName,
      message: newComment.trim(),
    });
    if (error) toast.error('Error al enviar comentario');
    else {
      setNewComment('');
      const { data } = await supabase.from('feedback_comments').select('*').eq('class_id', classId).order('created_at');
      setComments(data || []);
    }
    setSaving(false);
  };

  const renderStars = (qId: string, current?: number) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} onClick={() => setAnswer(qId, 'rating', star)} className="transition-transform hover:scale-110">
          <Star className={`h-7 w-7 ${(current || 0) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] flex flex-col overflow-hidden rounded-lg">
        <DialogHeader>
          <DialogTitle>📋 Feedback</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3 pb-2">
          <div className="space-y-6 pb-4">
            {questions.length > 0 && (
              <div className="space-y-4">
                {questions.map(q => (
                  <div key={q.id} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                    {q.question_type === 'rating' && renderStars(q.id, answers[q.id]?.rating)}
                    {q.question_type === 'text' && (
                      <Textarea
                        value={answers[q.id]?.answer_text || ''}
                        onChange={e => setAnswer(q.id, 'answer_text', e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        className="min-h-[60px]"
                      />
                    )}
                    {q.question_type === 'yes_no' && (
                      <div className="flex gap-2">
                        {['Sí', 'No'].map(opt => (
                          <Button
                            key={opt}
                            size="sm"
                            variant={answers[q.id]?.answer_text === opt ? 'default' : 'outline'}
                            onClick={() => setAnswer(q.id, 'answer_text', opt)}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    )}
                    {q.question_type === 'multiple_choice' && q.options.length > 0 && (
                      <RadioGroup
                        value={answers[q.id]?.selected_option_id || ''}
                        onValueChange={val => setAnswer(q.id, 'selected_option_id', val)}
                      >
                        {q.options.map((opt, oi) => (
                          <div key={opt.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${answers[q.id]?.selected_option_id === opt.id ? 'bg-primary/10 ring-1 ring-primary' : ''}`}>
                            <RadioGroupItem value={opt.id} id={`fb-${opt.id}`} />
                            <Label htmlFor={`fb-${opt.id}`} className="text-sm cursor-pointer flex-1">
                              <span className="font-bold text-muted-foreground mr-1">{String.fromCharCode(65 + oi)}.</span>
                              {opt.option_text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    {q.question_type === 'poll' && q.options.length > 0 && (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => {
                          const selectedIds = (answers[q.id]?.answer_text || '').split(',').filter(Boolean);
                          const isChecked = selectedIds.includes(opt.id);
                          return (
                            <div key={opt.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${isChecked ? 'bg-primary/10 ring-1 ring-primary' : ''}`}>
                              <Checkbox
                                id={`poll-${opt.id}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const current = (answers[q.id]?.answer_text || '').split(',').filter(Boolean);
                                  const next = checked
                                    ? [...current, opt.id]
                                    : current.filter(id => id !== opt.id);
                                  setAnswer(q.id, 'answer_text', next.join(','));
                                }}
                              />
                              <Label htmlFor={`poll-${opt.id}`} className="text-sm cursor-pointer flex-1">
                                <span className="font-bold text-muted-foreground mr-1">{String.fromCharCode(65 + oi)}.</span>
                                {opt.option_text}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={handleSubmit} disabled={saving} className="w-full gap-2">
                  <Send className="h-4 w-4" /> {submitted ? 'Actualizar Feedback' : 'Enviar Feedback'}
                </Button>
              </div>
            )}

            {/* Comments section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Preguntas al Maestro
              </h3>
              {comments.length > 0 && (
                <div className="space-y-2">
                  {comments.map(c => (
                    <div
                      key={c.id}
                      className={`rounded-lg p-3 text-sm ${
                        c.auth_user_id === authUserId
                          ? 'bg-primary/10 ml-4'
                          : 'bg-muted mr-4'
                      }`}
                    >
                      <p className="font-medium text-xs text-muted-foreground mb-1">{c.sender_name}</p>
                      <p className="text-foreground">{c.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Escribe una pregunta o comentario..."
                  className="min-h-[50px] flex-1"
                />
                <Button size="icon" onClick={sendComment} disabled={saving || !newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
