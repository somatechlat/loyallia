/**
 * ImageCropEditor — Interactive image crop/position editor.
 * Supports zoom, move, flip, rotate, and reset.
 * Per SRS-003 and UX/UI improvement plan LOYALLIA-PLAN-UX-UI-LOYALTY-CARDS-001.
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

export interface CropState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
  flipH: boolean;
  flipV: boolean;
}

const DEFAULT_CROP: CropState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
  flipH: false,
  flipV: false,
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const MOVE_STEP = 10;
const ROTATE_STEP = 90;

export interface ImageCropEditorProps {
  imageUrl: string;
  aspectRatio?: string;
  onChange?: (state: CropState) => void;
  initialState?: Partial<CropState>;
}

function ZoomInIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function MoveIcon({ direction }: { direction: string }) {
  const arrows: Record<string, string> = {
    up: 'M12 19V5M5 12l7-7 7 7',
    down: 'M12 5v14M19 12l-7 7-7-7',
    left: 'M19 12H5M12 19l-7-7 7-7',
    right: 'M5 12h14M12 5l7 7-7 7',
  };
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={arrows[direction] ?? arrows.up} />
    </svg>
  );
}

function FlipIcon({ horizontal }: { horizontal?: boolean }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={horizontal ? {} : { transform: 'rotate(90deg)' }}>
      <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" /><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" /><line x1="12" y1="20" x2="12" y2="4" />
    </svg>
  );
}

function RotateIcon({ clockwise }: { clockwise?: boolean }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={clockwise ? {} : { transform: 'scaleX(-1)' }}>
      <path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
    </svg>
  );
}

export function ImageCropEditor({ imageUrl, aspectRatio = '1', onChange, initialState }: ImageCropEditorProps) {
  const { t } = useI18n();
  const [crop, setCrop] = useState<CropState>({ ...DEFAULT_CROP, ...initialState });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const updateCrop = useCallback((partial: Partial<CropState>) => {
    setCrop((prev) => {
      const next = { ...prev, ...partial };
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const handleZoomIn = useCallback(() => updateCrop({ zoom: Math.min(crop.zoom + ZOOM_STEP, ZOOM_MAX) }), [crop.zoom, updateCrop]);
  const handleZoomOut = useCallback(() => updateCrop({ zoom: Math.max(crop.zoom - ZOOM_STEP, ZOOM_MIN) }), [crop.zoom, updateCrop]);
  const handleMove = useCallback((dir: string) => {
    const map: Record<string, Partial<CropState>> = {
      up: { offsetY: crop.offsetY - MOVE_STEP },
      down: { offsetY: crop.offsetY + MOVE_STEP },
      left: { offsetX: crop.offsetX - MOVE_STEP },
      right: { offsetX: crop.offsetX + MOVE_STEP },
    };
    updateCrop(map[dir] ?? {});
  }, [crop.offsetX, crop.offsetY, updateCrop]);
  const handleFlipH = useCallback(() => updateCrop({ flipH: !crop.flipH }), [crop.flipH, updateCrop]);
  const handleFlipV = useCallback(() => updateCrop({ flipV: !crop.flipV }), [crop.flipV, updateCrop]);
  const handleRotateCW = useCallback(() => updateCrop({ rotate: (crop.rotate + ROTATE_STEP) % 360 }), [crop.rotate, updateCrop]);
  const handleRotateCCW = useCallback(() => updateCrop({ rotate: (crop.rotate - ROTATE_STEP + 360) % 360 }), [crop.rotate, updateCrop]);
  const handleReset = useCallback(() => {
    setCrop(DEFAULT_CROP);
    onChange?.(DEFAULT_CROP);
  }, [onChange]);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, offsetX: crop.offsetX, offsetY: crop.offsetY };
  }, [crop.offsetX, crop.offsetY]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      updateCrop({ offsetX: dragStartRef.current.offsetX + dx, offsetY: dragStartRef.current.offsetY + dy });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, updateCrop]);

  const transform = `translate(${crop.offsetX}px, ${crop.offsetY}px) scale(${crop.zoom * (crop.flipH ? -1 : 1)}, ${crop.zoom * (crop.flipV ? -1 : 1)}) rotate(${crop.rotate}deg)`;

  const btnClass = 'p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-2">
      {/* Preview area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 cursor-grab active:cursor-grabbing"
        style={{ aspectRatio }}
        onMouseDown={handleMouseDown}
        data-testid="crop-preview"
      >
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          style={{ transform, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.15s ease' }}
          draggable={false}
        />
        {/* Crop guide overlay */}
        <div className="absolute inset-2 border-2 border-dashed border-white/30 rounded pointer-events-none" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-6 gap-1">
        <button type="button" onClick={handleZoomIn} className={btnClass} title={t('wallet.studio.crop.zoomIn')} data-testid="crop-zoom-in"><ZoomInIcon /></button>
        <button type="button" onClick={handleZoomOut} className={btnClass} title={t('wallet.studio.crop.zoomOut')} data-testid="crop-zoom-out"><ZoomOutIcon /></button>
        <button type="button" onClick={() => handleMove('left')} className={btnClass} title={t('wallet.studio.crop.moveLeft')} data-testid="crop-move-left"><MoveIcon direction="left" /></button>
        <button type="button" onClick={() => handleMove('right')} className={btnClass} title={t('wallet.studio.crop.moveRight')} data-testid="crop-move-right"><MoveIcon direction="right" /></button>
        <button type="button" onClick={() => handleMove('up')} className={btnClass} title={t('wallet.studio.crop.moveUp')} data-testid="crop-move-up"><MoveIcon direction="up" /></button>
        <button type="button" onClick={() => handleMove('down')} className={btnClass} title={t('wallet.studio.crop.moveDown')} data-testid="crop-move-down"><MoveIcon direction="down" /></button>
      </div>
      <div className="grid grid-cols-5 gap-1">
        <button type="button" onClick={handleFlipH} className={btnClass} title={t('wallet.studio.crop.flipH')} data-testid="crop-flip-h"><FlipIcon horizontal /></button>
        <button type="button" onClick={handleFlipV} className={btnClass} title={t('wallet.studio.crop.flipV')} data-testid="crop-flip-v"><FlipIcon /></button>
        <button type="button" onClick={handleRotateCW} className={btnClass} title={t('wallet.studio.crop.rotateCW')} data-testid="crop-rotate-cw"><RotateIcon clockwise /></button>
        <button type="button" onClick={handleRotateCCW} className={btnClass} title={t('wallet.studio.crop.rotateCCW')} data-testid="crop-rotate-ccw"><RotateIcon /></button>
        <button type="button" onClick={handleReset} className={btnClass} title={t('wallet.studio.crop.reset')} data-testid="crop-reset"><ResetIcon /></button>
      </div>

      {/* Zoom indicator */}
      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center font-mono">{Math.round(crop.zoom * 100)}%</p>
    </div>
  );
}
