/**
 * Draggable bottom sheet for mobile sidebar.
 *
 * Opens from bottom of screen with a drag handle, backdrop overlay,
 * and scrollable content area per SRS-003 Section 5.
 */

'use client';

import React from 'react';

export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const SHEET_HEIGHT_VH = 85;
const CLOSE_THRESHOLD_PX = 80;

export function MobileBottomSheet({ isOpen, onClose, children, title }: MobileBottomSheetProps) {
  const [translateY, setTranslateY] = React.useState(() => (isOpen ? 0 : 100));
  const [isDragging, setIsDragging] = React.useState(false);
  const startYRef = React.useRef(0);
  const currentYRef = React.useRef(0);
  const sheetRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTranslateY(0);
    } else {
      setTranslateY(100);
    }
  }, [isOpen]);

  const handleDragStart = React.useCallback((clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    currentYRef.current = clientY;
  }, []);

  const handleDragMove = React.useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      currentYRef.current = clientY;
      const delta = clientY - startYRef.current;
      if (delta < 0) return; // prevent dragging up past open
      const percent = (delta / window.innerHeight) * 100;
      setTranslateY(percent);
    },
    [isDragging]
  );

  const handleDragEnd = React.useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const delta = currentYRef.current - startYRef.current;
    if (delta > CLOSE_THRESHOLD_PX) {
      onClose();
    } else {
      setTranslateY(0);
    }
  }, [isDragging, onClose]);

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0]!.clientY);
    },
    [handleDragStart]
  );

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0]!.clientY);
    },
    [handleDragMove]
  );

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      handleDragStart(e.clientY);
    },
    [handleDragStart]
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!isOpen && translateY >= 100) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={onClose}
        data-testid="bottom-sheet-backdrop"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 bottom-0 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${translateY}vh)`,
          maxHeight: `${SHEET_HEIGHT_VH}vh`,
          willChange: 'transform',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div
          className="flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onMouseDown={onMouseDown}
          data-testid="bottom-sheet-handle"
        >
          <div className="w-10 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <span className="mt-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            {title}
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6" data-testid="bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );
}
