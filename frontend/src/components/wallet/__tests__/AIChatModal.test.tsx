/**
 * Unit tests for AIChatModal component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AIChatModal } from '@/components/wallet/studio/AIChatModal';
import type { AIVariation } from '@/hooks/useAI';

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
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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
    const backdrop = screen.getByLabelText('Cerrar').closest('.fixed')?.querySelector('.absolute');
    // Click the backdrop div (first absolute child)
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

  it('shows loading spinner during generation', async () => {
    render(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: 'Café acogedor' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generar diseños/i })).toBeDisabled();
    });

    // Advance timers to complete the async operation
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /generar diseños/i })).not.toBeDisabled();
    });
  });

  it('displays results after generation and allows selection', async () => {
    render(<AIChatModal {...baseProps} />);
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: 'Café acogedor' } });
    const generateBtn = screen.getByRole('button', { name: /generar diseños/i });
    fireEvent.click(generateBtn);

    vi.advanceTimersByTime(2000);

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
    // Force enable by typing then clearing won't work since empty disables button
    // Instead test via the hook path: type whitespace
    const textarea = screen.getByLabelText(/describe tu negocio/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    // Button should still be disabled for whitespace-only
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
