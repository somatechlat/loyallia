/**
 * Unit tests for the LIVE plan-gate components in wallet/studio.
 *
 * These replace tests of the deleted components/shared twins, which were
 * unreachable from any production module and carried hardcoded Spanish.
 * Locks: i18n-only copy, LockedFeature isLocked pass-through, LimitReached
 * role=alert usage banner.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nProvider, getNestedValue } from '@/lib/i18n';
import es from '@/lib/i18n/locales/es.json';
import { LockedFeature } from '@/components/wallet/studio/LockedFeature';
import { LimitReached } from '@/components/wallet/studio/LimitReached';

function t(key: string, vars?: Record<string, string | number>): string {
  const raw = getNestedValue(es as Record<string, unknown>, key);
  if (typeof raw !== 'string') return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m
  );
}

describe('LockedFeature (wallet/studio — the live one)', () => {
  afterEach(() => cleanup());

  it('renders children untouched when isLocked is false', () => {
    render(
      <I18nProvider>
        <LockedFeature featureName="AI Design" isLocked={false}>
          <button type="button">do the thing</button>
        </LockedFeature>
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'do the thing' })).toBeDefined();
    // no overlay chrome when unlocked
    expect(screen.queryByRole('button', { name: t('wallet.studio.locked.upgradePlan') })).toBeNull();
  });

  it('keeps children mounted under an overlay when isLocked is true', () => {
    render(
      <I18nProvider>
        <LockedFeature featureName="AI Design" isLocked={true}>
          <button type="button">do the thing</button>
        </LockedFeature>
      </I18nProvider>
    );
    // children stay in the DOM (read-only preview behind the overlay)
    expect(screen.getByRole('button', { name: 'do the thing' })).toBeDefined();
    expect(screen.getByText('AI Design')).toBeDefined();
    expect(screen.getByRole('button', { name: t('wallet.studio.locked.upgradePlan') })).toBeDefined();
  });

  it('names the required plan through i18n, not a hardcoded string', () => {
    render(
      <I18nProvider>
        <LockedFeature featureName="AI Design" requiredPlan="Pro" isLocked={true}>
          <span>child</span>
        </LockedFeature>
      </I18nProvider>
    );
    expect(screen.getByText(t('wallet.studio.locked.availableOnPlan', { plan: 'Pro' }))).toBeDefined();
  });

  it('falls back to the localized default plan name when requiredPlan is omitted', () => {
    render(
      <I18nProvider>
        <LockedFeature featureName="AI Design" isLocked={true}>
          <span>child</span>
        </LockedFeature>
      </I18nProvider>
    );
    expect(
      screen.getByText(
        t('wallet.studio.locked.availableOnPlan', { plan: t('wallet.studio.locked.professional') })
      )
    ).toBeDefined();
  });
});

describe('LimitReached (wallet/studio — the live one)', () => {
  afterEach(() => cleanup());

  it('is an alert and reports usage through i18n', () => {
    render(
      <I18nProvider>
        <LimitReached resourceName="plantillas" used={5} limit={5} />
      </I18nProvider>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(screen.getByText(t('wallet.studio.limitReached.title', { resource: 'plantillas' }))).toBeDefined();
    expect(screen.getByText(t('wallet.studio.limitReached.usage', { used: 5, limit: 5, pct: 100 }))).toBeDefined();
  });

  it('clamps the reported percentage at 100', () => {
    render(
      <I18nProvider>
        <LimitReached resourceName="plantillas" used={12} limit={5} />
      </I18nProvider>
    );
    expect(screen.getByText(t('wallet.studio.limitReached.usage', { used: 12, limit: 5, pct: 100 }))).toBeDefined();
  });

  it('computes the real percentage below the limit', () => {
    render(
      <I18nProvider>
        <LimitReached resourceName="plantillas" used={3} limit={4} />
      </I18nProvider>
    );
    expect(screen.getByText(t('wallet.studio.limitReached.usage', { used: 3, limit: 4, pct: 75 }))).toBeDefined();
  });

  it('handles a zero limit without dividing by zero', () => {
    render(
      <I18nProvider>
        <LimitReached resourceName="plantillas" used={1} limit={0} />
      </I18nProvider>
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(t('wallet.studio.limitReached.usage', { used: 1, limit: 0, pct: 0 }))).toBeDefined();
  });

  it('exposes an upgrade control', () => {
    render(
      <I18nProvider>
        <LimitReached resourceName="plantillas" used={5} limit={5} />
      </I18nProvider>
    );
    const btn = screen.getByRole('button', { name: t('common.update') });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
  });
});
