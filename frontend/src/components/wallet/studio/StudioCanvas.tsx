/**
 * Studio canvas component.
 *
 * Renders Apple and/or Google Wallet previews inside device frames.
 * Supports front/back view toggle and platform view filtering.
 */

'use client';

import { useI18n } from '@/lib/i18n';
import type { WalletPassStudioState, PlatformView, BarcodeFormat } from '@/components/wallet/types/unified-state';
import { AppleWalletCard, AppleWalletBackCard } from '@/components/wallet/AppleWalletPreview';
import { GoogleWalletCard, GoogleWalletBackCard } from '@/components/wallet/GoogleWalletPreview';
import { mapFieldsToApple, mapFieldsToGoogle } from '@/components/wallet/utils/field-mappers';

export interface StudioCanvasProps {
  state: WalletPassStudioState;
  platformView: PlatformView;
  showBack: boolean;
  zoom?: number;
}

function mapBarcodeFormat(format: BarcodeFormat): string {
  const mapping: Record<BarcodeFormat, string> = {
    QR_CODE: 'qr_code',
    AZTEC: 'aztec',
    PDF417: 'pdf417',
    CODE128: 'code_128',
    DATA_MATRIX: 'data_matrix',
  };
  return mapping[format] ?? 'qr_code';
}

type TextAlignment = 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';

function buildWalletDesign(state: WalletPassStudioState) {
  const appleFields = mapFieldsToApple(state.fields);
  const googleRows = mapFieldsToGoogle(state.fields);

  return {
    provider: state.ui.platformView === 'google' ? 'google' : 'apple',
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
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      primaryFields: appleFields.primaryFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      secondaryFields: appleFields.secondaryFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      auxiliaryFields: appleFields.auxiliaryFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
        changeMessage: f.changeMessage,
        textAlignment: f.textAlignment as TextAlignment,
        attributedValue: f.attributedValue,
      })),
      backFields: appleFields.backFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value,
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
    googleAdvanced: {
      reviewStatus: state.google.reviewStatus,
      allowMultipleUsers: state.google.allowMultipleUsers,
      homepageUri: state.google.homepageUri ?? '',
      helpUri: state.google.helpUri ?? '',
      linksModuleUris: [],
      messages: state.google.messages.map((m: { header: string; body: string }) => ({ header: m.header, body: m.body })),
      notifyPreference: state.google.notifyPreference,
    },
    appleAdvanced: {
      suppressStripShine: state.apple.suppressStripShine,
      nfcMessage: state.apple.nfc.message ?? '',
      sharingProhibited: state.apple.sharingProhibited,
      voided: state.apple.voided,
      expirationDate: state.apple.expirationDate ?? '',
    },
    appleNfc: {
      nfc_enabled: state.apple.nfc.enabled,
      nfc_requires_authentication: state.apple.nfc.requiresAuthentication,
    },
    locations: state.apple.locations.map((loc: { id: string; latitude: number; longitude: number; altitude?: number; relevantText?: string }) => ({ 
      id: loc.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      altitude: loc.altitude ?? 0,
      relevantText: loc.relevantText ?? '',
    })),
    beacons: state.apple.beacons.map((beacon: { id: string; uuid: string; major: number; minor: number; relevantText?: string }) => ({
      id: beacon.id,
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      relevantText: beacon.relevantText ?? '',
    })),
    links: state.backContent.links.map((link: { id: string; type: string; url: string; label: string; icon?: string }) => ({
      id: link.id,
      label: link.label,
      uri: link.url,
    })),
    homepageUri: state.google.homepageUri ?? '',
    helpUri: state.google.helpUri ?? '',
  };
}

function buildForm(state: WalletPassStudioState) {
  return {
    name: state.name,
    description: state.apple.description,
    background_color: state.colors.background,
    text_color: state.colors.foreground,
    card_type: state.cardType,
    strip_image_url: state.images.strip?.url,
  };
}

function buildSelectedType(state: WalletPassStudioState, t: (key: string) => string) {
  const key = `programs.cardTypes.${state.cardType}`;
  return {
    value: state.cardType,
    label: t(key),
    icon: state.cardType,
    desc: '',
  };
}

export function StudioCanvas({ state, platformView, showBack, zoom = 1 }: StudioCanvasProps) {
  const { t } = useI18n();
  const form = buildForm(state);
  const selectedType = buildSelectedType(state, t);
  const walletDesign = buildWalletDesign(state);
  const barcodeType = mapBarcodeFormat(state.barcode.format);
  const logoPreview = state.images.logo?.url ?? null;
  const stripPreview = state.images.strip?.url ?? null;
  const cardTypeConfig = state.cardTypeConfig;

  const showApple = platformView === 'apple' || platformView === 'both';
  const showGoogle = platformView === 'google' || platformView === 'both';

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto bg-surface-100 dark:bg-surface-900">
      {/* Phone previews — centered in available space */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0">
        <div
          className={`flex items-center gap-8 ${platformView === 'both' ? 'flex-row' : 'flex-col'}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {showApple && (
            <div className="flex flex-col items-center gap-3 shrink-0">
              {showBack ? (
                <AppleWalletBackCard form={form} walletDesign={walletDesign} cardTypeConfig={cardTypeConfig} />
              ) : (
                <AppleWalletCard
                  form={form}
                  selectedType={selectedType}
                  logoPreview={logoPreview}
                  stripPreview={stripPreview}
                  barcodeType={barcodeType}
                  walletDesign={walletDesign}
                  cardTypeConfig={cardTypeConfig}
                />
              )}
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('wallet.studio.canvas.appleWallet')}</span>
            </div>
          )}

          {showGoogle && (
            <div className="flex flex-col items-center gap-3 shrink-0">
              {showBack ? (
                <GoogleWalletBackCard
                  form={form}
                  logoPreview={logoPreview}
                  walletDesign={walletDesign}
                  cardTypeConfig={cardTypeConfig}
                  backFields={state.backContent.fields.map((f) => ({ label: f.label, value: f.value }))}
                  backLinks={state.backContent.links.map((l) => ({ type: l.type, url: l.url, label: l.label }))}
                />
              ) : (
                <GoogleWalletCard
                  form={form}
                  selectedType={selectedType}
                  logoPreview={logoPreview}
                  stripPreview={stripPreview}
                  barcodeType={barcodeType}
                  walletDesign={walletDesign}
                  cardTypeConfig={cardTypeConfig}
                />
              )}
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('wallet.studio.canvas.googleWallet')}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
