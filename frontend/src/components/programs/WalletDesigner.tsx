'use client';

import React, { useState, useCallback } from 'react';
import {
  APPLE_PASS_STYLES,
  GOOGLE_WALLET_TYPES,
  APPLE_IMAGE_SUPPORT,
} from './constants';
import ImageUploadField from '@/components/ui/ImageUploadField';
import { InfoIcon, ChevronUpIcon, ChevronDownIcon } from '../wallet/icons';
import type { WalletDesignState } from '../wallet/types';
import GoogleAdvancedSettings from '../wallet/design/GoogleAdvancedSettings';
import AppleAdvancedSettings from '../wallet/design/AppleAdvancedSettings';
import GoogleRowBuilder from '../wallet/design/GoogleRowBuilder';
import AppleFieldEditor from '../wallet/design/AppleFieldEditor';

/**
 * Re-export types for backward compatibility.
 */
export type {
  AppleWalletFeatureConfig,
  GoogleFieldRow,
  GoogleFieldItem,
  AppleFieldDef,
  GoogleAdvancedConfig,
  AppleAdvancedConfig,
  WalletLocation,
  WalletBeacon,
  WalletLink,
  WalletDesignState,
} from '../wallet/types';

/**
 * Re-export default wallet design state factory.
 */
export { defaultWalletDesignState } from '../wallet/types';

/**
 * @description Collapsible accordion section for the wallet designer.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} [props.defaultOpen=false] - Whether the section starts open
 * @returns JSX.Element
 */
