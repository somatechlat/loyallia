/**
 * Unit tests for FieldCard component — inline editing.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { FieldCard } from '@/components/wallet/studio/FieldCard';
import type { UnifiedField } from '@/components/wallet/types/unified-state';

function createMockField(overrides: Partial<UnifiedField> = {}): UnifiedField {
  return {
    id: 'field-1',
    label: 'Test Label',
    value: 'Test Value',
    fieldGroup: 'header',
    order: 0,
    showOnApple: true,
    showOnGoogle: false,
    isDynamic: false,
    dataType: 'text',
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

describe('FieldCard', () => {
  const baseProps = {
    cardType: 'stamp' as const,
    onUpdateField: vi.fn(),
    onDeleteField: vi.fn(),
    onToggleVisibility: vi.fn(),
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders label input and value input', () => {
    render(<I18nProvider><FieldCard field={createMockField()} {...baseProps} /></I18nProvider>);
    expect(screen.getByDisplayValue('Test Label')).toBeDefined();
    expect(screen.getByDisplayValue('Test Value')).toBeDefined();
  });

  it('calls onUpdateField when label changes', () => {
    render(<I18nProvider><FieldCard field={createMockField()} {...baseProps} /></I18nProvider>);
    const labelInput = screen.getByDisplayValue('Test Label');
    fireEvent.change(labelInput, { target: { value: 'New Label' } });
    expect(baseProps.onUpdateField).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdateField).toHaveBeenCalledWith('field-1', expect.objectContaining({ label: 'New Label' }));
  });

  it('calls onDeleteField when delete clicked', () => {
    render(<I18nProvider><FieldCard field={createMockField()} {...baseProps} /></I18nProvider>);
    const deleteBtn = screen.getByTestId('field-delete-btn');
    fireEvent.click(deleteBtn);
    expect(baseProps.onDeleteField).toHaveBeenCalledTimes(1);
    expect(baseProps.onDeleteField).toHaveBeenCalledWith('field-1');
  });

  it('calls onUpdateField when value changes', () => {
    render(<I18nProvider><FieldCard field={createMockField()} {...baseProps} /></I18nProvider>);
    const valueInput = screen.getByDisplayValue('Test Value');
    fireEvent.change(valueInput, { target: { value: 'New Value' } });
    expect(baseProps.onUpdateField).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdateField).toHaveBeenCalledWith('field-1', expect.objectContaining({ value: 'New Value' }));
  });

  it('calls onUpdateField when apple toggle clicked', () => {
    render(<I18nProvider><FieldCard field={createMockField({ showOnApple: true })} {...baseProps} /></I18nProvider>);
    // Checkboxes order: visibility, dynamic, apple, google
    const checkboxes = screen.getAllByRole('checkbox');
    const appleCheckbox = checkboxes[2]!;
    fireEvent.click(appleCheckbox);
    expect(baseProps.onUpdateField).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdateField).toHaveBeenCalledWith('field-1', expect.objectContaining({ showOnApple: false }));
  });

  it('calls onUpdateField when google toggle clicked', () => {
    render(<I18nProvider><FieldCard field={createMockField({ showOnGoogle: true })} {...baseProps} /></I18nProvider>);
    const checkboxes = screen.getAllByRole('checkbox');
    const googleCheckbox = checkboxes[3]!;
    fireEvent.click(googleCheckbox);
    expect(baseProps.onUpdateField).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdateField).toHaveBeenCalledWith('field-1', expect.objectContaining({ showOnGoogle: false }));
  });
});
