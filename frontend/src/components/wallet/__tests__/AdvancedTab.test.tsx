/**
 * Unit tests for AdvancedTab component (SRS-003 Section 8.6).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AdvancedTab } from '@/components/wallet/studio/AdvancedTab';
import type { AppleSpecificConfig, GoogleSpecificConfig } from '@/components/wallet/types/unified-state';

function createMockAppleConfig(overrides: Partial<AppleSpecificConfig> = {}): AppleSpecificConfig {
  return {
    passStyle: 'generic',
    description: 'Pase de fidelidad',
    organizationName: 'Loyallia',
    appLaunchURL: '',
    nfc: { enabled: false, requiresAuthentication: false },
    locations: [],
    beacons: [],
    suppressStripShine: true,
    sharingProhibited: false,
    voided: false,
    ...overrides,
  };
}

function createMockGoogleConfig(overrides: Partial<GoogleSpecificConfig> = {}): GoogleSpecificConfig {
  return {
    passType: 'LoyaltyClass',
    programName: 'Loyallia Rewards',
    hexBackgroundColor: '#1A1A1A',
    reviewStatus: 'UNDER_REVIEW',
    allowMultipleUsers: 'ONE_USER_ALL_DEVICES',
    messages: [],
    notifyPreference: true,
    ...overrides,
  };
}

describe('AdvancedTab', () => {
  const baseProps = {
    appleConfig: createMockAppleConfig(),
    googleConfig: createMockGoogleConfig(),
    onUpdateAppleConfig: vi.fn(),
    onUpdateGoogleConfig: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Apple Wallet and Google Wallet sections', () => {
    render(<AdvancedTab {...baseProps} />);
    expect(screen.getByText('APPLE WALLET')).toBeDefined();
    expect(screen.getByText('GOOGLE WALLET')).toBeDefined();
  });

  it('renders Exclusivo badges on both sections', () => {
    render(<AdvancedTab {...baseProps} />);
    const badges = screen.getAllByText('Exclusivo');
    expect(badges.length).toBe(2);
  });

  it('description input updates Apple config', () => {
    render(<AdvancedTab {...baseProps} />);
    const input = screen.getByPlaceholderText(/Descripción del pase/i);
    fireEvent.change(input, { target: { value: 'Nueva descripción' } });
    expect(baseProps.onUpdateAppleConfig).toHaveBeenCalledWith({ description: 'Nueva descripción' });
  });

  it('toggles sharing prohibited checkbox', () => {
    render(<AdvancedTab {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /Prohibir compartir/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateAppleConfig).toHaveBeenCalledWith({ sharingProhibited: true });
  });

  it('toggles suppress strip shine checkbox', () => {
    render(<AdvancedTab {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /Suprimir brillo strip/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateAppleConfig).toHaveBeenCalledWith({ suppressStripShine: false });
  });

  it('adds a location when clicking add location button', () => {
    render(<AdvancedTab {...baseProps} />);
    const addBtn = screen.getByRole('button', { name: /Ubicación/i });
    fireEvent.click(addBtn);
    expect(baseProps.onUpdateAppleConfig).toHaveBeenCalledOnce();
    const callArg = baseProps.onUpdateAppleConfig.mock.calls[0]![0] as { locations: unknown[] };
    expect(callArg.locations).toHaveLength(1);
  });

  it('adds a beacon when clicking add beacon button', () => {
    render(<AdvancedTab {...baseProps} />);
    const addBtn = screen.getByRole('button', { name: /Beacon/i });
    fireEvent.click(addBtn);
    expect(baseProps.onUpdateAppleConfig).toHaveBeenCalledOnce();
    const callArg = baseProps.onUpdateAppleConfig.mock.calls[0]![0] as { beacons: unknown[] };
    expect(callArg.beacons).toHaveLength(1);
  });

  it('updates app launch URL for Apple', () => {
    render(<AdvancedTab {...baseProps} />);
    // Apple appLaunchURL input has placeholder "https://..."
    // Google homepageUri input has placeholder "https://play.google.com/..."
    const inputs = screen.getAllByPlaceholderText(/https:\/\//i);
    const appleInput = inputs[0]!;
    fireEvent.change(appleInput, { target: { value: 'https://myapp.com/launch' } });
    expect(baseProps.onUpdateAppleConfig).toHaveBeenCalledWith({ appLaunchURL: 'https://myapp.com/launch' });
  });

  it('toggles Smart Tap / NFC for Google', () => {
    render(<AdvancedTab {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /Smart Tap \/ NFC/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateGoogleConfig).toHaveBeenCalledWith({ smartTapRedemptionValue: '' });
  });

  it('shows Smart Tap value input when enabled', () => {
    render(
      <AdvancedTab
        {...baseProps}
        googleConfig={createMockGoogleConfig({ smartTapRedemptionValue: '' })}
      />
    );
    expect(screen.getByPlaceholderText(/Valor Smart Tap/i)).toBeDefined();
  });

  it('updates Google Play app link', () => {
    render(<AdvancedTab {...baseProps} />);
    const input = screen.getByPlaceholderText(/play.google.com/i);
    fireEvent.change(input, { target: { value: 'https://play.google.com/store/apps/test' } });
    expect(baseProps.onUpdateGoogleConfig).toHaveBeenCalledWith({
      homepageUri: 'https://play.google.com/store/apps/test',
    });
  });

  it('renders grouping ID input', () => {
    render(<AdvancedTab {...baseProps} />);
    expect(screen.getByText('ID de grupo')).toBeDefined();
    expect(screen.getByPlaceholderText(/loyalty_group_001/i)).toBeDefined();
  });

  it('updates grouping ID', () => {
    render(<AdvancedTab {...baseProps} />);
    const input = screen.getByPlaceholderText(/loyalty_group_001/i);
    fireEvent.change(input, { target: { value: 'group_123' } });
    expect(baseProps.onUpdateGoogleConfig).toHaveBeenCalledWith({ groupingId: 'group_123' });
  });

  it('renders divider lines in both sections', () => {
    render(<AdvancedTab {...baseProps} />);
    expect(screen.getByText('📍 Ubicaciones y Beacons')).toBeDefined();
    expect(screen.getByText('Enlace a app')).toBeDefined();
    expect(screen.getByText('ID de grupo')).toBeDefined();
  });
});
