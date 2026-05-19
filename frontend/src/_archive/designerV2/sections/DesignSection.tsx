/* designerV2/sections/DesignSection.tsx — Colors, templates, images */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Info, Upload, X, Loader2 } from '@/components/ui/LucideIcons';
import { DESIGN_TEMPLATES } from '../../constants';
import type { WalletDesignState } from '../types';
import { PickImageModal } from '../modals/PickImageModal';
import { uploadFileWithError } from '@/lib/upload';
import toast from 'react-hot-toast';

/* ─── Info Callout ────────────────────────────────────────────────── */
function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{children}</p>
    </div>
  );
}

/* ─── Image Upload Row ────────────────────────────────────────────── */
interface ImageUploadRowProps {
  label: string;
  specs: string;
  value: string;
  onChange: (url: string) => void;
  onClick?: () => void;
}

function ImageUploadRow({ label, specs, value, onChange, onClick }: ImageUploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    if (url) onChange(url);
  }, [onChange]);

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground font-mono">{specs}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          onClick={() => { if (!uploading) { onClick?.(); inputRef.current?.click(); } }}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`
            relative rounded-lg border-2 transition-all overflow-hidden shrink-0
            ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            ${dragOver ? 'border-primary bg-primary/5' : 'border-dashed border-muted-foreground/25 hover:border-muted-foreground/50'}
            ${value ? 'w-20 h-20 border-solid' : 'w-20 h-20 flex items-center justify-center'}
          `}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} />
          ) : value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} disabled={uploading} />
        </div>

        {/* Info & actions */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {uploading ? 'Subiendo...' : value ? 'Haz click para cambiar o arrastra una nueva imagen' : 'Haz click o arrastra para subir'}
          </p>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="mt-1 flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <X className="w-3 h-3" strokeWidth={1.5} />
              Eliminar
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

/* ─── Color Picker ────────────────────────────────────────────────── */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-foreground w-24 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-md border border-border cursor-pointer overflow-hidden p-0"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 min-w-0 h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
        />
      </div>

    </div>
  );
}

/* ─── Main Section ────────────────────────────────────────────────── */
export interface DesignSectionProps {
  walletDesign: WalletDesignState;
  onWalletDesignChange: (state: WalletDesignState) => void;
  form: {
    background_color: string;
    text_color: string;
    card_type: string;
  };
  onFormChange: (patch: Partial<{ background_color: string; text_color: string }>) => void;
}

export function DesignSection({ walletDesign, onWalletDesignChange, form, onFormChange }: DesignSectionProps) {
  const [showExtraImages, setShowExtraImages] = useState(false);
  const [pickImageModal, setPickImageModal] = useState<{ key: keyof WalletDesignState; label: string; specs: string } | null>(null);

  const updateImage = (key: keyof WalletDesignState, url: string) => {
    onWalletDesignChange({ ...walletDesign, [key]: url });
  };

  const isApple = walletDesign.provider === 'apple';
  const passStyle = isApple
    ? { stamp: 'storeCard', cashback: 'storeCard', coupon: 'coupon', vip_membership: 'generic' }[form.card_type] || 'generic'
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <h2 className="text-lg font-semibold text-foreground">Diseño visual</h2>

      {/* Info callout */}
      <InfoCallout>
        Elige colores e imágenes que representen tu marca.
        Las imágenes se adaptan a cada plataforma automáticamente.
      </InfoCallout>

      {/* Quick templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Plantilla rápida</h3>
        <div className="grid grid-cols-4 gap-2">
          {DESIGN_TEMPLATES.filter(t => t.id !== 'custom').map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                onFormChange({ background_color: template.bg, text_color: template.text });
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div
                className="w-full h-8 rounded-md"
                style={{ background: template.bg }}
              />
              <span className="text-[10px] font-medium text-muted-foreground">{template.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Colores</h3>
        <div className="space-y-2.5">
          <ColorPicker
            label="Fondo"
            value={form.background_color}
            onChange={(color) => onFormChange({ background_color: color })}
          />
          <ColorPicker
            label="Texto"
            value={form.text_color}
            onChange={(color) => onFormChange({ text_color: color })}
          />
        </div>
      </div>

      {/* Images */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Imágenes</h3>

        {isApple ? (
          <>
            <ImageUploadRow
              label="Logo del programa"
              specs="160x50 px"
              value={walletDesign.appleLogoUrl}
              onChange={url => updateImage('appleLogoUrl', url)}
              onClick={() => setPickImageModal({ key: 'appleLogoUrl', label: 'Logo del programa', specs: '160x50 px' })}
            />
            <ImageUploadRow
              label="Icono (pantalla de bloqueo)"
              specs="114x114 px"
              value={walletDesign.appleIconUrl}
              onChange={url => updateImage('appleIconUrl', url)}
              onClick={() => setPickImageModal({ key: 'appleIconUrl', label: 'Icono', specs: '114x114 px' })}
            />
            {(passStyle === 'storeCard' || passStyle === 'coupon') && (
              <ImageUploadRow
                label="Imagen de tira"
                specs="375x123 px"
                value={walletDesign.appleStripUrl}
                onChange={url => updateImage('appleStripUrl', url)}
                onClick={() => setPickImageModal({ key: 'appleStripUrl', label: 'Imagen de tira', specs: '375x123 px' })}
              />
            )}
            {passStyle === 'generic' && (
              <ImageUploadRow
                label="Miniatura"
                specs="90x90 px"
                value={walletDesign.appleThumbnailUrl}
                onChange={url => updateImage('appleThumbnailUrl', url)}
                onClick={() => setPickImageModal({ key: 'appleThumbnailUrl', label: 'Miniatura', specs: '90x90 px' })}
              />
            )}
          </>
        ) : (
          <>
            <ImageUploadRow
              label="Logo del programa"
              specs="660x660 px"
              value={walletDesign.googleProgramLogoUrl}
              onChange={url => updateImage('googleProgramLogoUrl', url)}
              onClick={() => setPickImageModal({ key: 'googleProgramLogoUrl', label: 'Logo del programa', specs: '660x660 px' })}
            />
            <ImageUploadRow
              label="Imagen hero"
              specs="1032x336 px"
              value={walletDesign.googleHeroImageUrl}
              onChange={url => updateImage('googleHeroImageUrl', url)}
              onClick={() => setPickImageModal({ key: 'googleHeroImageUrl', label: 'Imagen hero', specs: '1032x336 px' })}
            />
          </>
        )}

        {/* Additional images toggle */}
        <button
          type="button"
          onClick={() => setShowExtraImages(!showExtraImages)}
          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          {showExtraImages ? 'Ocultar imágenes adicionales' : '+ Agregar imágenes adicionales'}
        </button>

        {showExtraImages && (
          <div className="space-y-4 pt-2 border-t border-border">
            {isApple ? (
              <>
                <ImageUploadRow
                  label="Logo @2x"
                  specs="320x100 px"
                  value={walletDesign.appleLogo2xUrl}
                  onChange={url => updateImage('appleLogo2xUrl', url)}
                />
                <ImageUploadRow
                  label="Icono @2x"
                  specs="228x228 px"
                  value={walletDesign.appleIcon2xUrl}
                  onChange={url => updateImage('appleIcon2xUrl', url)}
                />
                {(passStyle === 'storeCard' || passStyle === 'coupon') && (
                  <ImageUploadRow
                    label="Tira @2x"
                    specs="750x246 px"
                    value={walletDesign.appleStrip2xUrl}
                    onChange={url => updateImage('appleStrip2xUrl', url)}
                  />
                )}
                {passStyle === 'generic' && (
                  <ImageUploadRow
                    label="Miniatura @2x"
                    specs="180x180 px"
                    value={walletDesign.appleThumbnail2xUrl}
                    onChange={url => updateImage('appleThumbnail2xUrl', url)}
                  />
                )}
              </>
            ) : (
              <>
                <ImageUploadRow
                  label="Logo ancho"
                  specs="1032x150 px"
                  value={walletDesign.googleWideLogoUrl}
                  onChange={url => updateImage('googleWideLogoUrl', url)}
                />
                <ImageUploadRow
                  label="Imagen adicional"
                  specs="660x660 px"
                  value={walletDesign.googleImageModuleUrl}
                  onChange={url => updateImage('googleImageModuleUrl', url)}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Pick Image Modal */}
      {pickImageModal && (
        <PickImageModal
          isOpen={!!pickImageModal}
          onClose={() => setPickImageModal(null)}
          label={pickImageModal.label}
          specs={pickImageModal.specs}
          value={walletDesign[pickImageModal.key] as string}
          onChange={url => updateImage(pickImageModal.key, url)}
        />
      )}
    </div>
  );
}
