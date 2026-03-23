import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Monitor, StickyNote, BookOpen } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import SlideNotes from './SlideNotes';
import TeacherNotesPanel from './TeacherNotesPanel';

interface Props {
  url: string;
  name: string;
  onBack: () => void;
  classId?: string;
  authUserId?: string;
  isStudent?: boolean;
  teacherNotes?: string;
}

export default function UrlView({ url, name, onBack, classId, authUserId, isStudent, teacherNotes }: Props) {
  const [mode, setMode] = useState<'choose' | 'embedded'>('choose');
  const [showNotes, setShowNotes] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const isMobile = useIsMobile();

  const canShowNotes = isStudent && classId && authUserId;
  const hasGuide = !!(teacherNotes && teacherNotes.trim());

  const toggleNotes = useCallback(() => setShowNotes(prev => !prev), []);

  const notesPanel = canShowNotes && showNotes ? (
    <SlideNotes
      classId={classId}
      slideNumber={1}
      slideTitle={name}
      totalSlides={1}
      authUserId={authUserId}
      onClose={() => setShowNotes(false)}
      embedded
    />
  ) : null;

  if (mode === 'embedded') {
    return (
      <div className="h-screen-safe w-screen flex flex-col bg-background">
        <div className="flex items-center justify-between p-3 border-b bg-card safe-pt safe-pl safe-pr">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <span className="text-sm font-semibold text-foreground truncate">{name}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasGuide && (
              <button
                onClick={() => setShowGuide(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${
                  showGuide
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/80 text-primary-foreground hover:bg-primary/70'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Guía</span>
              </button>
            )}
            {canShowNotes && (
              <button
                onClick={toggleNotes}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${
                  showNotes
                    ? 'bg-yellow-500 text-black'
                    : 'bg-yellow-400 text-black hover:bg-yellow-300'
                }`}
              >
                <StickyNote className="h-4 w-4" />
                <span>Notas</span>
              </button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')} className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> Nueva pestaña
            </Button>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <iframe
            src={url}
            className="flex-1 w-full border-0"
            title={name}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
          {/* Desktop guide panel */}
          {showGuide && hasGuide && !isMobile && (
            <div className="w-80 border-l flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.85)' }}>
              <TeacherNotesPanel notes={teacherNotes!} slideNumber={1} slideTitle={name} onClose={() => setShowGuide(false)} />
            </div>
          )}
          {/* Desktop notes panel */}
          {showNotes && canShowNotes && !isMobile && (
            <div className="w-80 border-l flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.85)' }}>
              {notesPanel}
            </div>
          )}
        </div>
        {/* Mobile guide Sheet */}
        {hasGuide && (
          <Sheet open={showGuide && isMobile} onOpenChange={setShowGuide}>
            <SheetContent side="right" className="w-[85%] p-0 bg-background border-l border-border">
              <TeacherNotesPanel notes={teacherNotes!} slideNumber={1} slideTitle={name} onClose={() => setShowGuide(false)} />
            </SheetContent>
          </Sheet>
        )}
        {/* Mobile notes Sheet */}
        {canShowNotes && (
          <Sheet open={showNotes && isMobile} onOpenChange={setShowNotes}>
            <SheetContent side="right" className="w-[85%] p-0 bg-background border-l border-border">
              {notesPanel}
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <Button variant="ghost" onClick={onBack} className="absolute gap-1" style={{ top: 'calc(var(--safe-top) + 1rem)', left: 'calc(var(--safe-left) + 1rem)' }}>
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>

      <div className="text-center space-y-2">
        <span className="text-5xl">🌐</span>
        <h2 className="text-2xl font-bold text-foreground">{name}</h2>
        <p className="text-muted-foreground text-sm">¿Cómo quieres abrir esta página?</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" variant="outline" className="gap-2 px-8 py-6 text-lg rounded-2xl" onClick={() => setMode('embedded')}>
          <Monitor className="h-6 w-6" /> Abrir aquí
        </Button>
        <Button size="lg" className="gap-2 px-8 py-6 text-lg rounded-2xl" onClick={() => window.open(url, '_blank')}>
          <ExternalLink className="h-6 w-6" /> Nueva pestaña
        </Button>
      </div>
    </div>
  );
}
