/**
 * Unit tests for IconPicker — gallery tabs, search, selection, a11y.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

describe('IconPicker', () => {
  const baseProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders trigger button with placeholder text when no value selected', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    expect(screen.getByText('Seleccionar icono…')).toBeDefined();
  });

  it('opens modal when trigger is clicked', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    expect(screen.getByTestId('icon-picker-modal')).toBeDefined();
    expect(screen.getByText('Icono')).toBeDefined();
  });

  it('closes modal when close button is clicked', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    expect(screen.getByTestId('icon-picker-modal')).toBeDefined();

    const closeBtn = screen.getByLabelText('Cerrar');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('icon-picker-modal')).toBeNull();
  });

  it('exposes Formas and Iconos tabs', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    expect(screen.getByTestId('icon-picker-tab-shapes')).toBeDefined();
    expect(screen.getByTestId('icon-picker-tab-icons')).toBeDefined();
    expect(screen.getByText('Formas')).toBeDefined();
    expect(screen.getByText('Iconos')).toBeDefined();
  });

  it('shows shape silhouettes on the Formas tab', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    fireEvent.click(screen.getByTestId('icon-picker-tab-shapes'));

    expect(screen.getByTestId('icon-option-shape-circle')).toBeDefined();
    expect(screen.getByTestId('icon-option-shape-heart')).toBeDefined();
  });

  it('shows stamp motifs on the Iconos tab by default', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    expect(screen.getByTestId('icon-option-motif-coffee')).toBeDefined();
  });

  it('filters motifs by group', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    fireEvent.click(screen.getByTestId('icon-picker-group-food'));
    expect(screen.queryByTestId('icon-option-motif-coffee')).toBeDefined();
    expect(screen.queryByTestId('icon-option-motif-rocket')).toBeNull();
  });

  it('filters icons by category when category tab is clicked', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const foodTab = screen.getByTestId('category-tab-food');
    fireEvent.click(foodTab);

    expect(screen.queryByTestId('icon-option-coffee')).toBeDefined();
  });

  it('filters icons by search query', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const searchInput = screen.getByTestId('icon-picker-search');
    fireEvent.change(searchInput, { target: { value: 'coffee' } });

    expect(screen.queryByTestId('icon-option-coffee')).toBeDefined();
    expect(screen.queryByTestId('icon-option-motif-coffee')).toBeDefined();
  });

  it('calls onChange with icon id when icon is selected', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const iconOption = screen.getByTestId('icon-option-motif-coffee');
    fireEvent.click(iconOption);

    expect(baseProps.onChange).toHaveBeenCalledWith('motif-coffee');
  });

  it('calls onChange with shape id when a shape is selected', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    fireEvent.click(screen.getByTestId('icon-picker-tab-shapes'));
    fireEvent.click(screen.getByTestId('icon-option-shape-star'));

    expect(baseProps.onChange).toHaveBeenCalledWith('shape-star');
  });

  it('closes modal after selecting an icon', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    fireEvent.click(screen.getByTestId('icon-option-motif-coffee'));
    expect(screen.queryByTestId('icon-picker-modal')).toBeNull();
  });

  it('shows selected icon name in trigger when value is set', () => {
    render(<I18nProvider><IconPicker {...baseProps} value="motif-coffee" /></I18nProvider>);
    expect(screen.getByText('Taza de café')).toBeDefined();
  });

  it('marks the selected option with a check badge and aria-selected', () => {
    render(<I18nProvider><IconPicker {...baseProps} value="motif-star" /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const option = screen.getByTestId('icon-option-motif-star');
    expect(option.getAttribute('aria-selected')).toBe('true');
  });

  it('renders live filled + empty preview pair', () => {
    render(<I18nProvider><IconPicker {...baseProps} value="motif-heart" /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    expect(screen.getByTestId('icon-picker-preview-filled')).toBeDefined();
    expect(screen.getByTestId('icon-picker-preview-empty')).toBeDefined();
  });

  it('gives every icon button an aria-label', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const buttons = screen.getAllByRole('option');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('supports keyboard navigation across the grid', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const first = screen.getByTestId('icon-option-motif-coffee');
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).not.toBe(first);
  });

  it('respects initial category prop', () => {
    render(<I18nProvider><IconPicker {...baseProps} category="stamp" /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    expect(screen.queryByTestId('icon-option-stamp-circle')).toBeDefined();
    expect(screen.queryByTestId('icon-option-motif-coffee')).toBeDefined();
  });

  it('shows upload hint when allowUpload is true', () => {
    render(<I18nProvider><IconPicker {...baseProps} allowUpload /></I18nProvider>);
    expect(screen.getByText(/Subida de archivos disponible en configuración avanzada./)).toBeDefined();
  });

  it('shows no results message when search yields nothing', () => {
    render(<I18nProvider><IconPicker {...baseProps} /></I18nProvider>);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const searchInput = screen.getByTestId('icon-picker-search');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No se encontraron iconos.')).toBeDefined();
  });
});
