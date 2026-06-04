/**
 * Images tab content for the Wallet Pass Studio sidebar.
 *
 * SRS-003 Section 8.1 — Logo, Strip / Hero, and Additional Images.
 */

'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { uploadFile } from '@/lib/upload';
import type { ImageAsset, WalletImages } from '@/components/wallet/types/unified-state';

export interface ImagesTabProps {
  images: WalletImages;
  onUpdateImages: (images: Partial<WalletImages>) => void;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                  */
/* ------------------------------------------------------------------ */

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function UploadCloudIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

function ImageIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_ACCEPT = '.jpg,.jpeg,.png,.webp';
const DEFAULT_MAX_SIZE_MB = 5;

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (file.type === 'image/svg+xml') {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };
    img.src = objectUrl;
  });
}

async function uploadWalletImage(file: File): Promise<ImageAsset> {
  const url = await uploadFile(file, false);
  if (!url) throw new Error('Error al subir la imagen');
  const dimensions = await getImageDimensions(file);
  return { url, width: dimensions.width, height: dimensions.height };
}

function validateFile(file: File, accept: string, maxSizeMB: number): { valid: boolean; error?: string } {
  const allowed = accept.split(',').map((e) => e.trim().toLowerCase());
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const mime = file.type.toLowerCase();
  const isAllowed = allowed.includes(ext) || allowed.some((a) => mime.includes(a.replace('.', '')));
  if (!isAllowed) return { valid: false, error: `Formato no válido. Usa: ${accept}` };
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) return { valid: false, error: `Tamaño máximo: ${maxSizeMB} MB` };
  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

interface UploadZoneProps {
  id: string;
  label: string;
  sublabel?: string;
  wide?: boolean;
  accept?: string;
  maxSizeMB?: number;
  value?: ImageAsset;
  onChange: (asset: ImageAsset | undefined) => void;
  children?: React.ReactNode;
}

