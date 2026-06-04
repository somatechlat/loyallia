/**
 * Unit tests for FieldStudio component.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { FieldStudio } from '@/components/wallet/studio/FieldStudio';
import type { UnifiedField } from '@/components/wallet/types/unified-state';

function createMockField(overrides: Partial<UnifiedField> = {}): UnifiedField {
  return {
    id: `field-${Math.random().toString(36).slice(2, 7)}`,
    label: 'Test Label',
    value: 'Test Value',
    fieldGroup: 'header',
    order: 0,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

describe('FieldStudio', () => {
  const updates: Array<UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])> = [];
  const baseProps = {
    fields: [] as UnifiedField[],
    cardType: 'stamp' as const,
    onUpdateFields: (update: UnifiedField[] | ((prev: UnifiedField[]) => UnifiedField[])) => {
      updates.push(update);
    },
  };

  beforeEach(() => {
    updates.length = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders limit indicators for all groups', () => {
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} />
      </I18nProvider>
    );
    expect(screen.getByText('Field Limits')).toBeDefined();
    // Group labels appear in both limit indicators and group headers
    expect(screen.getAllByText('Encabezado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Primario').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Secundario').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Auxiliar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reverso').length).toBeGreaterThanOrEqual(1);
  });

  it('groups fields correctly', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', label: 'Header 1', fieldGroup: 'header', order: 0 }),
      createMockField({ id: 'f2', label: 'Primary 1', fieldGroup: 'primary', order: 0 }),
      createMockField({ id: 'f3', label: 'Secondary 1', fieldGroup: 'secondary', order: 0 }),
    ];
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    expect(screen.getByText('Header 1')).toBeDefined();
    expect(screen.getByText('Primary 1')).toBeDefined();
    expect(screen.getByText('Secondary 1')).toBeDefined();
  });

  it('shows empty state for groups without fields', () => {
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} />
      </I18nProvider>
    );
    expect(screen.getAllByText('No fields in this group').length).toBeGreaterThan(0);
  });

  it('shows correct count in group headers', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', order: 0 }),
      createMockField({ id: 'f2', fieldGroup: 'header', order: 1 }),
    ];
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    expect(screen.getByText('2 / 3')).toBeDefined();
  });

  it('toggles Apple visibility when apple button clicked', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', label: 'Field 1', fieldGroup: 'header', showOnApple: true }),
    ];
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    const appleBtn = screen.getByLabelText('Visible on Apple Wallet');
    fireEvent.click(appleBtn);
    expect(updates.length).toBe(1);
  });

  it('toggles Google visibility when google button clicked', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', label: 'Field 1', fieldGroup: 'header', showOnGoogle: true }),
    ];
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    const googleBtn = screen.getByLabelText('Visible on Google Wallet');
    fireEvent.click(googleBtn);
    expect(updates.length).toBe(1);
  });

  it('deletes a field when delete button clicked', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', label: 'Field 1', fieldGroup: 'header' }),
    ];
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    const deleteBtn = screen.getByLabelText('Delete field');
    fireEvent.click(deleteBtn);
    expect(updates.length).toBe(1);
  });

  it('opens quick add form when add button clicked', () => {
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} />
      </I18nProvider>
    );
    const addBtn = screen.getAllByLabelText(/Add Field/)[0]!;
    fireEvent.click(addBtn);
    expect(screen.getByPlaceholderText('Label')).toBeDefined();
    expect(screen.getByPlaceholderText('Value')).toBeDefined();
  });

  it('adds a field via quick add', async () => {
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} />
      </I18nProvider>
    );
    const addBtn = screen.getAllByLabelText(/Add Field/)[0]!;
    fireEvent.click(addBtn);

    const labelInput = screen.getByPlaceholderText('Label');
    const valueInput = screen.getByPlaceholderText('Value');
    fireEvent.change(labelInput, { target: { value: 'New Field' } });
    fireEvent.change(valueInput, { target: { value: 'New Value' } });

    // Use getAllByText because there's also a global "Add Field" button
    const addFieldBtns = screen.getAllByText('Add Field');
    // The quick-add form button is the first one (in the opened form)
    fireEvent.click(addFieldBtns[0]!);

    await waitFor(() => {
      expect(updates.length).toBeGreaterThan(0);
    });
  });

  it('opens full editor when "Open Editor" clicked', () => {
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} />
      </I18nProvider>
    );
    const addBtn = screen.getAllByLabelText(/Add Field/)[0]!;
    fireEvent.click(addBtn);
    const openEditorBtn = screen.getByText('Open Editor');
    fireEvent.click(openEditorBtn);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('shows field editor modal when field card clicked', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', label: 'Field 1', fieldGroup: 'header' }),
    ];
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    const card = screen.getByRole('button', { name: /Label Field 1/ });
    fireEvent.click(card);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('renders global add field button', () => {
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} />
      </I18nProvider>
    );
    expect(screen.getByText('Add Field')).toBeDefined();
  });

  it('disables add button when group is at capacity', () => {
    const fields: UnifiedField[] = Array.from({ length: 3 }, (_, i) =>
      createMockField({ id: `f${i}`, fieldGroup: 'header', order: i })
    );
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    const addButtons = screen.getAllByLabelText(/Add Field/);
    // Header group add button should not exist when at capacity (3/3)
    // But other groups still have add buttons
    expect(addButtons.length).toBeLessThan(5);
  });

  it('shows notification bell for fields with notifications', () => {
    const fields: UnifiedField[] = [
      createMockField({
        id: 'f1',
        label: 'Field 1',
        fieldGroup: 'header',
        notifications: { appleChangeMessage: 'Updated to %@' },
      }),
    ];
    render(
      <I18nProvider>
        <FieldStudio {...baseProps} fields={fields} />
      </I18nProvider>
    );
    expect(screen.getByLabelText('Notifications configured')).toBeDefined();
  });
});
