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
  label: string; // i18n key
  passed: boolean;
  message?: string; // i18n key
  messageParams?: Record<string, string | number>; // interpolation params for message
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
      label: 'wallet.designScore.checks.contrast_text',
      passed: textRatio >= 4.5,
      message: textRatio >= 4.5 ? undefined : 'wallet.designScore.messages.current_ratio',
      messageParams: textRatio >= 4.5 ? undefined : { ratio: textRatio.toFixed(2) },
    });

    // 2. contrast_label (part of Contrast ratio 18%)
    const labelRatio = contrastRatio(colors.label, colors.background);
    c.push({
      id: 'contrast_label',
      label: 'wallet.designScore.checks.contrast_label',
      passed: labelRatio >= 4.5,
      message: labelRatio >= 4.5 ? undefined : 'wallet.designScore.messages.current_ratio',
      messageParams: labelRatio >= 4.5 ? undefined : { ratio: labelRatio.toFixed(2) },
    });

    // 3. logo_present (Logo uploaded 13%)
    c.push({
      id: 'logo_present',
      label: 'wallet.designScore.checks.logo_present',
      passed: !!images.logo,
      message: !!images.logo ? undefined : 'wallet.designScore.messages.upload_logo',
    });

    // 4. logo_dimensions (Logo dimensions 9%)
    const logo = images.logo;
    const logoDimOk =
      !logo || (logo.width >= 660 && logo.height >= 660);
    c.push({
      id: 'logo_dimensions',
      label: 'wallet.designScore.checks.logo_dimensions',
      passed: logoDimOk,
      message: logoDimOk
        ? undefined
        : logo
          ? 'wallet.designScore.messages.logo_too_small'
          : 'wallet.designScore.messages.verify_logo_dimensions',
      messageParams: logo && !logoDimOk ? { width: logo.width, height: logo.height } : undefined,
    });

    // 5. primary_field (Required fields 13%)
    const hasPrimary = fields.some((f) => f.fieldGroup === 'primary' && !!f.value);
    c.push({
      id: 'primary_field',
      label: 'wallet.designScore.checks.primary_field',
      passed: hasPrimary,
      message: hasPrimary ? undefined : 'wallet.designScore.messages.define_primary',
    });

    // 6. hero_present (Hero image 9%)
    c.push({
      id: 'hero_present',
      label: 'wallet.designScore.checks.hero_present',
      passed: !!images.strip || !!images.heroImage,
      message: !!images.strip || !!images.heroImage ? undefined : 'wallet.designScore.messages.add_hero_image',
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
      label: 'wallet.designScore.checks.image_aspect_ratios',
      passed: aspectIssues.length === 0,
      message:
        aspectIssues.length === 0
          ? undefined
          : 'wallet.designScore.messages.incorrect_aspects',
      messageParams: aspectIssues.length === 0 ? undefined : { issues: aspectIssues.join('; ') },
    });

    // 8. barcode_configured (Barcode 9%)
    c.push({
      id: 'barcode_configured',
      label: 'wallet.designScore.checks.barcode_configured',
      passed: !!barcode.message,
      message: !!barcode.message ? undefined : 'wallet.designScore.messages.enter_barcode',
    });

    // 9. has_back_fields (Back content 5%)
    const hasBackFields = backContent.fields.length >= 2;
    c.push({
      id: 'has_back_fields',
      label: 'wallet.designScore.checks.has_back_fields',
      passed: hasBackFields,
      message: hasBackFields ? undefined : 'wallet.designScore.messages.add_back_fields',
    });

    // 10. has_terms (Back content 3%)
    const hasTerms = backContent.fields.some(
      (f) => /términos|terms|condiciones|conditions/i.test(f.label)
    );
    c.push({
      id: 'has_terms',
      label: 'wallet.designScore.checks.has_terms',
      passed: hasTerms,
      message: hasTerms ? undefined : 'wallet.designScore.messages.missing_terms',
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
      label: 'wallet.designScore.checks.has_contact_info',
      passed: hasContact,
      message: hasContact ? undefined : 'wallet.designScore.messages.add_contact',
    });

    // 12. has_program_rules (Back content 2%)
    const hasRules = backContent.fields.some(
      (f) => /reglas|rules|políticas|policies/i.test(f.label)
    );
    c.push({
      id: 'has_program_rules',
      label: 'wallet.designScore.checks.has_program_rules',
      passed: hasRules,
      message: hasRules ? undefined : 'wallet.designScore.messages.add_rules',
    });

    // 13. back_content_length (Back content 2%)
    const backLen = getBackContentLength(state);
    const backLenOk = backLen > 50;
    c.push({
      id: 'back_content_length',
      label: 'wallet.designScore.checks.back_content_length',
      passed: backLenOk,
      message: backLenOk ? undefined : 'wallet.designScore.messages.back_too_empty',
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
      label: 'wallet.designScore.checks.platform_compat',
      passed: platformOk,
      message: platformOk
        ? undefined
        : hiddenOnBoth
          ? 'wallet.designScore.messages.fields_hidden_both'
          : 'wallet.designScore.messages.barcode_incompatible',
    });

    // 15. color_harmony (bonus / not weighted)
    const allDefault =
      isDefaultColor('background', colors.background) &&
      isDefaultColor('foreground', colors.foreground) &&
      isDefaultColor('label', colors.label) &&
      isDefaultColor('accent', colors.accent);
    c.push({
      id: 'color_harmony',
      label: 'wallet.designScore.checks.color_harmony',
      passed: !allDefault,
      message: !allDefault ? undefined : 'wallet.designScore.messages.customize_defaults',
    });

    // 16. notifications_ok (bonus / not weighted)
    const notifyFields = fields.filter(
      (f) => !!f.notifications.appleChangeMessage || !!f.notifications.googleMessage
    );
    const notifyOk =
      notifyFields.length === 0 || notifyFields.every((f) => !!f.label && !!f.value);
    c.push({
      id: 'notifications_ok',
      label: 'wallet.designScore.checks.notifications_ok',
      passed: notifyOk,
      message: notifyOk ? undefined : 'wallet.designScore.messages.notification_fields_need_labels',
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
