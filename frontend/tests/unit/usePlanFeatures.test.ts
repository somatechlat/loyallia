/**
 * Unit tests for usePlanFeatures hook.
 */

import { describe, it, expect } from 'vitest';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';

describe('usePlanFeatures', () => {
  it('returns plan features', () => {
    const result = usePlanFeatures();

    expect(result.wallet_pass_studio).toBe(true);
    expect(result.wallet_custom_templates).toBe(true);
    expect(result.wallet_advanced_fields).toBe(true);
  });

  it('returns limits', () => {
    const result = usePlanFeatures();

    expect(result.limits.wallet_templates).toBe(50);
    expect(result.limits.wallet_pass_updates_month).toBe(200);
    expect(result.limits.wallet_ai_designs_month).toBe(20);
  });

  it('returns usage', () => {
    const result = usePlanFeatures();

    expect(result.usage.wallet_templates).toBe(3);
    expect(result.usage.wallet_pass_updates_month).toBe(12);
    expect(result.usage.wallet_ai_designs_month).toBe(2);
  });
});
