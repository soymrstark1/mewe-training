import { useState, useRef, useEffect, useCallback } from 'react';
import { ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  backgroundImage?: string;
  isActive: boolean;
  slideNumber: number;
  contentType?: string;
  mediaUrl?: string;
  onZoomChange?: (zoomed: boolean) => void;
}

function extractVideoEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  const tiktokMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tiktokMatch) return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
  return null;
}

export default function Slide({ backgroundImage, isActive, slideNumber, contentType, mediaUrl, onZoomChange }: Props) {
  const colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2c3e50', '#1b2838', '#2d1b69', '#1a3c34', '#3d1c02', '#0d1117'];

  // Zoom state: scale + pixel-based translate
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Gesture refs
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const lastTapPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const isGesturing = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateAtPanStart = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { translateRef.current = translate; }, [translate]);

  // Reset zoom when slide becomes inactive
  useEffect(() => {
    if (!isActive) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [isActive]);

  // Notify parent of zoom state
  useEffect(() => {
    onZoomChange?.(scale > 1);
  }, [scale, onZoomChange]);

  const clampTranslate = useCallback((s: number, tx: number, ty: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const container = containerRef.current;
    if (!container) return { x: tx, y: ty };
    const rect = container.getBoundingClientRect();
    const maxX = (rect.width * (s - 1)) / 2;
    const maxY = (rect.height * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prev => {
      const next = Math.min(prev + 0.5, 4);
      if (next <= 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next <= 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Get position relative to image center (in px)
  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
      lastPinchMid.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      isGesturing.current = true;
      isPanning.current = false;
      e.preventDefault();
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      translateAtPanStart.current = { ...translateRef.current };
    }

    // Double-tap detection
    if (e.touches.length === 1) {
      const now = Date.now();
      const tapX = e.touches[0].clientX;
      const tapY = e.touches[0].clientY;
      if (now - lastTap.current < 300) {
        if (scaleRef.current > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          // Zoom to 2.5x centered on tap point
          const rel = getRelativePos(tapX, tapY);
          const newScale = 2.5;
          // To keep the tapped point fixed: translate = rel * (1 - newScale)
          // But we also need to clamp
          const tx = rel.x * (1 - newScale);
          const ty = rel.y * (1 - newScale);
          setScale(newScale);
          setTranslate(clampTranslate(newScale, tx, ty));
        }
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        lastTapPos.current = { x: tapX, y: tapY };
      }
    }
  }, [getRelativePos, clampTranslate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null && lastPinchMid.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / lastPinchDist.current;

      const newMid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };

      const oldScale = scaleRef.current;
      const newScale = Math.max(1, Math.min(4, oldScale * ratio));

      // Adjust translate so the pinch midpoint stays fixed on screen
      const rel = getRelativePos(newMid.x, newMid.y);
      const oldT = translateRef.current;

      // The point under the midpoint in image-space:
      // imagePoint = (rel - oldT) / oldScale
      // After scaling, we want: rel = imagePoint * newScale + newT
      // So: newT = rel - imagePoint * newScale = rel - (rel - oldT) * (newScale / oldScale)
      const tx = rel.x - (rel.x - oldT.x) * (newScale / oldScale);
      const ty = rel.y - (rel.y - oldT.y) * (newScale / oldScale);

      // Also account for midpoint movement (pan during pinch)
      const midDx = newMid.x - lastPinchMid.current.x;
      const midDy = newMid.y - lastPinchMid.current.y;

      const finalT = clampTranslate(newScale, tx + midDx, ty + midDy);

      if (newScale <= 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(newScale);
        setTranslate(finalT);
      }

      lastPinchDist.current = dist;
      lastPinchMid.current = newMid;
    } else if (e.touches.length === 1 && isPanning.current && scaleRef.current > 1) {
      // 1:1 pixel panning
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      const newT = clampTranslate(scaleRef.current, translateAtPanStart.current.x + dx, translateAtPanStart.current.y + dy);
      setTranslate(newT);
    }
  }, [getRelativePos, clampTranslate]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastPinchDist.current = null;
      lastPinchMid.current = null;
      isGesturing.current = false;
    }
    if (e.touches.length === 0) isPanning.current = false;
  }, []);

  // Mouse wheel zoom (Ctrl+scroll)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rel = getRelativePos(e.clientX, e.clientY);
      const oldScale = scaleRef.current;
      const newScale = Math.max(1, Math.min(4, oldScale - e.deltaY * 0.01));
      const oldT = translateRef.current;

      const tx = rel.x - (rel.x - oldT.x) * (newScale / oldScale);
      const ty = rel.y - (rel.y - oldT.y) * (newScale / oldScale);

      if (newScale <= 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(newScale);
        setTranslate(clampTranslate(newScale, tx, ty));
      }
    }
  }, [getRelativePos, clampTranslate]);

  const renderContent = () => {
    if (contentType === 'video_link' && mediaUrl) {
      const embedUrl = extractVideoEmbedUrl(mediaUrl);
      return (
        <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: 'hsl(var(--slide-background, 0 0% 5%))' }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full max-w-[90%] max-h-[85%] rounded-lg"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`Video - Slide ${slideNumber}`}
            />
          ) : (
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-lg">
              Abrir video ↗
            </a>
          )}
        </div>
      );
    }

    if (contentType === 'external_link' && mediaUrl) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-6" style={{ backgroundColor: 'hsl(var(--slide-background, 0 0% 5%))' }}>
          <ExternalLink className="h-16 w-16 text-white/30" />
          <p className="text-white/50 text-lg">Enlace externo</p>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => window.open(mediaUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-5 w-5" /> Abrir enlace →
          </Button>
        </div>
      );
    }

    if (backgroundImage) {
      return (
        <div
          ref={containerRef}
          className="h-full w-full overflow-hidden touch-none"
          style={{ backgroundColor: 'hsl(var(--slide-background))' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <img
            ref={imgRef}
            src={backgroundImage}
            alt={`Slide ${slideNumber}`}
            className="h-full w-full object-contain select-none pointer-events-none"
            draggable={false}
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              transformOrigin: 'center center',
              transition: (isPanning.current || isGesturing.current) ? 'none' : 'transform 0.15s ease-out',
            }}
          />
          {/* Zoom controls */}
          {isActive && (
            <div className="absolute bottom-3 right-3 flex gap-1 z-10">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="rounded-full bg-black/50 p-1.5 text-white/80 backdrop-blur-sm disabled:opacity-30 hover:bg-black/70 transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="rounded-full bg-black/50 p-1.5 text-white/80 backdrop-blur-sm disabled:opacity-30 hover:bg-black/70 transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: colors[(slideNumber - 1) % colors.length] }}
      >
        <span className="text-6xl font-bold text-white/30">{slideNumber}</span>
      </div>
    );
  };

  return (
    <div
      className="absolute inset-0 transition-all duration-[400ms]"
      style={{
        opacity: isActive ? 1 : 0,
        visibility: isActive ? 'visible' : 'hidden',
      }}
    >
      {renderContent()}
    </div>
  );
}