function UploadZone({ id, label, sublabel, wide, accept = DEFAULT_ACCEPT, maxSizeMB = DEFAULT_MAX_SIZE_MB, value, onChange, children }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = value?.url || localPreview || '';

  const revokeBlob = useCallback((url: string) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const validation = validateFile(file, accept, maxSizeMB);
    if (!validation.valid) {
      setError(validation.error || 'Archivo no válido');
      return;
    }
    if (localPreview) revokeBlob(localPreview);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setUploading(true);
    try {
      const asset = await uploadWalletImage(file);
      onChange(asset);
    } catch (err: any) {
      const msg = err?.message || 'Error al subir la imagen';
      setError(msg);
      revokeBlob(objectUrl);
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  }, [accept, maxSizeMB, localPreview, revokeBlob, onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  }, [handleFile]);

  useEffect(() => {
    if (value?.url && !value.url.startsWith('blob:') && localPreview) {
      revokeBlob(localPreview);
      setLocalPreview(null);
    }
  }, [value?.url, localPreview, revokeBlob]);

  return (
    <div className="space-y-2">
      <div
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden
          ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : displayUrl ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-blue-400 dark:hover:border-blue-500' : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 hover:border-blue-400 dark:hover:border-blue-500'}
          ${displayUrl ? 'p-3' : wide ? 'py-10 px-4' : 'py-8 px-4'}
          ${uploading ? 'opacity-70 cursor-not-allowed' : ''}
        `}
      >
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-50/80 dark:bg-neutral-800/80 z-10">
            <SpinnerIcon className="w-8 h-8 text-blue-500" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Subiendo...</span>
          </div>
        )}

        {displayUrl ? (
          <img src={displayUrl} alt={label} className={`w-full object-contain rounded-lg ${wide ? 'h-24' : 'h-32'}`} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <ImageIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">{label}</span>
            {sublabel && <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{sublabel}</span>}
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">Formatos: PNG, JPG, WebP · Tamaño máximo: {maxSizeMB} MB</span>
          </div>
        )}

        <input ref={inputRef} id={id} type="file" accept={accept} className="hidden" onChange={onInputChange} disabled={uploading} />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
          <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function ImagesTab({ images, onUpdateImages }: ImagesTabProps) {
  const [autoGenerateVariants, setAutoGenerateVariants] = useState(true);

  const handleLogoUpload = useCallback((asset: ImageAsset | undefined) => {
    if (asset && autoGenerateVariants) {
      onUpdateImages({ logo: asset, logo2x: asset, logo3x: asset });
    } else {
      onUpdateImages({ logo: asset, logo2x: undefined, logo3x: undefined });
    }
  }, [onUpdateImages, autoGenerateVariants]);

  const handleStripUpload = useCallback((asset: ImageAsset | undefined) => {
    if (asset && autoGenerateVariants) {
      onUpdateImages({ strip: asset, strip2x: asset, strip3x: asset, heroImage: asset });
    } else {
      onUpdateImages({ strip: asset, strip2x: undefined, strip3x: undefined, heroImage: asset });
    }
  }, [onUpdateImages, autoGenerateVariants]);

  const handleLogoDelete = useCallback(() => {
    onUpdateImages({ logo: undefined, logo2x: undefined, logo3x: undefined });
  }, [onUpdateImages]);

  return (
    <div className="space-y-6">
      {/* Section 1: LOGO DEL NEGOCIO */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <UploadCloudIcon className="w-4 h-4" />
          LOGO DEL NEGOCIO
        </h3>

        <UploadZone
          id="logo-upload"
          label="Arrastra una imagen o haz click"
          value={images.logo}
          onChange={handleLogoUpload}
        />

        {images.logo && (
          <>
            {/* Three preview panes */}
            <div className="grid grid-cols-3 gap-3">
              {/* Apple Rect */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Apple Rect</span>
                <div className="w-full aspect-[3.2/1] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <img src={images.logo.url} alt="Apple rect preview" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">160×50pt</span>
              </div>

              {/* Google Circle */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Google Circle</span>
                <div className="w-full aspect-square rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <img src={images.logo.url} alt="Google circle preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">660×660px</span>
              </div>

              {/* Original */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Original</span>
                <div className="w-full aspect-square rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <img src={images.logo.url} alt="Original preview" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Full size</span>
              </div>
            </div>

            {/* Auto-generate checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerateVariants}
                onChange={(e) => setAutoGenerateVariants(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-200">Auto-generar @2x y @3x para Apple</span>
            </label>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogoDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('logo-upload')?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                Reemplazar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Mejorar con IA
              </button>
            </div>
          </>
        )}
      </section>

      {/* Section 2: IMAGEN PRINCIPAL (Strip / Hero) */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          IMAGEN PRINCIPAL (Strip / Hero)
        </h3>

        <UploadZone
          id="strip-upload"
          label="Arrastra una imagen panorámica"
          wide
          value={images.strip ?? images.heroImage}
          onChange={handleStripUpload}
        />

        <div className="space-y-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Apple: Banner detrás de campos (375×123pt)
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Google: Banner superior (1032×336px)
          </p>
        </div>
      </section>

      {/* Section 3: IMÁGENES ADICIONALES */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <SparklesIcon className="w-4 h-4" />
          IMÁGENES ADICIONALES
        </h3>

        <div className="space-y-3">
          {/* Icono Apple */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => document.getElementById('icon-upload')?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Icono Apple
            </button>
            <div className="min-w-0">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">Lock screen y notificaciones</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">29×29pt, mostrado en notificaciones</p>
            </div>
            <input
              id="icon-upload"
              type="file"
              accept={DEFAULT_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const validation = validateFile(f, DEFAULT_ACCEPT, DEFAULT_MAX_SIZE_MB);
                  if (validation.valid) {
                    const asset = await uploadWalletImage(f);
                    onUpdateImages({ icon: asset, icon2x: asset });
                  }
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* Miniatura */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => document.getElementById('thumbnail-upload')?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Miniatura
            </button>
            <div className="min-w-0">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">Solo Apple Generic / Event Ticket</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">90×90pt, junto a los campos</p>
            </div>
            <input
              id="thumbnail-upload"
              type="file"
              accept={DEFAULT_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const validation = validateFile(f, DEFAULT_ACCEPT, DEFAULT_MAX_SIZE_MB);
                  if (validation.valid) {
                    const asset = await uploadWalletImage(f);
                    onUpdateImages({ thumbnail: asset, thumbnail2x: asset });
                  }
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* Fondo */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => document.getElementById('background-upload')?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Fondo
            </button>
            <div className="min-w-0">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">Solo Apple Event Ticket</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">180×220pt, imagen de fondo difuminada</p>
            </div>
            <input
              id="background-upload"
              type="file"
              accept={DEFAULT_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const validation = validateFile(f, DEFAULT_ACCEPT, DEFAULT_MAX_SIZE_MB);
                  if (validation.valid) {
                    const asset = await uploadWalletImage(f);
                    onUpdateImages({ background: asset });
                  }
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* Wide Logo */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => document.getElementById('wide-logo-upload')?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Wide Logo
            </button>
            <div className="min-w-0">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">Solo Google Wallet</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">1032×150px, logo extendido</p>
            </div>
            <input
              id="wide-logo-upload"
              type="file"
              accept={DEFAULT_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const validation = validateFile(f, DEFAULT_ACCEPT, DEFAULT_MAX_SIZE_MB);
                  if (validation.valid) {
                    const asset = await uploadWalletImage(f);
                    onUpdateImages({ wideLogo: asset });
                  }
                }
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
