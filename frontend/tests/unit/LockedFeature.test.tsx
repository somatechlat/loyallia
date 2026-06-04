/**
 * Unit tests for LockedFeature component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LockedFeature } from '@/components/shared/LockedFeature';

describe('LockedFeature', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders lock icon and blocked message', () => {
    render(<LockedFeature featureName="AI Design" requiredPlan="Pro" />);

    expect(screen.getByText('Función bloqueada')).toBeDefined();
    expect(screen.getByText(/AI Design no está disponible en tu plan actual./)).toBeDefined();
  });

  it('shows required plan', () => {
    render(<LockedFeature featureName="AI Design" requiredPlan="Professional" />);

    expect(screen.getByText(/Requiere plan:/)).toBeDefined();
    expect(screen.getByText('Professional')).toBeDefined();
  });

  it('shows upgrade button when onUpgrade provided', () => {
    let upgradeCalled = 0;
    const onUpgrade = () => { upgradeCalled++; };
    render(<LockedFeature featureName="AI Design" requiredPlan="Pro" onUpgrade={onUpgrade} />);

    const btn = screen.getByRole('button', { name: /mejorar plan/i });
    expect(btn).toBeDefined();

    fireEvent.click(btn);
    expect(upgradeCalled).toBe(1);
  });

  it('does not show upgrade button when onUpgrade omitted', () => {
    render(<LockedFeature featureName="AI Design" requiredPlan="Pro" />);

    expect(screen.queryByRole('button', { name: /mejorar plan/i })).toBeNull();
  });
});
