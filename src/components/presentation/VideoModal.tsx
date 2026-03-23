import { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, StickyNote, BookOpen } from 'lucide-react';
import SlideNotes from './SlideNotes';
import TeacherNotesPanel from './TeacherNotesPanel';

interface Props {
  videoUrl: string;
  label: string;
  vertical: boolean;
  onClose: () => void;
  classId?: string;
  authUserId?: string;
  isStudent?: boolean;
  teacherNotes?: string;
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : '';
}

function extractYouTubeId(url: string): string {
  const patterns = [
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/watch\?v=([^&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return '';
}

function extractTikTokId(url: string): string {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (match) return match[1];
  const shortMatch = url.match(/vm\.tiktok\.com\/([a-zA-Z0-9]+)/);
  return shortMatch ? shortMatch[1] : '';
}

export default function VideoModal({ videoUrl, label, vertical, onClose, classId, authUserId, isStudent, teacherNotes }: Props) {
  const [showTip, setShowTip] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const isMobileView = useIsMobile();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const tipShown = localStorage.getItem('mewe_video_tip_shown');
    if (!tipShown) {
      setShowTip(true);
      localStorage.setItem('mewe_video_tip_shown', 'true');
    }
  }, []);

  const vimeoId = extractVimeoId(videoUrl);
  const youtubeId = extractYouTubeId(videoUrl);
  const tiktokId = extractTikTokId(videoUrl);
  const isVimeo = !!vimeoId;
  const isYouTube = !!youtubeId;
  const isTikTok = !!tiktokId;
  const embedUrl = isVimeo
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=0&muted=0&controls=1&responsive=1&dnt=1&title=0&byline=0&portrait=0&color=ffffff&keyboard=1&pip=1&quality=auto`
    : isYouTube
    ? `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&enablejsapi=1`
    : isTikTok
    ? `https://www.tiktok.com/embed/v2/${tiktokId}`
    : videoUrl;

  // TikTok is always vertical
  const effectiveVertical = isTikTok ? true : vertical;

  const pauseVideo = useCallback(() => {
    if (isYouTube && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    } else if (isVimeo && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"method":"pause"}', '*');
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isYouTube, isVimeo]);

  const playVideo = useCallback(() => {
    if (isYouTube && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    } else if (isVimeo && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"method":"play"}', '*');
    } else if (videoRef.current) {
      videoRef.current.play();
    }
  }, [isYouTube, isVimeo]);

  const toggleNotes = useCallback(() => {
    setShowNotes(prev => {
      if (!prev) pauseVideo();
      else playVideo();
      return !prev;
    });
  }, [pauseVideo, playVideo]);

  const closeNotes = useCallback(() => {
    setShowNotes(false);
    playVideo();
  }, [playVideo]);

  const canShowNotes = isStudent && classId && authUserId;
  const hasGuide = !!(teacherNotes && teacherNotes.trim());

  const notesContent = canShowNotes ? (
    <SlideNotes
      classId={classId}
      slideNumber={1}
      slideTitle="Video"
      totalSlides={1}
      authUserId={authUserId}
      onClose={closeNotes}
      embedded
    />
  ) : null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
    >
      <div
        className={`relative shadow-2xl overflow-hidden bg-black flex ${
          effectiveVertical
            ? 'w-full h-full md:w-[45%] md:max-w-md md:h-[85%] md:rounded-2xl'
            : 'w-full h-full md:w-[95%] md:max-w-7xl md:h-[90%] md:rounded-2xl'
        }`}
      >
        {/* Main video area */}
        <div className={`flex flex-col ${(showNotes || showGuide) && !isMobileView ? 'flex-1' : 'w-full'}`}>
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between gap-2 p-3 md:p-4 backdrop-blur safe-pt safe-pr safe-pl" style={{ background: 'rgba(0,0,0,0.9)' }}>
            <span className="text-base md:text-lg font-semibold text-white truncate min-w-0 flex-1 mr-2">{label}</span>
            <div className="flex items-center gap-2 shrink-0">
              {hasGuide && (
                <button
                  onClick={() => setShowGuide(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${
                    showGuide
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/80 text-primary-foreground hover:bg-primary/70'
                  }`}
                >
                  <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                  <span>Guía</span>
                </button>
              )}
              {canShowNotes && (
                <button
                  onClick={toggleNotes}
                  className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${
                    showNotes
                      ? 'bg-yellow-500 text-black'
                      : 'bg-yellow-400 text-black hover:bg-yellow-300'
                  }`}
                >
                  <StickyNote className="h-4 w-4 md:h-5 md:w-5" />
                  <span>Notas</span>
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 md:px-4 md:py-2 md:text-base"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
                <span>Cerrar</span>
              </button>
            </div>
          </div>

          {(isTikTok && isMobileView) ? (
            <div className="h-[calc(100%-56px)] md:h-[calc(100%-64px)] w-full flex flex-col items-center justify-center gap-6 px-8">
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <span className="text-4xl">🎵</span>
              </div>
              <p className="text-white/70 text-center text-base">Este video de TikTok no se puede embeber en el navegador móvil</p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg transition-transform active:scale-95"
              >
                Abrir en TikTok ↗
              </a>
            </div>
          ) : (isVimeo || isYouTube || isTikTok) ? (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="h-[calc(100%-56px)] md:h-[calc(100%-64px)] w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              title={label}
            />
          ) : (
            <video ref={videoRef} src={videoUrl} className="h-[calc(100%-56px)] md:h-[calc(100%-64px)] w-full bg-black" controls playsInline title={label} />
          )}

          {/* Fullscreen tip */}
          {showTip && (
            <div className="absolute left-1/2 -translate-x-1/2 rounded-2xl px-4 py-2 text-xs md:text-sm text-white" style={{ background: 'rgba(0,0,0,0.8)', bottom: 'calc(var(--safe-bottom) + 1rem)' }}>
              💡 Pulsa el icono de pantalla completa para mejor experiencia
              <button onClick={() => setShowTip(false)} className="ml-2 underline text-white/70">OK</button>
            </div>
          )}
        </div>

        {/* Desktop guide panel */}
        {showGuide && hasGuide && !isMobileView && (
          <div className="w-80 border-l flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.85)' }}>
            <TeacherNotesPanel notes={teacherNotes!} slideNumber={1} slideTitle={label} onClose={() => setShowGuide(false)} />
          </div>
        )}

        {/* Desktop notes panel */}
        {showNotes && canShowNotes && !isMobileView && (
          <div className="w-80 border-l flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.85)' }}>
            {notesContent}
          </div>
        )}

        {/* Mobile guide panel */}
        {showGuide && hasGuide && isMobileView && (
          <div className="absolute inset-0 z-10 animate-in slide-in-from-right duration-300 safe-pt safe-pb" style={{ background: 'rgba(0,0,0,0.95)' }}>
            <TeacherNotesPanel notes={teacherNotes!} slideNumber={1} slideTitle={label} onClose={() => setShowGuide(false)} />
          </div>
        )}

        {/* Mobile notes panel (inline, no Portal) */}
        {showNotes && canShowNotes && isMobileView && (
          <div className="absolute inset-0 z-10 animate-in slide-in-from-right duration-300 safe-pt safe-pb" style={{ background: 'rgba(0,0,0,0.95)' }}>
            {notesContent}
          </div>
        )}
      </div>
    </div>
  );
}
