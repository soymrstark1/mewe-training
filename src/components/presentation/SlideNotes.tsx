import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import NotesSummary from './NotesSummary';

interface Props {
  classId: string;
  slideNumber: number;
  slideTitle?: string;
  totalSlides: number;
  authUserId: string;
  onClose: () => void;
  embedded?: boolean;
}

export default function SlideNotes({ classId, slideNumber, slideTitle, totalSlides, authUserId, onClose, embedded = false }: Props) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load note for current slide
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('student_notes')
        .select('note_text')
        .eq('student_auth_user_id', authUserId)
        .eq('class_id', classId)
        .eq('slide_number', slideNumber)
        .maybeSingle();
      setNoteText(data?.note_text || '');
    };
    load();
  }, [classId, slideNumber, authUserId]);

  const saveNote = useCallback(async (text: string) => {
    setSaving(true);
    const trimmed = text.trim();
    if (!trimmed) {
      // Delete empty note
      await supabase
        .from('student_notes')
        .delete()
        .eq('student_auth_user_id', authUserId)
        .eq('class_id', classId)
        .eq('slide_number', slideNumber);
    } else {
      await supabase
        .from('student_notes')
        .upsert({
          student_auth_user_id: authUserId,
          class_id: classId,
          slide_number: slideNumber,
          note_text: trimmed,
        }, { onConflict: 'student_auth_user_id,class_id,slide_number' });
    }
    setSaving(false);
  }, [authUserId, classId, slideNumber]);

  const handleChange = (value: string) => {
    setNoteText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(value), 1000);
  };

  // Save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (showSummary) {
    return <NotesSummary classId={classId} authUserId={authUserId} totalSlides={totalSlides} onClose={() => setShowSummary(false)} />;
  }

  return (
    <div
      className={embedded ? "h-full w-full flex flex-col" : "fixed right-0 top-0 z-50 h-full w-80 border-l shadow-2xl flex flex-col safe-pt safe-pb"}
      style={embedded ? { background: 'rgba(0,0,0,0.85)' } : { background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <h3 className="text-sm font-semibold text-white">📝 Notas - Diapositiva {slideNumber}{slideTitle ? `: ${slideTitle}` : ''}</h3>
        <button onClick={onClose} className="text-white/60 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 p-4">
        <Textarea
          value={noteText}
          onChange={e => handleChange(e.target.value)}
          placeholder="Escribe tus notas aquí..."
          className="h-full resize-none border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-primary"
          maxLength={5000}
        />
      </div>

      <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <span className="text-xs text-white/40">{saving ? 'Guardando...' : 'Auto-guardado'}</span>
        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1" onClick={() => setShowSummary(true)}>
          <FileText className="h-4 w-4" /> Ver Resumen
        </Button>
      </div>
    </div>
  );
}
