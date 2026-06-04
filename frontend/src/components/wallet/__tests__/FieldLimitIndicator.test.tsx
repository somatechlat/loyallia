/**
 * Unit tests for FieldLimitIndicator component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FieldLimitIndicator } from '@/components/wallet/studio/FieldLimitIndicator';

describe('FieldLimitIndicator', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders label and count text', () => {
    render(<FieldLimitIndicator group="header" current={2} max={4} />);
    expect(screen.getByText('Encabezado')).toBeDefined();
    expect(screen.getByText('2 / 4')).toBeDefined();
  });

  it('shows green color when under 50%', () => {
    render(<FieldLimitIndicator group="primary" current={0} max={1} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-emerald-500');
  });

  it('shows yellow color between 50% and 80%', () => {
    render(<FieldLimitIndicator group="secondary" current={2} max={4} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-amber-500');
  });

  it('shows red color when over 80%', () => {
    render(<FieldLimitIndicator group="auxiliary" current={4} max={4} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-red-500');
  });

  it('shows warning icon and red background when over limit', () => {
    render(<FieldLimitIndicator group="back" current={9} max={8} />);
    expect(screen.getByLabelText('Over limit warning')).toBeDefined();
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-red-500');
  });

  it('has correct aria attributes', () => {
    render(<FieldLimitIndicator group="header" current={1} max={3} />);
    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toBe('Encabezado field usage: 1 of 3');
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('1');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('3');
  });
});
