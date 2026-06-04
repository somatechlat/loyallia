/**
 * Design score hook for Wallet Pass Studio.
 *
 * Evaluates the current pass design across 10 quality checks and
 * returns a numeric score (0–10) plus a human-readable level.
 */

import { useMemo } from 'react';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import { contrastRatio } from '@/components/wallet/utils/contrast';
import { DEFAULT_COLORS, BARCODE_FORMAT_METADATA } from '@/components/wallet/constants';

export interface DesignScoreCheck {
  id: string;
  label: string;
  passed: boolean;
  message?: string;
}

export interface DesignScoreResult {
  score: number;
  level: 'excelente' | 'bueno' | 'aceptable' | 'necesita_trabajo';
  checks: DesignScoreCheck[];
}

function getLevel(score: number): DesignScoreResult['level'] {
  if (score >= 9) return 'excelente';
  if (score >= 7) return 'bueno';
  if (score >= 5) return 'aceptable';
  return 'necesita_trabajo';
}

function isDefaultColor(key: keyof typeof DEFAULT_COLORS, value: string): boolean {
  return DEFAULT_COLORS[key].toLowerCase() === value.toLowerCase();
}

export function useDesignScore(state: WalletPassStudioState): DesignScoreResult {
  const checks = useMemo<DesignScoreCheck[]>(() => {
    const { colors, images, fields, barcode, backContent, ui } = state;

    const c: DesignScoreCheck[] = [];

    // 1. contrast_text
    const textRatio = contrastRatio(colors.foreground, colors.background);
    c.push({
      id: 'contrast_text',
      label: 'Contraste texto/fondo',
      passed: textRatio >= 4.5,
      message: textRatio >= 4.5 ? undefined : `Ratio actual: ${textRatio.toFixed(2)}:1`,
    });

    // 2. contrast_label
    const labelRatio = contrastRatio(colors.label, colors.background);
    c.push({
      id: 'contrast_label',
      label: 'Contraste etiquetas/fondo',
      passed: labelRatio >= 4.5,
      message: labelRatio >= 4.5 ? undefined : `Ratio actual: ${labelRatio.toFixed(2)}:1`,
    });

    // 3. logo_present
    c.push({
      id: 'logo_present',
      label: 'Logo presente',
      passed: !!images.logo,
      message: !!images.logo ? undefined : 'Sube un logo para identificar la marca',
    });

    // 4. hero_present
    c.push({
      id: 'hero_present',
      label: 'Hero/Strip image configurada',
      passed: !!images.strip || !!images.heroImage,
      message: !!images.strip || !!images.heroImage ? undefined : 'Añade una imagen strip o hero',
    });

    // 5. primary_field
    const hasPrimary = fields.some((f) => f.fieldGroup === 'primary' && !!f.value);
    c.push({
      id: 'primary_field',
      label: 'Campo principal definido',
      passed: hasPrimary,
      message: hasPrimary ? undefined : 'Define al menos un campo primario con valor',
    });

    // 6. barcode_configured
    c.push({
      id: 'barcode_configured',
      label: 'Barcode configurado',
      passed: !!barcode.message,
      message: !!barcode.message ? undefined : 'Introduce el contenido del código de barras',
    });

    // 7. back_content
    const backOk = backContent.fields.length >= 2;
    c.push({
      id: 'back_content',
      label: 'Back content presente',
      passed: backOk,
      message: backOk ? undefined : 'Añade al menos 2 campos al reverso',
    });

    // 8. color_harmony
    const allDefault =
      isDefaultColor('background', colors.background) &&
      isDefaultColor('foreground', colors.foreground) &&
      isDefaultColor('label', colors.label) &&
      isDefaultColor('accent', colors.accent);
    c.push({
      id: 'color_harmony',
      label: 'Armonía de colores',
      passed: !allDefault,
      message: !allDefault ? undefined : 'Personaliza los colores predeterminados',
    });

    // 9. platform_compat
    const hiddenOnBoth = fields.some((f) => !f.showOnApple && !f.showOnGoogle);
    const meta = BARCODE_FORMAT_METADATA[barcode.format];
    let barcodeConflict = false;
    if (meta) {
      if (ui.platformView === 'apple' && !meta.appleSupported) barcodeConflict = true;
      if (ui.platformView === 'google' && !meta.googleSupported) barcodeConflict = true;
      if (ui.platformView === 'both' && (!meta.appleSupported || !meta.googleSupported)) barcodeConflict = true;
    }
    const platformOk = !hiddenOnBoth && !barcodeConflict;
    c.push({
      id: 'platform_compat',
      label: 'Compatibilidad plataformas',
      passed: platformOk,
      message: platformOk
        ? undefined
        : hiddenOnBoth
          ? 'Algunos campos están ocultos en ambas plataformas'
          : 'El formato de código no es compatible con la vista de plataforma seleccionada',
    });

    // 10. notifications_ok
    const notifyFields = fields.filter(
      (f) => !!f.notifications.appleChangeMessage || !!f.notifications.googleMessage
    );
    const notifyOk =
      notifyFields.length === 0 || notifyFields.every((f) => !!f.label && !!f.value);
    c.push({
      id: 'notifications_ok',
      label: 'Notificaciones configuradas',
      passed: notifyOk,
      message: notifyOk ? undefined : 'Los campos con notificaciones deben tener etiqueta y valor',
    });

    return c;
  }, [state]);

  // Weighted scoring per SRS-003 §10
  const WEIGHTS: Record<string, number> = {
    contrast_text: 2.0,
    contrast_label: 2.0,
    platform_compat: 2.0,
    logo_present: 1.5,
    primary_field: 1.5,
    barcode_configured: 1.5,
    hero_present: 1.0,
    back_content: 1.0,
    color_harmony: 1.0,
    notifications_ok: 1.0,
  };

  const totalWeight = checks.reduce((sum, ch) => sum + (WEIGHTS[ch.id] ?? 1.0), 0);
  const earnedWeight = checks.reduce((sum, ch) => sum + (ch.passed ? (WEIGHTS[ch.id] ?? 1.0) : 0), 0);
  const rawScore = (earnedWeight / totalWeight) * 10;
  const score = Math.round(rawScore * 10) / 10;
  const level = getLevel(score);

  return { score, level, checks };
}
