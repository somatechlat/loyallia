/* designerV2/modals/PickImageModal.tsx — Pick or upload image */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Loader2 } from '@/components/ui/LucideIcons';
import { uploadFileWithError } from '@/lib/upload';
import { mediaApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface AssetItem {
  url: string;
  name: string;
  size: number;
  last_modified: string;
}

interface PickImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  specs: string;
  value: string;
  onChange: (url: string) => void;
}

export function PickImageModal({
  isOpen,
  onClose,
  label,
  specs,
  value,
  onChange,
}: PickImageModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setActiveTab('upload');
  }, [isOpen]);

  /* Load library when tab switches */
  useEffect(() => {
    if (!isOpen || activeTab !== 'library') return;
    loadAssets();
  }, [isOpen, activeTab]);

  const loadAssets = async () => {
    setLoadingAssets(true);
    try {
      const { data } = await mediaApi.listAssets();
      if (data.success) {
        setAssets(data.assets);
      }
    } catch {
      toast.error('Error al cargar biblioteca');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    setUploading(true);
    const { url, error } = await uploadFileWithError(file);
    setUploading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (url) {
      onChange(url);
      onClose();
    }
  }, [onChange, onClose]);

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-white/[0.06]">
          <h3 className="text-lg font-bold text-surface-900 dark:text-white">
            {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4 text-surface-500" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-200 dark:border-white/[0.06]">
          {(['upload', 'library'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative
                ${activeTab === t
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
            >
              {t === 'upload' ? 'Subir imagen' : 'Biblioteca'}
              {activeTab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`
                  relative cursor-pointer rounded-2xl border-2 transition-all overflow-hidden flex flex-col items-center justify-center gap-3 py-10
                  ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
                  ${dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-dashed border-surface-300 dark:border-surface-700 hover:border-surface-400 dark:hover:border-surface-600'
                  }
                `}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-surface-400 animate-spin" strokeWidth={1.5} />
                ) : value ? (
                  <img src={value} alt={label} className="w-24 h-24 object-cover rounded-xl" />
                ) : (
                  <Upload className="w-8 h-8 text-surface-400" strokeWidth={1.5} />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {uploading ? 'Subiendo...' : value ? 'Haz click para cambiar' : 'Haz click o arrastra para subir'}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">{specs}</p>
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} disabled={uploading} />
              </div>

              {value && !uploading && (
                <button
                  type="button"
                  onClick={() => { onChange(''); onClose(); }}
                  className="w-full py-2.5 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                >
                  Eliminar imagen actual
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {loadingAssets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-surface-400 animate-spin" strokeWidth={1.5} />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    No hay imágenes en la biblioteca.
                  </p>
                  <p className="text-xs text-surface-400 dark:text-surface-500 mt-2">
                    Sube imágenes desde la pestaña &quot;Subir imagen&quote;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                  {assets.map(asset => (
                    <button
                      key={asset.url}
                      type="button"
                      onClick={() => { onChange(asset.url); onClose(); }}
                      className="relative aspect-square rounded-lg border border-surface-200 dark:border-white/[0.06] overflow-hidden hover:border-primary transition-colors group"
                    >
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
