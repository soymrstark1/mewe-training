import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, StickyNote, ChevronUp, ChevronDown, ExternalLink, Play } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import SlideNotes from './SlideNotes';

interface VideoItem {
  id: string;
  slide_number: number;
  media_url: string;
  title: string;
  thumbnail_url?: string | null;
}

interface Props {
  videos: VideoItem[];
  onBack: () => void;
  classId?: string;
  authUserId?: string;
  canTakeNotes?: boolean;
}

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/.test(url) || /vm\.tiktok\.com/.test(url);
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getAutoThumbnail(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  return null;
}

function getEmbedUrl(url: string): string | null {
  const tiktokMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tiktokMatch) return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
  const tiktokShort = url.match(/vm\.tiktok\.com\/([a-zA-Z0-9]+)/);
  if (tiktokShort) return `https://www.tiktok.com/embed/v2/${tiktokShort[1]}`;
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

// ─── Gallery View ───
function VideoGallery({ videos, onSelect, onBack }: { videos: VideoItem[]; onSelect: (i: number) => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center gap-3 p-4 safe-pt border-b border-white/10">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10 gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <span className="text-white/60 text-sm">{videos.length} videos</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {videos.map((video, i) => {
            const thumb = video.thumbnail_url || getAutoThumbnail(video.media_url);
            return (
              <button
                key={video.id}
                onClick={() => onSelect(i)}
                className="group relative flex flex-col rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="relative aspect-[9/16] w-full bg-white/5 flex items-center justify-center overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <Play className="h-10 w-10 text-white/30" />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {i + 1}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-white/80 text-sm font-medium line-clamp-2 leading-tight">
                    {video.title || `Video ${i + 1}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Feed View ───
function VideoFeed({ videos, startIndex, onBackToGallery, classId, authUserId, canTakeNotes }: {
  videos: VideoItem[];
  startIndex: number;
  onBackToGallery: () => void;
  classId?: string;
  authUserId?: string;
  canTakeNotes?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showNotes, setShowNotes] = useState(false);
  const isMobileView = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isScrolling = useRef(false);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= videos.length || isScrolling.current) return;
    isScrolling.current = true;
    setCurrentIndex(index);
    setTimeout(() => { isScrolling.current = false; }, 500);
  }, [videos.length]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape') onBackToGallery();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onBackToGallery]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0) goNext(); else goPrev();
      }
      touchStart.current = null;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, [goNext, goPrev]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let wheelTimeout: ReturnType<typeof setTimeout>;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (e.deltaY > 30) goNext(); else if (e.deltaY < -30) goPrev();
      }, 50);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [goNext, goPrev]);

  const current = videos[currentIndex];
  if (!current) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 safe-pt" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
        <Button variant="ghost" size="sm" onClick={onBackToGallery} className="text-white hover:bg-white/10 gap-1">
          <ArrowLeft className="h-4 w-4" /> Videos
        </Button>
        <div className="flex items-center gap-2">
          {canTakeNotes && classId && authUserId && (
            <Button variant="ghost" size="sm" onClick={() => setShowNotes(prev => !prev)} className="text-yellow-400 hover:bg-white/10 gap-1 font-semibold">
              <StickyNote className="h-4 w-4" /> Notas
            </Button>
          )}
          <span className="text-white/60 text-sm font-mono">{currentIndex + 1}/{videos.length}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative flex items-center justify-center">
        {videos.map((video, i) => {
          const isActive = i === currentIndex;
          return (
            <div
              key={video.id}
              className="absolute inset-0 flex items-center justify-center transition-all duration-400"
              style={{ opacity: isActive ? 1 : 0, visibility: isActive ? 'visible' : 'hidden', transform: `translateY(${(i - currentIndex) * 100}%)` }}
            >
              {(() => {
                const embedUrl = getEmbedUrl(video.media_url);
                const isTiktok = isTikTokUrl(video.media_url);
                if (isTiktok && isMobileView) {
                  return (
                    <div className="flex flex-col items-center gap-6 px-8">
                      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center"><span className="text-4xl">🎵</span></div>
                      <p className="text-white/70 text-center text-base">Este video de TikTok no se puede embeber en el navegador móvil</p>
                      <a href={video.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg transition-transform active:scale-95">
                        <ExternalLink className="h-5 w-5" /> Abrir en TikTok
                      </a>
                    </div>
                  );
                }
                if (embedUrl) {
                  return (
                    <iframe
                      src={isActive ? embedUrl : undefined}
                      className="w-full h-full max-w-[500px] max-h-[90vh] rounded-xl"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={video.title || `Video ${video.slide_number}`}
                      style={{ border: 'none' }}
                    />
                  );
                }
                return (
                  <div className="flex flex-col items-center gap-3 text-white/50">
                    <p className="text-lg">No se puede embeber este video</p>
                    <a href={video.media_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Abrir en nueva pestaña ↗</a>
                  </div>
                );
              })()}
            </div>
          );
        })}

        {current.title && (
          <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none px-4">
            <p className="text-white text-lg font-semibold drop-shadow-lg">{current.title}</p>
          </div>
        )}

        {currentIndex > 0 && (
          <button onClick={goPrev} className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white transition-colors">
            <ChevronUp className="h-6 w-6" />
          </button>
        )}
        {currentIndex < videos.length - 1 && (
          <button onClick={goNext} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white transition-colors">
            <ChevronDown className="h-6 w-6" />
          </button>
        )}

        {videos.length > 1 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
            {videos.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>

      {showNotes && canTakeNotes && classId && authUserId && (
        <SlideNotes classId={classId} slideNumber={current.slide_number} slideTitle={current.title || undefined} totalSlides={videos.length} authUserId={authUserId} onClose={() => setShowNotes(false)} />
      )}
    </div>
  );
}

// ─── Main Component ───
export default function TikTokFeedView({ videos, onBack, classId, authUserId, canTakeNotes }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (selectedIndex !== null) {
    return (
      <VideoFeed
        videos={videos}
        startIndex={selectedIndex}
        onBackToGallery={() => setSelectedIndex(null)}
        classId={classId}
        authUserId={authUserId}
        canTakeNotes={canTakeNotes}
      />
    );
  }

  return (
    <VideoGallery
      videos={videos}
      onSelect={(i) => setSelectedIndex(i)}
      onBack={onBack}
    />
  );
}
