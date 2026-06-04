/**
 * Unit tests for FieldCard component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
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
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

describe('FieldCard', () => {
  const calls = {
    onClick: 0,
    onToggleApple: 0,
    onToggleGoogle: 0,
    onDelete: 0,
  };

  const baseProps = {
    onClick: () => { calls.onClick++; },
    onToggleApple: () => { calls.onToggleApple++; },
    onToggleGoogle: () => { calls.onToggleGoogle++; },
    onDelete: () => { calls.onDelete++; },
    hasNotification: false,
  };

  afterEach(() => {
    cleanup();
    calls.onClick = 0;
    calls.onToggleApple = 0;
    calls.onToggleGoogle = 0;
    calls.onDelete = 0;
  });

  it('renders label and value', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField()} {...baseProps} />
      </I18nProvider>
    );
    expect(screen.getByText('Test Label')).toBeDefined();
    expect(screen.getByText('Test Value')).toBeDefined();
  });

  it('truncates long values', () => {
    const longValue = 'a'.repeat(50);
    render(
      <I18nProvider>
        <FieldCard field={createMockField({ value: longValue })} {...baseProps} />
      </I18nProvider>
    );
    expect(screen.getByText(longValue.slice(0, 40) + '…')).toBeDefined();
  });

  it('shows dynamic badge when field is dynamic', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField({ isDynamic: true })} {...baseProps} />
      </I18nProvider>
    );
    expect(screen.getByText('dynamic')).toBeDefined();
  });

  it('calls onClick when card is clicked', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField()} {...baseProps} />
      </I18nProvider>
    );
    const card = screen.getByRole('button', { name: /Label Test Label/ });
    fireEvent.click(card);
    expect(calls.onClick).toBe(1);
  });

  it('calls onClick when Enter is pressed', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField()} {...baseProps} />
      </I18nProvider>
    );
    const card = screen.getByRole('button', { name: /Label Test Label/ });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(calls.onClick).toBe(1);
  });

  it('toggles Apple visibility when apple button clicked', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField()} {...baseProps} />
      </I18nProvider>
    );
    const appleBtn = screen.getByLabelText('Visible on Apple Wallet');
    fireEvent.click(appleBtn);
    expect(calls.onToggleApple).toBe(1);
  });

  it('toggles Google visibility when google button clicked', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField({ showOnGoogle: true })} {...baseProps} />
      </I18nProvider>
    );
    const googleBtn = screen.getByLabelText('Visible on Google Wallet');
    fireEvent.click(googleBtn);
    expect(calls.onToggleGoogle).toBe(1);
  });

  it('shows notification bell when hasNotification is true', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField()} {...baseProps} hasNotification={true} />
      </I18nProvider>
    );
    expect(screen.getByLabelText('Notifications configured')).toBeDefined();
  });

  it('calls onDelete when delete button clicked', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField()} {...baseProps} />
      </I18nProvider>
    );
    const deleteBtn = screen.getByLabelText('Delete field');
    fireEvent.click(deleteBtn);
    expect(calls.onDelete).toBe(1);
  });

  it('shows "No value" placeholder when value is empty', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField({ value: '' })} {...baseProps} />
      </I18nProvider>
    );
    expect(screen.getByText('No value')).toBeDefined();
  });

  it('has draggable attribute', () => {
    render(
      <I18nProvider>
        <FieldCard field={createMockField()} {...baseProps} />
      </I18nProvider>
    );
    const card = screen.getByRole('button', { name: /Label Test Label/ });
    expect(card.getAttribute('draggable')).toBe('true');
  });
});
