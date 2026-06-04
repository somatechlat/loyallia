/**
 * Images tab content for the Wallet Pass Studio sidebar.
 *
 * Provides smart upload fields for logo, hero/strip, and icon images
 * with platform-specific previews and tips.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { WalletImages } from '@/components/wallet/types/unified-state';
import { SmartImageUpload } from './SmartImageUpload';

export interface ImagesTabProps {
  images: WalletImages;
  onUpdateImages: (images: Partial<WalletImages>) => void;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                  */
/* ------------------------------------------------------------------ */

function InfoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  );
}

function AppleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.96 1.07-3.11-1.05.05-2.31.71-3.06 1.58-.67.77-1.26 2.01-1.1 3.14 1.19.09 2.41-.6 3.09-1.61z" />
    </svg>
  );
}

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ImagesTab({ images, onUpdateImages }: ImagesTabProps) {
  const { t } = useI18n();
  const imageCount = [
    images.logo,
    images.strip,
    images.icon,
    images.heroImage,
    images.thumbnail,
  ].filter(Boolean).length;
  const maxImages = 5;

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {t('wallet.studio.images.title')}
        </h3>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
          {imageCount}/{maxImages}
        </span>
      </div>

      {/* Logo upload */}
      <SmartImageUpload
        label={t('wallet.studio.upload.programLogo')}
        description={t('wallet.studio.upload.programLogoDesc')}
        recommendedSize={{ width: 160, height: 160 }}
        applePreviewShape="circle"
        googlePreviewShape="circle"
        value={images.logo}
        onChange={(asset) => onUpdateImages({ logo: asset })}
      />

      {/* Hero / Strip upload */}
      <SmartImageUpload
        label={t('wallet.studio.upload.heroImage')}
        description={t('wallet.studio.upload.heroImageDesc')}
        recommendedSize={{ width: 1125, height: 432 }}
        applePreviewShape="rect"
        googlePreviewShape="rect"
        value={images.strip ?? images.heroImage}
        onChange={(asset) =>
          onUpdateImages({
            strip: asset,
            heroImage: asset,
          })
        }
      />

      {/* Icon upload */}
      <SmartImageUpload
        label={t('wallet.studio.upload.icon')}
        description={t('wallet.studio.upload.iconDesc')}
        recommendedSize={{ width: 90, height: 90 }}
        applePreviewShape="circle"
        googlePreviewShape="circle"
        value={images.icon}
        onChange={(asset) => onUpdateImages({ icon: asset })}
      />

      {/* Platform-specific tips */}
      <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {t('wallet.studio.images.recommendations')}
        </h4>

        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <AppleIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-300 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                {t('wallet.studio.images.apple')}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {t('wallet.studio.images.appleDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <GoogleIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-300 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                {t('wallet.studio.images.google')}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {t('wallet.studio.images.googleDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* General info */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10">
        <InfoIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
          {t('wallet.studio.images.autoOptimize')}
        </p>
      </div>
    </div>
  );
}
