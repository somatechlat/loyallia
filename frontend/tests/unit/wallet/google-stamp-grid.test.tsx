/**
 * Google progress grid: configured stamp shape + colour render in the
 * preview, and the grid NEVER collapses to an empty row (missing/zero
 * totals fall back to 10 slots).
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { GoogleWalletCard } from '@/components/wallet/GoogleWalletPreview';
import type { CardTypeConfig } from '@/components/wallet/types/unified-state';

const baseForm = {
  name: 'Cafe Aurora',
  description: 'Disfruta cada visita',
  background_color: '',
  text_color: '',
  card_type: 'stamp',
};

function stampConfig(overrides: Partial<Extract<CardTypeConfig, { cardType: 'stamp' }>> = {}) {
  return {
    cardType: 'stamp' as const,
    stampsRequired: 4,
    rewardDescription: 'Café gratis',
    stampType: 'visit' as const,
    consumptionPerStamp: 1,
    stampExpiry: 'unlimited' as const,
    stampsAtIssue: 2,
    dailyStampLimit: 1,
    birthdayStamps: 0,
    stampShape: 'circle' as const,
    stampIcon: '',
    stampFilledIcon: '',
    stampColor: '#FBBF24',
    stampGridLayout: '5x2' as const,
    ...overrides,
  };
}

function renderCard(config: Extract<CardTypeConfig, { cardType: 'stamp' }>) {
  return render(
    <I18nProvider>
      <GoogleWalletCard
        form={baseForm}
        barcodeType="qr_code"
        cardTypeConfig={config}
        deviceFrame={false}
      />
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe('GoogleWalletCard progress grid', () => {
  it('renders one stamp glyph per slot', () => {
    renderCard(stampConfig({ stampsAtIssue: 2, stampsRequired: 4 }));
    const progress = screen.getByTestId('google-progress');
    expect(progress.querySelectorAll('svg').length).toBe(4);
  });

  it('never vanishes: a missing/zero stampsRequired falls back to 10 slots', () => {
    renderCard(stampConfig({ stampsAtIssue: 1, stampsRequired: 0 }));
    const progress = screen.getByTestId('google-progress');
    expect(progress).toBeTruthy();
    expect(progress.querySelectorAll('svg').length).toBe(10);
  });

  it('honours the configured stamp shape', () => {
    renderCard(stampConfig({ stampShape: 'star', stampsAtIssue: 1, stampsRequired: 3 }));
    const progress = screen.getByTestId('google-progress');
    const firstPath = progress.querySelector('svg path');
    // Star glyph path from StampIcons (circle would start "M12 2a10").
    expect(firstPath?.getAttribute('d') ?? '').toContain('M12 2.6');
  });

  it('honours the configured stamp colour for filled slots', () => {
    renderCard(stampConfig({ stampColor: '#FF0000', stampsAtIssue: 1, stampsRequired: 3 }));
    const progress = screen.getByTestId('google-progress');
    const filledSlot = progress.querySelector('svg');
    const outline = filledSlot?.querySelector('path');
    expect(outline?.getAttribute('fill')).toBe('#FF0000');
  });

  it('falls back to the palette accent when no stamp colour is configured', () => {
    renderCard(stampConfig({ stampColor: '', stampsAtIssue: 1, stampsRequired: 2 }));
    const progress = screen.getByTestId('google-progress');
    const outline = progress.querySelector('svg path');
    // Some concrete colour is applied (never "none" on a filled slot).
    const fill = outline?.getAttribute('fill') ?? '';
    expect(fill).not.toBe('none');
    expect(fill).not.toBe('');
  });
});
