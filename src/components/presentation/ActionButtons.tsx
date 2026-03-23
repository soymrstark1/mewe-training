import { X, Maximize, Minimize, BookOpen } from 'lucide-react';
import { ActionConfig } from '@/types/presentation';

interface Props {
  config: ActionConfig;
  isVisible: boolean;
  onToggle: () => void;
  onOpenTool: (url: string) => void;
  onOpenVideo: (url: string, label: string, vertical: boolean) => void;
  onDashboard: () => void;
  onBack: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenNotes?: () => void;
  onOpenFeedback?: () => void;
  feedbackPending?: boolean;
  onToggleTeacherNotes?: () => void;
  teacherNotesActive?: boolean;
}

export default function ActionButtons({ config, isVisible, onToggle, onOpenTool, onOpenVideo, onDashboard, onBack, isFullscreen, onToggleFullscreen, onOpenNotes, onOpenFeedback, feedbackPending, onToggleTeacherNotes, teacherNotesActive }: Props) {
  const buttons: { emoji: string | React.ReactNode; label: string; onClick: () => void; special?: boolean }[] = [];

  if (config.web) buttons.push({ emoji: '🌐', label: 'Web', onClick: () => window.open(config.web!, '_blank') });
  if (config.web2) buttons.push({ emoji: '🌐', label: 'Web 2', onClick: () => window.open(config.web2!, '_blank') });
  if (config.tool) buttons.push({ emoji: '🔧', label: 'Herramienta', onClick: () => onOpenTool(config.tool!) });
  if (config.tool2) buttons.push({ emoji: '🔧', label: 'Herramienta 2', onClick: () => onOpenTool(config.tool2!) });
  if (config.video) buttons.push({ emoji: '🎥', label: config.videoLabel || 'Video', onClick: () => onOpenVideo(config.video!, config.videoLabel || 'Video', !!config.videoVertical) });
  if (config.video2) buttons.push({ emoji: '🎥', label: config.videoLabel2 || 'Video 2', onClick: () => onOpenVideo(config.video2!, config.videoLabel2 || 'Video 2', !!config.videoVertical2) });
  if (config.dashboard) buttons.push({ emoji: '🏠', label: 'Hub', onClick: onDashboard, special: true });
  if (onOpenNotes) buttons.push({ emoji: '📝', label: 'Notas', onClick: onOpenNotes });
  if (onToggleTeacherNotes) buttons.push({
    emoji: <BookOpen className={`h-5 w-5 ${teacherNotesActive ? 'text-primary' : ''}`} />,
    label: teacherNotesActive ? 'Ocultar Guía' : 'Guía',
    onClick: onToggleTeacherNotes,
  });
  if (onOpenFeedback) buttons.push({
    emoji: (
      <span className="relative">
        📋
        {feedbackPending && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-white animate-pulse" />
        )}
      </span>
    ),
    label: feedbackPending ? 'Feedback ❗' : 'Feedback',
    onClick: onOpenFeedback,
  });

  // Fullscreen toggle
  buttons.push({
    emoji: isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />,
    label: isFullscreen ? 'Salir P.C.' : 'P. Completa',
    onClick: onToggleFullscreen,
    special: true,
  });

  // Always add "Volver"
  buttons.push({ emoji: '↩️', label: 'Volver', onClick: onBack, special: true });

  if (!isVisible) return null;

  return (
    <div className="fixed z-50" style={{ bottom: 'calc(var(--safe-bottom) + 1.5rem)', right: 'calc(var(--safe-right) + 1.5rem)' }}>
      {/* Menu */}
      <div
        className="absolute bottom-20 right-0 rounded-2xl border p-3 shadow-2xl transition-all duration-300"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: `blur(var(--action-bar-blur))`,
          borderColor: 'rgba(255,255,255,0.2)',
          minWidth: 280,
        }}
      >
        <div className="flex flex-wrap gap-2 justify-center">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={() => { btn.onClick(); onToggle(); }}
              className={`flex flex-col items-center justify-center rounded-full min-w-[60px] h-[60px] px-3 transition-all duration-200 hover:scale-105 ${
                btn.special
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                  : 'text-white hover:bg-white/20'
              }`}
              style={!btn.special ? { background: 'rgba(255,255,255,0.1)' } : {}}
            >
              <span className="text-xl">{btn.emoji}</span>
              <span className="text-[10px] mt-0.5">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Close FAB */}
      <button
        onClick={onToggle}
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-105"
        style={{
          background: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      >
        <X className="h-7 w-7 text-white" />
      </button>
    </div>
  );
}
