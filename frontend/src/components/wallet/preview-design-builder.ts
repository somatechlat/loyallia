/**
 * Maps WalletPassStudioState → PreviewWalletDesign for Apple/Google previews.
 * Shared by StudioCanvas, TemplatePreviewModal, and program card preview.
 */

import type { WalletPassStudioState, BarcodeFormat } from '@/components/wallet/types/unified-state';
import { mapFieldsToApple, mapFieldsToGoogle } from '@/components/wallet/utils/field-mappers';

type TextAlignment =
  | 'PKTextAlignmentLeft'
  | 'PKTextAlignmentCenter'
  | 'PKTextAlignmentRight'
  | 'PKTextAlignmentNatural';

export function mapBarcodeFormat(format: BarcodeFormat): string {
  const mapping: Record<BarcodeFormat, string> = {
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

export function buildWalletDesignFromState(state: WalletPassStudioState) {
  const appleFields = mapFieldsToApple(state.fields);
  const googleRows = mapFieldsToGoogle(state.fields);

  const mapField = (f: {
    key: string;
    label: string;
    value: string;
    changeMessage?: string;
    textAlignment?: string;
    attributedValue?: string;
  }) => ({
    key: f.key,
    label: f.label,
    value: f.value,
    changeMessage: f.changeMessage,
    textAlignment: f.textAlignment as TextAlignment,
    attributedValue: f.attributedValue,
  });

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
    googleHeroImageUrl: state.images.heroImage?.url ?? state.images.strip?.url ?? '',
    googleWideLogoUrl: state.images.wideLogo?.url ?? '',
    googleImageModuleUrl: state.images.imageModule?.url ?? '',
    googleBackgroundUrl: state.images.background?.url ?? '',
    imageCrops: {
      logo: state.images.logo?.crop,
      strip: state.images.strip?.crop,
      thumbnail: state.images.thumbnail?.crop,
      icon: state.images.icon?.crop,
      background: state.images.background?.crop,
      heroImage: state.images.heroImage?.crop ?? state.images.strip?.crop,
      wideLogo: state.images.wideLogo?.crop,
      imageModule: state.images.imageModule?.crop,
    },
    appleFields: {
      headerFields: appleFields.headerFields.map(mapField),
      primaryFields: appleFields.primaryFields.map(mapField),
      secondaryFields: appleFields.secondaryFields.map(mapField),
      auxiliaryFields: appleFields.auxiliaryFields.map(mapField),
      backFields: appleFields.backFields.map(mapField),
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
    google: {
      passType: state.google.passType,
      programName: state.google.programName || state.name,
      hexBackgroundColor: state.google.hexBackgroundColor || state.colors.background,
      messages: state.google.messages.map((m: { header: string; body: string }) => ({
        header: m.header,
        body: m.body,
      })),
    },
    googleAdvanced: {
      reviewStatus: state.google.reviewStatus,
      allowMultipleUsers: state.google.allowMultipleUsers,
      homepageUri: state.google.homepageUri ?? '',
      helpUri: state.google.helpUri ?? '',
      linksModuleUris: [],
      messages: state.google.messages.map((m: { header: string; body: string }) => ({
        header: m.header,
        body: m.body,
      })),
      notifyPreference: state.google.notifyPreference,
    },
  };
}
