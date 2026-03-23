import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList, Clock } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFillFeedback: () => void;
  onSkip: () => void;
}

export default function FeedbackPromptDialog({ open, onOpenChange, onFillFeedback, onSkip }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">📋 Feedback Pendiente</DialogTitle>
          <DialogDescription>
            Tienes feedback pendiente para esta clase. ¿Te gustaría llenarlo antes de salir?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={onFillFeedback} className="gap-2">
            <ClipboardList className="h-4 w-4" /> Llenar Feedback
          </Button>
          <Button variant="outline" onClick={onSkip} className="gap-2">
            <Clock className="h-4 w-4" /> Lo hago después
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
