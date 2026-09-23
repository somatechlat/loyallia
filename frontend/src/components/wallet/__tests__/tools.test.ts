/**
 * Unit tests for the single studio tool registry (D-U2, D-U9).
 *
 * Locks: one ordered 7-tool registry, one tool-id union, every nav labelKey
 * resolvable in both locales (regression for the missing `cardType` key).
 */

import { describe, it, expect } from 'vitest';
import { STUDIO_TOOLS, type StudioToolId } from '@/components/wallet/studio/tools';
import type { ActiveTab, WalletPassStudioState } from '@/components/wallet/types/unified-state';
import { getNestedValue } from '@/lib/i18n';
import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('STUDIO_TOOLS', () => {
  it('has exactly 7 entries with unique ids', () => {
    expect(STUDIO_TOOLS).toHaveLength(7);
    const ids = STUDIO_TOOLS.map((tool) => tool.id);
    expect(new Set(ids).size).toBe(7);
  });

  it('excludes ai — AI is an action, not a tool', () => {
    expect(STUDIO_TOOLS.map((tool) => tool.id)).not.toContain('ai');
  });

  it('orders the tools images → cardType → fields → back → barcode → colors → advanced', () => {
    expect(STUDIO_TOOLS.map((tool) => tool.id)).toEqual([
      'images',
      'cardType',
      'fields',
      'back',
      'barcode',
      'colors',
      'advanced',
    ]);
  });

  it('resolves every labelKey in es and en locales', () => {
    for (const tool of STUDIO_TOOLS) {
      const esValue = getNestedValue(es as Record<string, unknown>, tool.labelKey);
      expect(esValue, `es missing ${tool.labelKey}`).not.toBe(tool.labelKey);
      expect(esValue.length).toBeGreaterThan(0);

      const enValue = getNestedValue(en as Record<string, unknown>, tool.labelKey);
      expect(enValue, `en missing ${tool.labelKey}`).not.toBe(tool.labelKey);
      expect(enValue.length).toBeGreaterThan(0);
    }
  });

  it('ActiveTab is exactly StudioToolId (both directions)', () => {
    // Runtime direction 1: every registry id is a valid ActiveTab
    const asActiveTabs: ActiveTab[] = STUDIO_TOOLS.map((tool) => tool.id);
    expect(asActiveTabs).toHaveLength(7);

    // Runtime direction 2 + type-level: the two unions have the same members
    const identical: Equals<ActiveTab, StudioToolId> = true;
    expect(identical).toBe(true);
  });

  it('every STUDIO_TOOLS id is a valid ui.activeTab', () => {
    for (const tool of STUDIO_TOOLS) {
      const activeTab: WalletPassStudioState['ui']['activeTab'] = tool.id;
      expect(activeTab).toBe(tool.id);
    }
  });
});
