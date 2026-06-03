import { stripLocalMinioUrl } from '@/lib/url-utils';
import {
  type WalletDesignState,
  type AppleWalletFeatureConfig,
  type AppleAdvancedConfig,
  type GoogleAdvancedConfig,
  type GoogleFieldRow,
  type AppleFieldDef,
  defaultWalletDesignState,
} from './types';

function stripTempUrl(url: string | undefined): string {
  return stripLocalMinioUrl(url);
}

/**
 * @description Parses wallet design state from program metadata.
 * @param {Record<string, unknown>} metadata - Program metadata object
 * @returns {WalletDesignState} Parsed wallet design state
 */
export function parseWalletDesignFromMetadata(
  metadata: Record<string, unknown>
): WalletDesignState {
  const wd = metadata?.wallet_design as Record<string, unknown> | undefined;
  if (!wd) return defaultWalletDesignState();

  const appleImages = (wd.apple_images as Record<string, string>) || {};
  const googleImages = (wd.google_images as Record<string, string>) || {};
  const appleWallet = (metadata.apple_wallet as AppleWalletFeatureConfig | undefined);

  return {
    provider: (wd.provider as 'apple' | 'google') || 'apple',
    appleLogoUrl: stripTempUrl(appleImages.logo),
    appleLogo2xUrl: stripTempUrl(appleImages.logo_2x),
    appleStripUrl: stripTempUrl(appleImages.strip),
    appleStrip2xUrl: stripTempUrl(appleImages.strip_2x),
    appleThumbnailUrl: stripTempUrl(appleImages.thumbnail),
    appleThumbnail2xUrl: stripTempUrl(appleImages.thumbnail_2x),
    appleIconUrl: stripTempUrl(appleImages.icon),
    appleIcon2xUrl: stripTempUrl(appleImages.icon_2x),
    googleProgramLogoUrl: stripTempUrl(googleImages.program_logo),
    googleHeroImageUrl: stripTempUrl(googleImages.hero_image),
    googleWideLogoUrl: stripTempUrl(googleImages.wide_logo),
    googleImageModuleUrl: stripTempUrl(googleImages.image_module),
    appleFields: (wd.apple_fields as Record<string, AppleFieldDef[]>) || {},
    googleRows: (wd.google_rows as GoogleFieldRow[]) || [],
    googleAdvanced:
      (wd.google_advanced as GoogleAdvancedConfig) ||
      defaultWalletDesignState().googleAdvanced,
    appleAdvanced:
      (wd.apple_advanced as AppleAdvancedConfig) ||
      defaultWalletDesignState().appleAdvanced,
    appleNfc: appleWallet || defaultWalletDesignState().appleNfc,
    locations: (wd.locations as WalletDesignState['locations']) || [],
    beacons: (wd.beacons as WalletDesignState['beacons']) || [],
    links: (wd.links as WalletDesignState['links']) || [],
    homepageUri: (wd.homepage_uri as string) || '',
    helpUri: (wd.help_uri as string) || '',
  };
}

/**
 * @description Builds wallet design metadata from a design state object.
 * @param {WalletDesignState} state - Wallet design state
 * @returns {Record<string, unknown>} Metadata object for storage
 */
export function buildWalletDesignMetadata(
  state: WalletDesignState
): Record<string, unknown> {
  const clean = (url: string) =>
    url.startsWith('blob:') || url.startsWith('data:') ? '' : url;
  return {
    wallet_design: {
      provider: state.provider,
      apple_images: {
        logo: clean(state.appleLogoUrl),
        logo_2x: clean(state.appleLogo2xUrl),
        strip: clean(state.appleStripUrl),
        strip_2x: clean(state.appleStrip2xUrl),
        thumbnail: clean(state.appleThumbnailUrl),
        thumbnail_2x: clean(state.appleThumbnail2xUrl),
        icon: clean(state.appleIconUrl),
        icon_2x: clean(state.appleIcon2xUrl),
      },
      google_images: {
        program_logo: clean(state.googleProgramLogoUrl),
        hero_image: clean(state.googleHeroImageUrl),
        wide_logo: clean(state.googleWideLogoUrl),
        image_module: clean(state.googleImageModuleUrl),
      },
      apple_fields: state.appleFields,
      google_rows: state.googleRows,
      google_advanced: state.googleAdvanced,
      apple_advanced: state.appleAdvanced,
      locations: state.locations,
      beacons: state.beacons,
      links: state.links,
      homepage_uri: state.homepageUri,
      help_uri: state.helpUri,
    },
    apple_wallet: state.appleNfc,
    wallet_provider: 'both',
  };
}
