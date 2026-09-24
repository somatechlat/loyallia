/**
 * Unit tests for FieldStudio — grouped field editor with inline cards.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { FieldStudio } from '@/components/wallet/studio/FieldStudio';
import type { UnifiedField, FieldGroup } from '@/components/wallet/types/unified-state';

function createField(overrides: Partial<UnifiedField> = {}): UnifiedField {
  return {
    id: `f-${Math.random().toString(36).slice(2)}`,
    label: 'Label',
    value: 'Value',
    fieldGroup: 'primary',
    order: 0,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    dataType: 'text',
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

describe('FieldStudio', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders one panel per field group', () => {
    render(
      <I18nProvider>
        <FieldStudio fields={[]} cardType="stamp" onUpdateFields={vi.fn()} />
      </I18nProvider>
    );
    for (const group of ['header', 'primary', 'secondary', 'auxiliary', 'back'] as FieldGroup[]) {
      expect(screen.getByTestId(`field-group-${group}`)).toBeDefined();
    }
  });

  it('groups fields by fieldGroup and sorts by order', () => {
    const fields = [
      createField({ id: 'b', label: 'Second', fieldGroup: 'primary', order: 2 }),
      createField({ id: 'a', label: 'First', fieldGroup: 'primary', order: 1 }),
      createField({ id: 'h', label: 'Header', fieldGroup: 'header', order: 0 }),
    ];
    render(
      <I18nProvider>
        <FieldStudio fields={fields} cardType="stamp" onUpdateFields={vi.fn()} />
      </I18nProvider>
    );
    const primary = screen.getByTestId('field-group-primary');
    const labels = within(primary).getAllByDisplayValue(/First|Second|Header/).map((el) => (el as HTMLInputElement).value);
    expect(labels).toEqual(['First', 'Second']);
  });

  it('adds an empty field to a group', () => {
    const onUpdateFields = vi.fn();
    render(
      <I18nProvider>
        <FieldStudio fields={[]} cardType="stamp" onUpdateFields={onUpdateFields} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('add-field-primary'));
    expect(onUpdateFields).toHaveBeenCalledTimes(1);
    const next = onUpdateFields.mock.calls[0]![0];
    if (typeof next === 'function') {
      const result = next([]) as UnifiedField[];
      expect(result).toHaveLength(1);
      expect(result[0]!.fieldGroup).toBe('primary');
    } else {
      expect(next).toHaveLength(1);
      expect(next[0].fieldGroup).toBe('primary');
    }
  });

  it('deletes a field through the card delete button', () => {
    const onUpdateFields = vi.fn();
    const field = createField({ id: 'gone', fieldGroup: 'primary' });
    render(
      <I18nProvider>
        <FieldStudio fields={[field]} cardType="stamp" onUpdateFields={onUpdateFields} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('field-delete-btn'));
    expect(onUpdateFields).toHaveBeenCalledTimes(1);
    const next = onUpdateFields.mock.calls[0]![0];
    if (typeof next === 'function') {
      expect(next([field])).toEqual([]);
    } else {
      expect(next).toEqual([]);
    }
  });
});
