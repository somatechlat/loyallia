/**
 * Unit tests for FieldCard component.
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
    onClick: vi.fn(),
    onToggleApple: vi.fn(),
    onToggleGoogle: vi.fn(),
    onDelete: vi.fn(),
    hasNotification: false,
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders label and value', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    expect(screen.getByText('Test Label')).toBeDefined();
    expect(screen.getByText('Test Value')).toBeDefined();
  });

  it('truncates long values', () => {
    const longValue = 'a'.repeat(50);
    render(<FieldCard field={createMockField({ value: longValue })} {...baseProps} />);
    expect(screen.getByText(longValue.slice(0, 40) + '…')).toBeDefined();
  });

  it('shows dynamic badge when field is dynamic', () => {
    render(<FieldCard field={createMockField({ isDynamic: true })} {...baseProps} />);
    expect(screen.getByText('dynamic')).toBeDefined();
  });

  it('calls onClick when card is clicked', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const card = screen.getByRole('button', { name: /Field Test Label/ });
    fireEvent.click(card);
    expect(baseProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter is pressed', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const card = screen.getByRole('button', { name: /Field Test Label/ });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(baseProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('toggles Apple visibility when apple button clicked', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const appleBtn = screen.getByLabelText('Visible on Apple Wallet');
    fireEvent.click(appleBtn);
    expect(baseProps.onToggleApple).toHaveBeenCalledTimes(1);
  });

  it('toggles Google visibility when google button clicked', () => {
    render(<FieldCard field={createMockField({ showOnGoogle: true })} {...baseProps} />);
    const googleBtn = screen.getByLabelText('Visible on Google Wallet');
    fireEvent.click(googleBtn);
    expect(baseProps.onToggleGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows notification bell when hasNotification is true', () => {
    render(<FieldCard field={createMockField()} {...baseProps} hasNotification={true} />);
    expect(screen.getByLabelText('Notifications configured')).toBeDefined();
  });

  it('calls onDelete when delete button clicked', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const deleteBtn = screen.getByLabelText('Delete field');
    fireEvent.click(deleteBtn);
    expect(baseProps.onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows "No value" placeholder when value is empty', () => {
    render(<FieldCard field={createMockField({ value: '' })} {...baseProps} />);
    expect(screen.getByText('No value')).toBeDefined();
  });

  it('has draggable attribute', () => {
    render(<FieldCard field={createMockField()} {...baseProps} />);
    const card = screen.getByRole('button', { name: /Field Test Label/ });
    expect(card.getAttribute('draggable')).toBe('true');
  });
});
