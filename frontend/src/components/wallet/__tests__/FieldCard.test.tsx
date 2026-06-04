/**
 * Unit tests for FieldCard component — inline editing.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    isCompact: false,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders label input and value input when expanded', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    expect(screen.getByText('Etiqueta:')).toBeDefined();
    expect(screen.getByText('Valor:')).toBeDefined();
    expect(screen.getByDisplayValue('Test Label')).toBeDefined();
    expect(screen.getByDisplayValue('Test Value')).toBeDefined();
  });

  it('shows template picker button', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    expect(screen.getByLabelText('Insert dynamic template')).toBeDefined();
  });

  it('shows dinámico checkbox', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    expect(screen.getByLabelText('Dinámico')).toBeDefined();
  });

  it('shows apple toggle', () => {
    render(<FieldCard field={createMockField({ showOnApple: true })} {...baseProps} />);
    expect(screen.getByLabelText('Visible on Apple Wallet')).toBeDefined();
  });

  it('shows google toggle', () => {
    render(<FieldCard field={createMockField({ showOnGoogle: true })} {...baseProps} />);
    expect(screen.getByLabelText('Visible on Google Wallet')).toBeDefined();
  });

  it('shows delete button', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    expect(screen.getByLabelText('Delete field')).toBeDefined();
  });

  it('calls onUpdate when label changes', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const labelInput = screen.getByDisplayValue('Test Label');
    fireEvent.change(labelInput, { target: { value: 'New Label' } });
    expect(baseProps.onUpdate).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ label: 'New Label' }));
  });

  it('calls onDelete when delete clicked', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const deleteBtn = screen.getByLabelText('Delete field');
    fireEvent.click(deleteBtn);
    expect(baseProps.onDelete).toHaveBeenCalledTimes(1);
  });

  it('can toggle between compact and expanded', () => {
    render(<FieldCard field={createMockField()} {...baseProps} isCompact={true} />);
    // Compact mode
    expect(screen.queryByText('Etiqueta:')).toBeNull();
    expect(screen.getByText('Test Label')).toBeDefined();
    // Click to expand
    const row = screen.getByRole('button', { name: /Field Test Label: Test Value/ });
    fireEvent.click(row);
    expect(screen.getByText('Etiqueta:')).toBeDefined();
    // Click collapse
    const collapseBtn = screen.getByLabelText('Collapse field');
    fireEvent.click(collapseBtn);
    expect(screen.queryByText('Etiqueta:')).toBeNull();
  });

  it('calls onUpdate when value changes', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const valueInput = screen.getByDisplayValue('Test Value');
    fireEvent.change(valueInput, { target: { value: 'New Value' } });
    expect(baseProps.onUpdate).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 'New Value' }));
  });

  it('calls onUpdate when apple toggle clicked', () => {
    render(<FieldCard field={createMockField({ showOnApple: true })} {...baseProps} />);
    const appleBtn = screen.getByLabelText('Visible on Apple Wallet');
    fireEvent.click(appleBtn);
    expect(baseProps.onUpdate).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ showOnApple: false }));
  });

  it('calls onUpdate when google toggle clicked', () => {
    render(<FieldCard field={createMockField({ showOnGoogle: true })} {...baseProps} />);
    const googleBtn = screen.getByLabelText('Visible on Google Wallet');
    fireEvent.click(googleBtn);
    expect(baseProps.onUpdate).toHaveBeenCalledTimes(1);
    expect(baseProps.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ showOnGoogle: false }));
  });

  it('renders dynamic template picker when isDynamic is true', () => {
    render(<FieldCard field={createMockField({ isDynamic: true })} {...baseProps} />);
    // DynamicTemplatePicker renders an input with aria-label "Field value"
    expect(screen.getByLabelText('Field value')).toBeDefined();
  });

  it('has draggable attribute when expanded', () => {
    const { container } = render(<FieldCard field={createMockField()} {...baseProps} />);
    const draggable = container.querySelector('[draggable="true"]');
    expect(draggable).not.toBeNull();
  });
});
