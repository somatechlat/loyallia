/**
 * Unit tests for StampGrid component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
    render(<StampGrid {...baseProps} />);
    const slots = screen.getAllByTestId(/stamp-slot-/);
    expect(slots.length).toBe(10);
  });

  it('renders correct number of filled stamps', () => {
    render(<StampGrid {...baseProps} stampsEarned={5} />);
    const filledSlots = screen.getAllByTestId(/stamp-slot-/).filter((el) => el.getAttribute('data-filled') === 'true');
    expect(filledSlots.length).toBe(5);
  });

  it('renders empty message when stampsRequired is 0', () => {
    render(<StampGrid {...baseProps} stampsRequired={0} />);
    expect(screen.getByText('Sin sellos configurados')).toBeDefined();
  });

  it('caps stamps at 20 maximum', () => {
    render(<StampGrid {...baseProps} stampsRequired={25} />);
    const slots = screen.getAllByTestId(/stamp-slot-/);
    expect(slots.length).toBe(20);
  });

  it('renders grid layout with grid class', () => {
    render(<StampGrid {...baseProps} layout="grid" />);
    const grid = screen.getByTestId('stamp-grid');
    expect(grid.className).toContain('grid');
  });

  it('renders linear layout with flex class', () => {
    render(<StampGrid {...baseProps} layout="linear" />);
    const grid = screen.getByTestId('stamp-grid');
    expect(grid.className).toContain('flex');
  });

  it('renders all supported shapes without errors', () => {
    const shapes: Array<'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon'> = ['circle', 'square', 'star', 'heart', 'diamond', 'hexagon'];
    for (const shape of shapes) {
      cleanup();
      const { container } = render(<StampGrid {...baseProps} stampShape={shape} />);
      expect(container.querySelector('svg')).toBeDefined();
    }
  });

  it('defaults stampsEarned to 0 when not provided', () => {
    render(<StampGrid {...baseProps} stampsEarned={undefined} />);
    const filledSlots = screen.getAllByTestId(/stamp-slot-/).filter((el) => el.getAttribute('data-filled') === 'true');
    expect(filledSlots.length).toBe(0);
  });
});
