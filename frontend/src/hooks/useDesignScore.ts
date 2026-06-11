/**
 * Design score hook for Wallet Pass Studio.
 *
 * Evaluates the current pass design across 14+ quality checks and
 * returns a numeric score (0–10) plus a human-readable level.
 *
 * Weights per SRS-008 §8:
 *   Contrast ratio 18% | Logo 13% | Logo dimensions 9% | Required fields 13%
 *   Hero image 9% | Image aspect ratios 9% | Barcode 9% | Back content 15%
 *   Dual platform 5%
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

/** Extract all text content from back fields and links for length check */
function getBackContentLength(state: WalletPassStudioState): number {
  const { backContent } = state;
  let len = 0;
  for (const f of backContent.fields) {
    len += (f.label?.length ?? 0) + (f.value?.length ?? 0);
  }
  for (const l of backContent.links) {
    len += (l.label?.length ?? 0) + (l.url?.length ?? 0);
  }
  return len;
}

export function useDesignScore(state: WalletPassStudioState): DesignScoreResult {
  const checks = useMemo<DesignScoreCheck[]>(() => {
    const { colors, images, fields, barcode, backContent, ui } = state;

    const c: DesignScoreCheck[] = [];

    // 1. contrast_text (part of Contrast ratio 18%)
    const textRatio = contrastRatio(colors.foreground, colors.background);
    c.push({
      id: 'contrast_text',
      label: 'Contraste texto/fondo',
      passed: textRatio >= 4.5,
      message: textRatio >= 4.5 ? undefined : `Ratio actual: ${textRatio.toFixed(2)}:1`,
    });

    // 2. contrast_label (part of Contrast ratio 18%)
    const labelRatio = contrastRatio(colors.label, colors.background);
    c.push({
      id: 'contrast_label',
      label: 'Contraste etiquetas/fondo',
      passed: labelRatio >= 4.5,
      message: labelRatio >= 4.5 ? undefined : `Ratio actual: ${labelRatio.toFixed(2)}:1`,
    });

    // 3. logo_present (Logo uploaded 13%)
    c.push({
      id: 'logo_present',
      label: 'Logo presente',
      passed: !!images.logo,
      message: !!images.logo ? undefined : 'Sube un logo para identificar la marca',
    });

    // 4. logo_dimensions (Logo dimensions 9%)
    const logo = images.logo;
    const logoDimOk =
      !logo || (logo.width >= 660 && logo.height >= 660);
    c.push({
      id: 'logo_dimensions',
      label: 'Dimensiones del logo',
      passed: logoDimOk,
      message: logoDimOk
        ? undefined
        : logo
          ? `Logo muy pequeño (${logo.width}×${logo.height}px). Mínimo: 660×660px`
          : 'Sube un logo para verificar dimensiones',
    });

    // 5. primary_field (Required fields 13%)
    const hasPrimary = fields.some((f) => f.fieldGroup === 'primary' && !!f.value);
    c.push({
      id: 'primary_field',
      label: 'Campo principal definido',
      passed: hasPrimary,
      message: hasPrimary ? undefined : 'Define al menos un campo primario con valor',
    });

    // 6. hero_present (Hero image 9%)
    c.push({
      id: 'hero_present',
      label: 'Hero/Strip image configurada',
      passed: !!images.strip || !!images.heroImage,
      message: !!images.strip || !!images.heroImage ? undefined : 'Añade una imagen strip o hero',
    });

    // 7. image_aspect_ratios (Image aspect ratios 9%)
    const aspectIssues: string[] = [];
    if (images.strip) {
      const r = images.strip.width / (images.strip.height || 1);
      if (r < 2 || r > 5) {
        aspectIssues.push(`Strip ${images.strip.width}×${images.strip.height} (ratio ${r.toFixed(1)}:1)`);
      }
    }
    if (images.heroImage) {
      const r = images.heroImage.width / (images.heroImage.height || 1);
      if (r < 1.5 || r > 3.5) {
        aspectIssues.push(`Hero ${images.heroImage.width}×${images.heroImage.height} (ratio ${r.toFixed(1)}:1)`);
      }
    }
    if (images.logo) {
      const r = images.logo.width / (images.logo.height || 1);
      if (r < 0.8 || r > 1.25) {
        aspectIssues.push(`Logo ${images.logo.width}×${images.logo.height} (ratio ${r.toFixed(1)}:1)`);
      }
    }
    c.push({
      id: 'image_aspect_ratios',
      label: 'Proporciones de imagen',
      passed: aspectIssues.length === 0,
      message:
        aspectIssues.length === 0
          ? undefined
          : `Proporciones incorrectas: ${aspectIssues.join('; ')}`,
    });

    // 8. barcode_configured (Barcode 9%)
    c.push({
      id: 'barcode_configured',
      label: 'Barcode configurado',
      passed: !!barcode.message,
      message: !!barcode.message ? undefined : 'Introduce el contenido del código de barras',
    });

    // 9. has_back_fields (Back content 5%)
    const hasBackFields = backContent.fields.length >= 2;
    c.push({
      id: 'has_back_fields',
      label: 'Campos en el reverso',
      passed: hasBackFields,
      message: hasBackFields ? undefined : 'Añade al menos 2 campos al reverso de la tarjeta',
    });

    // 10. has_terms (Back content 3%)
    const hasTerms = backContent.fields.some(
      (f) => /términos|terms|condiciones|conditions/i.test(f.label)
    );
    c.push({
      id: 'has_terms',
      label: 'Términos y condiciones',
      passed: hasTerms,
      message: hasTerms ? undefined : 'Faltan términos y condiciones',
    });

    // 11. has_contact_info (Back content 3%)
    const hasContactInFields = backContent.fields.some(
      (f) => /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(f.value) || /\+?\d[\d\s()-]{6,}/.test(f.value)
    );
    const hasContactInLinks = backContent.links.some(
      (l) => l.type === 'email' || l.type === 'phone' || /^mailto:|^tel:/i.test(l.url)
    );
    const hasContact = hasContactInFields || hasContactInLinks;
    c.push({
      id: 'has_contact_info',
      label: 'Información de contacto',
      passed: hasContact,
      message: hasContact ? undefined : 'Añade información de contacto (email o teléfono)',
    });

    // 12. has_program_rules (Back content 2%)
    const hasRules = backContent.fields.some(
      (f) => /reglas|rules|políticas|policies/i.test(f.label)
    );
    c.push({
      id: 'has_program_rules',
      label: 'Reglas del programa',
      passed: hasRules,
      message: hasRules ? undefined : 'Añade las reglas del programa',
    });

    // 13. back_content_length (Back content 2%)
    const backLen = getBackContentLength(state);
    const backLenOk = backLen > 50;
    c.push({
      id: 'back_content_length',
      label: 'Contenido del reverso',
      passed: backLenOk,
      message: backLenOk ? undefined : 'El reverso está muy vacío (menos de 50 caracteres)',
    });

    // 14. platform_compat (Dual platform 5%)
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

    // 15. color_harmony (bonus / not weighted)
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

    // 16. notifications_ok (bonus / not weighted)
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

  // Weighted scoring per SRS-008 §8 (percentage-based weights)
  const WEIGHTS: Record<string, number> = {
    contrast_text: 9,        // 9% (half of 18% contrast)
    contrast_label: 9,       // 9% (half of 18% contrast)
    logo_present: 13,        // 13%
    logo_dimensions: 9,      // 9%
    primary_field: 13,       // 13%
    hero_present: 9,         // 9%
    image_aspect_ratios: 9,  // 9%
    barcode_configured: 9,   // 9%
    has_back_fields: 5,      // 5%
    has_terms: 3,            // 3%
    has_contact_info: 3,     // 3%
    has_program_rules: 2,    // 2%
    back_content_length: 2,  // 2%
    platform_compat: 5,      // 5%
    color_harmony: 0,        // not counted in score (informational)
    notifications_ok: 0,     // not counted in score (informational)
  };

  const totalWeight = checks.reduce((sum, ch) => sum + (WEIGHTS[ch.id] ?? 1.0), 0);
  const earnedWeight = checks.reduce((sum, ch) => sum + (ch.passed ? (WEIGHTS[ch.id] ?? 1.0) : 0), 0);
  const rawScore = (earnedWeight / totalWeight) * 10;
  const score = Math.round(rawScore * 10) / 10;
  const level = getLevel(score);

  return { score, level, checks };
}
