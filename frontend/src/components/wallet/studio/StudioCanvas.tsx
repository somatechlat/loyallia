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
    central_background: state.colors.centralBackground || '',
    card_type: state.cardType,
    strip_image_url: state.images.strip?.url,
  };
}

function buildSelectedType(state: WalletPassStudioState) {
  return {
    value: state.cardType,
    icon: state.cardType,
  };
}

export function StudioCanvas({ state, platformView, showBack, zoom = 1 }: StudioCanvasProps) {
  const { t } = useI18n();
  const form = buildForm(state);
  const selectedType = buildSelectedType(state);
  const walletDesign = buildWalletDesign(state);
  const barcodeType = mapBarcodeFormat(state.barcode.format);
  const logoPreview = state.images.logo?.url ?? null;
  const stripPreview = state.images.strip?.url ?? null;
  const cardTypeConfig = state.cardTypeConfig;

  const showApple = platformView === 'apple' || platformView === 'both';
  const showGoogle = platformView === 'google' || platformView === 'both';

  // Check if any field has notifications configured
  const hasNotifications = state.fields.some((f) => f.notifications?.appleChangeMessage?.enabled || f.notifications?.googleMessage?.enabled);
  const firstNotifField = state.fields.find((f) => f.notifications?.appleChangeMessage?.enabled || f.notifications?.googleMessage?.enabled);
  const appleNotif = firstNotifField?.notifications?.appleChangeMessage;
  const googleNotif = firstNotifField?.notifications?.googleMessage;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto bg-surface-100 dark:bg-surface-900">
      {/* Notification preview banner */}
      {hasNotifications && (
        <div className="flex items-center justify-center px-4 pt-4 pb-1">
          <div className="flex items-center gap-3 max-w-lg w-full">
            {appleNotif?.enabled && showApple && (
              <div className="flex-1 rounded-2xl bg-neutral-200/80 dark:bg-neutral-700/60 backdrop-blur-xl p-2.5 shadow-lg border border-neutral-300/50 dark:border-neutral-600/50">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-neutral-800 dark:text-neutral-100 truncate">{state.name || t('wallet.studio.notifications.programFallback')}</p>
                    <p className="text-[10px] text-neutral-600 dark:text-neutral-300 leading-tight line-clamp-1">{appleNotif.message.replace('%@', '1,250')}</p>
                  </div>
                  <span className="text-[8px] text-neutral-400 shrink-0 ml-1">ahora</span>
                </div>
              </div>
            )}
            {googleNotif?.enabled && showGoogle && (
              <div className="flex-1 rounded-2xl bg-white dark:bg-neutral-700 p-2.5 shadow-md border border-neutral-200 dark:border-neutral-600">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-neutral-800 dark:text-neutral-100 truncate">{state.name || t('wallet.studio.notifications.programFallback')}</p>
                    <p className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-200 leading-tight truncate">{googleNotif.header}</p>
                    <p className="text-[9px] text-neutral-500 dark:text-neutral-400 leading-tight line-clamp-1">{googleNotif.body}</p>
                  </div>
                  <span className="text-[8px] text-neutral-400 shrink-0 ml-1">ahora</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
