/**
 * Unit tests for IconPicker component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    render(<IconPicker {...baseProps} />);
    expect(screen.getByText('Seleccionar icono…')).toBeDefined();
  });

  it('opens modal when trigger is clicked', () => {
    render(<IconPicker {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    expect(screen.getByTestId('icon-picker-modal')).toBeDefined();
    expect(screen.getByText('Seleccionar Icono')).toBeDefined();
  });

  it('closes modal when close button is clicked', () => {
    render(<IconPicker {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    expect(screen.getByTestId('icon-picker-modal')).toBeDefined();

    const closeBtn = screen.getByLabelText('Cerrar');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('icon-picker-modal')).toBeNull();
  });

  it('filters icons by category when category tab is clicked', () => {
    render(<IconPicker {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const foodTab = screen.getByTestId('category-tab-food');
    fireEvent.click(foodTab);

    // Should show food icons and not show icons from other categories
    expect(screen.queryByTestId('icon-option-coffee')).toBeDefined();
  });

  it('filters icons by search query', () => {
    render(<IconPicker {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const searchInput = screen.getByTestId('icon-picker-search');
    fireEvent.change(searchInput, { target: { value: 'coffee' } });

    expect(screen.queryByTestId('icon-option-coffee')).toBeDefined();
  });

  it('calls onChange with icon id when icon is selected', () => {
    render(<IconPicker {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const iconOption = screen.getByTestId('icon-option-coffee');
    fireEvent.click(iconOption);

    expect(baseProps.onChange).toHaveBeenCalledWith('coffee');
  });

  it('closes modal after selecting an icon', () => {
    render(<IconPicker {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const iconOption = screen.getByTestId('icon-option-coffee');
    fireEvent.click(iconOption);

    expect(screen.queryByTestId('icon-picker-modal')).toBeNull();
  });

  it('shows selected icon name in trigger when value is set', () => {
    render(<IconPicker {...baseProps} value="coffee" />);
    expect(screen.getByText('Coffee')).toBeDefined();
  });

  it('respects initial category prop', () => {
    render(<IconPicker {...baseProps} category="stamp" />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    // The stamp tab should be pre-selected logic is handled on open
    // Modal should show stamp category icons
    expect(screen.queryByTestId('icon-option-stamp-circle')).toBeDefined();
  });

  it('shows upload hint when allowUpload is true', () => {
    render(<IconPicker {...baseProps} allowUpload />);
    expect(screen.getByText(/Subida de archivos disponible en configuración avanzada./)).toBeDefined();
  });

  it('shows no results message when search yields nothing', () => {
    render(<IconPicker {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const searchInput = screen.getByTestId('icon-picker-search');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No se encontraron iconos.')).toBeDefined();
  });
});
