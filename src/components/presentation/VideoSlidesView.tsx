import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, StickyNote, BookOpen, ChevronLeft, ChevronRight, Minimize2, Maximize2, ZoomIn, ZoomOut, Download } from 'lucide-react';
import SlideNotes from './SlideNotes';
import TeacherNotesPanel from './TeacherNotesPanel';
import ActionButtons from './ActionButtons';
import ToolModal from './ToolModal';
import VideoModal from './VideoModal';
import DashboardConfirmation from './DashboardConfirmation';
import InteractiveOverlay from './InteractiveOverlay';
import SlideIndicator from './SlideIndicator';
import { ActionConfig } from '@/types/presentation';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useSlideZoom } from '@/hooks/useSlideZoom';

interface SlideData {
  id: string;
  slide_number: number;
  media_url: string | null;
  media_type: string;
  is_active: boolean;
  actions: ActionConfig[];
  title: string;
  content_type: string;
  thumbnail_url?: string | null;
  teacher_notes: string;
}

interface VideoSlidesViewProps {
  classId: string;
  className: string;
  videoUrl: string;
  slides: SlideData[];
  authUserId?: string;
  canTakeNotes: boolean;
  isStudent: boolean;
  teacherNotes: string;
  layout?: string;
  onBack: () => void;
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

export default function VideoSlidesView({
  classId,
  className: clsName,
  videoUrl,
  slides,
  authUserId,
  canTakeNotes,
  isStudent,
  teacherNotes,
  layout = 'video-top',
  onBack,
}: VideoSlidesViewProps) {
  const isMobile = useIsMobile();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
  const [toolUrl, setToolUrl] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<{ url: string; label: string; vertical: boolean } | null>(null);
  const [showDashConfirm, setShowDashConfirm] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pip, setPip] = useState(false);

  const zoom = useSlideZoom(pip);

