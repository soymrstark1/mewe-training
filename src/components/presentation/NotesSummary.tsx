import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Printer, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  classId: string;
  authUserId: string;
  totalSlides: number;
  onClose: () => void;
  lightMode?: boolean;
}

interface NoteRow {
  slide_number: number;
  note_text: string;
  slide_title?: string;
  slide_image?: string;
}

export default function NotesSummary({ classId, authUserId, totalSlides, onClose, lightMode }: Props) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlides, setSavingSlides] = useState<Set<number>>(new Set());
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const debounceRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('student_notes')
        .select('slide_number, note_text')
        .eq('student_auth_user_id', authUserId)
        .eq('class_id', classId)
        .order('slide_number', { ascending: true });

      const { data: slidesData } = await supabase
        .from('teacher_slides')
        .select('slide_number, title, media_url')
        .eq('class_id', classId)
        .eq('is_active', true);

      const titleMap = new Map<number, string>();
      const imageMap = new Map<number, string>();
      slidesData?.forEach(s => {
        if (s.title) titleMap.set(s.slide_number, s.title);
        if (s.media_url) imageMap.set(s.slide_number, s.media_url);
      });

      setNotes((data || []).map(n => ({
        ...n,
        slide_title: titleMap.get(n.slide_number),
        slide_image: imageMap.get(n.slide_number),
      })));
      setLoading(false);
    };
    load();
  }, [classId, authUserId]);

  useEffect(() => {
    return () => {
      debounceRefs.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const saveNote = useCallback(async (slideNumber: number, text: string) => {
    setSavingSlides(prev => new Set(prev).add(slideNumber));
    const trimmed = text.trim();
    if (!trimmed) {
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
    setSavingSlides(prev => { const s = new Set(prev); s.delete(slideNumber); return s; });
  }, [authUserId, classId]);

  const handleNoteChange = (slideNumber: number, newText: string) => {
    setNotes(prev => prev.map(n => n.slide_number === slideNumber ? { ...n, note_text: newText } : n));
    const existing = debounceRefs.current.get(slideNumber);
    if (existing) clearTimeout(existing);
    debounceRefs.current.set(slideNumber, setTimeout(() => saveNote(slideNumber, newText), 1000));
  };

  const toggleExpand = (slideNumber: number) => {
    setExpandedSlide(prev => prev === slideNumber ? null : slideNumber);
  };

  const isLongText = (text: string) => text.length > 120 || text.split('\n').length > 3;

  const slideLabel = (n: NoteRow) => `Diapositiva ${n.slide_number}${n.slide_title ? `: ${n.slide_title}` : ''}`;

  const handlePrint = () => {
    const printContent = notes.map(n =>
      `${slideLabel(n)}\n${'—'.repeat(30)}\n${n.note_text}\n`
    ).join('\n');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Resumen de Notas</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; }
          h1 { font-size: 1.5rem; margin-bottom: 2rem; }
          .note { margin-bottom: 1.5rem; page-break-inside: avoid; }
          .note h2 { font-size: 1rem; color: #666; margin-bottom: 0.5rem; }
          .note p { white-space: pre-wrap; line-height: 1.6; }
          hr { border: none; border-top: 1px solid #eee; margin: 1rem 0; }
        </style></head><body>
        <h1>📝 Resumen de Notas</h1>
        ${notes.map(n => `
          <div class="note">
            <h2>${slideLabel(n).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>
            <p>${n.note_text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div><hr/>
        `).join('')}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const Thumbnail = ({ src }: { src?: string }) => {
    if (!src) return null;
    return (
      <img
        src={src}
        alt=""
        className="w-12 h-[27px] object-cover rounded shrink-0"
        loading="lazy"
      />
    );
  };

  const NoteCard = ({ n, dark }: { n: NoteRow; dark?: boolean }) => {
    const expanded = expandedSlide === n.slide_number;
    const long = isLongText(n.note_text);

    return (
      <div
        key={n.slide_number}
        className={`rounded-lg p-3 space-y-2 ${dark ? '' : 'border bg-muted/30'}`}
        style={dark ? { background: 'rgba(255,255,255,0.05)' } : undefined}
      >
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => toggleExpand(n.slide_number)}
        >
          <Thumbnail src={n.slide_image} />
          <p className={`text-xs font-medium flex-1 ${dark ? 'text-white/50' : 'text-muted-foreground'}`}>
            {slideLabel(n)}
          </p>
          {long && (
            expanded
              ? <ChevronUp className={`h-4 w-4 shrink-0 ${dark ? 'text-white/40' : 'text-muted-foreground'}`} />
              : <ChevronDown className={`h-4 w-4 shrink-0 ${dark ? 'text-white/40' : 'text-muted-foreground'}`} />
          )}
        </div>

        {expanded ? (
          <Textarea
            value={n.note_text}
            onChange={e => handleNoteChange(n.slide_number, e.target.value)}
            className={`min-h-[120px] max-h-[400px] text-sm resize-y ${dark ? 'border-white/20 bg-white/5 text-white placeholder:text-white/40' : ''}`}
            maxLength={5000}
          />
        ) : (
          <div
            className="relative cursor-pointer"
            onClick={() => toggleExpand(n.slide_number)}
          >
            <p className={`text-sm whitespace-pre-wrap line-clamp-3 ${dark ? 'text-white/70' : 'text-foreground'}`}>
              {n.note_text}
            </p>
            {long && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t pointer-events-none ${dark ? 'from-[rgba(255,255,255,0.05)]' : 'from-muted/30'}`}
              />
            )}
            {long && (
              <p className={`text-xs mt-1 ${dark ? 'text-white/30' : 'text-muted-foreground/60'}`}>
                Clic para expandir
              </p>
            )}
          </div>
        )}

        {savingSlides.has(n.slide_number) && (
          <p className={`text-xs animate-pulse ${dark ? 'text-white/40' : 'text-muted-foreground'}`}>Guardando...</p>
        )}
      </div>
    );
  };

  if (lightMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">📋 Resumen de Notas</h3>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={notes.length === 0} className="gap-1">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando notas...</p>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No tienes notas aún.</p>
        ) : (
          notes.map(n => <NoteCard key={n.slide_number} n={n} />)
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 z-50 h-full w-80 border-l shadow-2xl flex flex-col safe-pt safe-pb"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <button onClick={onClose} className="text-white/60 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-sm font-semibold text-white">📋 Resumen de Notas</h3>
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white" onClick={handlePrint} disabled={notes.length === 0}>
          <Printer className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-white/40 text-sm animate-pulse">Cargando notas...</p>
        ) : notes.length === 0 ? (
          <p className="text-white/40 text-sm text-center mt-8">No tienes notas aún. Escribe algo en cualquier diapositiva.</p>
        ) : (
          notes.map(n => <NoteCard key={n.slide_number} n={n} dark />)
        )}
      </div>
    </div>
  );
}
