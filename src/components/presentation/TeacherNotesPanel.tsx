import { BookOpen, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  notes: string;
  slideNumber: number;
  slideTitle?: string;
  onClose?: () => void;
}

export default function TeacherNotesPanel({ notes, slideNumber, slideTitle, onClose }: Props) {
  if (!notes) return null;

  return (
    <div className="flex flex-col h-full bg-background/95 border-t border-border">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {slideTitle || `Diapositiva ${slideNumber}`} — Notas del maestro
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors shrink-0"
            aria-label="Cerrar notas del maestro"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{notes}</p>
      </ScrollArea>
    </div>
  );
}