  // Reset zoom when slide changes
  useEffect(() => {
    zoom.resetZoom();
  }, [currentSlideIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const vimeoId = extractVimeoId(videoUrl);
  const youtubeId = extractYouTubeId(videoUrl);
  const isVimeo = !!vimeoId;
  const isYouTube = !!youtubeId;

  const embedUrl = isVimeo
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=0&muted=0&controls=1&responsive=1&dnt=1&title=0&byline=0&portrait=0`
    : isYouTube
    ? `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&enablejsapi=1`
    : videoUrl;

  const totalSlides = slides.length;
  const currentSlide = slides[currentSlideIndex] || null;

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.min(totalSlides - 1, prev + 1));
  }, [totalSlides]);

  const currentActions = currentSlide?.actions || [];

  const currentActionConfig: ActionConfig | undefined = useMemo(() => {
    if (!currentActions.length) return undefined;
    const questionAction = currentActions.find((a: any) => a._actionType === 'question');
    if (questionAction) return questionAction;
    const config: ActionConfig = {};
    currentActions.forEach((a: any, i: number) => {
      const suffix = i === 0 ? '' : String(i + 1);
      if (a._actionType === 'web') (config as any)[`web${suffix}`] = a.web;
      else if (a._actionType === 'tool') (config as any)[`tool${suffix}`] = a.tool;
      else if (a._actionType === 'video') {
        (config as any)[`video${suffix}`] = a.video;
        (config as any)[`videoLabel${suffix}`] = a.videoLabel;
        (config as any)[`videoVertical${suffix}`] = a.videoVertical;
      }
      else if (a._actionType === 'dashboard') config.dashboard = true;
    });
    return Object.keys(config).length > 0 ? config : undefined;
  }, [currentActions]);

  const answerQuestion = useCallback((key: string, answer: string) => {
    localStorage.setItem(`mewe_answer_${key}`, answer);
    setTimeout(() => nextSlide(), 500);
  }, [nextSlide]);

  const toggleActionMenu = useCallback(() => setIsActionMenuVisible(prev => !prev), []);
  const hideActionMenu = useCallback(() => setIsActionMenuVisible(false), []);

  const hasGuide = !!(teacherNotes && teacherNotes.trim());
  const hasSlideGuide = !!(currentSlide?.teacher_notes && currentSlide.teacher_notes.trim());
  const activeGuideText = hasSlideGuide ? currentSlide!.teacher_notes : hasGuide ? teacherNotes : '';
  const showGuideButton = hasGuide || hasSlideGuide;

  const canShowNotes = canTakeNotes && authUserId;

  const showRightPanel = !isMobile && (showNotes || showGuide);

  // Download current slide image
  const handleDownloadSlide = useCallback(() => {
    if (!currentSlide?.media_url) return;
    const a = document.createElement('a');
    a.href = currentSlide.media_url;
    a.download = `slide-${currentSlide.slide_number}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [currentSlide]);

  // Compute video container classes based on pip and layout
  const videoContainerClasses = pip
    ? `fixed z-50 rounded-lg shadow-2xl overflow-hidden border border-white/10 transition-all duration-300 ${
        isMobile ? 'bottom-20 right-3 w-40 h-24' : 'bottom-4 right-4 w-56 h-32'
      }`
    : `relative transition-all duration-300 ${
        isMobile ? 'h-[35vh] w-full shrink-0'
        : layout === 'video-left' ? 'w-1/2 h-full shrink-0'
        : layout === 'video-dominant' ? 'w-[70%] h-full shrink-0'
        : 'h-[50%] w-full shrink-0'
      }`;

  // Slide image with optional zoom
  const renderSlideImage = () => {
    if (!currentSlide) return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <span>No hay diapositivas disponibles</span>
      </div>
    );

    return (
      <>
        <div
          ref={pip ? zoom.containerRef : undefined}
          className={`flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-black/50 ${pip ? 'touch-none' : ''}`}
          onTouchStart={pip ? zoom.handleTouchStart : undefined}
          onTouchMove={pip ? zoom.handleTouchMove : undefined}
          onTouchEnd={pip ? zoom.handleTouchEnd : undefined}
          onWheel={pip ? zoom.handleWheel : undefined}
        >
          {currentSlide.media_url ? (
            <img
              src={currentSlide.media_url}
              alt={currentSlide.title || `Slide ${currentSlide.slide_number}`}
              className="max-w-full max-h-full object-contain select-none pointer-events-none"
              draggable={false}
              style={pip ? zoom.imgStyle : undefined}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <span className="text-6xl font-bold opacity-20">{currentSlide.slide_number}</span>
              {currentSlide.title && <span className="text-sm">{currentSlide.title}</span>}
            </div>
          )}
          {totalSlides > 1 && !zoom.isZoomed && (
            <>
              <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all disabled:opacity-20" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button onClick={nextSlide} disabled={currentSlideIndex >= totalSlides - 1} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all disabled:opacity-20" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </>
          )}
          {/* Zoom controls in PiP mode */}
          {pip && (
            <div className="absolute bottom-3 right-3 flex gap-1 z-10">
              <button
                onClick={zoom.handleZoomOut}
                disabled={!zoom.isZoomed}
                className="rounded-full p-1.5 text-white/80 backdrop-blur-sm disabled:opacity-30 hover:bg-black/70 transition-colors"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={zoom.handleZoomIn}
                disabled={zoom.scale >= 4}
                className="rounded-full p-1.5 text-white/80 backdrop-blur-sm disabled:opacity-30 hover:bg-black/70 transition-colors"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-center gap-3 py-2 px-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          {currentSlide.title && <span className="text-xs text-white/70 truncate max-w-[200px]">{currentSlide.title}</span>}
          <span className="text-xs text-white/50">{currentSlideIndex + 1} / {totalSlides}</span>
          {currentSlide.media_url && (
            <button
              onClick={handleDownloadSlide}
              className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Descargar diapositiva"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-black" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-2 p-3 md:p-4 shrink-0" style={{ background: 'rgba(0,0,0,0.9)' }}>
        <span className="text-base md:text-lg font-semibold text-white truncate min-w-0 flex-1 mr-2">{clsName}</span>
        <div className="flex items-center gap-2 shrink-0">
          {showGuideButton && (
            <button
              onClick={() => setShowGuide(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${
                showGuide ? 'bg-primary text-primary-foreground' : 'bg-primary/80 text-primary-foreground hover:bg-primary/70'
              }`}
            >
              <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
              <span>Guía</span>
            </button>
          )}
          {canShowNotes && (
            <button
              onClick={() => setShowNotes(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${
                showNotes ? 'bg-yellow-500 text-black' : 'bg-yellow-400 text-black hover:bg-yellow-300'
              }`}
            >
              <StickyNote className="h-4 w-4 md:h-5 md:w-5" />
              <span>Notas</span>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 md:px-4 md:py-2 md:text-base"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
            <span>Cerrar</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex">
        {/* Content: video + slides */}
        <div className={`flex min-h-0 ${showRightPanel ? 'flex-1' : 'w-full'} ${
          pip ? 'flex-col' :
          !isMobile && (layout === 'video-left' || layout === 'video-dominant') ? 'flex-row' :
          layout === 'slides-top' ? 'flex-col-reverse' : 'flex-col'
        }`}>
          {/* Single persistent video container — CSS moves it between inline and PiP */}
          <div className={videoContainerClasses}>
            {(isVimeo || isYouTube) ? (
              <iframe ref={iframeRef} src={embedUrl} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen title={clsName} style={{ touchAction: 'none' }} />
            ) : (
              <video src={videoUrl} className="w-full h-full bg-black" controls playsInline title={clsName} />
            )}
            <button
              onClick={() => setPip(prev => !prev)}
              className="absolute top-2 right-2 z-20 rounded-full p-1.5 text-white/80 backdrop-blur-sm hover:bg-black/70 transition-colors"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              aria-label={pip ? 'Expandir video' : 'Minimizar video'}
            >
              {pip ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Slides area */}
          <div className="flex-1 min-h-0 relative flex flex-col">
            {renderSlideImage()}
          </div>
        </div>

        {/* Right panel: guide and/or notes (desktop only) */}
        {showRightPanel && (
          <div className="w-80 border-l flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.85)' }}>
            {showGuide && activeGuideText && (
              <div className={showNotes && canShowNotes ? 'h-1/2 border-b overflow-hidden' : 'flex-1 overflow-hidden'} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <TeacherNotesPanel
                  notes={activeGuideText}
                  slideNumber={currentSlide?.slide_number || 1}
                  slideTitle={currentSlide?.title || clsName}
                  onClose={() => setShowGuide(false)}
                />
              </div>
            )}
            {showNotes && canShowNotes && authUserId && (
              <div className={showGuide && activeGuideText ? 'h-1/2 overflow-hidden' : 'flex-1 overflow-hidden'}>
                <SlideNotes
                  classId={classId}
                  slideNumber={currentSlide?.slide_number || 1}
                  slideTitle={currentSlide?.title || 'Video'}
                  totalSlides={totalSlides}
                  authUserId={authUserId}
                  onClose={() => setShowNotes(false)}
                  embedded
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile panels (fullscreen overlay) */}
      {isMobile && showGuide && activeGuideText && (
        <div className="absolute inset-0 z-10 animate-in slide-in-from-right duration-300 safe-pt safe-pb" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <TeacherNotesPanel notes={activeGuideText} slideNumber={currentSlide?.slide_number || 1} slideTitle={currentSlide?.title || clsName} onClose={() => setShowGuide(false)} />
        </div>
      )}

      {isMobile && showNotes && canShowNotes && authUserId && (
        <div className="absolute inset-0 z-10 animate-in slide-in-from-right duration-300 safe-pt safe-pb" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <SlideNotes
            classId={classId}
            slideNumber={currentSlide?.slide_number || 1}
            slideTitle={currentSlide?.title || 'Video'}
            totalSlides={totalSlides}
            authUserId={authUserId}
            onClose={() => setShowNotes(false)}
            embedded
          />
        </div>
      )}

      {/* Action buttons FAB */}
      {currentActionConfig && (
        <ActionButtons
          config={currentActionConfig}
          isVisible={isActionMenuVisible}
          onToggle={toggleActionMenu}
          onOpenTool={url => setToolUrl(url)}
          onOpenVideo={(url, label, vertical) => setVideoState({ url, label, vertical })}
          onDashboard={() => setShowDashConfirm(true)}
          onBack={onBack}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Interactive overlay for questions */}
      {currentActionConfig?.type === 'question' && currentActionConfig.key && currentActionConfig.text && (
        <InteractiveOverlay questionText={currentActionConfig.text} questionKey={currentActionConfig.key} onAnswer={answerQuestion} />
      )}

      {toolUrl && <ToolModal url={toolUrl} onClose={() => setToolUrl(null)} />}
      {videoState && <VideoModal videoUrl={videoState.url} label={videoState.label} vertical={videoState.vertical} onClose={() => setVideoState(null)} classId={classId} authUserId={authUserId} isStudent={canTakeNotes} />}
      {showDashConfirm && <DashboardConfirmation onConfirm={onBack} onCancel={() => setShowDashConfirm(false)} />}
    </div>
  );
}
