import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import NotesSummary from './NotesSummary';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  authUserId: string;
}

export default function StudentNotesDialog({ open, onOpenChange, classId, className: clsName, authUserId }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          expanded
            ? 'max-w-4xl w-full h-[90vh] overflow-y-auto transition-all'
            : 'max-w-lg max-h-[80vh] overflow-y-auto transition-all'
        }
      >
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>📝 Mis Notas — {clsName}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(e => !e)}
              title={expanded ? 'Contraer' : 'Expandir'}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>
        <NotesSummary
          classId={classId}
          authUserId={authUserId}
          totalSlides={0}
          onClose={() => onOpenChange(false)}
          lightMode
        />
      </DialogContent>
    </Dialog>
  );
}
