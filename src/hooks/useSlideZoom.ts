import { useState, useRef, useCallback, useEffect } from 'react';

export function useSlideZoom(enabled: boolean) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const lastPinchDist = useRef<number | null>(null);
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const isPanning = useRef(false);
  const isGesturing = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateAtPanStart = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { translateRef.current = translate; }, [translate]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [enabled]);

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

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
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
    // Double-tap
    if (e.touches.length === 1) {
      const now = Date.now();
      const tapX = e.touches[0].clientX;
      const tapY = e.touches[0].clientY;
      if (now - lastTap.current < 300) {
        if (scaleRef.current > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          const rel = getRelativePos(tapX, tapY);
          const newScale = 2.5;
          const tx = rel.x * (1 - newScale);
          const ty = rel.y * (1 - newScale);
          setScale(newScale);
          setTranslate(clampTranslate(newScale, tx, ty));
        }
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
  }, [enabled, getRelativePos, clampTranslate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
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
      const rel = getRelativePos(newMid.x, newMid.y);
      const oldT = translateRef.current;
      const tx = rel.x - (rel.x - oldT.x) * (newScale / oldScale);
      const ty = rel.y - (rel.y - oldT.y) * (newScale / oldScale);
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
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      const newT = clampTranslate(scaleRef.current, translateAtPanStart.current.x + dx, translateAtPanStart.current.y + dy);
      setTranslate(newT);
    }
  }, [enabled, getRelativePos, clampTranslate]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastPinchDist.current = null;
      lastPinchMid.current = null;
      isGesturing.current = false;
    }
    if (e.touches.length === 0) isPanning.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!enabled) return;
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
  }, [enabled, getRelativePos, clampTranslate]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const imgStyle = {
    transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
    transformOrigin: 'center center' as const,
    transition: (isPanning.current || isGesturing.current) ? 'none' : 'transform 0.15s ease-out',
  };

  return {
    scale,
    containerRef,
    imgStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    resetZoom,
    isZoomed: scale > 1,
  };
}
