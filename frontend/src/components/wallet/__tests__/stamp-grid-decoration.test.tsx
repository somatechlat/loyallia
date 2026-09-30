/**
 * StampGridDecoration — slot counts, palette roles, layout geometry.
 */
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import {
  StampGridDecoration,
  getStampSlotCount,
  SHAPE_PATHS,
} from '@/components/wallet/preview-decorations';
import { getCardPalette } from '@/components/wallet/design-system';

function renderGrid(props: Partial<React.ComponentProps<typeof StampGridDecoration>> = {}) {
  return render(
    <I18nProvider>
      <StampGridDecoration
        current={0}
        total={10}
        color="#3B82F6"
        {...props}
      />
    </I18nProvider>,
  );
}

function slots(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-testid="stamp-slot"]'));
}

describe('StampGridDecoration layouts', () => {
  afterEach(cleanup);

  const cases: Array<{ layout: string; total: number; slots: number }> = [
    { layout: '5x2', total: 10, slots: 10 },
    { layout: '3x3', total: 9, slots: 9 },
    { layout: '10x1', total: 10, slots: 10 },
    { layout: '4x2', total: 8, slots: 8 },
    { layout: '6x2', total: 12, slots: 12 },
    { layout: '4x4', total: 16, slots: 16 },
    { layout: 'dynamic', total: 7, slots: 7 },
  ];

  for (const { layout, total, slots: expected } of cases) {
    it(`renders ${expected} slots for ${layout}`, () => {
      const { container } = renderGrid({
        current: 2,
        total,
        stampGridLayout: layout,
      });
      expect(slots(container).length).toBe(expected);
      expect(getStampSlotCount(layout, total)).toBe(expected);
    });
  }

  it('caps slots at grid capacity when total overflows a fixed layout', () => {
    expect(getStampSlotCount('5x2', 20)).toBe(10);
    expect(getStampSlotCount('3x3', 20)).toBe(9);
    const { container } = renderGrid({ total: 20, stampGridLayout: '5x2' });
    expect(slots(container).length).toBe(10);
  });

  it('never renders more filled slots than total', () => {
    const { container } = renderGrid({
      current: 99,
      total: 8,
      stampGridLayout: '4x2',
    });
    const all = slots(container);
    expect(all.length).toBe(8);
    expect(all.every((s) => s.getAttribute('data-slot-state') === 'filled')).toBe(true);
  });
});

describe('StampGridDecoration palette roles', () => {
  afterEach(cleanup);

  it('filled slots use accent, empty slots use accentSoft', () => {
    const palette = getCardPalette('stamp');
    const { container } = renderGrid({
      current: 3,
      total: 10,
      stampGridLayout: '5x2',
      cardType: 'stamp',
    });
    const all = slots(container);
    const filled = all.filter((s) => s.getAttribute('data-slot-state') === 'filled');
    const empty = all.filter((s) => s.getAttribute('data-slot-state') === 'empty');

    expect(filled.length).toBe(3);
    expect(empty.length).toBe(7);

    // jsdom normalises hex → rgb; compare via a detached element.
    const probe = document.createElement('div');
    probe.style.backgroundColor = palette.accent;
    const accentNorm = probe.style.backgroundColor;
    probe.style.backgroundColor = palette.accentSoft;
    const softNorm = probe.style.backgroundColor;

    for (const slot of filled) {
      expect(slot.style.backgroundColor).toBe(accentNorm);
    }
    for (const slot of empty) {
      expect(slot.style.backgroundColor).toBe(softNorm);
    }
  });

  it('honours stampColor override on filled slots', () => {
    const { container } = renderGrid({
      current: 1,
      total: 4,
      stampGridLayout: '4x2',
      stampColor: 'rgb(1, 2, 3)',
    });
    const all = slots(container);
    expect(all[0].style.backgroundColor).toBe('rgb(1, 2, 3)');
    const probe = document.createElement('div');
    probe.style.backgroundColor = getCardPalette('stamp').accentSoft;
    expect(all[1].style.backgroundColor).toBe(probe.style.backgroundColor);
  });

  it('renders filled and empty icons when stampIcon ids are set', () => {
    const { container } = renderGrid({
      current: 1,
      total: 4,
      stampGridLayout: '4x2',
      stampIcon: 'motif-coffee-empty',
      stampFilledIcon: 'motif-coffee',
    });
    const all = slots(container);
    expect(all[0].querySelector('svg')).not.toBeNull();
    expect(all[1].querySelector('svg')).not.toBeNull();
  });
});

describe('StampGridDecoration shapes', () => {
  afterEach(cleanup);

  it('renders every supported shape without crashing', () => {
    for (const shape of Object.keys(SHAPE_PATHS)) {
      const { container } = renderGrid({
        current: 2,
        total: 4,
        stampGridLayout: '4x2',
        stampShape: shape,
      });
      expect(slots(container).length).toBe(4);
      cleanup();
    }
  });
});
