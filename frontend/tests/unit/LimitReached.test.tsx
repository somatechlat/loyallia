/**
 * Unit tests for LimitReached component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LimitReached } from '@/components/shared/LimitReached';

describe('LimitReached', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders warning and usage bar', () => {
    render(<LimitReached limitName="templates" current={5} limit={5} />);

    expect(screen.getByText('Límite alcanzado')).toBeDefined();
    expect(screen.getByText(/Has usado todo tu cupo de templates./)).toBeDefined();
  });

  it('shows current and limit counts', () => {
    render(<LimitReached limitName="templates" current={3} limit={5} />);

    expect(screen.getByText(/3 \/ 5/)).toBeDefined();
  });

  it('shows upgrade button when onUpgrade provided', () => {
    let upgradeCalled = 0;
    const onUpgrade = () => { upgradeCalled++; };
    render(<LimitReached limitName="templates" current={5} limit={5} onUpgrade={onUpgrade} />);

    const btn = screen.getByRole('button', { name: /mejorar plan/i });
    expect(btn).toBeDefined();

    fireEvent.click(btn);
    expect(upgradeCalled).toBe(1);
  });

  it('does not show upgrade button when onUpgrade omitted', () => {
    render(<LimitReached limitName="templates" current={5} limit={5} />);

    expect(screen.queryByRole('button', { name: /mejorar plan/i })).toBeNull();
  });

  it('uses red styling when at limit', () => {
    render(<LimitReached limitName="templates" current={5} limit={5} />);

    expect(screen.getByText('Límite alcanzado')).toBeDefined();
  });
});
