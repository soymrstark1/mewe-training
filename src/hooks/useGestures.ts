import { useEffect, useRef } from 'react';

interface GestureCallbacks {
  onNext: () => void;
  onPrev: () => void;
  onShowMenu: () => void;
  onHideMenu: () => void;
  disabled?: boolean;
}

export function useGestures({ onNext, onPrev, onShowMenu, onHideMenu, disabled }: GestureCallbacks) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchCount = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchCount.current = e.touches.length;
      if (e.touches.length === 1) {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (disabled || touchCount.current > 1 || !touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > 50 && absDx > absDy) {
        if (dx < 0) onNext();
        else onPrev();
      } else if (absDy > 50 && absDy > absDx) {
        if (dy < 0) onShowMenu();
        else onHideMenu();
      }
      touchStart.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      switch (e.key) {
        case 'ArrowRight': onNext(); break;
        case 'ArrowLeft': onPrev(); break;
        case 'ArrowUp': e.preventDefault(); onShowMenu(); break;
        case 'ArrowDown': e.preventDefault(); onHideMenu(); break;
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrev, onShowMenu, onHideMenu, disabled]);
}
