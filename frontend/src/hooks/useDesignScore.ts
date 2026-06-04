/**
 * Design score hook for Wallet Pass Studio.
 *
 * Computes a 0–10 score and 14 detailed checks based on the current
 * pass design state per SRS-003 Section 10.
 */

import { useMemo } from 'react';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import { contrastRatio } from '@/components/wallet/utils/contrast';
import { hexToHsl } from '@/components/wallet/utils/colors';
import { BARCODE_FORMAT_METADATA } from '@/components/wallet/constants';

export interface DesignScoreCheck {
  id: string;
  label: string;
  passed: boolean;
  message?: string;
  autoFixable?: boolean;
}

export type DesignScoreLevel = 'excelente' | 'bueno' | 'aceptable' | 'necesita_trabajo';

export interface DesignScoreResult {
  score: number; // 0-10
  level: DesignScoreLevel;
  checks: DesignScoreCheck[];
}

function getLevel(score: number): DesignScoreLevel {
  if (score >= 9.0) return 'excelente';
  if (score >= 7.0) return 'bueno';
  if (score >= 5.0) return 'aceptable';
  return 'necesita_trabajo';
}

export function useDesignScore(state: WalletPassStudioState): DesignScoreResult {
  const checks = useMemo<DesignScoreCheck[]>(() => {
    const { colors, images, fields, barcode, backContent, apple, google } = state;
    const result: DesignScoreCheck[] = [];

    // 1. Contraste texto/fondo ≥ 4.5:1
    const textContrast = contrastRatio(colors.foreground, colors.background);
    const textContrastPassed = textContrast >= 4.5;
    result.push({
      id: 'textContrast',
      label: 'Contraste texto/fondo',
      passed: textContrastPassed,
      message: `${textContrast.toFixed(1)}:1 (${textContrast >= 7 ? 'AAA' : textContrast >= 4.5 ? 'AA' : 'FAIL'})`,
      autoFixable: !textContrastPassed,
    });

    // 2. Contraste etiquetas/fondo ≥ 4.5:1
    const labelContrast = contrastRatio(colors.label, colors.background);
    const labelContrastPassed = labelContrast >= 4.5;
    result.push({
      id: 'labelContrast',
      label: 'Contraste etiquetas/fondo',
      passed: labelContrastPassed,
      message: `${labelContrast.toFixed(1)}:1 (${labelContrast >= 7 ? 'AAA' : labelContrast >= 4.5 ? 'AA' : 'FAIL'})`,
      autoFixable: !labelContrastPassed,
    });

    // 3. Logo presente
    const logoPresent = !!images.logo;
    result.push({
      id: 'logoPresent',
      label: 'Logo presente',
      passed: logoPresent,
      autoFixable: false,
    });

    // 4. Hero/Strip image configurada
    const heroStripPresent = !!images.strip || !!images.heroImage;
    result.push({
      id: 'heroStripPresent',
      label: 'Hero/Strip image configurada',
      passed: heroStripPresent,
      autoFixable: false,
    });

    // 5. Campo principal definido
    const primaryFields = fields.filter((f) => f.fieldGroup === 'primary');
    const primaryFieldDefined =
      primaryFields.length > 0 && primaryFields.some((f) => f.value.trim().length > 0);
    result.push({
      id: 'primaryFieldDefined',
      label: 'Campo principal definido',
      passed: primaryFieldDefined,
      autoFixable: false,
    });

    // 6. Campos requeridos completos
    const requiredFields = fields.filter((f) =>
      ['header', 'primary', 'secondary'].includes(f.fieldGroup)
    );
    const requiredFieldsComplete =
      requiredFields.length > 0 && requiredFields.every((f) => f.value.trim().length > 0);
    result.push({
      id: 'requiredFieldsComplete',
      label: 'Campos requeridos completos',
      passed: requiredFieldsComplete,
      autoFixable: false,
    });

    // 7. Barcode configurado
    const barcodeConfigured = barcode.message.trim().length > 0;
    result.push({
      id: 'barcodeConfigured',
      label: 'Barcode configurado',
      passed: barcodeConfigured,
      autoFixable: false,
    });

    // 8. Dimensiones de imagen correctas
    const allImages = [
      images.logo,
      images.strip,
      images.heroImage,
      images.icon,
      images.thumbnail,
    ].filter(Boolean);
    const imageDimensionsCorrect =
      allImages.length === 0 || allImages.every((img) => img!.width > 0 && img!.height > 0);
    result.push({
      id: 'imageDimensionsCorrect',
      label: 'Dimensiones de imagen correctas',
      passed: imageDimensionsCorrect,
      autoFixable: false,
    });

    // 9. Armonía de colores
    const accentContrast = contrastRatio(colors.accent, colors.background);
    const bgHsl = hexToHsl(colors.background);
    const accentHsl = hexToHsl(colors.accent);
    const hueDiff = Math.abs(bgHsl.h - accentHsl.h);
    const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff);
    const colorHarmonyPassed =
      accentContrast >= 2.0 && (normalizedHueDiff > 15 || accentHsl.s > 10);
    result.push({
      id: 'colorHarmony',
      label: 'Armonía de colores',
      passed: colorHarmonyPassed,
      autoFixable: true,
    });

    // 10. Compatibilidad plataformas
    const hasAppleFields = fields.some((f) => f.showOnApple);
    const hasGoogleFields = fields.some((f) => f.showOnGoogle);
    const platformCompatibilityPassed = hasAppleFields && hasGoogleFields;
    result.push({
      id: 'platformCompatibility',
      label: 'Compatibilidad plataformas',
      passed: platformCompatibilityPassed,
      message: platformCompatibilityPassed ? 'OK' : 'Faltan campos visibles en una plataforma',
      autoFixable: false,
    });

    // 11. Back content presente
    const backContentPresent =
      backContent.fields.length > 0 ||
      backContent.links.length > 0 ||
      (backContent.termsAndConditions?.trim().length ?? 0) > 0;
    result.push({
      id: 'backContentPresent',
      label: 'Back content presente',
      passed: backContentPresent,
      autoFixable: false,
    });

    // 12. Tamaño de logo apropiado
    let logoSizePassed = true;
    if (images.logo) {
      const { width, height } = images.logo;
      logoSizePassed = width >= 40 && height >= 40 && width <= 1000 && height <= 1000;
    }
    result.push({
      id: 'logoSizeAppropriate',
      label: 'Tamaño de logo apropiado',
      passed: logoSizePassed,
      autoFixable: false,
    });

    // 13. Formato de barcode compatible con ambas plataformas
    const barcodeMeta = BARCODE_FORMAT_METADATA[barcode.format];
    const barcodeFormatCompatible = barcodeMeta.appleSupported && barcodeMeta.googleSupported;
    result.push({
      id: 'barcodeFormatCompatible',
      label: 'Formato de barcode compatible con ambas plataformas',
      passed: barcodeFormatCompatible,
      message: barcodeFormatCompatible
        ? 'Compatible con Apple Wallet y Google Wallet'
        : 'No compatible con ambas plataformas',
      autoFixable: false,
    });

    // 14. Notificaciones configuradas correctamente
    const notificationsConfigured =
      google.notifyPreference ||
      apple.locations.length > 0 ||
      apple.beacons.length > 0 ||
      fields.some(
        (f) =>
          !!f.notifications.appleChangeMessage || !!f.notifications.googleMessage
      );
    result.push({
      id: 'notificationsConfigured',
      label: 'Notificaciones configuradas correctamente',
      passed: notificationsConfigured,
      autoFixable: false,
    });

    return result;
  }, [state]);

  const score = useMemo(() => {
    const totalChecks = checks.length;
    if (totalChecks === 0) return 0;
    const passedCount = checks.filter((c) => c.passed).length;
    return Math.round((passedCount / totalChecks) * 100) / 10;
  }, [checks]);

  const level = useMemo(() => getLevel(score), [score]);

  return { score, level, checks };
}
