/**
 * Unit tests for StampGrid component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { StampGrid } from '@/components/wallet/studio/StampGrid';

describe('StampGrid', () => {
  const baseProps = {
    stampsRequired: 10,
    stampsEarned: 3,
    stampShape: 'circle' as const,
    stampIcon: '',
    stampColor: '#3B82F6',
    layout: 'grid' as const,
  };

  afterEach(() => {
    cleanup();
  });

  it('renders correct number of stamp slots', () => {
    render(
      <I18nProvider>
        <StampGrid {...baseProps} />
      </I18nProvider>
    );
    const slots = screen.getAllByTestId(/stamp-slot-/);
    expect(slots.length).toBe(10);
  });

  it('renders correct number of filled stamps', () => {
    render(
      <I18nProvider>
        <StampGrid {...baseProps} stampsEarned={5} />
      </I18nProvider>
    );
    const filledSlots = screen.getAllByTestId(/stamp-slot-/).filter((el) => el.getAttribute('data-filled') === 'true');
    expect(filledSlots.length).toBe(5);
  });

  it('renders empty message when stampsRequired is 0', () => {
    render(
      <I18nProvider>
        <StampGrid {...baseProps} stampsRequired={0} />
      </I18nProvider>
    );
    expect(screen.getByText('No stamps configured')).toBeDefined();
  });

  it('caps stamps at 20 maximum', () => {
    render(
      <I18nProvider>
        <StampGrid {...baseProps} stampsRequired={25} />
      </I18nProvider>
    );
    const slots = screen.getAllByTestId(/stamp-slot-/);
    expect(slots.length).toBe(20);
  });

  it('renders grid layout with grid class', () => {
    render(
      <I18nProvider>
        <StampGrid {...baseProps} layout="grid" />
      </I18nProvider>
    );
    const grid = screen.getByTestId('stamp-grid');
    expect(grid.className).toContain('grid');
  });

  it('renders linear layout with flex class', () => {
    render(
      <I18nProvider>
        <StampGrid {...baseProps} layout="linear" />
      </I18nProvider>
    );
    const grid = screen.getByTestId('stamp-grid');
    expect(grid.className).toContain('flex');
  });

  it('renders all supported shapes without errors', () => {
    const shapes: Array<'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon'> = ['circle', 'square', 'star', 'heart', 'diamond', 'hexagon'];
    for (const shape of shapes) {
      cleanup();
      const { container } = render(
        <I18nProvider>
          <StampGrid {...baseProps} stampShape={shape} />
        </I18nProvider>
      );
      expect(container.querySelector('svg')).toBeDefined();
    }
  });

  it('defaults stampsEarned to 0 when not provided', () => {
    render(
      <I18nProvider>
        <StampGrid {...baseProps} stampsEarned={undefined} />
      </I18nProvider>
    );
    const filledSlots = screen.getAllByTestId(/stamp-slot-/).filter((el) => el.getAttribute('data-filled') === 'true');
    expect(filledSlots.length).toBe(0);
  });
});
