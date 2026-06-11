/**
 * Unit tests for AIChatModal component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AIChatModal } from '@/components/wallet/studio/AIChatModal';

// Mock the useAI hook to avoid real API calls
vi.mock('@/hooks/useAI', () => ({
  useAI: vi.fn(() => ({
    isLoading: false,
    error: null,
    quota: { used: 0, limit: 10 },
    generateTemplate: vi.fn().mockResolvedValue([
      {
        id: 'var-1',
        name: 'Café Cálido',
        description: 'Diseño cálido',
        confidence: 9.1,
        design: {
          colors: { background: '#6B4226', foreground: '#FFFFFF', label: '#F5DEB3', accent: '#D2691E' },
        },
      },
      {
        id: 'var-2',
        name: 'Industrial Oscuro',
        description: 'Estilo industrial',
        confidence: 8.9,
        design: {
          colors: { background: '#1A1A1A', foreground: '#FFFFFF', label: '#CCCCCC', accent: '#C0A062' },
        },
      },
      {
        id: 'var-3',
        name: 'Minimal',
        description: 'Diseño minimalista',
        confidence: 8.7,
        design: {
          colors: { background: '#0D1117', foreground: '#C9D1D9', label: '#8B949E', accent: '#58A6FF' },
        },
      },
    ]),
    reset: vi.fn(),
  })),
}));

vi.mock('@/hooks/usePlanFeatures', () => ({
  usePlanFeatures: vi.fn(() => ({
    hasAIAssistant: true,
    hasAdvancedFields: true,
    hasCustomBranding: true,
  })),
}));

describe('AIChatModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onApplyTemplate: vi.fn(),
    initialCardType: 'stamp' as const,
    initialIndustry: 'food' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<AIChatModal {...baseProps} />);
    expect(screen.getByText('Diseña tu tarjeta con inteligencia artificial')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(<AIChatModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText('Diseña tu tarjeta con inteligencia artificial')).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    render(<AIChatModal {...baseProps} />);
    const closeBtn = screen.getByLabelText('Cerrar');
    fireEvent.click(closeBtn);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<AIChatModal {...baseProps} />);
    const backdropDiv = document.querySelector('.absolute.inset-0');
    if (backdropDiv) {
      fireEvent.click(backdropDiv);
    }
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders description textarea', () => {
    render(<AIChatModal {...baseProps} />);
    expect(screen.getByLabelText(/describe tu negocio/i)).toBeDefined();
  });

  it('renders quick suggestion chips', () => {
    render(<AIChatModal {...baseProps} />);
    expect(screen.getByText(/Café acogedor con tonos tierra/i)).toBeDefined();
    expect(screen.getByText(/Salón elegante, dorado y blanco/i)).toBeDefined();
    expect(screen.getByText(/Tienda tech moderna/i)).toBeDefined();
  });

  it('clicking suggestion fills textarea', () => {
    render(<AIChatModal {...baseProps} />);
    const chip = screen.getByText(/Café acogedor con tonos tierra/i);
    fireEvent.click(chip);
    const textarea = screen.getByLabelText(/describe tu negocio/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Café acogedor con tonos tierra');
  });

  it('renders card type and industry dropdowns', () => {
    render(<AIChatModal {...baseProps} />);
    expect(screen.getByLabelText(/tipo de tarjeta/i)).toBeDefined();
    expect(screen.getByLabelText(/industria/i)).toBeDefined();
  });

  it('generate button is disabled when textarea is empty', () => {
    render(<AIChatModal {...baseProps} />);
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    expect(generateBtn).toBeDisabled();
  });

  it('generate button is enabled after typing description', () => {
    render(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: 'Café acogedor' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    expect(generateBtn).not.toBeDisabled();
  });

  it('displays results after generation and allows selection', async () => {
    render(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: 'Café acogedor' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Café Cálido')).toBeDefined();
      expect(screen.getByText('Industrial Oscuro')).toBeDefined();
      expect(screen.getByText('Minimal')).toBeDefined();
    });

    const selectButtons = screen.getAllByRole('button', { name: /seleccionar/i });
    expect(selectButtons.length).toBe(3);

    fireEvent.click(selectButtons[0]!);
    expect(baseProps.onApplyTemplate).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders quota indicator', () => {
    render(<AIChatModal {...baseProps} />);
    expect(screen.getByText(/Usos:/i)).toBeDefined();
  });

  it('shows error when generating without description', async () => {
    render(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    expect(generateBtn).toBeDisabled();
  });

  it('dropdowns have correct initial values', () => {
    render(<AIChatModal {...baseProps} initialCardType="coupon" initialIndustry="retail" />);
    const cardTypeSelect = screen.getByLabelText(/tipo de tarjeta/i) as HTMLSelectElement;
    const industrySelect = screen.getByLabelText(/industria/i) as HTMLSelectElement;
    expect(cardTypeSelect.value).toBe('coupon');
    expect(industrySelect.value).toBe('retail');
  });
});
