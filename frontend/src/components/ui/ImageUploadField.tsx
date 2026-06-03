'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { uploadFile } from '@/lib/upload';

function TrashIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  );
}

function ImageIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

function SpinnerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

/**
 * Props for the ImageUploadField component.
 */
interface ImageUploadFieldProps {
  /** Label displayed above the upload area */
  label: string;
  /** Technical specifications shown next to the label */
  specs?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Current image URL value */
  value: string;
  /** Callback when the image URL changes */
  onChange: (url: string) => void;
  /** Aspect ratio class for the dropzone. Default: 'aspect-video' */
  aspectClass?: string;
  /** Compact mode for icons/small images (e.g. coupon icon). Fixed small height. */
  compact?: boolean;
}

/**
 * @description Drag-and-drop image upload field.
 * Shows a local preview IMMEDIATELY while uploading to MinIO/S3 in the background.
 * NO base64 — keeps metadata small and backend-friendly.
 */
export default function ImageUploadField({
  label,
  specs = '',
  required = false,
  value,
  onChange,
  aspectClass = 'aspect-video',
  compact = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Strip base64 data URLs — they bloat metadata and break previews
  const safeValue = typeof value === 'string' && !value.startsWith('data:') ? value : '';
  // Use local preview as fallback so the image NEVER disappears during upload
  const displayUrl = safeValue || localPreview || '';

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  const revokeBlob = useCallback((url: string) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    // Revoke previous blob so we don't leak memory
    if (localPreview) revokeBlob(localPreview);

    const objectUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(objectUrl);
    setLocalPreview(objectUrl);
    onChange(objectUrl); // ← instant preview in parent/card preview
    setUploading(true);

    try {
      const url = await uploadFile(file, false);
      if (url) {
        onChange(url); // ← swap to server URL when ready
      }
    } finally {
      setUploading(false);
      // DO NOT revoke blob here — the card preview may still need it
      // until React propagates the new server URL via props.
      // We revoke in useEffect when safeValue confirms the server URL.
    }
  }, [onChange, localPreview, revokeBlob]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleClear = () => {
    if (localPreview) revokeBlob(localPreview);
    setLocalPreview(null);
    onChange('');
  };

  // When props confirm a non-blob server URL, clean up the local blob preview
  useEffect(() => {
    if (safeValue && !safeValue.startsWith('blob:') && localPreview) {
      revokeBlob(localPreview);
      setLocalPreview(null);
    }
  }, [safeValue, localPreview, revokeBlob]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">{label}</span>
        {required && <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">Obligatorio</span>}
        {specs && <span className="text-xs text-surface-500 dark:text-surface-400 ml-auto font-mono">{specs}</span>}
      </div>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden
          ${dragOver ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 hover:border-brand-400 dark:hover:border-brand-500'}
          ${displayUrl ? 'p-0' : 'p-4 flex flex-col items-center justify-center gap-2'}
          ${compact ? 'h-32 w-32' : aspectClass}
          ${uploading ? 'opacity-70 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <SpinnerIcon className="w-8 h-8 text-brand-500" />
            <span className="text-xs text-surface-500 dark:text-surface-400">Subiendo...</span>
          </div>
        ) : displayUrl ? (
          <img src={displayUrl} alt={label} className="w-full h-full object-contain" />
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-surface-400 dark:text-surface-500" />
            <span className="text-xs text-surface-500 dark:text-surface-400 text-center">
              Haz click o arrastra una imagen
              {specs && <><br /><span className="font-mono">{specs}</span></>}
            </span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} disabled={uploading} />
      </div>

      {displayUrl && (
        <div className="flex items-center gap-3">
          <img src={displayUrl} alt={label ? `${label} miniatura` : 'Miniatura'} className="w-12 h-12 rounded-lg object-cover border border-surface-200 dark:border-surface-600" />
          <button
            onClick={handleClear}
            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1"
            type="button"
          >
            <TrashIcon className="w-3 h-3" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
