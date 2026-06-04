/**
 * Smart image upload component with validation, crop preview,
 * and platform-specific preview shapes.
 */

'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import type { ImageAsset } from '@/components/wallet/types/unified-state';
import { uploadWalletImage } from '@/components/wallet/services/imageUpload';

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                  */
/* ------------------------------------------------------------------ */

function TrashIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ImageIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function SpinnerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function AppleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.96 1.07-3.11-1.05.05-2.31.71-3.06 1.58-.67.77-1.26 2.01-1.1 3.14 1.19.09 2.41-.6 3.09-1.61z" />
    </svg>
  );
}

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SmartImageUploadProps {
  label: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  recommendedSize: { width: number; height: number };
  applePreviewShape: 'rect' | 'circle';
  googlePreviewShape: 'rect' | 'circle';
  value?: ImageAsset;
  onChange: (asset: ImageAsset | undefined) => void;
  onError?: (message: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_ACCEPT = '.jpg,.jpeg,.png,.svg';
const DEFAULT_MAX_SIZE_MB = 5;

function validateFile(
  file: File,
  accept: string,
  maxSizeMB: number,
  recommendedSize: { width: number; height: number },
  t: (key: string, vars?: Record<string, string | number>) => string
): { valid: boolean; error?: string; warning?: string } {
  const allowed = accept.split(',').map((e) => e.trim().toLowerCase());
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const mime = file.type.toLowerCase();

  const isAllowed =
    allowed.includes(ext) ||
    allowed.some((a) => mime.includes(a.replace('.', '')));

  if (!isAllowed) {
    return { valid: false, error: t('wallet.studio.upload.invalidFormat', { accept }) };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: t('wallet.studio.upload.fileTooBig', { maxSize: maxSizeMB }),
    };
  }

  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SmartImageUpload({
  label,
  description,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  recommendedSize,
  applePreviewShape,
  googlePreviewShape,
  value,
  onChange,
  onError,
}: SmartImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [actualDimensions, setActualDimensions] = useState<{ width: number; height: number } | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const { t } = useI18n();

  const displayUrl = value?.url || localPreview || '';

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
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

  const checkDimensions = useCallback((file: File) => {
    if (file.type === 'image/svg+xml') {
      setActualDimensions(null);
      setWarning(null);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(objectUrl);

    img.onload = () => {
      setActualDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      if (
        img.naturalWidth < recommendedSize.width ||
        img.naturalHeight < recommendedSize.height
      ) {
        setWarning(
          t('wallet.studio.upload.dimensionsRecommended', {
            width: recommendedSize.width,
            height: recommendedSize.height,
            actualW: img.naturalWidth,
            actualH: img.naturalHeight,
          })
        );
      } else {
        setWarning(null);
      }
      URL.revokeObjectURL(objectUrl);
      blobUrlsRef.current.delete(objectUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      blobUrlsRef.current.delete(objectUrl);
      setActualDimensions(null);
    };

    img.src = objectUrl;
  }, [recommendedSize, t]);

  const handleFile = useCallback(async (file: File, type: 'logo' | 'hero' | 'icon') => {
    setError(null);
    const validation = validateFile(file, accept, maxSizeMB, recommendedSize, t);
    if (!validation.valid) {
      setError(validation.error || t('wallet.studio.upload.invalidFile'));
      onError?.(validation.error || t('wallet.studio.upload.invalidFile'));
      return;
    }

    if (validation.warning) {
      setWarning(validation.warning);
    }

    checkDimensions(file);

    // Revoke previous blob
    if (localPreview) revokeBlob(localPreview);

    const objectUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(objectUrl);
    setLocalPreview(objectUrl);
    setUploading(true);

    try {
      const asset = await uploadWalletImage(file, type);
      onChange(asset);
    } catch (err: any) {
      const msg = err?.message || t('wallet.studio.upload.uploadError');
      setError(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
    }
  }, [accept, maxSizeMB, recommendedSize, localPreview, revokeBlob, onChange, onError, checkDimensions]);

  const onDrop = useCallback((e: React.DragEvent, type: 'logo' | 'hero' | 'icon') => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f, type);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'hero' | 'icon') => {
    const f = e.target.files?.[0];
    if (f) handleFile(f, type);
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const handleClear = useCallback(() => {
    if (localPreview) revokeBlob(localPreview);
    setLocalPreview(null);
    setError(null);
    setWarning(null);
    setActualDimensions(null);
    onChange(undefined);
  }, [localPreview, revokeBlob, onChange]);

  // Clean up local blob when server URL is confirmed
  useEffect(() => {
    if (value?.url && !value.url.startsWith('blob:') && localPreview) {
      revokeBlob(localPreview);
      setLocalPreview(null);
    }
  }, [value?.url, localPreview, revokeBlob]);

  const isImageLoaded = Boolean(displayUrl);

  const previewSizeClass =
    label.toLowerCase().includes('hero') || label.toLowerCase().includes('principal')
      ? 'h-20'
      : label.toLowerCase().includes('icon')
        ? 'h-16 w-16'
        : 'h-20 w-20';

  const shapeClass = (shape: 'rect' | 'circle') =>
    shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {label}
          </h4>
          {description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
        {isImageLoaded && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            title={t('wallet.studio.upload.delete')}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload zone */}
      <div
        onClick={() => {
          if (!uploading && inputRef.current) {
            inputRef.current.click();
          }
        }}
        onDrop={(e) => onDrop(e, label.toLowerCase().includes('icon') ? 'icon' : label.toLowerCase().includes('hero') || label.toLowerCase().includes('principal') ? 'hero' : 'logo')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden
          ${dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : isImageLoaded
              ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-blue-400 dark:hover:border-blue-500'
              : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 hover:border-blue-400 dark:hover:border-blue-500'
          }
          ${isImageLoaded ? 'p-2' : 'py-8 px-4 flex flex-col items-center justify-center gap-2'}
          ${uploading ? 'opacity-70 cursor-not-allowed' : ''}
        `}
      >
        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-50/80 dark:bg-neutral-800/80 z-10">
            <SpinnerIcon className="w-8 h-8 text-blue-500" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('wallet.studio.upload.uploading')}</span>
          </div>
        ) : null}

        {isImageLoaded ? (
          <img
            src={displayUrl}
            alt={label}
            className="w-full h-32 object-contain rounded-lg"
          />
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              {t('wallet.studio.upload.clickOrDrag')}
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono text-center">
              {accept} · {t('wallet.studio.upload.maxSize')} {maxSizeMB}MB
            </span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onInputChange(e, label.toLowerCase().includes('icon') ? 'icon' : label.toLowerCase().includes('hero') || label.toLowerCase().includes('principal') ? 'hero' : 'logo')}
          disabled={uploading}
        />
      </div>

      {/* Error / Warning messages */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
          <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {warning && !error && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Platform crop previews */}
      {isImageLoaded && (
        <div className="flex items-center gap-4 pt-1">
          {/* Apple preview */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium">
              <AppleIcon className="w-3 h-3" />
              <span>Apple</span>
            </div>
            <div className={`relative overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 ${shapeClass(applePreviewShape)} ${previewSizeClass}`}>
              <img
                src={displayUrl}
                alt={`${label} - Apple preview`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Google preview */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium">
              <GoogleIcon className="w-3 h-3" />
              <span>Google</span>
            </div>
            <div className={`relative overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 ${shapeClass(googlePreviewShape)} ${previewSizeClass}`}>
              <img
                src={displayUrl}
                alt={`${label} - Google preview`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {/* Specs footer */}
      {!isImageLoaded && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
          {t('wallet.studio.upload.recommended')}: {recommendedSize.width}x{recommendedSize.height}{t('wallet.studio.upload.px')}
        </p>
      )}
    </div>
  );
}