function AccordionSection({
  title, children, defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
      >
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">{title}</span>
        {open ? <ChevronUpIcon className="w-4 h-4 text-surface-400 dark:text-surface-500" /> : <ChevronDownIcon className="w-4 h-4 text-surface-400 dark:text-surface-500" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

/**
 * Props for the WalletDesigner component.
 */
export interface WalletDesignerProps {
  /** Type of loyalty card */
  cardType: string;
  /** Current wallet design state */
  state: WalletDesignState;
  /** State change handler */
  onChange: (state: WalletDesignState) => void;
  /** Active wallet provider */
  provider: 'apple' | 'google';
}

/**
 * @description Advanced wallet designer with image uploads, field editors, and NFC settings.
 * @param {WalletDesignerProps} props - Component props
 * @returns JSX.Element
 */
export default function WalletDesigner({ cardType, state, onChange, provider }: WalletDesignerProps) {
  const passStyle = APPLE_PASS_STYLES[cardType] || 'storeCard';
  const appleSupportsStrip = APPLE_IMAGE_SUPPORT[passStyle]?.strip ?? false;
  const googleType = GOOGLE_WALLET_TYPES[cardType]?.type || 'LoyaltyClass';

  const patch = useCallback((p: Partial<WalletDesignState>) => {
    onChange({ ...state, ...p });
  }, [state, onChange]);

  return (
    <div className="space-y-6">
      {provider === 'apple' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Estilo de pase: <span className="font-mono">{passStyle}</span></p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {appleSupportsStrip
                  ? 'Este estilo usa la imagen panorámica (strip.png) en la parte superior.'
                  : 'Este estilo usa una miniatura (thumbnail.png) en la parte superior derecha.'}
              </p>
            </div>
          </div>

          <AccordionSection title="Imágenes" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Logo"
                specs="160×50pt (320×100px @2x)"
                required={true}
                value={state.appleLogoUrl}
                onChange={v => patch({ appleLogoUrl: v })}
              />
              <ImageUploadField
                label="Logo @2x"
                specs="160×50pt (320×100px @2x)"
                required={true}
                value={state.appleLogo2xUrl}
                onChange={v => patch({ appleLogo2xUrl: v })}
              />
              <ImageUploadField
                label="Ícono"
                specs="29×29pt (58×58px @2x)"
                required={true}
                value={state.appleIconUrl}
                onChange={v => patch({ appleIconUrl: v })}
              />
              <ImageUploadField
                label="Ícono @2x"
                specs="29×29pt (58×58px @2x)"
                required={true}
                value={state.appleIcon2xUrl}
                onChange={v => patch({ appleIcon2xUrl: v })}
              />
              {appleSupportsStrip ? (
                <>
                  <ImageUploadField
                    label="Strip"
                    specs="375×123pt (750×246px @2x) — solo storeCard/coupon"
                    required={false}
                    value={state.appleStripUrl}
                    onChange={v => patch({ appleStripUrl: v })}
                  />
                  <ImageUploadField
                    label="Strip @2x"
                    specs="375×123pt (750×246px @2x) — solo storeCard/coupon"
                    required={false}
                    value={state.appleStrip2xUrl}
                    onChange={v => patch({ appleStrip2xUrl: v })}
                  />
                </>
              ) : (
                <>
                  <ImageUploadField
                    label="Thumbnail"
                    specs="90×90pt (180×180px @2x) — solo generic"
                    required={false}
                    value={state.appleThumbnailUrl}
                    onChange={v => patch({ appleThumbnailUrl: v })}
                  />
                  <ImageUploadField
                    label="Thumbnail @2x"
                    specs="90×90pt (180×180px @2x) — solo generic"
                    required={false}
                    value={state.appleThumbnail2xUrl}
                    onChange={v => patch({ appleThumbnail2xUrl: v })}
                  />
                </>
              )}
            </div>
          </AccordionSection>

          <AccordionSection title="Diseño de campos" defaultOpen>
            <AppleFieldEditor
              fields={state.appleFields}
              onChange={v => patch({ appleFields: v })}
              cardType={cardType}
            />
          </AccordionSection>

          <AccordionSection title="NFC y funciones avanzadas">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={state.appleNfc.nfc_enabled}
                  onChange={e => patch({ appleNfc: { ...state.appleNfc, nfc_enabled: e.target.checked } })}
                  className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700"
                />
                Activar NFC (Near Field Communication)
              </label>
              {state.appleNfc.nfc_enabled && (
                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300 pl-6">
                  <input
                    type="checkbox"
                    checked={state.appleNfc.nfc_requires_authentication}
                    onChange={e => patch({ appleNfc: { ...state.appleNfc, nfc_requires_authentication: e.target.checked } })}
                    className="rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-surface-700"
                  />
                  Requerir autenticación para usar NFC
                </label>
              )}
            </div>
          </AccordionSection>

          <AccordionSection title="Parámetros avanzados">
            <AppleAdvancedSettings config={state.appleAdvanced} onChange={v => patch({ appleAdvanced: v })} />
          </AccordionSection>
        </div>
      )}

      {provider === 'google' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5 flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Tipo de clase: <span className="font-mono">{googleType}</span></p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Google Wallet usa <span className="font-mono">cardTemplateOverride</span> con filas de campos personalizables.
              </p>
            </div>
          </div>

          <AccordionSection title="Imágenes" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Logo del programa"
                specs="660×660px"
                required={true}
                value={state.googleProgramLogoUrl}
                onChange={v => patch({ googleProgramLogoUrl: v })}
              />
              <ImageUploadField
                label="Imagen Hero"
                specs="1032×336px"
                required={false}
                value={state.googleHeroImageUrl}
                onChange={v => patch({ googleHeroImageUrl: v })}
              />
              <ImageUploadField
                label="Logo ancho"
                specs="1032×150px"
                required={false}
                value={state.googleWideLogoUrl}
                onChange={v => patch({ googleWideLogoUrl: v })}
              />
              <ImageUploadField
                label="Imagen adicional"
                specs="660×660px"
                required={false}
                value={state.googleImageModuleUrl}
                onChange={v => patch({ googleImageModuleUrl: v })}
              />
            </div>
          </AccordionSection>

          <AccordionSection title="Configuración de filas (cardTemplateOverride)" defaultOpen>
            <GoogleRowBuilder rows={state.googleRows} onChange={v => patch({ googleRows: v })} cardType={cardType} />
          </AccordionSection>

          <AccordionSection title="Parámetros avanzados">
            <GoogleAdvancedSettings config={state.googleAdvanced} onChange={v => patch({ googleAdvanced: v })} />
          </AccordionSection>
        </div>
      )}
    </div>
  );
}
