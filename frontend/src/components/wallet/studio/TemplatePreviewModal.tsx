/**
 * TemplatePreviewModal — Full WYSIWYG template preview.
 *
 * Pixel-accurate design-system card at iPhone scale with an Apple/Google
 * variant toggle, plus a secondary device-frame mode.
 */

'use client';

import React from 'react';
import type { WalletTemplate } from '@/components/wallet/types/templates';
import type { WalletPassStudioState, BarcodeFormat } from '@/components/wallet/types/unified-state';
import { AppleWalletCard } from '@/components/wallet/AppleWalletPreview';
import { GoogleWalletCard } from '@/components/wallet/GoogleWalletPreview';
import { mapFieldsToApple, mapFieldsToGoogle } from '@/components/wallet/utils/field-mappers';
import {
  getCardPalette,
  CARD_TYPE_SCALE,
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_CHROME,
  progressSlots,
} from '@/components/wallet/design-system';
import { useI18n } from '@/lib/i18n';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface TemplatePreviewModalProps {
  template: WalletTemplate;
  designState?: WalletPassStudioState;
  onClose: () => void;
  onUse: () => void;
}

type PlatformVariant = 'apple' | 'google';
type ViewMode = 'wysiwyg' | 'device';

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function mapBarcodeFormat(format: BarcodeFormat | string): string {
  const mapping: Record<string, string> = {
    QR_CODE: 'qr_code',
    AZTEC: 'aztec',
    PDF417: 'pdf417',
    CODE128: 'code_128',
    CODE39: 'code_39',
    CODABAR: 'codabar',
    EAN13: 'ean_13',
    ITF: 'interleaved_2_of_5',
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

function groupFields(fields: WalletTemplate['fields']) {
  const byGroup = (group: string) => fields.filter((f) => f.fieldGroup === group);
  return {
    header: byGroup('header'),
    primary: byGroup('primary'),
    secondary: byGroup('secondary'),
    auxiliary: byGroup('auxiliary'),
  };
}

function stampProgress(template: WalletTemplate): { filled: number; total: number } | null {
  const cfg = template.cardTypeConfig;
  if (cfg.cardType === 'stamp') {
    return { filled: 3, total: Math.min(cfg.stampsRequired, 12) };
  }
  if (cfg.cardType === 'multipass') {
    return {
      filled: Math.floor(cfg.bundleSize * 0.4),
      total: Math.min(cfg.bundleSize, 12),
    };
  }
  return null;
}

/**
 * Pixel-accurate design-system card. Apple uses the PassKit store-card
 * corner; Google uses the taller Wallet sheet corner.
 */
function WysiwygCard({
  template,
  variant,
}: {
  template: WalletTemplate;
  variant: PlatformVariant;
}) {
  const palette = getCardPalette(template.paletteKey ?? template.cardType);
  const groups = groupFields(template.fields);
  const progress = stampProgress(template);
  const slots = progress ? progressSlots(progress.filled, progress.total) : [];
  const radius = variant === 'apple' ? CARD_RADIUS.apple : CARD_RADIUS.google;

  return (
    <div
      data-testid={`preview-card-${variant}`}
      data-variant={variant}
      className={`relative w-full max-w-[320px] overflow-hidden ${radius} ${CARD_SHADOW.card} transition-all duration-300`}
      style={
        variant === 'apple'
          ? { backgroundImage: palette.gradient, backgroundColor: palette.base }
          : {
              backgroundImage: palette.gradient,
              backgroundColor: palette.base,
              filter: 'saturate(1.05)',
            }
      }
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 ${CARD_CHROME.gloss}`} />

      {/* Header strip */}
      <div className={`relative flex items-start justify-between px-4 pt-3 pb-2 ${CARD_CHROME.headerGlass}`}>
        <div>
          <div
            className={`${CARD_TYPE_SCALE.xs} font-semibold uppercase tracking-wider`}
            style={{ color: palette.text }}
          >
            {template.apple.organizationName || template.name}
          </div>
          {groups.header[0] ? (
            <div className={`${CARD_TYPE_SCALE.xs} mt-0.5`} style={{ color: palette.textMuted }}>
              {groups.header[0].label}
              {' · '}
              {groups.header[0].value}
            </div>
          ) : null}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: palette.accentSoft, color: palette.text }}
          aria-hidden="true"
        >
          <span className={`${CARD_TYPE_SCALE.md} font-bold`}>
            {(template.apple.organizationName || template.name).slice(0, 1).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative px-4 pb-1 pt-3">
        {groups.primary[0] ? (
          <>
            <div
              className={`${CARD_TYPE_SCALE.xs} font-medium uppercase tracking-wider`}
              style={{ color: palette.textMuted }}
            >
              {groups.primary[0].label}
            </div>
            <div
              className={`${CARD_TYPE_SCALE.xl} font-bold leading-none mt-1`}
              style={{ color: palette.text }}
              data-testid="preview-hero-value"
            >
              {groups.primary[0].value}
            </div>
          </>
        ) : (
          <div
            className={`${CARD_TYPE_SCALE.lg} font-bold`}
            style={{ color: palette.text }}
            data-testid="preview-hero-value"
          >
            {template.name}
          </div>
        )}
      </div>

      {/* Progress / stamps */}
      {slots.length > 0 ? (
        <div className="relative px-4 pt-3">
          <div className="flex flex-wrap items-center gap-1.5" data-testid="preview-stamps">
            {slots.map((slot, i) => (
              <span
                key={`preview-slot-${i}`}
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: slot === 'filled' ? palette.accent : palette.accentSoft,
                  boxShadow: slot === 'filled' ? `0 0 0 1px ${palette.accent}` : 'none',
                }}
              />
            ))}
            {progress ? (
              <span
                className={`${CARD_TYPE_SCALE.xs} ml-2 font-semibold tabular-nums`}
                style={{ color: palette.textMuted }}
              >
                {progress.filled}/{progress.total}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="relative px-4 pt-3">
          <div
            className="h-2 w-24 rounded-full"
            style={{ backgroundColor: palette.accent }}
          />
        </div>
      )}

      {/* Secondary + auxiliary fields */}
      <div className="relative grid grid-cols-2 gap-2 px-4 pb-3 pt-3">
        {groups.secondary.slice(0, 2).map((f) => (
          <div
            key={f.id}
            className="rounded-xl px-2.5 py-2"
            style={{ backgroundColor: palette.accentSoft }}
          >
            <div className={`${CARD_TYPE_SCALE.xs}`} style={{ color: palette.textMuted }}>
              {f.label}
            </div>
            <div className={`${CARD_TYPE_SCALE.sm} font-semibold`} style={{ color: palette.text }}>
              {f.value}
            </div>
          </div>
        ))}
        {groups.auxiliary.slice(0, 2).map((f) => (
          <div
            key={f.id}
            className="rounded-xl px-2.5 py-2"
            style={{ backgroundColor: palette.accentSoft }}
          >
            <div className={`${CARD_TYPE_SCALE.xs}`} style={{ color: palette.textMuted }}>
              {f.label}
            </div>
            <div className={`${CARD_TYPE_SCALE.sm} font-semibold`} style={{ color: palette.text }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>

      {/* Barcode plate */}
      <div className="relative px-4 pb-4">
        <div className={`flex items-center justify-between ${CARD_CHROME.barcodePlate}`}>
          <div>
            <div className={`${CARD_TYPE_SCALE.xs} text-neutral-500`}>
              {template.barcode.format.replace(/_/g, ' ')}
            </div>
            <div className={`${CARD_TYPE_SCALE.sm} font-semibold text-neutral-900`}>
              {template.google.programName || template.name}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
            <div className="grid grid-cols-3 gap-0.5" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <span
                  key={`qr-${i}`}
                  className="h-1.5 w-1.5 rounded-[1px] bg-neutral-900"
                  style={{ opacity: (i * 7) % 3 === 0 ? 0.2 : 1 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplatePreviewModal({ template, designState, onClose, onUse }: TemplatePreviewModalProps) {
  const { t } = useI18n();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [variant, setVariant] = React.useState<PlatformVariant>('apple');
  const [viewMode, setViewMode] = React.useState<ViewMode>('wysiwyg');
  const [entering, setEntering] = React.useState(true);

  useFocusTrap({
    isOpen: true,
    onEscape: onClose,
    containerRef: dialogRef,
    modalId: 'gallery-preview',
  });

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(raf);
  }, []);

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

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('wallet.studio.templatePreview.title')}
        className={`relative z-10 w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${
          entering ? 'opacity-0 scale-95 translate-y-3' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {template.name}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('wallet.studio.templatePreview.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Platform toggle */}
            <div
              data-testid="preview-platform-toggle"
              className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800"
              role="group"
              aria-label={t('wallet.studio.templatePreview.platformToggle')}
            >
              {(['apple', 'google'] as PlatformVariant[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  data-testid={`preview-platform-${v}`}
                  aria-pressed={variant === v}
                  onClick={() => setVariant(v)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    variant === v
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {v === 'apple'
                    ? t('wallet.studio.templatePreview.appleWallet')
                    : t('wallet.studio.templatePreview.googleWallet')}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="preview-close-btn"
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label={t('wallet.studio.templatePreview.close')}
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'wysiwyg' ? (
            <div className="flex flex-col items-center gap-6" data-testid="preview-wysiwyg-stage">
              <WysiwygCard template={template} variant={variant} />
              <div className="flex flex-wrap items-center justify-center gap-2">
                {template.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
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
                  {t('wallet.studio.templatePreview.appleWallet')}
                </span>
              </div>
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
                  {t('wallet.studio.templatePreview.googleWallet')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            {t('wallet.studio.templatePreview.closeShort')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'wysiwyg' ? 'device' : 'wysiwyg'))}
            data-testid="preview-mode-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <EyeIcon className="w-4 h-4" />
            {t('wallet.studio.templatePreview.previewAction')}
          </button>
          <button
            type="button"
            onClick={onUse}
            data-testid="preview-use-btn"
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            {t('wallet.studio.templatePreview.useTemplate')}
          </button>
        </div>
      </div>
    </div>
  );
}
