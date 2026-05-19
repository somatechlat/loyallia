/* Test page for V2 Designer */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { programsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CARD_TYPES,
} from '@/components/programs/constants';
import {
  type WalletDesignState,
  defaultWalletDesignState,
} from '@/components/programs/WalletDesigner';
import { WalletDesignShellV2 } from '@/components/programs/designerV2/WalletDesignShellV2';

interface ProgramData {
  id: string;
  name: string;
  description: string;
  card_type: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  strip_image_url: string;
  icon_url: string;
  barcode_type: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  is_published: boolean;
}

function stripTempUrl(url: string | undefined): string {
  if (typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return '';
  if (url.includes('://localhost:33903/') || url.includes('://127.0.0.1:33903/')) {
    return url.replace(/^https?:\/\/[^/]+:33903/, '');
  }
  return url;
}

function parseWalletDesignFromMetadata(metadata: Record<string, unknown>): WalletDesignState {
  const wd = metadata?.wallet_design as Record<string, unknown> | undefined;
  if (!wd) return defaultWalletDesignState();

  const appleImages = (wd.apple_images as Record<string, string>) || {};
  const googleImages = (wd.google_images as Record<string, string>) || {};
  const appleWallet = (metadata.apple_wallet as { nfc_enabled: boolean; nfc_requires_authentication: boolean } | undefined);

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
    appleFields: (wd.apple_fields as Record<string, Array<{ key: string; label: string; value: string }>>) || {},
    googleRows: (wd.google_rows as WalletDesignState['googleRows']) || [],
    googleAdvanced: (wd.google_advanced as WalletDesignState['googleAdvanced']) || {
      reviewStatus: 'UNDER_REVIEW',
      allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
      homepageUri: '',
      helpUri: '',
      linksModuleUris: [],
      messages: [],
      notifyPreference: true,
    },
    appleAdvanced: (wd.apple_advanced as WalletDesignState['appleAdvanced']) || {
      suppressStripShine: false,
      nfcMessage: '',
      sharingProhibited: false,
      voided: false,
      expirationDate: '',
    },
    appleNfc: appleWallet || { nfc_enabled: false, nfc_requires_authentication: false },
    locations: (wd.locations as WalletDesignState['locations']) || [],
    beacons: (wd.beacons as WalletDesignState['beacons']) || [],
    links: (wd.links as WalletDesignState['links']) || [],
    homepageUri: (wd.homepage_uri as string) || '',
    helpUri: (wd.help_uri as string) || '',
  };
}

export default function ProgramDesignV2Page() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  const [program, setProgram] = useState<ProgramData | null>(null);
  const [walletDesign, setWalletDesign] = useState<WalletDesignState>(defaultWalletDesignState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleFormChange = (patch: Partial<{ background_color: string; text_color: string }>) => {
    setProgram(prev => prev ? { ...prev, ...patch } : null);
  };

  const handleBarcodeTypeChange = (type: string) => {
    setProgram(prev => prev ? { ...prev, barcode_type: type } : null);
  };

  useEffect(() => {
    loadProgram();
  }, [programId]);

  const loadProgram = async () => {
    try {
      setLoading(true);
      const res = await programsApi.get(programId);
      const data = res.data as ProgramData;
      setProgram(data);
      setWalletDesign(parseWalletDesignFromMetadata(data.metadata || {}));
    } catch (err) {
      toast.error('Error al cargar el programa');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!program) return;
    try {
      setSaving(true);
      const walletMeta = {
        wallet_design: {
          provider: walletDesign.provider,
          apple_images: {
            logo: walletDesign.appleLogoUrl,
            logo_2x: walletDesign.appleLogo2xUrl,
            strip: walletDesign.appleStripUrl,
            strip_2x: walletDesign.appleStrip2xUrl,
            thumbnail: walletDesign.appleThumbnailUrl,
            thumbnail_2x: walletDesign.appleThumbnail2xUrl,
            icon: walletDesign.appleIconUrl,
            icon_2x: walletDesign.appleIcon2xUrl,
          },
          google_images: {
            program_logo: walletDesign.googleProgramLogoUrl,
            hero_image: walletDesign.googleHeroImageUrl,
            wide_logo: walletDesign.googleWideLogoUrl,
            image_module: walletDesign.googleImageModuleUrl,
          },
          apple_fields: walletDesign.appleFields,
          google_rows: walletDesign.googleRows,
          google_advanced: walletDesign.googleAdvanced,
          apple_advanced: walletDesign.appleAdvanced,
          locations: walletDesign.locations,
          beacons: walletDesign.beacons,
          links: walletDesign.links,
          homepage_uri: walletDesign.homepageUri,
          help_uri: walletDesign.helpUri,
        },
        apple_wallet: walletDesign.appleNfc,
        wallet_provider: walletDesign.provider,
      };
      await programsApi.update(programId, {
        name: program.name,
        description: program.description,
        background_color: program.background_color,
        text_color: program.text_color,
        logo_url: walletDesign.provider === 'apple' ? walletDesign.appleLogoUrl : walletDesign.googleProgramLogoUrl,
        strip_image_url: walletDesign.provider === 'apple' ? walletDesign.appleStripUrl : walletDesign.googleHeroImageUrl,
        icon_url: walletDesign.provider === 'apple' ? walletDesign.appleIconUrl : walletDesign.googleProgramLogoUrl,
        barcode_type: program.barcode_type || 'qr_code',
        metadata: { ...program.metadata, ...walletMeta },
      });
      toast.success('Cambios guardados');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !program) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedType = CARD_TYPES.find(t => t.value === program.card_type);

  return (
    <WalletDesignShellV2
      programName={program.name}
      programStatus={program.is_published ? 'published' : program.is_active ? 'draft' : 'suspended'}
      onBack={() => router.push(`/programs/${programId}`)}
      form={{
        name: program.name,
        description: program.description,
        background_color: program.background_color,
        text_color: program.text_color,
        card_type: program.card_type,
        strip_image_url: program.strip_image_url,
      }}
      selectedType={selectedType}
      logoPreview={walletDesign.provider === 'apple' ? walletDesign.appleLogoUrl : walletDesign.googleProgramLogoUrl}
      stripPreview={walletDesign.provider === 'apple' ? walletDesign.appleStripUrl : walletDesign.googleHeroImageUrl}
      barcodeType={program.barcode_type}
      walletDesign={walletDesign}
      onWalletDesignChange={setWalletDesign}
      onSave={handleSave}
      isSaving={saving}
      onFormChange={handleFormChange}
      onBarcodeTypeChange={handleBarcodeTypeChange}
    />
  );
}
