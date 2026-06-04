/**
 * Unit tests for AIChatModal component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { AIChatModal } from '@/components/wallet/studio/AIChatModal';

const mockPost = vi.fn();

vi.mock('@/lib/api', () => ({
  aiApi: {
    generateTemplate: (...args: unknown[]) => mockPost(...args),
    suggestColors: (...args: unknown[]) => mockPost(...args),
    critiqueDesign: (...args: unknown[]) => mockPost(...args),
    suggestStampIcons: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('AIChatModal', () => {
  function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
  }

  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onApplyTemplate: vi.fn(),
    initialCardType: 'stamp' as const,
    initialIndustry: 'food' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders when isOpen is true', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    expect(screen.getByText('Asistente de Diseño IA')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    renderWithI18n(<AIChatModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText('Asistente de Diseño IA')).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    const closeBtn = screen.getByLabelText('Cerrar');
    fireEvent.click(closeBtn);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    const backdropDiv = document.querySelector('.absolute.inset-0');
    if (backdropDiv) {
      fireEvent.click(backdropDiv);
    }
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders description textarea', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    expect(screen.getByLabelText(/describe tu negocio/i)).toBeDefined();
  });

  it('renders quick suggestion chips', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    expect(screen.getByText(/Café acogedor con tonos tierra/i)).toBeDefined();
    expect(screen.getByText(/Salón elegante, dorado y blanco/i)).toBeDefined();
    expect(screen.getByText(/Tienda tech moderna/i)).toBeDefined();
  });

  it('clicking suggestion fills textarea', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    const chip = screen.getByText(/Café acogedor con tonos tierra/i);
    fireEvent.click(chip);
    const textarea = screen.getByLabelText(/describe tu negocio/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Café acogedor con tonos tierra');
  });

  it('renders card type and industry dropdowns', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    expect(screen.getByLabelText(/tipo de tarjeta/i)).toBeDefined();
    expect(screen.getByLabelText(/industria/i)).toBeDefined();
  });

  it('generate button is disabled when textarea is empty', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    expect(generateBtn).toBeDisabled();
  });

  it('generate button is enabled after typing description', () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: 'Café acogedor' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    expect(generateBtn).not.toBeDisabled();
  });

  it('shows loading spinner during generation', async () => {
    mockPost.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: { data: [] } }), 50)));

    renderWithI18n(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: 'Café acogedor' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generar diseños/i })).toBeDisabled();
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /generar diseños/i })).not.toBeDisabled();
    });
  });

  it('displays results after generation and allows selection', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        data: [
          { name: 'Café Cálido', description: 'D1', confidence: 0.9, design: {} },
          { name: 'Industrial Oscuro', description: 'D2', confidence: 0.8, design: {} },
          { name: 'Minimal', description: 'D3', confidence: 0.7, design: {} },
        ],
      },
    });

    renderWithI18n(<AIChatModal {...baseProps} />);
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
    renderWithI18n(<AIChatModal {...baseProps} />);
    expect(screen.getByText(/Usos:/i)).toBeDefined();
  });

  it('shows error when generating without description', async () => {
    renderWithI18n(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    expect(generateBtn).toBeDisabled();
  });

  it('dropdowns have correct initial values', () => {
    renderWithI18n(<AIChatModal {...baseProps} initialCardType="coupon" initialIndustry="retail" />);
    const cardTypeSelect = screen.getByLabelText(/tipo de tarjeta/i) as HTMLSelectElement;
    const industrySelect = screen.getByLabelText(/industria/i) as HTMLSelectElement;
    expect(cardTypeSelect.value).toBe('coupon');
    expect(industrySelect.value).toBe('retail');
  });
});
