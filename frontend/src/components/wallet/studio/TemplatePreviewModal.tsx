/**
 * TemplatePreviewModal — Side-by-side Apple + Google Wallet preview.
 *
 * Uses real DeviceFrame components with the template's design_state.
 */

'use client';

import React from 'react';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { WalletPassStudioState, BarcodeFormat } from '@/components/wallet/types/unified-state';
import { AppleWalletCard } from '@/components/wallet/AppleWalletPreview';
import { GoogleWalletCard } from '@/components/wallet/GoogleWalletPreview';
import { mapFieldsToApple, mapFieldsToGoogle } from '@/components/wallet/utils/field-mappers';
import { useI18n } from '@/lib/i18n';

interface TemplatePreviewModalProps {
  template: WalletTemplate;
  designState?: WalletPassStudioState;
  onClose: () => void;
  onUse: () => void;
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function mapBarcodeFormat(format: BarcodeFormat | string): string {
  const mapping: Record<string, string> = {
    QR_CODE: 'qr_code',
    AZTEC: 'aztec',
    PDF417: 'pdf417',
    CODE128: 'code_128',
    DATA_MATRIX: 'data_matrix',
  };
  return mapping[format] ?? 'qr_code';
}

type TextAlignment = 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';

function buildPreviewWalletDesign(state: WalletPassStudioState) {
  const appleFields = mapFieldsToApple(state.fields);
  const googleRows = mapFieldsToGoogle(state.fields);

  return {
    appleLogoUrl: state.images.logo?.url ?? '',
    appleLogo2xUrl: state.images.logo2x?.url ?? '',
    appleStripUrl: state.images.strip?.url ?? '',
    appleStrip2xUrl: state.images.strip2x?.url ?? '',
    appleThumbnailUrl: state.images.thumbnail?.url ?? '',
    appleThumbnail2xUrl: state.images.thumbnail2x?.url ?? '',
    appleIconUrl: state.images.icon?.url ?? '',
    appleIcon2xUrl: state.images.icon2x?.url ?? '',
    appleBackgroundUrl: state.images.background?.url ?? '',
    googleProgramLogoUrl: state.images.logo?.url ?? '',
    googleHeroImageUrl: state.images.strip?.url ?? state.images.heroImage?.url ?? '',
    googleWideLogoUrl: state.images.wideLogo?.url ?? '',
    googleImageModuleUrl: state.images.imageModule?.url ?? '',
    googleBackgroundUrl: state.images.background?.url ?? '',
    appleFields: {
      headerFields: appleFields.headerFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        dataType: f.dataType,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      primaryFields: appleFields.primaryFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        dataType: f.dataType,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      secondaryFields: appleFields.secondaryFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        dataType: f.dataType,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      auxiliaryFields: appleFields.auxiliaryFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        dataType: f.dataType,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      backFields: appleFields.backFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        dataType: f.dataType,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
    },
    googleRows: googleRows.map((row) => ({
      id: row.id,
      type: row.type,
      items: row.items.map((item) => ({
        id: item.id,
        fieldPath: item.fieldPath,
        label: item.label,
        displayName: item.displayName,
        value: item.value,
        dataType: item.dataType,
      })),
    })),
  };
}

export function TemplatePreviewModal({ template, designState, onClose, onUse }: TemplatePreviewModalProps) {
  const { t } = useI18n();

  const selectedType = React.useMemo(
    () => ({
      value: template.cardType,
      label: t(`programs.cardTypes.${template.cardType}`),
      icon: template.cardType,
      desc: '',
    }),
    [template.cardType, t]
  );

  const { form, walletDesign, cardTypeConfig, barcodeType, logoPreview, stripPreview } = React.useMemo(() => {
    if (designState) {
      const form = {
        name: designState.name,
        description: designState.apple.description,
        background_color: designState.colors.background,
        text_color: designState.colors.foreground,
        card_type: designState.cardType,
        strip_image_url: designState.images.strip?.url,
      };
      return {
        form,
        walletDesign: buildPreviewWalletDesign(designState),
        cardTypeConfig: designState.cardTypeConfig,
        barcodeType: mapBarcodeFormat(designState.barcode.format),
        logoPreview: designState.images.logo?.url ?? null,
        stripPreview: designState.images.strip?.url ?? null,
      };
    }
    const form = {
      name: template.name,
      description: template.description,
      background_color: template.colors.background,
      text_color: template.colors.foreground,
      card_type: template.cardType,
      strip_image_url: undefined,
    };
    return {
      form,
      walletDesign: undefined,
      cardTypeConfig: template.cardTypeConfig,
      barcodeType: mapBarcodeFormat(template.barcode.format),
      logoPreview: null,
      stripPreview: null,
    };
  }, [template, designState]);

  return (
    <div data-testid="preview-large" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {template.name}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Vista previa en ambas plataformas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="preview-close-btn"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar vista previa"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Side-by-side previews */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            {/* Apple Wallet */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <AppleWalletCard
                form={form}
                selectedType={selectedType}
                logoPreview={logoPreview}
                stripPreview={stripPreview}
                barcodeType={barcodeType}
                walletDesign={walletDesign}
                cardTypeConfig={cardTypeConfig}
              />
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Apple Wallet
              </span>
            </div>

            {/* Google Wallet */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <GoogleWalletCard
                form={form}
                selectedType={selectedType}
                logoPreview={logoPreview}
                stripPreview={stripPreview}
                barcodeType={barcodeType}
                walletDesign={walletDesign}
                cardTypeConfig={cardTypeConfig}
              />
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Google Wallet
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onUse}
            data-testid="preview-use-btn"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            Usar este diseño
          </button>
        </div>
      </div>
    </div>
  );
}
