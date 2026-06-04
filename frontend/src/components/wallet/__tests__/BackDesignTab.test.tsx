/**
 * Unit tests for BackDesignTab component (SRS-003 Section 8.7).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BackDesignTab } from '@/components/wallet/studio/BackDesignTab';
import type { BackContent, AppleSpecificConfig, GoogleSpecificConfig } from '@/components/wallet/types/unified-state';

function createMockBackContent(overrides: Partial<BackContent> = {}): BackContent {
  return {
    fields: [],
    links: [],
    detailImages: [],
    ...overrides,
  };
}

function createMockAppleConfig(overrides: Partial<AppleSpecificConfig> = {}): AppleSpecificConfig {
  return {
    passStyle: 'generic',
    description: '',
    organizationName: 'Loyallia',
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

describe('BackDesignTab', () => {
  const baseProps = {
    backContent: createMockBackContent(),
    onUpdateBackContent: vi.fn(),
    appleConfig: createMockAppleConfig(),
    googleConfig: createMockGoogleConfig(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 4 sections', () => {
    render(<BackDesignTab {...baseProps} />);
    expect(screen.getByText('CAMPOS DEL REVERSO — Sin límite')).toBeDefined();
    expect(screen.getByText('ENLACES RÁPIDOS')).toBeDefined();
    expect(screen.getByText('ENLACE A LA APP')).toBeDefined();
    expect(screen.getByText('IMÁGENES EN DETALLES')).toBeDefined();
  });

  it('renders empty state for back fields', () => {
    render(<BackDesignTab {...baseProps} />);
    expect(screen.getByText('No hay campos en el reverso')).toBeDefined();
  });

  it('adds a back field when clicking add button', () => {
    render(<BackDesignTab {...baseProps} />);
    const addBtn = screen.getByRole('button', { name: /Añadir campo del reverso/i });
    fireEvent.click(addBtn);
    expect(baseProps.onUpdateBackContent).toHaveBeenCalledOnce();
    const callArg = baseProps.onUpdateBackContent.mock.calls[0]![0] as { fields: unknown[] };
    expect(callArg.fields).toHaveLength(1);
    expect(callArg.fields[0]).toMatchObject({ label: '', value: '', isLink: false });
  });

  it('renders existing back fields with label and value inputs', () => {
    render(
      <BackDesignTab
        {...baseProps}
        backContent={createMockBackContent({
          fields: [
            { id: 'bf-1', label: 'Términos', value: 'Válido 30 días', isLink: false, order: 0 },
          ],
        })}
      />
    );
    const inputs = screen.getAllByDisplayValue(/Términos|Válido 30 días/);
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('deletes a back field', () => {
    render(
      <BackDesignTab
        {...baseProps}
        backContent={createMockBackContent({
          fields: [
            { id: 'bf-1', label: 'Términos', value: 'Válido', isLink: false, order: 0 },
          ],
        })}
      />
    );
    const deleteBtn = screen.getByRole('button', { name: /Delete field/i });
    fireEvent.click(deleteBtn);
    expect(baseProps.onUpdateBackContent).toHaveBeenCalledWith({ fields: [] });
  });

  it('shows link inputs when link toggle is enabled', () => {
    render(
      <BackDesignTab
        {...baseProps}
        backContent={createMockBackContent({
          fields: [
            { id: 'bf-1', label: 'Web', value: 'Visítanos', isLink: true, linkUrl: 'https://example.com', linkType: 'website', order: 0 },
          ],
        })}
      />
    );
    expect(screen.getByDisplayValue('https://example.com')).toBeDefined();
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('toggles quick links and adds them to state', () => {
    render(<BackDesignTab {...baseProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox in Quick Links is "Sitio Web"
    const sitioWebCheckbox = checkboxes[0]!;
    fireEvent.click(sitioWebCheckbox);
    expect(baseProps.onUpdateBackContent).toHaveBeenCalled();
    const callArg = baseProps.onUpdateBackContent.mock.calls[0]![0] as { links: unknown[] };
    expect(callArg.links).toHaveLength(1);
    expect(callArg.links[0]).toMatchObject({ label: 'Sitio Web', type: 'website' });
  });

  it('updates quick link URL when typed', () => {
    render(
      <BackDesignTab
        {...baseProps}
        backContent={createMockBackContent({
          links: [{ id: 'l1', type: 'website', url: 'https://old.com', label: 'Sitio Web' }],
        })}
      />
    );
    const urlInput = screen.getByDisplayValue('https://old.com');
    fireEvent.change(urlInput, { target: { value: 'https://new.com' } });
    expect(baseProps.onUpdateBackContent).toHaveBeenCalledWith({
      links: [{ id: 'l1', type: 'website', url: 'https://new.com', label: 'Sitio Web' }],
    });
  });

  it('adds custom link via "Añadir enlace" button', () => {
    render(<BackDesignTab {...baseProps} />);
    const addBtn = screen.getByRole('button', { name: /Añadir enlace/i });
    fireEvent.click(addBtn);
    expect(baseProps.onUpdateBackContent).toHaveBeenCalledOnce();
    const callArg = baseProps.onUpdateBackContent.mock.calls[0]![0] as { links: unknown[] };
    expect(callArg.links).toHaveLength(1);
  });

  it('toggles app link section and initializes appLink object', () => {
    render(<BackDesignTab {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /Añadir botón/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateBackContent).toHaveBeenCalledWith(
      expect.objectContaining({ appLink: expect.objectContaining({ iosAppLink: '' }) })
    );
  });

  it('shows Apple and Google app link inputs when enabled', () => {
    render(
      <BackDesignTab
        {...baseProps}
        backContent={createMockBackContent({
          appLink: { iosAppLink: '', androidAppPackage: '', androidAppLink: '' },
        })}
      />
    );
    expect(screen.getByText(/Apple \(appLaunchURL\)/i)).toBeDefined();
    expect(screen.getByText(/Google \(appLinkData\)/i)).toBeDefined();
  });

  it('shows Apple Wallet warning for detail images', () => {
    render(<BackDesignTab {...baseProps} />);
    expect(screen.getByText(/Apple Wallet no soporta imágenes en el reverso/i)).toBeDefined();
  });

  it('adds detail image when clicking add button', () => {
    render(<BackDesignTab {...baseProps} />);
    const addBtn = screen.getByRole('button', { name: /Añadir imagen a la vista de detalles/i });
    fireEvent.click(addBtn);
    expect(baseProps.onUpdateBackContent).toHaveBeenCalledOnce();
    const callArg = baseProps.onUpdateBackContent.mock.calls[0]![0] as { detailImages: unknown[] };
    expect(callArg.detailImages).toHaveLength(1);
  });

  it('renders Google Wallet exclusivo badge on detail images section', () => {
    render(<BackDesignTab {...baseProps} />);
    expect(screen.getByText('Google Wallet exclusivo')).toBeDefined();
  });
});
